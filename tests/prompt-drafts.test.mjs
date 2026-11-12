import test from 'node:test';
import assert from 'node:assert/strict';
import {createPromptDraftStore, promptDraftLimits} from '../src/lib/prompt-drafts.mjs';

const day = 24 * 60 * 60 * 1000;
function browserStorage() {
  const values = new Map();
  return {values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
}
const account = (storage, accountKey = 'web:account-a', now = () => 100 * day) => createPromptDraftStore({accountKey, storage: () => storage, now});

test('text survives a new store immediately after editing, without a debounce or unmount flush', () => {
  const storage = browserStorage(), draft = account(storage);
  draft.set('new:project-a', '  A courtyard house\nwith café and فارسی‌نویسی.  ');
  assert.equal(account(storage).get('new:project-a'), '  A courtyard house\nwith café and فارسی‌نویسی.  ');
  draft.set('task-a', 'Follow up');
  assert.equal(account(storage).get('task-a'), 'Follow up');
  assert.equal(account(storage).get('new'), '');
});

test('accounts, native identities, tasks and new-project drafts stay isolated', () => {
  const storage = browserStorage(), first = account(storage);
  first.set('task-a', 'First account');
  first.set('new:project-a', 'First project');
  account(storage, 'web:account-b').set('task-a', 'Second account');
  assert.equal(account(storage).get('task-a'), 'First account');
  assert.equal(account(storage, 'web:account-b').get('task-a'), 'Second account');
  assert.equal(account(storage, 'desktop:account-a').get('task-a'), '');
  assert.equal(account(storage).get('new:project-b'), '');
  let storageCalls = 0;
  const preview = createPromptDraftStore({storage: () => { storageCalls++; throw Error('must not read account data'); }});
  assert.equal(preview.set('task-a', 'Preview only'), 'memory');
  assert.equal(preview.get('task-a'), 'Preview only');
  assert.equal(storageCalls, 0);
});

test('rejected or disconnected requests preserve text; only confirmed exact admission clears its original source', () => {
  const storage = browserStorage(), draft = account(storage);
  draft.set('new:project-a', 'Submit me');
  draft.set('task-b', 'Keep the other task');
  // An optimistic composer clear or a failed request does not mutate this store.
  assert.equal(account(storage).get('new:project-a'), 'Submit me');
  draft.confirm('new:project-a', 'Different request');
  assert.equal(account(storage).get('new:project-a'), 'Submit me');
  draft.confirm('new:project-a', 'Submit me');
  assert.equal(account(storage).get('new:project-a'), '');
  assert.equal(account(storage).get('task-b'), 'Keep the other task');
  draft.set('task-b', 'A newer edit');
  draft.confirm('task-b', 'Keep the other task');
  assert.equal(account(storage).get('task-b'), 'A newer edit');
});

test('late admission remains attached to its original account store', () => {
  const storage = browserStorage(), first = account(storage), second = account(storage, 'web:account-b');
  first.set('task-a', 'Same text');
  second.set('task-a', 'Same text');
  first.confirm('task-a', 'Same text');
  assert.equal(account(storage).get('task-a'), '');
  assert.equal(account(storage, 'web:account-b').get('task-a'), 'Same text');
});

test('late admission from a stale same-account owner preserves newer persisted edits and other sources', () => {
  const storage = browserStorage(), oldOwner = account(storage);
  oldOwner.set('task-a', 'Submitted text');
  oldOwner.set('task-b', 'Old second task');
  const newOwner = account(storage);
  newOwner.set('task-a', 'Newer unsent edit');
  newOwner.set('task-b', 'Newer second task');
  newOwner.set('new:project-a', 'Another new draft');
  oldOwner.confirm('task-a', 'Submitted text');
  const restored = account(storage);
  assert.equal(restored.get('task-a'), 'Newer unsent edit');
  assert.equal(restored.get('task-b'), 'Newer second task');
  assert.equal(restored.get('new:project-a'), 'Another new draft');
  assert.equal(oldOwner.get('task-a'), 'Newer unsent edit');
});

test('a same-text edit at the same timestamp has its own revision and survives old admission', () => {
  const storage = browserStorage(), oldOwner = account(storage);
  oldOwner.set('task-a', 'Repeated text');
  const newOwner = account(storage);
  newOwner.set('task-a', 'Repeated text');
  oldOwner.confirm('task-a', 'Repeated text');
  assert.equal(account(storage).get('task-a'), 'Repeated text');
  newOwner.confirm('task-a', 'Repeated text');
  assert.equal(account(storage).get('task-a'), '');
});

test('a captured submission revision protects identical text after synchronization or a local re-edit', () => {
  const storage = browserStorage(), oldOwner = account(storage);
  oldOwner.set('task-a', 'Repeated text');
  const submittedRevision = oldOwner.revision('task-a');
  const newOwner = account(storage);
  newOwner.set('task-a', 'Repeated text');
  oldOwner.set('task-b', 'Synchronize while editing another source');
  oldOwner.confirm('task-a', 'Repeated text', submittedRevision);
  assert.equal(account(storage).get('task-a'), 'Repeated text');
  oldOwner.set('task-a', 'Repeated text');
  oldOwner.confirm('task-a', 'Repeated text', submittedRevision);
  assert.equal(account(storage).get('task-a'), 'Repeated text');
  assert.notEqual(oldOwner.revision('task-a'), submittedRevision);
});

test('interleaved source edits merge current disk state and cannot resurrect an admitted draft', () => {
  const storage = browserStorage(), oldOwner = account(storage);
  oldOwner.set('task-a', 'Admit this');
  const newOwner = account(storage);
  newOwner.confirm('task-a', 'Admit this');
  newOwner.set('task-b', 'Other owner');
  oldOwner.set('task-c', 'Old owner edits another source');
  newOwner.set('task-d', 'Keep both owners');
  const restored = account(storage);
  assert.equal(restored.get('task-a'), '');
  assert.equal(restored.get('task-b'), 'Other owner');
  assert.equal(restored.get('task-c'), 'Old owner edits another source');
  assert.equal(restored.get('task-d'), 'Keep both owners');
});

test('a stale move checks current source and target revisions before changing either source', () => {
  const storage = browserStorage(), oldOwner = account(storage);
  oldOwner.set('new:project-a', 'Provisional draft');
  const newOwner = account(storage);
  newOwner.set('task-a', 'Existing destination draft');
  oldOwner.move('new:project-a', 'task-a');
  assert.equal(account(storage).get('new:project-a'), 'Provisional draft');
  assert.equal(account(storage).get('task-a'), 'Existing destination draft');
  newOwner.set('new:project-a', 'Newer provisional edit');
  oldOwner.move('new:project-a', 'task-b');
  assert.equal(account(storage).get('new:project-a'), 'Newer provisional edit');
  assert.equal(account(storage).get('task-b'), '');
});

test('combined late confirmation and move cannot take another owner’s provisional draft', () => {
  for (const newerText of ['Second owner new-chat draft', 'Submitted text']) {
    const storage = browserStorage(), first = account(storage);
    first.set('new', 'Submitted text');
    const submittedRevision = first.revision('new');
    const second = account(storage);
    second.set('new', newerText);
    first.confirm('new', 'Submitted text', submittedRevision);
    first.move('new', 'task-a');
    const restored = account(storage);
    assert.equal(restored.get('new'), newerText);
    assert.equal(restored.get('task-a'), '');
    assert.equal(first.get('new'), newerText);
  }
});

test('typing during initial admission follows the new task identity without erasing another draft', () => {
  const storage = browserStorage(), draft = account(storage);
  draft.set('new:project-a', 'Original request');
  const submittedRevision = draft.revision('new:project-a');
  draft.set('new:project-a', 'A follow-up typed while sending');
  draft.confirm('new:project-a', 'Original request', submittedRevision);
  draft.move('new:project-a', 'task-a');
  assert.equal(account(storage).get('task-a'), 'A follow-up typed while sending');
  assert.equal(account(storage).get('new:project-a'), '');
  draft.set('task-b', 'Keep target');
  draft.move('task-a', 'task-b');
  assert.equal(draft.get('task-a'), 'A follow-up typed while sending');
  assert.equal(draft.get('task-b'), 'Keep target');
  draft.set('new:project-b', 'Identical follow-up');
  const olderRevision = draft.revision('new:project-b');
  draft.set('new:project-b', 'Identical follow-up');
  draft.confirm('new:project-b', 'Identical follow-up', olderRevision);
  draft.move('new:project-b', 'task-c');
  assert.equal(account(storage).get('new:project-b'), '');
  assert.equal(account(storage).get('task-c'), 'Identical follow-up');
});

test('retention excludes old and future records and bounds persisted drafts without truncating in-memory text', () => {
  const storage = browserStorage(); let time = 100 * day;
  const draft = account(storage, undefined, () => time);
  draft.set('expired', 'Old draft'); time += 7 * day;
  assert.equal(account(storage, undefined, () => time).get('expired'), '');
  assert.equal([...storage.values.values()].some(raw => raw.includes('Old draft')), false);
  for (let i = 0; i < 30; i++) { time++; draft.set('task-' + i, 'x'.repeat(6000)); }
  const saved = JSON.parse([...storage.values.values()][0]);
  assert.ok(saved.drafts.length <= promptDraftLimits.drafts);
  assert.ok(saved.drafts.reduce((sum, row) => sum + row.text.length, 0) <= promptDraftLimits.totalCharacters);
  assert.equal(account(storage, undefined, () => time).get('task-29').length, 6000);
  assert.equal(draft.get('task-0').length, 6000);
  assert.equal(draft.status('task-0'), 'memory');
  assert.equal(draft.status('task-29'), 'saved');
  const oversized = '😀'.repeat(7000);
  assert.equal(draft.set('oversized', oversized), 'memory');
  assert.equal(draft.get('oversized'), oversized);
  assert.equal(account(storage, undefined, () => time).get('oversized'), '');
});

test('embedded file data and recognizable credentials remain in memory without entering browser storage', () => {
  const storage = browserStorage(), draft = account(storage);
  for (const text of ['data:image/png;base64,AAABBB', 'Bearer abcdefghijklmnopqrstuvwxyz', 'sk-proj-' + 'a'.repeat(30), '-----BEGIN PRIVATE KEY-----']) {
    assert.equal(draft.set('task-a', text), 'memory');
    assert.equal(draft.get('task-a'), text);
    assert.equal(account(storage).get('task-a'), '');
  }
});

test('malformed, oversized or unavailable storage cannot crash or destroy the in-memory draft', () => {
  const storage = browserStorage(), draft = account(storage);
  draft.set('new', 'Initial');
  const key = [...storage.values.keys()][0];
  for (const raw of ['{', JSON.stringify({version: 2, drafts: []}), 'x'.repeat(600001), JSON.stringify({version: 1, drafts: [{source: 'new', text: 'future', updatedAt: 200 * day}]})]) {
    storage.values.set(key, raw);
    assert.equal(account(storage).get('new'), '');
  }
  const unavailable = createPromptDraftStore({accountKey: 'web:a', storage: () => { throw Error('SecurityError'); }});
  assert.equal(unavailable.set('task-a', 'Keep this text'), 'unavailable');
  assert.equal(unavailable.get('task-a'), 'Keep this text');
  let quota = true;
  const target = browserStorage(), restricted = {...target, setItem: (...args) => { if (quota) throw Error('QuotaExceededError'); return target.setItem(...args); }};
  const recoverable = account(restricted);
  assert.equal(recoverable.set('new', 'Quota draft'), 'unavailable');
  assert.equal(recoverable.get('new'), 'Quota draft');
  quota = false;
  recoverable.set('task-b', 'Another source after quota recovers');
  assert.equal(recoverable.get('new'), 'Quota draft');
  assert.equal(recoverable.status('new'), 'memory');
  assert.equal(recoverable.set('new', 'Quota draft revised'), 'saved');
  assert.equal(account(target).get('new'), 'Quota draft revised');
});
