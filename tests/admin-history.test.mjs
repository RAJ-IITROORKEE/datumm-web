import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditPath, changedPaths, formatChange, historyPath, parseAuditRows, parseHistory,
  parseHistoryDetail, restoreBlock, restoreBody,
} from '../src/lib/admin-history.mjs';
import { createHistoryFixture } from '../src/components/dev/admin-history-fixture.ts';
import { emptyConfig } from '../src/lib/admin-config.mjs';

const HASH = 'abcdef012345';
const change = extra => ({ path: 'parallelChats', beforeHash: HASH, afterHash: HASH, ...extra });
const row = extra => ({
  revision: 3, at: '2026-11-16T10:00:00Z', by: 'boss', action: 'restore', restoredFrom: 1,
  note: 'rollback', configHash: HASH, changes: [change({ before: 4, after: 2 })],
  changesTruncated: false, recovered: false, redacted: false, restorable: true, ...extra,
});
const page = extra => ({ schemaVersion: 1, current: 3, nextBefore: 2, rows: [row()], ...extra });

// @lat: [[contracts#Admin history parsing]]
test('history parsing keeps only allowlisted keys at every level', () => {
  const parsed = parseHistory(page({
    secret: 'x',
    rows: [row({
      config: { skills: 'TEXT' }, extra: 1,
      changes: [change({ before: 4, after: 2, leak: 'CANARY', nested: { a: 1 } })],
    })],
  }));
  assert.deepEqual(parsed, {
    current: 3, nextBefore: 2,
    rows: [{
      revision: 3, at: '2026-11-16T10:00:00Z', by: 'boss', action: 'restore', restoredFrom: 1,
      note: 'rollback', configHash: HASH,
      changes: [{ path: 'parallelChats', beforeHash: HASH, afterHash: HASH, before: 4, after: 2 }],
      changesTruncated: false, recovered: false, redacted: false, restorable: true,
      identical: false,
    }],
  });
  assert.ok(!JSON.stringify(parsed).includes('CANARY'));
});

test('history parsing refuses wrong shapes and bad revisions, actions and flags', () => {
  for (const raw of [null, [], 'x', {}, page({ schemaVersion: 2 }), page({ rows: 'x' }),
    page({ current: '3' }), page({ current: 0 }), page({ current: 1.5 })]) {
    assert.equal(parseHistory(raw), null, JSON.stringify(raw));
  }
  const parsed = parseHistory(page({
    nextBefore: '2',
    rows: [
      row({ revision: 1.5 }), row({ revision: '4' }), row({ revision: 0 }), row({ revision: -1 }),
      row({ action: 'delete' }), row({ action: 'Update' }), 'x', null, row({ revision: 5 }),
      row({ revision: 6, restorable: 'yes', recovered: 1, redacted: 'true', restoredFrom: 'a',
        identical: 'true' }),
      row({ revision: 7, identical: true }),
    ],
  }));
  assert.equal(parsed.nextBefore, null, 'a non-integer cursor is dropped');
  assert.deepEqual(parsed.rows.map(item => item.revision), [5, 6, 7]);
  const odd = parsed.rows[1];
  assert.deepEqual([odd.restorable, odd.recovered, odd.redacted, odd.restoredFrom, odd.identical],
    [false, false, false, null, false], 'only a literal true counts');
  assert.equal(parsed.rows[2].identical, true);
  assert.equal(parseHistoryDetail(row({ identical: true })).identical, true);
});

test('changes keep values only when scalar and drop objects, long text and bad paths', () => {
  const changes = parseHistory(page({
    rows: [row({
      changes: [
        change({ path: 'models', before: ['a', 'b'], after: [] }),
        change({ path: 'skills[b].instructions' }),
        change({ path: 'skills[c]', beforeHash: null, before: null, after: undefined }),
        change({ path: 'webSearch.enabled', before: false, after: true }),
        change({ path: 'x', before: { a: 1 }, after: 'y'.repeat(201) }),
        change({ path: '' }), change({ path: 'bad\npath' }),
        change({ path: 'p', beforeHash: 'XYZ' }), null, 'x',
      ],
    })],
  })).rows[0].changes;
  assert.deepEqual(changes.map(item => item.path),
    ['models', 'skills[b].instructions', 'skills[c]', 'webSearch.enabled', 'x', 'p']);
  assert.deepEqual(changes[0],
    { path: 'models', beforeHash: HASH, afterHash: HASH, before: ['a', 'b'], after: [] });
  assert.ok(!('before' in changes[1]) && !('after' in changes[1]));
  assert.equal(changes[2].beforeHash, null);
  assert.ok(!('before' in changes[2]), 'a null value is never shown');
  assert.ok(!('before' in changes[4]) && !('after' in changes[4]));
  assert.equal(changes[5].beforeHash, null, 'a malformed hash is dropped');
});

test('changes are capped at 50 and notes longer than 200 characters are dropped', () => {
  const many = Array.from({ length: 60 }, (_, i) => change({ path: `limits.k${i}` }));
  const parsed = parseHistory(page({ rows: [row({ changes: many, note: 'n'.repeat(201) })] }));
  assert.equal(parsed.rows[0].changes.length, 50);
  assert.equal(parsed.rows[0].note, null);
});

test('the detail keeps the diff from live, drops the snapshot and flags truncation', () => {
  const detail = parseHistoryDetail({
    ...row(), config: { skills: [{ instructions: 'CANARY-SKILL' }] },
    changesFromCurrent: [change({ path: 'skills[a].instructions' })],
    changesFromCurrentTruncated: true,
  });
  assert.equal(detail.changesFromCurrent.length, 1);
  assert.equal(detail.changesFromCurrentTruncated, true);
  assert.ok(!('config' in detail));
  assert.ok(!JSON.stringify(detail).includes('CANARY'));
  assert.equal(parseHistoryDetail(row()).changesFromCurrentTruncated, false);
  assert.deepEqual(parseHistoryDetail(row()).changesFromCurrent, []);
  assert.equal(parseHistoryDetail(null), null);
  assert.equal(parseHistoryDetail({ ...row(), revision: 'x' }), null);
});

test('audit rows stay an array, tolerate old rows and keep closed kind and action sets', () => {
  assert.equal(parseAuditRows({ rows: [] }), null);
  const rows = parseAuditRows([
    { at: '2026-11-16T10:00:00Z', by: 'boss', summary: 'Updated config: skills' },
    {
      at: '2026-11-16T09:00:00Z', by: 'boss', summary: 'Restored config revision 3: skills',
      kind: 'config', action: 'restore', revision: 3, restoredFrom: 1, note: 'ok',
      changes: [change({ path: 'skills[a].enabled', before: false, after: true })],
      changesTruncated: true, cursor: '2026-11-16T09:00:00+00:00|65f0a1', hidden: 'x',
    },
    { at: 'bad', by: 5, summary: 7, kind: 'other', action: 'wipe', cursor: 'has space' },
    'x', null,
  ]);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], {
    at: '2026-11-16T10:00:00Z', by: 'boss', summary: 'Updated config: skills', kind: null,
    action: null, revision: null, restoredFrom: null, note: null, changes: [],
    changesTruncated: false, cursor: null,
  });
  assert.equal(rows[1].cursor, '2026-11-16T09:00:00+00:00|65f0a1');
  assert.equal(rows[1].changesTruncated, true);
  assert.ok(!('hidden' in rows[1]));
  const bad = rows[2];
  assert.deepEqual([bad.at, bad.by, bad.summary, bad.kind, bad.action, bad.cursor],
    [null, null, '', null, null, null]);
});

test('change formatting shows before to after only when values exist', () => {
  assert.equal(formatChange(change({ before: 3, after: 2 })), '3 → 2');
  assert.equal(formatChange(change({ before: false, after: true })), 'false → true');
  assert.equal(formatChange(change({ before: ['a', 'b'], after: [] })), 'a, b → (none)');
  assert.equal(formatChange(change({ before: '', after: 'x' })), '(empty) → x');
  assert.equal(formatChange(change()), 'changed');
  assert.equal(formatChange(change({ beforeHash: null })), 'changed', 'added item: hashes only');
  const paths = changedPaths([1, 2, 3, 4, 5].map(n => change({ path: `p${n}` })), true, 3);
  assert.deepEqual(paths, { paths: ['p1', 'p2', 'p3'], more: 2, truncated: true });
});

test('request paths send only valid cursors, limits and kinds', () => {
  assert.equal(historyPath(), 'admin/config/history?limit=20');
  assert.equal(historyPath({ before: 7 }), 'admin/config/history?before=7&limit=20');
  assert.equal(historyPath({ before: '7; drop' }), 'admin/config/history?limit=20');
  assert.equal(auditPath(), 'admin/audit?limit=25');
  assert.equal(auditPath({ kind: 'knowledge', before: '2026-11-16T09:00:00+00:00|65f0a1' }),
    'admin/audit?before=2026-11-16T09%3A00%3A00%2B00%3A00%7C65f0a1&limit=25&kind=knowledge');
  assert.equal(auditPath({ kind: 'secrets', before: 'a b' }), 'admin/audit?limit=25');
});

// @lat: [[contracts#Config restore binding]]
test('a restore body needs integer fromRevision and expectedRevision and trims the note', () => {
  for (const input of [undefined, {}, { fromRevision: 1 }, { expectedRevision: 2 },
    { fromRevision: '1', expectedRevision: 2 }, { fromRevision: 1, expectedRevision: '2' },
    { fromRevision: 0, expectedRevision: 2 }, { fromRevision: 1.5, expectedRevision: 2 },
    { fromRevision: 1, expectedRevision: -1 }, { fromRevision: 1, expectedRevision: NaN }]) {
    assert.equal(restoreBody(input), null, JSON.stringify(input));
  }
  assert.deepEqual(restoreBody({ fromRevision: 1, expectedRevision: 0 }),
    { fromRevision: 1, expectedRevision: 0 });
  assert.deepEqual(restoreBody({ fromRevision: 1, expectedRevision: 2, note: '  ' }),
    { fromRevision: 1, expectedRevision: 2 });
  const long = restoreBody(
    { fromRevision: 1, expectedRevision: 2, note: `  ${'n'.repeat(300)}  ` });
  assert.equal(long.note.length, 200);
  const keys = Object.keys(restoreBody({ fromRevision: 1, expectedRevision: 2, x: 1, note: 'ok' }));
  assert.deepEqual(keys.sort(), ['expectedRevision', 'fromRevision', 'note']);
});

test('restore is blocked by unsaved edits first, then by an unrestorable or live revision', () => {
  const base = { restorable: true, revision: 2, current: 3, dirty: false, saving: false };
  assert.equal(restoreBlock(base), null);
  assert.equal(restoreBlock({ ...base, dirty: true }), 'Save or discard your edits first');
  assert.equal(restoreBlock({ ...base, saving: true }), 'Save or discard your edits first');
  assert.equal(restoreBlock({ ...base, restorable: false }),
    'Contains data that cannot be restored');
  assert.equal(restoreBlock({ ...base, restorable: false, dirty: true }),
    'Save or discard your edits first');
  assert.equal(restoreBlock({ ...base, revision: 3 }), 'This is the live revision');
});

test('revisions are bounded to 31 bits in parsing and in the restore body', () => {
  const max = 2147483647;
  assert.deepEqual(restoreBody({ fromRevision: max, expectedRevision: max }),
    { fromRevision: max, expectedRevision: max });
  assert.equal(restoreBody({ fromRevision: max + 1, expectedRevision: 2 }), null);
  assert.equal(restoreBody({ fromRevision: 1, expectedRevision: max + 1 }), null);
  assert.equal(parseHistory(page({ current: max })).current, max);
  assert.equal(parseHistory(page({ current: max + 1 })), null);
  const parsed = parseHistory(page({
    nextBefore: max + 1, rows: [row({ revision: max }), row({ revision: max + 1 })],
  }));
  assert.deepEqual(parsed.rows.map(item => item.revision), [max]);
  assert.equal(parsed.nextBefore, null);
  assert.equal(historyPath({ before: max + 1 }), 'admin/config/history?limit=20');
});

test('restore is blocked for a revision with the live settings, after the other reasons', () => {
  const same = 'Same settings as the live revision';
  const base = { restorable: true, revision: 2, current: 3, dirty: false, saving: false,
    changesFromCurrent: [change()], changesFromCurrentTruncated: false };
  assert.equal(restoreBlock(base), null);
  assert.equal(restoreBlock({ ...base, identical: true }), same);
  assert.equal(restoreBlock({ ...base, identical: 'true' }), null, 'only a literal true counts');
  assert.equal(restoreBlock({ ...base, changesFromCurrent: [] }), same);
  assert.equal(restoreBlock({ ...base, changesFromCurrent: [], changesFromCurrentTruncated: true }),
    null, 'a truncated empty list is not proof of sameness');
  assert.equal(restoreBlock({ ...base, identical: true, revision: 3 }),
    'This is the live revision');
  assert.equal(restoreBlock({ ...base, identical: true, restorable: false }),
    'Contains data that cannot be restored');
  assert.equal(restoreBlock({ ...base, identical: true, dirty: true }),
    'Save or discard your edits first');
});

test('an unfinished list entry blocks restore like unsaved edits', () => {
  const base = { restorable: true, revision: 2, current: 3, dirty: false, saving: false };
  assert.equal(restoreBlock({ ...base, pendingChipCount: 0 }), null);
  assert.equal(restoreBlock({ ...base, pendingChipCount: 1 }), 'Save or discard your edits first');
  assert.equal(restoreBlock({ ...base, pendingChipCount: 2, restorable: false }),
    'Save or discard your edits first');
});

test('the fixture marks revisions identical to live and checks staleness before sameness', () => {
  const live = { ...emptyConfig(), models: ['m1', 'm2'], defaultModel: 'm2' };
  const fixture = createHistoryFixture(live, 12, 'fixture@example.invalid');
  const rows = fixture.list(null, 20).rows;
  const same = rows.filter(item => item.identical).map(item => item.revision);
  assert.ok(same.includes(12) && same.some(r => r < 12), `identical rows: ${same}`);
  const old = same.find(r => r < 12);
  assert.equal(fixture.detail(old).identical, true);
  assert.equal(fixture.detail(11).identical, false);
  assert.equal(fixture.restore(old, 11, '').reason, 'stale', '409 before 422');
  const already = fixture.restore(old, 12, '');
  assert.deepEqual([already.ok, already.reason, already.message],
    [false, 'error', 'Already current.']);
  assert.equal(fixture.current(), 12, 'no write');
  const done = fixture.restore(11, 12, 'back');
  assert.equal(done.ok, true);
  assert.equal(fixture.current(), 13);
  assert.equal(fixture.detail(11).identical, true, 'identity follows the new live revision');
  assert.equal(fixture.detail(old).identical, false);
});
