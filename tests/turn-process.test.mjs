import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as processActivity from '../src/lib/process-activity.mjs';
import * as nesting from '../src/lib/turn-nesting.mjs';

const compile = path => ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;

function harness() {
  const slots = [];
  let cursor = 0;
  const hooks = { ...React, useState(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }];
  } };
  const icons = new Proxy({}, { get: (_, name) => `icon-${String(name)}` });
  const activity = {};
  const requireModule = name => {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return jsxRuntime;
    if (name === 'radix-ui') return { Collapsible: { Root: 'disclosure', Trigger: 'disclosure-trigger', Content: 'disclosure-content' } };
    if (name === 'lucide-react') return icons;
    if (name === '@/lib/process-activity.mjs') return processActivity;
    if (name === '@/lib/turn-nesting.mjs') return nesting;
    if (name === '../agent-activity') return activity;
    if (name.endsWith('.module.css')) return { default: new Proxy({}, { get: (_, key) => key }) };
    return new Proxy({}, { get: (_, key) => String(key) });
  };
  // Exercise the repository's actual batching implementation alongside its data helpers.
  runInNewContext(compile('../src/components/agent-activity.tsx'), { exports: activity, require: requireModule });
  const exports = {};
  runInNewContext(compile('../src/components/workspace/turn-process.tsx'), { exports, require: requireModule });
  return { exports, render(props) { cursor = 0; return expand(exports.TurnProcess(props)); } };
}

const expand = node => Array.isArray(node) ? node.map(expand) : !node || typeof node !== 'object' ? node :
  typeof node.type === 'function' ? expand(node.type(node.props)) : { ...node, props: { ...node.props, children: expand(node.props.children) } };
const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node && typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
const content = node => Array.isArray(node) ? node.map(content).join('') : node == null || typeof node === 'boolean' ? '' : typeof node === 'object' ? content(node.props?.children) : String(node);
const root = tree => flatten(tree).find(node => node.type === 'disclosure' && 'open' in node.props);
const header = tree => root(tree).props.children.find(node => node?.type === 'disclosure-trigger');
const props = overrides => ({ events: [], active: false, waiting: false, ...overrides });
const event = (index, stage, overrides = {}) => ({ index, eventId: `event-${index}`, stage, detail: 'Calling datumm_revit_get_rooms', at: `2026-11-12T10:00:0${index}Z`, ...overrides });
const call = overrides => ({ callId: 'call-1', tool: 'datumm_revit_get_rooms', status: 'completed', ...overrides });
const manifest = overrides => ({ taskId: 'task-1', model: 'recorded-model', mode: 'ask', state: 'completed', children: [], ...overrides });

test('empty turns stay absent, while lifecycle-only and evidence-only turns remain truthful', () => {
  const h = harness();
  assert.equal(h.exports.turnProcessVisible(props()), false);
  assert.equal(h.render(props()), null);
  for (const value of [props({ active: true, status: 'running' }), props({ waiting: true }), props({ status: 'failed' }), props({ evidence: [call()] })]) {
    assert.equal(h.exports.turnProcessVisible(value), true);
    assert.ok(root(h.render(value)));
  }
  const empty = content(h.render(props({ status: 'completed' })));
  assert.ok(empty.includes('Activity details are unavailable'));
  assert.ok(!empty.includes('0 steps'));
  assert.ok(!empty.includes('DATUMM'));
  const evidence = content(h.render(props({ evidence: [call()] })));
  assert.ok(evidence.includes('get rooms'));
  assert.ok(evidence.includes('Native verification is shown separately'));
  assert.ok(!evidence.includes('Verified'));
});

test('disclosure choice persists through new events, waiting and authoritative completion', () => {
  const h = harness(), value = props({ active: true, status: 'running' });
  assert.equal(root(h.render(value)).props.open, false);
  root(h.render(value)).props.onOpenChange(true);
  assert.equal(root(h.render({ ...value, events: [event(1, 'tool_running')] })).props.open, true);
  assert.equal(root(h.render({ ...value, waiting: true, status: 'needs_input' })).props.open, true);
  root(h.render(value)).props.onOpenChange(false);
  assert.equal(root(h.render({ ...value, events: [event(1, 'tool_running'), event(2, 'tool_completed')] })).props.open, false);
  assert.equal(root(h.render(props({ status: 'completed' }))).props.open, false);
  root(h.render(value)).props.onOpenChange(true);
  assert.equal(root(h.render(props({ status: 'completed' }))).props.open, true);
});

test('summary uses lifecycle authority and distinguishes requested stop, stale and unknown state', () => {
  const h = harness();
  const cases = [
    ['queued', 'Queued'], ['needs_input', 'Waiting for your input'], ['awaiting_approval', 'Waiting for approval'],
    ['cancel_requested', 'Stop requested'], ['cancelling', 'Stop requested'], ['cancelled', 'Stopped'],
    ['failed', 'Failed'], ['blocked', 'Blocked'], ['partial', 'Partially complete'], ['stale', 'Source changed'],
    ['disconnected', 'Updates unavailable'], ['reconnecting', 'Refreshing activity'], ['unavailable', 'Activity unavailable'],
    ['unexpected_backend_state', 'Status unavailable'],
  ];
  for (const [status, expected] of cases) {
    const tree = h.render(props({ status, active: true }));
    assert.ok(content(header(tree)).startsWith(expected), status);
    assert.ok(!content(header(tree)).includes('Working'), status);
  }
  assert.ok(content(header(h.render(props({ active: true, waiting: true, status: 'failed' })))).startsWith('Failed'));
  assert.ok(content(header(h.render(props({ active: true, waiting: true, status: 'awaiting_approval' })))).startsWith('Waiting for approval'));
  for (const [status, expected] of [
    ['paused_limit', 'Paused at task limit'], ['paused_recovery', 'Recovery required'],
    ['partial', 'Partially complete'], ['stale', 'Source changed'], ['blocked', 'Blocked'], ['error', 'Failed'],
  ]) {
    const settled = h.render(props({ status, active: true, waiting: true, events: [event(1, 'tool_running')] }));
    assert.ok(content(header(settled)).startsWith(expected), status);
    assert.ok(!content(settled).includes('Review the question or approval'), status);
    assert.ok(content(settled).includes('Not confirmed'), status);
    assert.ok(!flatten(settled).some(node => node.type === 'icon-Loader2'), status);
  }
});

test('duration uses finite recorded values or labeled event estimates, never invalid numbers or a clock', () => {
  const h = harness();
  for (const elapsedMs of [NaN, Infinity, -50]) {
    const tree = h.render(props({ status: 'completed', manifest: manifest({ elapsedMs }) }));
    assert.ok(!content(header(tree)).includes(' s'));
  }
  const invalid = h.render(props({ status: 'completed', events: [event(1, 'agent_stage_start', { at: 'invalid' }), event(2, 'agent_stage_complete', { at: '' })] }));
  assert.ok(!content(header(invalid)).includes(' s'));
  const estimate = h.render(props({ status: 'completed', events: [event(1, 'agent_stage_start'), event(4, 'agent_stage_complete'), event(6, 'answer', { at: 'invalid' })] }));
  assert.ok(content(header(estimate)).includes('≈ 3 s'));
  const measured = h.render(props({ status: 'completed', manifest: manifest({ elapsedMs: 2200 }) }));
  assert.ok(content(header(measured)).includes('2 s'));
  assert.ok(!content(header(measured)).includes('≈'));
});

test('failed tools and unfinished calls remain visible after the task settles', () => {
  const h = harness();
  const failed = h.render(props({ status: 'completed', events: [event(1, 'tool_running', { callId: 'call-1' }), event(2, 'tool_failed', { callId: 'call-1' })] }));
  assert.ok(content(header(failed)).startsWith('Completed'));
  assert.ok(content(header(failed)).includes('Recorded work failed'));
  const uncertain = h.render(props({ status: 'completed', events: [event(1, 'tool_running')] }));
  assert.ok(content(header(uncertain)).includes('Some work unconfirmed'));
  assert.ok(content(uncertain).includes('Not confirmed'));
  const contradictory = h.render(props({ active: true, waiting: true, status: 'failed', events: [event(1, 'tool_running')] }));
  assert.ok(content(contradictory).includes('Not confirmed'));
  assert.ok(!flatten(contradictory).some(node => node.type === 'icon-Loader2'));
});

test('recorded participants and sources use supplied identity, without exposing raw tool evidence', () => {
  const h = harness();
  const tree = h.render(props({ status: 'completed', manifest: manifest({ children: [{ sessionId: 'worker-a', role: 'cost_reviewer', state: 'completed' }] }), evidence: [call({ sessionId: 'worker-a', arguments: { secret: 'RAW_ARGUMENT' }, result: 'RAW_RESULT' })] }));
  const text = content(tree);
  assert.ok(text.includes('cost reviewer'));
  assert.ok(text.includes('get rooms'));
  assert.ok(!text.includes('RAW_ARGUMENT'));
  assert.ok(!text.includes('RAW_RESULT'));
  const nested = h.render(props({ status: 'completed', events: [event(1, 'tool_completed', { parentStepId: 'rooms', agent: { id: 'agent-a', name: 'Recorded reviewer' } })] }));
  assert.ok(content(nested).includes('Recorded reviewer'));
  const unnamed = h.render(props({ status: 'completed', events: [event(1, 'tool_completed', { parentStepId: 'rooms' })] }));
  assert.ok(!content(unnamed).includes('DATUMM'));
  const idOnly = h.render(props({ status: 'completed', events: [event(1, 'tool_completed', { parentStepId: 'rooms', agent: { id: 'only-id' } })] }));
  assert.ok(content(idOnly).includes('Recorded participant'));
  assert.ok(!content(idOnly).includes('DATUMM'));
});

test('event and evidence duplicates use established identities, and checklist is never worker evidence', () => {
  const h = harness(), toolEvent = event(1, 'tool_completed', { callId: 'call-1' });
  const tree = h.render(props({ status: 'completed', events: [toolEvent, { ...toolEvent }], evidence: [call(), call()] }));
  assert.equal(flatten(tree).filter(node => node.type === 'li' && content(node).includes('get rooms')).length, 1);
  const participant = h.render(props({ status: 'completed', events: [toolEvent], manifest: manifest({ children: [{ sessionId: 'worker-a', role: 'cost_reviewer', state: 'completed' }] }), evidence: [call({ sessionId: 'worker-a' })] }));
  assert.equal(flatten(participant).filter(node => node.type === 'li' && content(node).includes('get rooms')).length, 1);
  const scheduler = h.render(props({ status: 'running', active: true, scheduler: { steps: [{ stepId: 'check_dimensions', status: 'running' }, { stepId: 'future', status: 'pending' }] } }));
  assert.ok(content(scheduler).includes('Scheduler checklist'));
  assert.ok(content(scheduler).includes('Checklist states do not confirm that a worker ran'));
  assert.ok(!content(scheduler).includes('future'));
});
