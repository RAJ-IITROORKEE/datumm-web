import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import { deriveTodos } from '../src/lib/agent-todos.mjs';
import { stageSpans } from '../src/lib/turn-nesting.mjs';

const exports = {};
const unexpectedAction = () => { throw Error('Rendering activity must not invoke a task or native action'); };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/conversation.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require(name) {
  if (name === 'react/jsx-runtime') return jsx;
  if (name === '@/lib/utils') return { cn: (...values) => values.filter(Boolean).join(' ') };
  if (name === '@/lib/agent-todos.mjs') return { deriveTodos };
  if (name === '@/lib/turn-nesting.mjs') return { stageSpans };
  if (name === './use-workspace-state') return { api: unexpectedAction, terminal: new Set(['completed', 'failed', 'cancelled', 'interrupted']) };
  if (name === './turn-process') return { TurnProcess: 'turn-process', turnProcessVisible: () => true };
  return new Proxy({}, { get: (_, key) => String(key) });
} });

function elements(tree) {
  if (!React.isValidElement(tree)) return [];
  // Traverse the actual parent output without executing unrelated children.
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)];
}
const event = (index, stage = 'tool_running') => ({ index, stage, detail: 'Reading rooms', at: '2026-11-12T12:00:00Z' });
const task = (id, conversation = [{ prompt: 'Read rooms', answer: 'Saved answer' }]) => ({ id, title: id, status: 'completed', conversation, data: {} });
const props = (run, changes = {}) => ({ run, hasContent: true, traceTurns: [[event(0)]], savedTurns: [], messages: [], nativeQuestions: [], nativeTodos: [], savedSources: [], devices: [], verifiedNativeBatches: [], completedCriteria: [], previewRooms: [], connected: true, workspaceReady: true, mode: 'ask', ...changes });
const render = value => elements(exports.ConversationPanel(value));
const turnContainer = tree => tree.find(node => node.props.className === 'conversation-turn');
const process = tree => tree.find(node => node.type === 'turn-process');

test('real conversation mount preserves turn identity through updates and resets disclosure identity across tasks', () => {
  const first = render(props(task('task-a')));
  const refreshed = render(props(task('task-a'), { traceTurns: [[event(0), event(1, 'tool_completed')]] }));
  const switched = render(props(task('task-b')));
  assert.equal(turnContainer(first).key, turnContainer(refreshed).key, 'An event update must preserve the user disclosure choice');
  assert.notEqual(turnContainer(first).key, turnContainer(switched).key, 'React must remount the process subtree on a task switch');
  assert.equal(process(first).props.status, 'completed');
  assert.equal(process(switched).props.events[0].stage, 'tool_running');
});

test('actual parent binds each saved turn to its events and saved manifest while only the latest turn is active', () => {
  const run = task('task-a', [{ prompt: 'First', answer: 'First answer' }, { prompt: 'Second' }]);
  run.status = 'running';
  const firstManifest = { taskId: 'task-a', sessionId: 'first-session', children: [] };
  const latestManifest = { taskId: 'task-a', sessionId: 'latest-session', children: [] };
  run.data.run_manifest = latestManifest;
  const traceTurns = [[event(0, 'tool_failed')], [event(1)]];
  const tree = render(props(run, { executing: true, traceTurns, savedTurns: [{ conversationIndex: 0, result: { manifest: firstManifest, evidence: [] } }] }));
  const processes = tree.filter(node => node.type === 'turn-process');
  assert.equal(processes.length, 2);
  assert.equal(processes[0].props.events, traceTurns[0]);
  assert.equal(processes[0].props.manifest, firstManifest);
  assert.equal(processes[0].props.active, false);
  assert.equal(processes[1].props.events, traceTurns[1]);
  assert.equal(processes[1].props.manifest, latestManifest);
  assert.equal(processes[1].props.active, true);
  assert.notEqual(tree.filter(node => node.props.className === 'conversation-turn')[0].key, tree.filter(node => node.props.className === 'conversation-turn')[1].key);
});

test('transient streaming process identity stays stable for event updates and changes for a task or new turn', () => {
  const renderLive = (run, traceTurns) => process(render(props(run, { executing: true, traceTurns, messages: [{ id: 'user-message', role: 'user', parts: [{ type: 'text', text: 'Read rooms' }] }] })));
  const run = task('task-a', []);
  run.status = 'running';
  const first = renderLive(run, [[event(0)]]);
  const update = renderLive(run, [[event(0), event(1)]]);
  const nextTurn = renderLive(run, [[event(0)], [event(1)]]);
  const nextTask = renderLive({ ...run, id: 'task-b' }, [[event(0)]]);
  assert.ok(first);
  assert.equal(first.key, update.key);
  assert.notEqual(first.key, nextTurn.key);
  assert.notEqual(first.key, nextTask.key);
});
