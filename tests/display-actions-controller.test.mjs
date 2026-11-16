import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import * as turns from '../src/lib/conversation-turns.mjs';
import * as registry from '../src/lib/display-actions.mjs';

const hash = 'c'.repeat(64);
const completion = {
  status: 'completed', taskId: 'task-1', turnId: 'turn-2', answerHash: hash, completionSequence: 9,
};
const wrap = items => ({
  schemaVersion: 1, kind: 'display-actions', answerHash: hash, taskId: 'task-1', turnId: 'turn-2',
  items,
});
const open = {action: 'open_work_area', section: 'activity'};
const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

// Minimal hook runtime: state and refs persist across renders; effects are not needed
// (offer is called directly).
function mount(hostChanges = {}, document = {}) {
  const slots = []; let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = initial;
      return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= {current: initial}; },
    useCallback: fn => fn, useEffect() {},
  };
  const exports = {};
  const options = {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022,
  };
  const code = ts.transpileModule(source('../src/components/workspace/display-actions.tsx'),
    {compilerOptions: options}).outputText;
  const modules = {
    'react': react, 'react/jsx-runtime': jsx,
    '@/lib/conversation-turns.mjs': turns, '@/lib/display-actions.mjs': registry,
  };
  const require = name => modules[name] ?? {};
  runInNewContext(code, {exports, document, CSS: {escape: value => value}, require});
  const host = {
    enabled: true, scope: {key: 'task-1', epoch: 1}, captured: {key: 'task-1', epoch: 1},
    split: true, live: true, composerEmpty: true,
    view: {section: 'design', workAreaOpen: null, workspacePane: 'chat'}, calls: [], ...hostChanges,
  };
  const render = () => {
    cursor = 0;
    return exports.useDisplayActions({
      enabled: host.enabled, scopeNow: () => ({...host.scope}),
      liveScope: (...args) => host.record ? registry.liveScopeFor(host.record, ...args)
        : host.live && args.at(-1) ? {...host.captured} : null,
      split: host.split, view: {...host.view}, composerEmpty: host.composerEmpty,
      openSection: section => {
        host.calls.push(['open', section]);
        host.view = {section, workAreaOpen: true, workspacePane: 'drawing'};
      },
      restoreView: fields => {
        host.calls.push(['restore', fields]); host.view = {...host.view, ...fields};
      },
    });
  };
  return {host, render};
}
const offer = (api, value, changes = {}) => api.offer({
  taskId: 'task-1', turnId: 'turn-2', completion, value, last: true, turnIds: ['turn-1', 'turn-2'],
  ...changes,
});
const rowsOf = api => api.rows('task-1', 'turn-2');
const texts = api => Array.from(rowsOf(api), row => row.text);
const restoredChat = ['restore', {section: 'design', workAreaOpen: null, workspacePane: 'chat'}];

// @lat: [[contracts#Hosted contract tests#Frontend context and display actions]]
test(
  'a live answer applies open_work_area once through the existing setter and Undo restores it',
  () => {
  const m = mount(); let api = m.render();
  offer(api, wrap([open])); offer(api, wrap([open]));
  api = m.render();
  assert.deepEqual(m.host.calls, [['open', 'activity']], 'applied exactly once');
  assert.deepEqual(texts(api), ['Opened Activity']);
  const [row] = rowsOf(api);
  assert.equal(row.button.label, 'Undo'); assert.equal(row.button.disabled, false);
  row.button.onClick(); api = m.render();
  assert.deepEqual(m.host.calls.at(-1), restoredChat);
  assert.deepEqual(texts(api), ['Undone']);
  assert.equal(rowsOf(api)[0].button, undefined, 'one level only');
});

test('Undo is disabled with a reason once the user changed the target', () => {
  const m = mount(); let api = m.render(); offer(api, wrap([open])); api = m.render();
  m.host.view = {...m.host.view, section: 'assets'}; api = m.render();
  const [row] = rowsOf(api);
  assert.equal(row.button.disabled, true); assert.equal(row.button.note, 'View changed since');
  row.button.onClick(); api = m.render();
  assert.equal(m.host.calls.some(call => call[0] === 'restore'), false);
  assert.deepEqual(texts(api), ['Opened Activity']);
});

test('a changed scope epoch denies the action before it applies and disables a later Undo', () => {
  const stale = mount({scope: {key: 'task-1', epoch: 2}}); let api = stale.render();
  offer(api, wrap([open])); api = stale.render();
  assert.deepEqual(stale.host.calls, []);
  assert.deepEqual(texts(api), ['Not applied: view changed']);
  const later = mount(); api = later.render(); offer(api, wrap([open]));
  later.host.scope = {key: 'task-1', epoch: 2}; api = later.render();
  assert.equal(rowsOf(api)[0].button.disabled, true);
});

test('history and reload only list inert offers and never apply or add a button', () => {
  const m = mount({live: false}); let api = m.render();
  offer(api, wrap([open, {action: 'suggest_followup', text: 'Next'}])); api = m.render();
  assert.deepEqual(m.host.calls, []); assert.equal(api.placeholder, null);
  assert.deepEqual(texts(api), ['Offered: open Activity', 'Offered: suggest a follow-up']);
  assert.ok(rowsOf(api).every(row => row.button === undefined));
  const older = mount();
  api = older.render();
  offer(api, wrap([open]), {last: false});
  api = older.render();
  assert.deepEqual(older.host.calls, [], 'an earlier turn is history even in the live session');
});

test(
  'below 1,180 px open_work_area is offered, applies on one click, and can then be undone',
  () => {
  const m = mount({split: false}); let api = m.render(); offer(api, wrap([open])); api = m.render();
  assert.deepEqual(m.host.calls, []);
  assert.deepEqual(texts(api), ['Offered: open Activity (narrow screen)']);
  rowsOf(api)[0].button.onClick(); api = m.render();
  assert.deepEqual(m.host.calls, [['open', 'activity']]);
  assert.deepEqual(texts(api), ['Opened Activity']);
  rowsOf(api)[0].button.onClick(); api = m.render();
  assert.deepEqual(m.host.calls.at(-1), restoredChat);
});

test(
  'expand_process uses the lifted state, Undo collapses it, and a manual toggle blocks Undo',
  () => {
  const m = mount(); let api = m.render();
  offer(api, wrap([{action: 'expand_process', turnId: 'turn-1'}])); api = m.render();
  assert.equal(api.processOpen('task-1', 'turn-1'), true);
  assert.deepEqual(texts(api), ['Expanded process details']);
  rowsOf(api)[0].button.onClick(); api = m.render();
  assert.equal(api.processOpen('task-1', 'turn-1'), false);
  assert.deepEqual(texts(api), ['Undone']);
  const manual = mount(); api = manual.render();
  offer(api, wrap([{action: 'expand_process', turnId: 'turn-1'}])); api = manual.render();
  api.setProcessOpen('task-1', 'turn-1', false); api = manual.render();
  assert.equal(rowsOf(api)[0].button.disabled, true);
});

test(
  'suggest_followup is placeholder text only: empty composer, never a draft, typing replaces it',
  () => {
  const m = mount(); let api = m.render();
  offer(api, wrap([{action: 'suggest_followup', text: 'Compare the areas'}])); api = m.render();
  assert.equal(api.placeholder, 'Compare the areas');
  assert.deepEqual(texts(api), ['Suggested a follow-up in the message box']);
  assert.deepEqual(m.host.calls, [], 'no setter is called, so no draft is written');
  rowsOf(api)[0].button.onClick(); api = m.render();
  assert.equal(api.placeholder, null); assert.deepEqual(texts(api), ['Undone']);
  const typed = mount(); api = typed.render();
  offer(api, wrap([{action: 'suggest_followup', text: 'Next'}])); api = typed.render();
  api.dismissPlaceholder(); api = typed.render();
  assert.equal(api.placeholder, null); assert.equal(rowsOf(api)[0].button.disabled, true);
  const busy = mount({composerEmpty: false}); api = busy.render();
  offer(api, wrap([{action: 'suggest_followup', text: 'Next'}])); api = busy.render();
  assert.equal(api.placeholder, null);
  assert.deepEqual(texts(api), ['Not applied: the message box has text']);
});

test('scroll_to_turn scrolls through the anchor and Undo restores the scroll position', () => {
  const viewport = {scrollTop: 480};
  const target = {closest: () => viewport, scrollIntoView() { viewport.scrollTop = 0; }};
  const query = {querySelector: selector => selector.includes('data-turn-id') ? target : viewport};
  const m = mount({}, query);
  let api = m.render();
  offer(api, wrap([{action: 'scroll_to_turn', turnId: 'turn-1'}])); api = m.render();
  assert.equal(viewport.scrollTop, 0);
  assert.deepEqual(texts(api), ['Scrolled to an earlier turn']);
  rowsOf(api)[0].button.onClick(); api = m.render();
  assert.equal(viewport.scrollTop, 480); assert.deepEqual(texts(api), ['Undone']);
  viewport.scrollTop = 0;
  const moved = mount({}, query);
  api = moved.render(); viewport.scrollTop = 480;
  offer(api, wrap([{action: 'scroll_to_turn', turnId: 'turn-1'}])); api = moved.render();
  viewport.scrollTop = 200; api = moved.render();
  assert.equal(rowsOf(api)[0].button.disabled, true, 'the user scrolled since');
});

test(
  'unknown, unbound, foreign-turn and flag-off actions never apply; unknown, unbound unlisted',
  () => {
  const calls = [];
  for (const [value, changes, expected] of [
    [wrap([{action: 'send_message', text: 'x'}]), {}, []],
    [{...wrap([open]), taskId: 'other'}, {}, []],
    [wrap([{action: 'expand_process', turnId: 'turn-9'}]), {},
      ['Not applied: that turn is not shown']],
    [wrap([open]), {enabled: false}, []],
  ]) {
    const m = mount(changes); let api = m.render(); offer(api, value); api = m.render();
    assert.deepEqual(m.host.calls, [], JSON.stringify(value));
    assert.deepEqual(texts(api), expected);
    calls.push(...m.host.calls);
    assert.equal(api.processOpen('task-1', 'turn-9'), false);
  }
  assert.deepEqual(calls, []);
});

test(
  'narrow: after the one-click open the user returns to chat; Undo restores and returns to chat',
  () => {
  const m = mount({split: false}); let api = m.render(); offer(api, wrap([open])); api = m.render();
  rowsOf(api)[0].button.onClick(); api = m.render();
  assert.equal(m.host.view.workspacePane, 'drawing');
  m.host.view = {...m.host.view, workspacePane: 'chat'}; api = m.render();
  const [row] = rowsOf(api);
  assert.equal(row.button.disabled, false, 'returning to chat is not a view change');
  row.button.onClick(); api = m.render();
  assert.deepEqual(m.host.calls.at(-1), restoredChat);
  assert.deepEqual(texts(api), ['Undone']);
  const again = mount({split: false});
  api = again.render();
  offer(api, wrap([open]));
  api = again.render();
  rowsOf(api)[0].button.onClick(); api = again.render();
  again.host.view = {...again.host.view, section: 'assets', workspacePane: 'chat'};
  api = again.render();
  assert.equal(rowsOf(api)[0].button.disabled, true, 'a changed section still blocks');
});

test(
  'only the turn this browser submitted is live: a later turn from another device never applies',
  () => {
  const record = {key: 'turn-1', taskId: 'task-1', scope: {key: 'task-1', epoch: 1},
    submission: {startCursor: 3}};
  const other = mount({record});
  let api = other.render();
  offer(api, wrap([open]));
  api = other.render();
  assert.deepEqual(other.host.calls, []); assert.deepEqual(texts(api), ['Offered: open Activity']);
  const own = mount({record: {...record, key: 'turn-2'}});
  api = own.render();
  offer(api, wrap([open]));
  assert.deepEqual(own.host.calls, [['open', 'activity']]);
});

test('the lifted process disclosure is keyed by scope epoch, so switching chats resets it', () => {
  const m = mount(); let api = m.render();
  api.setProcessOpen('task-1', 'turn-1', true); api = m.render();
  assert.equal(api.processOpen('task-1', 'turn-1'), true);
  m.host.scope = {key: 'task-1', epoch: 2}; api = m.render();
  assert.equal(api.processOpen('task-1', 'turn-1'), false);
});

test('rows announce only what this session applied or undid, never history offers', () => {
  const history = mount({live: false}); let api = history.render(); offer(api, wrap([open]));
  api = history.render();
  assert.equal(rowsOf(api)[0].announce, false);
  const m = mount(); api = m.render(); offer(api, wrap([open])); api = m.render();
  assert.equal(rowsOf(api)[0].announce, true);
  rowsOf(api)[0].button.onClick(); api = m.render();
  assert.equal(rowsOf(api)[0].announce, true);
  // A live narrow-screen offer is announced; the same offer from history is not.
  const narrow = mount({split: false}); api = narrow.render(); offer(api, wrap([open]));
  api = narrow.render();
  assert.equal(rowsOf(api)[0].announce, true);
});

test(
  'scroll Undo reads and restores the viewport captured at apply, not another transcript',
  () => {
  const captured = {scrollTop: 480}, other = {scrollTop: 999};
  const target = {closest: () => captured, scrollIntoView() { captured.scrollTop = 0; }};
  const querySelector = selector => selector.includes('data-turn-id') ? target : other;
  const m = mount({}, {querySelector});
  let api = m.render();
  offer(api, wrap([{action: 'scroll_to_turn', turnId: 'turn-1'}])); api = m.render();
  const [row] = rowsOf(api);
  assert.equal(row.button.disabled, false);
  row.button.onClick(); api = m.render();
  assert.equal(captured.scrollTop, 480); assert.equal(other.scrollTop, 999);
});

test('workspace wiring: the liveScope rule, flag helper and placeholder dismissal', () => {
  const read = path => source(`../src/components/${path}`);
  const workspace = read('workspace.tsx'), state = read('workspace/use-workspace-state.ts');
  assert.match(workspace,
    /liveScope: \(\.\.\.args\) => liveScopeFor\(w\.liveSubmission\.current, \.\.\.args\)/);
  for (const text of [workspace, state]) {
    assert.doesNotMatch(text, /features\.(?:frontendContext|displayActions)\s*===\s*'on'/);
  }
  assert.match(workspace, /submit=\{[^}]*dismissPlaceholder\(\)/);
  assert.match(workspace, /replyToQuestion=\{[^}]*dismissPlaceholder\(\)/);
  const conversation = read('workspace/conversation.tsx');
  assert.match(conversation, /props\.displayActions\?\.enabled && turn\.turnId \? \{/,
    'the disclosure is lifted only while display actions are on');
});
