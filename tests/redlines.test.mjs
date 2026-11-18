import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REDLINE_LIMITS, appliedMessage, applyLabel, applyQueue, canTick, checkFile, clipText,
  defaultTicks, fitEdge, pageCheck, parseRedlines, partialMessage, readFailureMessage,
  redlineBody, redlinePath,
} from '../src/lib/redlines.mjs';

const drawing = { planId: 'plan-1', version: 2, fingerprint: 'f'.repeat(64) };
const door = {
  kind: 'opening',
  opening: {
    kind: 'update', openingKey: 'door-1', wallKey: 'w1', offsetMm: 300, widthMm: 900,
    heightMm: 2100, sillMm: 0,
  },
};
const ready = (id, confidence, edit = door) =>
  ({ id, mark: `mark ${id}`, confidence, status: 'ready', summary: `Do ${id}`, edit });
const unclear = (id) => ({
  id, mark: '?? move', confidence: 'low', status: 'unclear', summary: 'Unclear', edit: null,
  reason: 'No wall named.',
});
const answer = (items, extra = {}) =>
  ({ schema: 'datumm.redlines.v1', ...drawing, model: 'm', items, ...extra });
const ids = (rows) => rows.map((item) => item.id);

// @lat: [[contracts#Redline intake]]
test('parses a redline answer for this exact plan version', () => {
  const parsed = parseRedlines(answer([ready('r1', 'high'), unclear('r2')]), drawing);
  assert.equal(parsed.items.length, 2);
  assert.equal(parsed.items[1].reason, 'No wall named.');
  assert.equal(parsed.items[0].edit.kind, 'opening');
});

test('rejects unknown shapes instead of dropping parts of them', () => {
  const swapOne = ready('r1', 'high', { kind: 'swap', roomKeys: ['a'] });
  const moveHalf = ready('r1', 'high', { kind: 'move-wall', wallKey: 'w', offsetMm: 1.5 });
  const explode = ready('r1', 'high', { kind: 'opening', opening: { kind: 'explode' } });
  const bad = [
    null, {}, answer([], { schema: 'datumm.redlines.v2' }), answer([], { planId: 'other' }),
    answer([], { version: 3 }), answer([], { fingerprint: '' }), answer('x'),
    answer([ready('r1', 'certain')]), answer([{ ...ready('r1', 'high'), status: 'done' }]),
    answer([{ ...ready('r1', 'high'), edit: null }]),
    answer([{ ...ready('r1', 'high'), edit: { kind: 'delete-room' } }]),
    answer([moveHalf]), answer([swapOne]), answer([explode]),
    answer([{ ...unclear('r1'), edit: door }]), answer([ready('r1', 'high'), ready('r1', 'low')]),
    answer(Array.from({ length: 13 }, (_, i) => ready(`r${i}`, 'high'))),
  ];
  for (const raw of bad) {
    assert.equal(parseRedlines(raw, drawing), null, JSON.stringify(raw)?.slice(0, 80));
  }
});

test('a ready item carries no reason and the mark is plain text', () => {
  const row = { ...ready('r1', 'high'), mark: '<b>door</b>\u0000\n900' };
  const [item] = parseRedlines(answer([row]), drawing).items;
  assert.equal(item.mark, '<b>door</b> 900');
  assert.equal(item.reason, '');
});

test('an unclear item without a reason still gets a plain one', () => {
  const raw = { ...unclear('r1') };
  delete raw.reason;
  assert.match(parseRedlines(answer([raw]), drawing).items[0].reason, /could not be turned/);
});

test('high and medium are ticked, low is not, unclear is never tickable', () => {
  const rows = [ready('a', 'high'), ready('b', 'medium'), ready('c', 'low'), unclear('d')];
  const { items } = parseRedlines(answer(rows), drawing);
  assert.deepEqual(defaultTicks(items), ['a', 'b']);
  assert.deepEqual(items.map(canTick), [true, true, true, false]);
  assert.deepEqual(ids(applyQueue(items, ['a', 'c', 'd'])), ['a', 'c']);
});

test('the apply queue keeps the server order and skips what was already applied', () => {
  const rows = [ready('a', 'high'), ready('b', 'high'), ready('c', 'high')];
  const { items } = parseRedlines(answer(rows), drawing);
  assert.deepEqual(ids(applyQueue(items, ['c', 'a', 'b'])), ['a', 'b', 'c']);
  assert.deepEqual(ids(applyQueue(items, ['c', 'a', 'b'], ['a'])), ['b', 'c']);
  assert.deepEqual(applyQueue(items, []), []);
});

test('the request carries the fingerprint, the image and clipped page text', () => {
  const path = redlinePath({ planId: 'a/b', version: 3 });
  assert.equal(path, 'variable/plans/a%2Fb/versions/3/redlines');
  const plain = redlineBody(drawing, { image: 'data:image/jpeg;base64,AA' });
  assert.deepEqual(plain, { fingerprint: drawing.fingerprint, image: 'data:image/jpeg;base64,AA' });
  const pageText = `a${' '.repeat(5)}b\u0000${'z'.repeat(9000)}`;
  const body = redlineBody(drawing, { image: 'x', pageText });
  assert.equal(body.pageText.length, REDLINE_LIMITS.maxPageText);
  assert.ok(body.pageText.startsWith('a b '));
  assert.equal(clipText(42), '');
});

test('the image budget leaves room under the server limit and the proxy body limit', () => {
  const json = Math.ceil(REDLINE_LIMITS.maxImageBytes / 3) * 4 + 30;
  assert.ok(REDLINE_LIMITS.maxImageBytes <= 2_621_440, 'server decoded limit');
  assert.ok(json + REDLINE_LIMITS.maxPageText * 3 + 200 < 3_500_000, 'proxy body limit');
});

test('files are checked for type, emptiness and the 20 MB limit', () => {
  assert.deepEqual(checkFile({ type: 'application/pdf', size: 10 }), { ok: true, kind: 'pdf' });
  assert.deepEqual(checkFile({ type: 'image/webp', size: 10 }), { ok: true, kind: 'image' });
  assert.equal(checkFile({ type: 'image/gif', size: 10 }).ok, false);
  assert.equal(checkFile({ type: 'image/png', size: 0 }).ok, false);
  assert.equal(checkFile({ type: 'image/png', size: 20_000_001 }).ok, false);
  assert.equal(checkFile(null).ok, false);
});

test('sizes fit the longest edge and pages are bounded', () => {
  assert.deepEqual(fitEdge(4800, 2400), { width: 2400, height: 1200, scale: 0.5 });
  assert.deepEqual(fitEdge(1000, 500), { width: 1000, height: 500, scale: 1 });
  assert.deepEqual(fitEdge(600, 300, 2400, true), { width: 2400, height: 1200, scale: 4 });
  assert.equal(pageCheck(3, 5).ok, true);
  assert.equal(pageCheck(0, 5).ok, false);
  assert.equal(pageCheck(6, 5).ok, false);
  assert.equal(pageCheck(1.5, 5).ok, false);
});

test('plain wording for counts and failures', () => {
  assert.equal(applyLabel(0), 'Apply changes');
  assert.equal(applyLabel(1), 'Apply 1 change');
  assert.equal(applyLabel(3), 'Apply 3 changes');
  assert.equal(appliedMessage(3, 5), '3 changes applied · Saved as Version 5');
  assert.equal(partialMessage(0, 3, 2, 'Nope.'), '0 of 3 changes applied. Stopped there: Nope.');
  assert.match(partialMessage(2, 3, 4, 'Nope.'), /Version 4 is saved\.$/);
});

test('a failed read shows the server message, or a plain fallback', () => {
  assert.match(readFailureMessage({ status: 409 }), /changed elsewhere/);
  assert.equal(readFailureMessage({ status: 429, message: 'Limit reached.' }), 'Limit reached.');
  assert.match(readFailureMessage({ status: 422, message: 'No model.' }), /No model/);
  assert.equal(readFailureMessage({ status: 502, message: 'Model failed.' }), 'Model failed.');
  const generic = 'DATUMM service is temporarily unavailable.';
  assert.match(readFailureMessage({ status: 502, message: generic }), /Try again/);
  assert.match(readFailureMessage({ status: 500 }), /plan is unchanged/);
});
