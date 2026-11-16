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
    ['paused_limit', 'Paused at task limit'], ['paused_recovery', 'Task paused'],
    ['partial', 'Partially complete'], ['stale', 'Source changed'], ['blocked', 'Blocked'], ['error', 'Failed'],
  ]) {
    const settled = h.render(props({ status, active: true, waiting: true, events: [event(1, 'tool_running')] }));
    assert.ok(content(header(settled)).startsWith(expected), status);
    assert.ok(!content(settled).includes('Review the question or approval'), status);
    assert.ok(content(settled).includes('Not confirmed'), status);
    assert.ok(!flatten(settled).some(node => node.type === 'icon-Loader2'), status);
  }
});

test('duration uses only finite recorded values and never derives time from event spacing', () => {
  const h = harness();
  for (const elapsedMs of [NaN, Infinity, -50]) {
    const tree = h.render(props({ status: 'completed', manifest: manifest({ elapsedMs }) }));
    assert.ok(!content(header(tree)).includes(' s'));
  }
  const invalid = h.render(props({ status: 'completed', events: [event(1, 'agent_stage_start', { at: 'invalid' }), event(2, 'agent_stage_complete', { at: '' })] }));
  assert.ok(!content(header(invalid)).includes(' s'));
  const estimate = h.render(props({ status: 'completed', events: [event(1, 'agent_stage_start'), event(4, 'agent_stage_complete'), event(6, 'answer', { at: 'invalid' })] }));
  assert.ok(!content(header(estimate)).includes(' s'));
  const measured = h.render(props({ status: 'completed', manifest: manifest({ elapsedMs: 2200 }) }));
  assert.ok(content(header(measured)).includes('2 s'));
  assert.ok(!content(header(measured)).includes('≈'));
});

test('failed tools and unfinished calls remain visible after the task settles', () => {
  const h = harness();
  const failed = h.render(props({ status: 'completed', events: [event(1, 'tool_running', { callId: 'call-1', turnId: 'turn-1' }), event(2, 'tool_failed', { callId: 'call-1', turnId: 'turn-1' })] }));
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


test('compact tool rows use only the matching call recorded duration and remain collapsed without arguments',()=>{
 const h=harness();
 const tree=h.render(props({status:'completed',events:[event(1,'tool_completed',{callId:'call-1'})],evidence:[call({elapsedMs:1500,arguments:'PRIVATE_ARGS',result:'RAW_RESULT'}),call({callId:'other-call',tool:'datumm_revit_get_rooms',elapsedMs:7200})]}));
 assert.equal(root(tree).props.open,false);
 const rows=flatten(tree).filter(node=>node.type==='li'&&content(node).includes('get rooms'));
 assert.equal(rows.length,2);assert.ok(content(rows[0]).includes('2 s'));assert.ok(!content(rows[0]).includes('7 s'));assert.ok(content(rows[1]).includes('7 s'));
 assert.ok(!content(tree).includes('PRIVATE_ARGS'));assert.ok(!content(tree).includes('RAW_RESULT'));
 const unmatched=h.render(props({status:'completed',events:[event(1,'tool_completed')],evidence:[call({elapsedMs:1500})]}));
 const first=flatten(unmatched).find(node=>node.type==='li'&&content(node).includes('get rooms'));assert.ok(!content(first).includes(' s'),'A same-name call without identity must not borrow timing');
});

test('public actions replace generic stage wrappers and preserve repeated meaningful events', () => {
  const h = harness();
  const events = [
    event(1, 'agent_stage_start', { detail: 'Planning the next step' }),
    event(2, 'agent_action', { detail: 'capture_intent' }),
    event(3, 'agent_stage_complete'),
    event(4, 'agent_stage_start', { detail: 'Planning the next step' }),
    event(5, 'agent_action', { detail: 'finish_answer' }),
    event(6, 'agent_stage_complete'),
    event(7, 'agent_stage_start', { detail: 'Planning the next step' }),
    event(8, 'agent_action', { detail: 'finish_answer' }),
    event(9, 'agent_stage_complete'),
  ];
  const tree = h.render(props({ status: 'completed', events }));
  assert.ok(content(tree).includes('Capture request'));
  assert.equal(flatten(tree).filter(node => node.type === 'li' && content(node).includes('Prepare answer')).length, 2);
  assert.ok(!content(tree).includes('Planning the next step'));
  assert.ok(!content(tree).includes('DATUMM'));
});

test('repeated scoped actions group distinct attempts without hiding identities or outcomes',()=>{
 const h=harness(),phase=(n,executionId,activityId,complete=true)=>[
  event(n,'agent_stage_start',{detail:'Planning the next step'}),
  event(n+1,'agent_action',{detail:'capture_intent',taskId:'task',turnId:'turn',executionId,activityId}),
  ...(complete?[event(n+2,'agent_stage_complete',{taskId:'task',turnId:'turn',executionId,activityId,controlOutcome:'success'})]:[]),
 ];
 const tree=h.render(props({status:'completed',events:[...phase(1,'exec-a','attempt-a'),...phase(4,'exec-b','attempt-b',false)]}));
 const group=flatten(tree).find(node=>node.type==='disclosure-trigger'&&content(node).includes('Capture request')&&content(node).includes('2'));
 assert.ok(group);const text=content(tree);assert.ok(text.includes('execution exec-a · activity attempt-a'));assert.ok(text.includes('execution exec-b · activity attempt-b'));assert.ok(text.includes('Not confirmed'));
 const foreign=h.render(props({status:'completed',events:[...phase(1,'exec-a','attempt-a'),...phase(4,'exec-b','attempt-b').map(row=>({...row,turnId:row.turnId?'other':undefined}))]}));
 assert.equal(flatten(foreign).filter(node=>node.type==='disclosure-trigger'&&content(node).includes('Capture request')&&content(node).includes('2')).length,0);
 const duplicate=h.render(props({status:'completed',events:[...phase(1,'exec-a','attempt-a'),...phase(4,'exec-a','attempt-a')]}));
 assert.equal(flatten(duplicate).filter(node=>node.type==='disclosure-trigger'&&content(node).includes('Capture request')&&content(node).includes('2')).length,0);
});

test('legacy generic spans remain unconfirmed and coalesce', () => {
  const h = harness();
  const events = [event(1, 'agent_stage_start', { detail: 'Planning the next step' }), event(2, 'agent_stage_complete'),
    event(3, 'agent_stage_start', { detail: 'Planning the next step' }), event(4, 'agent_stage_complete'),
    event(5, 'agent_stage_start', { detail: 'Planning the next step' })];
  const rows = flatten(h.render(props({ status: 'completed', events }))).filter(node => node.type === 'li');
  assert.equal(rows.length, 1);
  assert.ok(content(rows[0]).includes('Not confirmed'));
});

test('compact public update and scoped checklist summary are findable on the closed trigger', () => {
  const h = harness();
  const live = h.render(props({ active: true, status: 'running', events: [event(1, 'agent_stage_start', { detail: 'Planning the next step' }), event(2, 'agent_action', { detail: 'capture_intent' })] }));
  assert.equal(root(live).props.open, false);
  assert.ok(content(header(live)).includes('Capture request'));
  const saved = h.render(props({ status: 'completed', publicSummary: 'Plan · 2 of 3 recorded', settledLabel: 'Response ready' }));
  assert.ok(content(header(saved)).includes('Plan · 2 of 3 recorded'));
  assert.ok(content(header(saved)).startsWith('Response ready'));
  assert.ok(content(header(h.render(props({ status: 'failed', settledLabel: 'Response ready' })))).startsWith('Failed'));
  assert.ok(content(header(h.render(props({ status: 'stale', active: true, settledLabel: 'Response ready' })))).startsWith('Source changed'));
});

test('settled summary names recorded work without inventing work for an empty turn', () => {
  const h = harness();
  const recorded = h.render(props({ status: 'completed', events: [event(1, 'tool_completed', { callId: 'call-1' })] }));
  assert.ok(content(header(recorded)).includes('get rooms'));
  const evidence = h.render(props({ status: 'failed', evidence: [call({ tool: 'datumm_revit_get_walls', status: 'failed' })] }));
  assert.ok(content(header(evidence)).includes('get walls'));
  assert.ok(!content(header(h.render(props({ status: 'completed' })))).includes('get rooms'));
  const row = flatten(recorded).find(node => node.type === 'li' && content(node).includes('get rooms'));
  assert.ok(flatten(row).some(node => node.props?.className === 'srOnly' && content(node) === 'Completed'));
});

test('settled summary prefers recorded actions over specialist advisory detail', () => {
  const h = harness();
  const tree = h.render(props({ status: 'completed', events: [
    event(1, 'agent_action', { detail: 'create_design' }),
    event(2, 'agent_action', { detail: 'finish_answer' }),
    event(3, 'specialist_complete', { detail: 'Report preparer: completed; findings are advisory.' }),
  ] }));
  assert.ok(content(header(tree)).includes('Create design · Prepare answer'));
  assert.ok(!content(header(tree)).includes('findings are advisory'));
  assert.ok(content(tree).includes('findings are advisory'));
  const checklist = h.render(props({ status: 'completed', events: [event(1, 'agent_action', { detail: 'plan_task' })] }));
  assert.ok(content(header(checklist)).includes('Record checklist'));
});


test('stage actions and tool records remain visible when both occur in one turn', () => {
  const h = harness();
  const tree = h.render(props({ status: 'completed', events: [
    event(1, 'agent_stage_start', { detail: 'Planning the next step' }),
    event(2, 'agent_action', { detail: 'capture_intent' }),
    event(3, 'agent_stage_complete'),
    event(4, 'tool_completed', { callId: 'call-1' }),
  ] }));
  assert.ok(content(tree).includes('Capture request'));
  assert.ok(content(tree).includes('get rooms'));
});

test('correlates only unique call IDs in the same recorded scope',()=>{
 const row=(index,stage,extra={})=>({index,stage,detail:'Calling read',...extra});
 const project=events=>processActivity.processRows(events,false,false).map(r=>r.status);
 assert.deepEqual(project([row(0,'tool_running'),row(1,'tool_completed')]),['unconfirmed','done']);
 assert.deepEqual(project([row(0,'tool_running',{callId:'a',turnId:'one'}),row(1,'tool_completed',{callId:'a',turnId:'two'})]),['unconfirmed','done']);
 assert.deepEqual(project([row(0,'tool_running',{callId:'a',turnId:'one'}),row(1,'tool_completed',{callId:'a',turnId:'one'})]),['done']);
 assert.deepEqual(project([row(0,'tool_running',{callId:'a',turnId:'one'}),row(1,'tool_completed',{callId:'a',turnId:'one'}),row(2,'tool_completed',{callId:'a',turnId:'one'})]),['unconfirmed','done','done']);
});

test('actual hosted generation keeps action outcome unconfirmed when not recorded',()=>{
 const events=JSON.parse(readFileSync(new URL('./fixtures/progress-usage-initial-events.json',import.meta.url),'utf8'));
 const h=harness(), tree=h.render(props({status:'completed',events}));
 const text=content(tree); assert.ok(text.includes('Not confirmed')); assert.equal(flatten(tree).filter(node=>node.type==='li'&&/create design/i.test(content(node))).length,1);
 assert.ok(text.includes('Report preparer: completed'));
 const action=events.find(e=>e.stage==='agent_action'&&e.detail==='create_design');
 const withoutCompletion=events.filter(e=>!(e.stage==='agent_stage_complete'&&e.activityId===action.activityId));
 assert.ok(content(h.render(props({status:'completed',events:withoutCompletion}))).includes('Not confirmed'));
 const completion=events.find(e=>e.stage==='agent_stage_complete'&&e.activityId===action.activityId);
 const duplicate=[...events,{...completion,index:999,eventId:'distinct-duplicate'}];
 assert.ok(content(h.render(props({status:'completed',events:duplicate}))).includes('Not confirmed'));
});

test('closed live process shows scoped checklist alongside current action without inferring tool counts', () => {
 const h = harness();
 const live = h.render(props({active:true,status:'running',publicSummary:'Checklist · 0 of 1',events:[
  event(1,'agent_stage_start',{detail:'Planning the next step'}),
  event(2,'agent_action',{detail:'capture_intent'}),
  event(3,'tool_running',{detail:'Calling datumm_revit_get_rooms',callId:'call-1'}),
 ],evidence:[call({status:'running'})]}));
 const text = content(header(live));
 assert.ok(text.includes('Capture request'));
 assert.ok(text.includes('Checklist · 0 of 1'));
 assert.ok(text.includes('1 recorded tool'));
 assert.ok(!/\d+ tool calls? recorded/.test(text));
 const anonymous = h.render(props({status:'completed',events:[event(1,'tool_completed',{callId:undefined})]}));
 assert.ok(!/\d+ tool calls? recorded/.test(content(header(anonymous))));
 const ambiguous = h.render(props({status:'completed',evidence:[call({sessionId:'a'}),call({sessionId:'b'})]}));
 assert.ok(!/\d+ tool calls? recorded/.test(content(header(ambiguous))));
});

test('historical connection requirement has a specific accessible lifecycle label', () => {
  const h = harness();
  const text = content(h.render(props({status:'needs_connection'})));
  assert.ok(text.includes('Revit connection required'));
  assert.ok(!text.includes('Status unavailable'));
});


test('a paused action remains waiting when a later attempt completes', () => {
 const h = harness();
 const phase = (n, activityId, controlOutcome) => {
  const scope = {taskId:'task-1',turnId:'turn-1',executionId:'execution-1',activityId};
  return [event(n,'agent_stage_start',{...scope,detail:'Planning the next step'}),
   event(n+1,'agent_action',{...scope,eventId:`action-${n}`,detail:'create_design'}),
   event(n+2,'agent_stage_complete',{...scope,controlOutcome})];
 };
 const tree = h.render(props({status:'completed',events:[...phase(1,'attempt-1','needs_input'),...phase(4,'attempt-2','success')]}));
 const attempts = flatten(tree).filter(node=>node.type==='li' && content(node).includes('Attempt '));
 assert.equal(attempts.length,2);
 assert.equal(attempts[0].props['data-status'],'waiting');
 assert.equal(attempts[1].props['data-status'],'done');
 const unknown = h.render(props({status:'completed',events:phase(7,'attempt-3','finish')}));
 const action = flatten(unknown).find(node=>node.type==='li' && content(node).includes('Create design'));
 assert.equal(action.props['data-status'],'unconfirmed');
});

test('unknown historical process with evidence has a neutral compact label',()=>{
 const h=harness();
 const tree=h.render(props({status:'unknown',events:[event(1,'agent_stage_start',{detail:'Planning the next step'}),event(2,'agent_action',{detail:'capture_intent'})]}));
 assert.ok(content(header(tree)).includes('Recorded activity'));
 assert.ok(!content(header(tree)).includes('Some work unconfirmed'));
 assert.ok(content(tree).includes('Not confirmed'));
 assert.ok(content(header(h.render(props({status:'unknown'})))).includes('Status unavailable'));
});

// @lat: [[contracts#Hosted contract tests#Stage spans]]
const lifecycle = JSON.parse(readFileSync(new URL('./fixtures/hosted-lifecycle-events.json', import.meta.url), 'utf8'));
const rowsOf = (tree, text) => flatten(tree).filter(node => node.type === 'li' && content(node).includes(text));

test('hosted native calls pair by call id, take their outcome and keep the recorded duration', () => {
  const row = (index, stage, extra = {}) => ({ index, stage, detail: 'datumm_revit_get_rooms', tool: 'datumm_revit_get_rooms', callId: 'c', turnId: 't', ...extra });
  const project = events => processActivity.processRows(events, false, false).map(r => [r.name, r.status, r.durationMs]);
  assert.deepEqual(project([row(0, 'tool_start'), row(1, 'tool_returned', { outcome: 'succeeded', durationMs: 300 })]), [['get rooms', 'done', 300]]);
  assert.deepEqual(project([row(0, 'tool_start'), row(1, 'tool_returned', { outcome: 'partial' })]), [['get rooms', 'partial', undefined]]);
  assert.deepEqual(project([row(0, 'tool_start'), row(1, 'tool_stopped', { outcome: 'failed', durationMs: 20 })]), [['get rooms', 'failed', 20]]);
  assert.deepEqual(project([row(0, 'tool_start')]), [['get rooms', 'unconfirmed', undefined]]);
  assert.deepEqual(project([row(0, 'tool_start'), row(1, 'tool_returned', { durationMs: -1 })]), [['get rooms', 'done', undefined]]);
  // A call the user stopped is stopped, not failed; an unknown outcome on a stop stays failed.
  assert.deepEqual(project([row(0, 'tool_start'), row(1, 'tool_stopped', { outcome: 'stopped', durationMs: 40 })]), [['get rooms', 'cancelled', 40]]);
  assert.deepEqual(project([row(0, 'tool_start'), row(1, 'tool_stopped')]), [['get rooms', 'failed', undefined]]);
});

test('specialist rows pair by activity id and take the job outcome', () => {
  const row = (index, stage, extra = {}) => ({ index, stage, detail: 'Report preparer', agent: { id: 'report_preparer' }, activityId: 'j1', ...extra });
  const project = events => processActivity.processRows(events, false, false).map(r => [r.status, r.durationMs]);
  assert.deepEqual(project([row(0, 'specialist_started'), row(1, 'specialist_complete', { outcome: 'partial', durationMs: 9 })]), [['partial', 9]]);
  assert.deepEqual(project([row(0, 'specialist_started'), row(1, 'specialist_complete')]), [['done', undefined]]);
  assert.deepEqual(project([row(0, 'specialist_started')]), [['unconfirmed', undefined]]);
  assert.deepEqual(project([row(1, 'specialist_complete', { outcome: 'failed' })]), [['failed', undefined]]);
  // Without an activity id (old events) a completion is a plain done row, as before.
  assert.deepEqual(project([row(0, 'specialist_complete', { activityId: undefined, outcome: undefined })]), [['done', undefined]]);
  assert.equal(project([row(0, 'specialist_started'), row(1, 'specialist_complete'), row(2, 'specialist_complete')]).length, 3);
});

test('old hosted events keep every step Not confirmed and show no lifecycle detail', () => {
  const tree = harness().render(props({ status: 'completed', events: lifecycle.old }));
  const text = content(tree);
  assert.ok(text.includes('Not confirmed'));
  assert.ok(content(header(tree)).includes('Some work unconfirmed'));
  assert.ok(!text.includes('Retried') && !/[0-9] s/.test(text) && !content(header(tree)).includes('Recorded work failed'));
  assert.equal(rowsOf(tree, 'Report preparer').length, 1);
});

test('new hosted events show done, retried, timed native calls and each specialist once', () => {
  const h = harness();
  const tree = h.render(props({ status: 'completed', events: lifecycle.completed, specialists: [{ role: 'report_preparer', status: 'completed' }, { role: 'layout_critic', status: 'completed' }] }));
  const text = content(tree);
  assert.ok(!text.includes('Not confirmed') && !content(header(tree)).includes('unconfirmed'));
  const [capture] = rowsOf(tree, 'Capture request'), [lookup] = rowsOf(tree, 'Look up evidence');
  assert.equal(capture.props['data-status'], 'done');
  assert.ok(content(capture).includes('0.9 s'));
  assert.equal(lookup.props['data-status'], 'done');
  assert.ok(content(lookup).includes('Retried once') && content(lookup).includes('2 s'));
  assert.ok(!content(capture).includes('Retried'));
  const [call] = rowsOf(tree, 'get rooms');
  assert.ok(call && call.props['data-status'] === 'done' && content(call).includes('0.3 s'));
  const [prep] = rowsOf(tree, 'Report preparer'), [critic] = rowsOf(tree, 'Layout critic');
  assert.equal(rowsOf(tree, 'Report preparer:').length, 1);
  assert.equal(prep.props['data-status'], 'done');
  assert.equal(critic.props['data-status'], 'partial');
  assert.ok(content(critic).includes('partial') && content(critic).includes('5 s'));
  // The checkpoint copy of the job takes the paired row's status, never its own.
  const nodes = flatten(tree).filter(node => node.props?.className === 'leaf' && content(node).includes('layout critic review'));
  assert.ok(nodes.length && nodes.every(node => node.props['data-status'] === 'partial'));
});

test('two specialists run side by side while live', () => {
  const tree = harness().render(props({ active: true, status: 'running', events: lifecycle.completed.filter(e => e.stage !== 'specialist_complete' && e.stage !== 'completed') }));
  assert.deepEqual([rowsOf(tree, 'Report preparer')[0], rowsOf(tree, 'Layout critic')[0]].map(r => r.props['data-status']), ['running', 'running']);
});

test('a failed action and native call show Failed with durations and the header keeps the failure', () => {
  const tree = harness().render(props({ status: 'failed', events: lifecycle.failed }));
  const [action] = rowsOf(tree, 'Create design'), [call] = rowsOf(tree, 'get walls');
  assert.equal(action.props['data-status'], 'failed');
  assert.equal(call.props['data-status'], 'failed');
  assert.ok(content(action).includes('0.9 s') && content(call).includes('0.4 s'));
  assert.ok(content(header(tree)).includes('Recorded work failed'));
});

test('an open specialist settles to Not confirmed when the run is stopped', () => {
  const tree = harness().render(props({ status: 'cancelled', events: lifecycle.stopped }));
  const [job] = rowsOf(tree, 'Report preparer');
  assert.equal(job.props['data-status'], 'unconfirmed');
  assert.ok(content(job).includes('Not confirmed'));
  assert.equal(rowsOf(tree, 'Create design')[0].props['data-status'], 'cancelled');
});

test('a native call the user stopped shows Stopped and never Recorded work failed', () => {
  const tree = harness().render(props({ status: 'cancelled', events: lifecycle.stopped }));
  const [call] = rowsOf(tree, 'get walls');
  assert.equal(call.props['data-status'], 'cancelled');
  assert.ok(!content(call).includes('failed'));
  assert.ok(content(header(tree)).startsWith('Stopped'));
  assert.ok(!content(header(tree)).includes('Recorded work failed'));
});

test('a read retry that succeeds reads Completed while the failed attempt stays visible', () => {
  const tree = harness().render(props({ status: 'completed', events: lifecycle.completed }));
  assert.ok(!content(header(tree)).includes('Recorded work failed'));
  assert.deepEqual(rowsOf(tree, 'get model views').map(row => row.props['data-status']), ['failed', 'done']);
  // The same failed call without the action's retry still fails the turn.
  const unretried = lifecycle.completed.filter(event => !event.stage.startsWith('read_retry'));
  assert.ok(content(header(harness().render(props({ status: 'completed', events: unretried })))).includes('Recorded work failed'));
});

test('a schema repair that continues is skipped, not a failure', () => {
  const tree = harness().render(props({ status: 'completed', events: lifecycle.repaired }));
  assert.deepEqual(rowsOf(tree, 'Attempt ').map(row => row.props['data-status']), ['skipped', 'done']);
  assert.ok(!content(header(tree)).includes('Recorded work failed'));
});

test('old relay tool events without a call id render exactly as before N3', () => {
  assert.deepEqual(processActivity.processRows(lifecycle.old_relay, false, false), []);
  // Recorded from the pre-N3 renderer (HEAD) on this fixture.
  for (const [status, label] of [['completed', 'Completed'], ['cancelled', 'Stopped']]) {
    const tree = harness().render(props({ status, events: lifecycle.old_relay }));
    assert.equal(content(header(tree)), `${label} · Some work unconfirmedinspect model`);
    assert.deepEqual(flatten(tree).filter(node => node.type === 'li').map(row => [row.props['data-status'], content(row)]), [['unconfirmed', 'inspect modelNot confirmed']]);
  }
});

test('a needs_input pause stays waiting even when its outcome is failed, and a later attempt completes', () => {
  const scope = { taskId: 'task-1', turnId: 'turn-1', executionId: 'execution-1' };
  const phase = (n, activityId, complete) => [event(n, 'agent_stage_start', { ...scope, detail: 'Planning the next step' }), event(n + 1, 'agent_action', { ...scope, activityId, detail: 'create_design' }), event(n + 2, 'agent_stage_complete', { ...scope, activityId, ...complete })];
  const tree = harness().render(props({ status: 'completed', events: [...phase(1, 'a1', { controlOutcome: 'needs_input', outcome: 'failed', durationMs: 500 }), ...phase(4, 'a2', { controlOutcome: 'continue', outcome: 'succeeded', durationMs: 700 })] }));
  const attempts = rowsOf(tree, 'Attempt ');
  assert.deepEqual(attempts.map(r => r.props['data-status']), ['waiting', 'done']);
  assert.ok(content(attempts[0]).includes('0.5 s') && content(attempts[1]).includes('0.7 s'));
});
