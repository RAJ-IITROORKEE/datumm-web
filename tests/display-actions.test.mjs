import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {conversationTurns} from '../src/lib/conversation-turns.mjs';
import {
  acceptSuggestion, captureUndo, describeAction, liveScopeFor, parseDisplayActions, undoStatus,
  validateDisplayActions, validateDisplayItems,
} from '../src/lib/display-actions.mjs';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const vectors = JSON.parse(read('./fixtures/display-action-vectors.json'));
const hash = 'a'.repeat(64);
const scope = {key: 'task-a', epoch: 3};
const completion = {status: 'completed', taskId: 'task-1', turnId: 'turn-0002', answerHash: hash};
const wrap = (items, changes = {}) => ({
  schemaVersion: 1, kind: 'display-actions', answerHash: hash, taskId: 'task-1',
  turnId: 'turn-0002', items, ...changes,
});
const context = (changes = {}) => ({
  taskId: 'task-1', turnId: 'turn-0002', answerHash: hash, completion, scope, liveScope: scope,
  turnIds: ['turn-0001', 'turn-0002'], live: true, ...changes,
});
const open = {action: 'open_work_area', section: 'activity'};
const chr = code => String.fromCharCode(code);
const validate = (value, changes) => validateDisplayActions(value, context(changes));

// @lat: [[contracts#Hosted contract tests#Frontend context and display actions]]
test('shared display-action vectors agree with the web item validator', () => {
  assert.ok(vectors.length >= 20);
  for (const row of vectors) {
    const result = validateDisplayItems(row.actions, row.turnIds);
    assert.equal(result !== null, row.valid, row.name);
    if (row.valid) assert.deepEqual(result, row.actions, row.name);
  }
});

test('a valid, bound, live, same-scope answer yields its actions', () => {
  assert.deepEqual(validate(wrap([open])), {actions: [open]});
  assert.deepEqual(validate(undefined), {actions: []});
});

test(
  'unknown actions, extra keys, empty or oversized lists and a malformed object are unknown',
  () => {
  for (const value of [
    wrap([{action: 'send_message', text: 'x'}]), wrap([open, open]), wrap([]),
    wrap([open], {extra: 1}),
    [open], 'open', wrap([{...open, url: 'https://x.test'}]),
  ]) {
    assert.deepEqual(validate(value), {denied: 'unknown'});
  }
  const three = [
    open, {action: 'expand_process', turnId: 't'}, {action: 'scroll_to_turn', turnId: 't'},
  ];
  assert.equal(parseDisplayActions(three), null);
});

test('identity or proof mismatches are unbound and carry no actions', () => {
  const otherHash = 'b'.repeat(64);
  for (const [value, changes] of [
    [wrap([open], {taskId: 'other'}), {}], [wrap([open], {turnId: 'turn-0001'}), {}],
    [wrap([open], {answerHash: otherHash}), {}],
    [wrap([open], {schemaVersion: 2}), {}], [wrap([open], {kind: 'composition'}), {}],
    [wrap([open]), {completion: null}],
    [wrap([open]), {completion: {...completion, status: 'failed'}}],
    [wrap([open]), {completion: {...completion, answerHash: otherHash}}],
    [wrap([open]), {taskId: 'other'}],
  ]) assert.deepEqual(validate(value, changes), {denied: 'unbound'});
});

test(
  'history never applies; a changed scope key or epoch is stale; a foreign turn is missing',
  () => {
  assert.deepEqual(validate(wrap([open]), {live: false}), {denied: 'history', actions: [open]});
  assert.equal(validate(wrap([open]), {scope: null, live: false}).denied, 'history');
  const stale = {denied: 'stale', actions: [open]};
  assert.deepEqual(validate(wrap([open]), {liveScope: {key: 'task-b', epoch: 3}}), stale);
  assert.deepEqual(validate(wrap([open]), {liveScope: {key: 'task-a', epoch: 4}}), stale);
  const foreign = {action: 'scroll_to_turn', turnId: 'turn-9999'};
  assert.deepEqual(validate(wrap([foreign])), {denied: 'missing_target', actions: [foreign]});
});

test('suggest_followup is plain one-line text only', () => {
  const ok = text => validateDisplayItems([{action: 'suggest_followup', text}], []) !== null;
  assert.equal(ok('Compare the two alternatives'), true);
  const bad = [
    '', ' lead', 'trail ', 'a\nb', 'a' + chr(0x85) + 'b', 'a' + chr(0x2028) + 'b', '<b>x</b>',
    'use `code`', '[x](http://y.test)', 'Viewport annotation: {}', 'VIEWPORT CONTEXT: x',
    'x'.repeat(161),
  ];
  for (const text of bad) assert.equal(ok(text), false, JSON.stringify(text));
  assert.equal(ok('x'.repeat(160)), true);
});

test('undo restores only what each action changed, and only while the applied value holds', () => {
  const cases = [
    [open, {section: 'design', workAreaOpen: null, workspacePane: 'chat'},
      {section: 'activity', workAreaOpen: true, workspacePane: 'drawing'}, {section: 'design'}],
    [{action: 'expand_process', turnId: 't'}, {processOpen: false}, {processOpen: true},
      {processOpen: false}],
    [{action: 'scroll_to_turn', turnId: 't'}, {scrollTop: 480}, {scrollTop: 0}, {scrollTop: 500}],
    [{action: 'suggest_followup', text: 'Next'}, {placeholder: null}, {placeholder: 'Next'},
      {placeholder: null}],
  ];
  const changed = {ok: false, reason: 'view_changed'};
  for (const [action, before, after, userChange] of cases) {
    const record = captureUndo(action, before, after, scope);
    assert.equal(record.noop, false);
    assert.deepEqual(undoStatus(record, after, scope), {ok: true, restore: record.before});
    assert.deepEqual(undoStatus(record, {...after, ...userChange}, scope), changed, action.action);
    assert.deepEqual(undoStatus(record, after, {key: 'task-b', epoch: 3}), changed);
    assert.deepEqual(undoStatus(record, after, {key: 'task-a', epoch: 4}), changed);
  }
  assert.deepEqual(captureUndo(cases[0][0], cases[0][1], cases[0][2], scope).before, cases[0][1]);
  const expand = cases[1][0];
  const wider = {processOpen: false, section: 'design'};
  assert.deepEqual(captureUndo(expand, wider, {processOpen: true}, scope).before,
    {processOpen: false}, 'unrelated fields are not captured');
  assert.equal(captureUndo(expand, {processOpen: true}, {processOpen: true}, scope).noop, true);
  assert.equal(undoStatus(null, {}, scope).ok, false);
});

test('process rows use the public wording', () => {
  assert.equal(describeAction(open, 'applied'), 'Opened Activity');
  assert.equal(describeAction(open, 'offered', 'narrow'), 'Offered: open Activity (narrow screen)');
  assert.equal(describeAction(open, 'offered', 'history'), 'Offered: open Activity');
  assert.equal(describeAction(open, 'undone'), 'Undone');
  assert.equal(describeAction(open, 'skipped', 'stale'), 'Not applied: view changed');
  assert.equal(describeAction({action: 'scroll_to_turn', turnId: 't'}, 'skipped', 'missing_target'),
    'Not applied: that turn is not shown');
});

test(
  'the registry imports nothing, so no command, API or draft setter is reachable from it',
  () => {
  const source = read('../src/lib/display-actions.mjs');
  const forbidden = new RegExp(
    String.raw`^\s*import\b|\bimport\s*\(|\brequire\s*\(|\bfetch\b|\bsetPrompt\b|` +
    String.raw`\bsendMessage\b|\bpostHostedCommand\b|\bdocument\b|\bwindow\b`, 'm');
  assert.equal(forbidden.test(source), false);
});

test(
  'conversation turns carry presentation.actions and the turn anchor exists in the conversation',
  () => {
  const presentation = {actions: wrap([open])};
  const [turn] = conversationTurns([
    {prompt: 'Q', turnId: 'turn-2'}, {answer: 'A', turnId: 'turn-2', presentation, completion},
  ]);
  assert.deepEqual(turn.presentation.actions, wrap([open]));
  const conversation = read('../src/components/workspace/conversation.tsx');
  assert.match(conversation, /data-turn-id=\{turn\.turnId\}/);
  assert.match(conversation, /<DisplayActionsTurn /);
});

test('suggest_followup also rejects U+FEFF and Turkish I spellings of the markers', () => {
  const ok = text => validateDisplayItems([{action: 'suggest_followup', text}], []) !== null;
  for (const text of [
    'a' + chr(0xfeff) + 'b', chr(0xfeff) + 'Next', 'V' + chr(0x130) + 'EWPORT CONTEXT: x',
    'v' + chr(0x131) + 'ewport annotation: {}', 'viewport annotat' + chr(0x131) + 'on: {}',
  ]) {
    assert.equal(ok(text), false, JSON.stringify(text));
  }
  assert.equal(ok('Compare İstanbul and Diyarbakır'), true, 'ordinary Turkish text still passes');
});

test('liveScopeFor binds the live check to this browser\'s submission key', () => {
  const scope3 = {key: 'task-a', epoch: 3};
  const live = {key: 'turn-0002', taskId: 'task-1', scope: scope3, submission: {startCursor: 4}};
  assert.deepEqual(liveScopeFor(live, 'task-1', 'turn-0002', 5, true), scope3);
  const own = ['task-1', 'turn-0002', 5, true];
  for (const [value, args] of [
    [live, ['task-1', 'turn-0003', 5, true]], [live, ['task-2', 'turn-0002', 5, true]],
    [live, ['task-1', 'turn-0002', 4, true]], [live, ['task-1', 'turn-0002', 5, false]],
    [{...live, scope: null}, own], [null, own],
  ]) assert.equal(liveScopeFor(value, ...args), null, JSON.stringify(args));
});

test('acceptSuggestion fills only an empty or whitespace-only box', () => {
  assert.equal(acceptSuggestion('', 'Compare the two'), 'Compare the two');
  assert.equal(acceptSuggestion('  \n ', 'Compare the two'), 'Compare the two');
  assert.equal(acceptSuggestion('typed', 'Compare the two'), null);
  assert.equal(acceptSuggestion('', ''), null);
  assert.equal(acceptSuggestion('', null), null);
  assert.equal(acceptSuggestion(undefined, 'Compare the two'), 'Compare the two');
});
