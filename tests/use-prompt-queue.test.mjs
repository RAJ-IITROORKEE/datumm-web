import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import * as queueLib from '../src/lib/prompt-queue.mjs';

const code = ts.transpileModule(
  readFileSync(new URL('../src/components/workspace/use-prompt-queue.ts', import.meta.url), 'utf8'),
  {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;

// Smallest hook runtime: state, refs and memo persist by call order; effects run after render when
// their dependencies changed.
function mount(initialEnv, globals = {}) {
  const slots = [], effects = [], store = {};
  let cursor = 0, env = initialEnv, result;
  const hooks = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      const set = value => {
        slots[i] = typeof value === 'function' ? value(slots[i]) : value;
      };
      return [slots[i], set];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= {current: initial}; },
    useMemo(fn, deps) {
      const i = cursor++;
      if (!slots[i] || slots[i].deps.some((d, n) => d !== deps[n])) slots[i] = {deps, value: fn()};
      return slots[i].value;
    },
    useCallback: fn => fn,
    useEffect(fn, deps) {
      const i = cursor++;
      const old = slots[i];
      if (!old || !deps || deps.some((d, n) => d !== old[n])) effects.push(fn);
      slots[i] = deps;
    },
  };
  const exports = {};
  runInNewContext(code, {exports, require: name => name === 'react' ? hooks : queueLib,
    sessionStorage: undefined, Promise, setTimeout: () => 0, ...globals});
  const render = () => {
    cursor = 0;
    result = exports.usePromptQueue(env);
    for (const effect of effects.splice(0)) effect();
    return result;
  };
  const set = change => { env = {...env, ...change}; return render(); };
  return {render, set, get: () => result, store};
}

const base = () => {
  const sent = [];
  return {sent, env: {
    accountKey: 'u', taskId: 't1', status: 'running', active: true, models: ['a/m'], model: 'a/m',
    mode: 'ask', idle: true, lastPrompt: 'first question',
    send: async (text, model, mode) => { sent.push({text, model, mode}); return true; },
    stop: async () => true,
  }};
};
const tick = () => new Promise(resolve => setImmediate(resolve));

test('a queued prompt is sent once, only after this tab watched the turn complete', async () => {
  const {env, sent} = base();
  const h = mount(env);
  h.render();
  assert.equal(h.get().add('second'), true);
  assert.equal(h.render().items.length, 1);
  h.set({status: 'completed'});
  await tick();
  assert.deepEqual(sent, [{text: 'second', model: 'a/m', mode: 'ask'}]);
  assert.equal(h.render().items.length, 0);
  // A reload (never watched running) must not send by itself.
  const reload = base();
  const fresh = mount({...reload.env, status: 'completed'});
  fresh.render();
  assert.equal(reload.sent.length, 0);
});

test('other endings pause the queue and keep every prompt', async () => {
  for (const status of ['failed', 'needs_input', 'awaiting_approval', 'cancelled']) {
    const {env, sent} = base();
    const h = mount(env);
    h.render();
    h.get().add('kept');
    h.render();
    h.set({status});
    await tick();
    assert.equal(sent.length, 0, status);
    assert.equal(h.render().items.length, 1);
    assert.equal(h.get().paused, 'status');
  }
});

test('send now stops the turn, then sends the prompt with the Instead of line', async () => {
  const {env, sent} = base();
  const stops = [];
  const h = mount({...env, stop: async () => { stops.push(1); return true; }});
  h.render();
  h.get().add('later');
  h.render();
  let cleared = 0;
  await h.get().sendNow({text: 'urgent'}, () => cleared++);
  assert.equal(stops.length, 1);
  assert.equal(cleared, 1);
  assert.equal(h.render().stopping, true);
  assert.deepEqual(h.get().items.map(item => item.prompt), ['urgent', 'later']);
  h.set({status: 'cancelled'});
  await tick();
  const text = 'Instead of: first question' + '\n\n' + 'urgent';
  assert.deepEqual(sent, [{text, model: 'a/m', mode: 'ask'}]);
  assert.deepEqual(h.render().items.map(item => item.prompt), ['later']);
});

test('a prompt the service did not start goes back to the front of the queue', async () => {
  const {env} = base();
  const h = mount({...env, send: async () => false});
  h.render();
  h.get().add('one');
  h.render();
  h.set({status: 'completed'});
  await tick();
  assert.deepEqual([...h.render().items.map(item => item.prompt)], ['one']);
});

test('the fourth prompt is refused with a notice', () => {
  const {env} = base();
  const h = mount(env);
  h.render();
  for (const text of ['a', 'b', 'c']) { h.get().add(text); h.render(); }
  assert.equal(h.get().full, true);
  assert.equal(h.get().add('d'), false);
  assert.match(h.render().notice, /Queue is full/);
});

const memoryStorage = (entries = []) => {
  const map = new Map(entries);
  return {getItem: key => map.get(key) ?? null, setItem: (key, value) => map.set(key, value),
    removeItem: key => map.delete(key), map};
};

test('send now never answers a question or skips a pending approval', async () => {
  for (const status of ['needs_input', 'awaiting_approval']) {
    const {env, sent} = base();
    const stops = [];
    const h = mount({...env, stop: async () => { stops.push(1); return true; }});
    h.render();
    h.get().add('held');
    h.render();
    h.set({status});
    assert.equal(h.get().canSendNow, false, status);
    await h.get().sendNow({id: h.get().items[0].id});
    await h.get().sendNow({text: 'typed'});
    await tick();
    assert.equal(sent.length, 0, status);
    assert.equal(stops.length, 0, status);
    assert.deepEqual(h.render().items.map(item => item.prompt), ['held']);
  }
  const {env, sent} = base();
  const h = mount(env);
  h.render();
  h.get().add('retry me');
  h.render();
  h.set({status: 'failed'});
  assert.equal(h.get().canSendNow, true);
  await h.get().sendNow({id: h.get().items[0].id});
  assert.deepEqual(sent.map(row => row.text), ['retry me']);
});

test('a send that fails after a chat switch puts the prompt back in its own task', async () => {
  const {env} = base();
  let finish;
  const h = mount({...env, send: () => new Promise(resolve => { finish = resolve; })});
  h.render();
  h.get().add('mine');
  h.render();
  h.set({status: 'completed'});
  await tick();
  assert.equal(typeof finish, 'function');
  h.set({taskId: 't2', status: 'completed'});
  finish(false);
  await tick();
  assert.equal(h.render().items.length, 0);
  assert.deepEqual([...h.set({taskId: 't1'}).items.map(item => item.prompt)], ['mine']);
});

test('a refused stop clears Stopping and keeps the prompt without a steer line', async () => {
  const {env, sent} = base();
  const h = mount({...env, stop: async () => false});
  h.render();
  await h.get().sendNow({text: 'urgent'});
  assert.equal(h.render().stopping, false);
  assert.match(h.get().notice, /could not be stopped/);
  h.set({status: 'completed'});
  await tick();
  assert.deepEqual(sent.map(row => row.text), ['urgent']);
});

test('a turn that completes before the stop sends the prompt without Instead of', async () => {
  const {env, sent} = base();
  let finishStop;
  const h = mount({...env, stop: () => new Promise(resolve => { finishStop = resolve; })});
  h.render();
  const pending = h.get().sendNow({text: 'urgent'});
  h.render();
  h.set({status: 'completed'});
  await tick();
  finishStop(false);
  await pending;
  assert.deepEqual(sent.map(row => row.text), ['urgent']);
  assert.equal(h.render().stopping, false);
  assert.equal(h.get().notice, '');
});

test('a stop that never ends resets Stopping after the timeout and keeps the prompt', async () => {
  const {env, sent} = base();
  const timers = [];
  const h = mount(env, {setTimeout: (fn, ms) => { timers.push({fn, ms}); return timers.length; }});
  h.render();
  await h.get().sendNow({text: 'urgent'});
  assert.equal(h.render().stopping, true);
  assert.ok(timers.length && timers.every(timer => timer.ms >= 30000));
  timers.forEach(timer => timer.fn());
  assert.equal(h.render().stopping, false);
  assert.match(h.get().notice, /did not stop/);
  h.set({status: 'cancelled'});
  await tick();
  assert.equal(sent.length, 0);
  assert.equal(h.render().paused, 'status');
});

test('a duplicated tab never sends the same queued prompt twice', async () => {
  const local = memoryStorage();
  const first = base(), session = memoryStorage();
  const a = mount(first.env, {sessionStorage: session, localStorage: local});
  a.render();
  a.get().add('once');
  a.render();
  const second = base();
  const copy = memoryStorage(session.map);
  const b = mount(second.env, {sessionStorage: copy, localStorage: local});
  assert.equal(b.render().items.length, 1);
  a.set({status: 'completed'});
  b.set({status: 'completed'});
  await tick();
  await tick();
  assert.equal(first.sent.length + second.sent.length, 1);
  assert.equal(b.render().items.length, 0);
});
