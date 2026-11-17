import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_QUEUED, MAX_PROMPT_CHARS, claimQueued, clearQueueKeys, createQueueStore, enqueue,
  interruptedLine, nextQueued, promptFirst, queueAllowed, removeQueued, sendNowAllowed,
  withInterrupted,
} from '../src/lib/prompt-queue.mjs';

const entry = (prompt, extra = {}) => ({prompt, mode: 'ask', model: 'a/m', ...extra});
const fill = n => Array.from({length: n}).reduce(
  (items, _, i) => enqueue(items, entry('p' + i, {id: 'id' + i})).items, []);
const memory = () => {
  const map = new Map();
  return {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key), map};
};

// @lat: [[contracts#Hosted contract tests#Composer queue, steer and retry]]
test('queue refuses a fourth, empty, oversized and build entries', () => {
  assert.equal(MAX_QUEUED, 3);
  const full = fill(3);
  assert.equal(full.length, 3);
  assert.deepEqual(enqueue(full, entry('x')), {items: full, error: 'full'});
  assert.equal(enqueue([], entry('   ')).error, 'empty');
  assert.equal(enqueue([], entry('x'.repeat(MAX_PROMPT_CHARS + 1))).error, 'too_long');
  assert.equal(enqueue([], entry('x'.repeat(MAX_PROMPT_CHARS))).error, undefined);
  assert.equal(enqueue([], entry('ok', {mode: 'build'})).error, 'mode');
  assert.equal(enqueue([], entry('  ok  ')).items[0].prompt, 'ok');
});

test('promptFirst moves an item and keeps the rest in order; remove drops one', () => {
  const items = fill(3);
  assert.deepEqual(promptFirst(items, 'id2').map(i => i.id), ['id2', 'id0', 'id1']);
  assert.deepEqual(promptFirst(items, 'nope'), items);
  assert.deepEqual(removeQueued(items, 'id1').map(i => i.id), ['id0', 'id2']);
});

test('nextQueued dispatches only after completed, or a requested steer stop', () => {
  const items = fill(2), served = ['a/m'];
  const at = (status, extra = {}) => nextQueued(items, {status, models: served, ...extra});
  assert.equal(at('completed').item.id, 'id0');
  for (const status of ['queued', 'running']) {
    assert.deepEqual(at(status), {item: null, paused: null});
  }
  for (const status of ['failed', 'needs_input', 'awaiting_approval', 'cancelled']) {
    assert.deepEqual(at(status), {item: null, paused: 'status'});
  }
  assert.equal(at('cancelled', {steering: true}).item.id, 'id0');
  assert.deepEqual(at('failed', {steering: true}), {item: null, paused: 'status'});
  assert.deepEqual(nextQueued(items, {status: 'completed', models: ['b/n']}),
    {item: null, paused: 'model'});
  assert.equal(nextQueued(items, {status: 'completed', models: []}).item.id, 'id0');
  assert.deepEqual(nextQueued([], {status: 'failed', models: served}), {item: null, paused: null});
});

test('interruptedLine strips controls, collapses space and caps at 280 characters', () => {
  assert.equal(interruptedLine('  a\u0000b\n\n c\t d '), 'Instead of: ab c d');
  assert.equal(interruptedLine('   '), null);
  assert.equal(interruptedLine(undefined), null);
  assert.equal(interruptedLine('x'.repeat(500)), 'Instead of: ' + 'x'.repeat(280));
  assert.equal(withInterrupted('next', 'old'), 'Instead of: old\n\nnext');
  assert.equal(withInterrupted('next', ''), 'next');
  const big = 'y'.repeat(MAX_PROMPT_CHARS - 5);
  assert.equal(withInterrupted(big, 'old'), big);
});

test('store keeps tasks and accounts apart, survives bad storage and bad data', () => {
  const storage = memory();
  const a = createQueueStore({accountKey: 'u1', storage: () => storage});
  a.set('t1', fill(2));
  a.set('t2', fill(1));
  assert.equal(a.get('t1').length, 2);
  const again = createQueueStore({accountKey: 'u1', storage: () => storage});
  assert.deepEqual(again.get('t1'), a.get('t1'));
  assert.equal(again.get('t2').length, 1);
  assert.deepEqual(createQueueStore({accountKey: 'u2', storage: () => storage}).get('t1'), []);
  a.set('t1', []);
  assert.equal([...storage.map.keys()].some(key => key.includes('t1')), false);
  const key = [...storage.map.keys()][0];
  storage.map.set(key, '{bad');
  assert.deepEqual(createQueueStore({accountKey: 'u1', storage: () => storage}).get('t2'), []);
  storage.map.set(key, JSON.stringify(Array.from({length: 9}, () => ({}))));
  assert.deepEqual(createQueueStore({accountKey: 'u1', storage: () => storage}).get('t2'), []);
});

test('store falls back to memory when storage throws or the account is unknown', () => {
  const broken = {getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); },
    removeItem() { throw new Error('no'); }};
  const store = createQueueStore({accountKey: 'u1', storage: () => broken});
  store.set('t', fill(1));
  assert.equal(store.get('t').length, 1);
  const none = createQueueStore({accountKey: null, storage: () => { throw new Error('unused'); }});
  none.set('t', fill(1));
  assert.equal(none.get('t').length, 1);
  assert.equal(createQueueStore({accountKey: 'u1', storage: () => null}).get('t').length, 0);
});

test('only a hosted Ask or Plan task without native work can queue or steer', () => {
  assert.equal(queueAllowed({mode: 'ask', data: {}}), true);
  assert.equal(queueAllowed({mode: 'plan', data: {}}), true);
  assert.equal(queueAllowed({mode: 'build', data: {}}), false);
  assert.equal(queueAllowed({mode: 'ask', data: {native_build: {state: 'proposed'}}}), false);
  assert.equal(queueAllowed({mode: 'ask', data: {proposal: {proposalId: 'p'}}}), false);
  assert.equal(queueAllowed({mode: 'ask', data: {operation_id: 'op'}}), false);
  assert.equal(queueAllowed(null), false);
});

test('send now stops a running turn or sends after completed, failed or cancelled only', () => {
  for (const status of ['queued', 'running', 'completed', 'failed', 'cancelled']) {
    assert.equal(sendNowAllowed(status), true, status);
  }
  const held = ['needs_input', 'awaiting_approval', 'interrupted', 'reconciling', undefined];
  for (const status of held) assert.equal(sendNowAllowed(status), false, status);
});

test('a new Instead of line replaces an earlier one instead of nesting it', () => {
  assert.equal(withInterrupted('next', 'Instead of: oldest\n\nold'), 'Instead of: old\n\nnext');
  assert.equal(interruptedLine('Instead of: oldest\n\nold'), 'Instead of: old');
  assert.equal(interruptedLine('Instead of: oldest\n\n'), null);
});

test('a queued prompt is claimed by one tab only, and claims expire', () => {
  const storage = memory();
  const claim = (tab, now, id = 'q1') =>
    claimQueued(() => storage, {accountKey: 'u', taskId: 't', id, tab, now});
  assert.equal(claim('A', 1000), true);
  assert.equal(claim('A', 2000), true, 'the same tab may send it again after a failure');
  assert.equal(claim('B', 3000), false);
  assert.equal(claim('B', 3000, 'q2'), true);
  assert.equal(claim('B', 1000 + 11 * 60 * 1000), true, 'an old claim no longer blocks');
  assert.equal(claimQueued(() => null, {accountKey: 'u', taskId: 't', id: 'x', tab: 'A'}), true);
  const broken = () => { throw new Error('blocked'); };
  assert.equal(claimQueued(broken, {accountKey: 'u', taskId: 't', id: 'x', tab: 'A'}), true);
});

test('sign-out clears every queue and claim key and nothing else', () => {
  const session = memory(), local = memory();
  const store = createQueueStore({accountKey: 'u', storage: () => session});
  store.set('t', fill(1));
  session.setItem('other', 'keep');
  claimQueued(() => local, {accountKey: 'u', taskId: 't', id: 'q', tab: 'A', now: 1});
  local.setItem('datumm-prompt-drafts:v1:u', 'keep');
  for (const storage of [session, local]) {
    storage.key = i => [...storage.map.keys()][i] ?? null;
    Object.defineProperty(storage, 'length', {get: () => storage.map.size});
  }
  clearQueueKeys([() => session, () => local, () => { throw new Error('blocked'); }]);
  assert.deepEqual([...session.map.keys()], ['other']);
  assert.deepEqual([...local.map.keys()], ['datumm-prompt-drafts:v1:u']);
});
