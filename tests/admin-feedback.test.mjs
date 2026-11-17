import test from 'node:test';
import assert from 'node:assert/strict';
import { casePath, caseJson, feedbackPath, parseFeedbackPage } from '../src/lib/admin-feedback.mjs';

const ID = 'task-1:3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const row = (extra = {}) => ({
  id: ID, vote: 'down', reason: 'too_long', createdAt: '2026-11-16T09:00:00Z',
  model: 'openai/gpt-6-luna', ownerHash: '0123456789abcdef', taskId: 'task-1', ...extra,
});
const page = (rows = [row()], extra = {}) => ({ schemaVersion: 1, rows, nextBefore: '2026-11-16T09:00:00Z|x', ...extra });

// @lat: [[contracts#Hosted contract tests#Admin feedback parsing]]
test('rows keep only allowlisted keys and no text survives', () => {
  const parsed = parseFeedbackPage(page([row({
    prompt: 'CANARY-7f3', answerExcerpt: 'CANARY-7f3', note: 'CANARY-7f3', owner: 'user_2abc',
  })], { debug: 'CANARY-7f3' }));
  assert.deepEqual(Object.keys(parsed.rows[0]).sort(),
    ['createdAt', 'id', 'model', 'ownerHash', 'reason', 'taskId', 'vote']);
  assert.deepEqual(Object.keys(parsed).sort(), ['nextBefore', 'rows']);
  assert.ok(!JSON.stringify(parsed).includes('CANARY'));
});

test('a wrong schema, hostile ids and an up vote with a reason are cleaned', () => {
  assert.equal(parseFeedbackPage({ ...page(), schemaVersion: 2 }), null);
  assert.equal(parseFeedbackPage({ schemaVersion: 1, rows: 'x' }), null);
  assert.equal(parseFeedbackPage(null), null);
  const rows = parseFeedbackPage(page([row({ id: 'a/b' }), row({ vote: 'meh' }), row({ vote: 'up' }),
    row({ ownerHash: 'user_2abc', model: 'bad model', reason: 'because' })])).rows;
  assert.equal(rows.length, 2);
  assert.deepEqual([rows[0].vote, rows[0].reason], ['up', null]);
  assert.deepEqual([rows[1].ownerHash, rows[1].model, rows[1].reason], [null, null, null]);
});

test('query sends only valid values and caps the limit', () => {
  assert.equal(feedbackPath({ vote: 'down' }), 'admin/feedback?limit=25&vote=down');
  assert.equal(feedbackPath({ vote: 'x', reason: 'too_long', before: 'a|b', limit: 500 }),
    'admin/feedback?limit=100&reason=too_long&before=a%7Cb');
  assert.equal(feedbackPath({ reason: 'bogus', before: 'has space' }), 'admin/feedback?limit=25');
});

test('the case path is built only for an id the proxy accepts', () => {
  assert.equal(casePath(ID), `admin/feedback/${encodeURIComponent(ID)}/case`);
  for (const id of ['a/b', '../x', '', 'x y', null]) assert.equal(casePath(id), null, String(id));
});

test('the eval case is rebuilt key by key with expected null', () => {
  const json = caseJson({ prompt: 'Q', answerExcerpt: 'A', expected: 'LEAK', reason: 'too_long', vote: 'down',
    model: 'openai/gpt-6-luna', createdAt: '2026-11-16T09:00:00Z', extra: 'CANARY' });
  assert.deepEqual(JSON.parse(json), { prompt: 'Q', answerExcerpt: 'A', expected: null, reason: 'too_long',
    vote: 'down', model: 'openai/gpt-6-luna', createdAt: '2026-11-16T09:00:00Z' });
  assert.equal(caseJson({ vote: 'sideways' }), null);
  assert.equal(caseJson(null), null);
  assert.equal(JSON.parse(caseJson({ vote: 'up', reason: 'too_long', prompt: 5 })).reason, null);
  assert.equal(JSON.parse(caseJson({ vote: 'up', prompt: 5 })).prompt, null);
});
