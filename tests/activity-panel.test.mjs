import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import { activityStateLabel } from '../src/lib/process-activity.mjs';
import { deriveTodos } from '../src/lib/agent-todos.mjs';
import { stopRequested } from '../src/lib/stop-requested.mjs';
import { createWebHost } from '../src/lib/host/web.mjs';

function harness(host = { capabilities: { has: flag => flag === 'runTrace' } }) {
  const slots = []; let cursor = 0;
  const hooks = { ...React, useId: () => 'activity-test', useState(initial) {
    const i = cursor++;
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }];
  } };
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/activity-panel.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require(module) {
    if (module === 'react') return hooks;
    if (module === 'react/jsx-runtime') return jsx;
    if (module === '@/lib/process-activity.mjs') return { activityStateLabel };
    if (module === '@/lib/agent-todos.mjs') return { deriveTodos };
    if (module === '@/lib/stop-requested.mjs') return { stopRequested };
    if (module === './plan-dock') return { PlanDock: 'plan-dock' };
    if (module === '../agent-activity') return { ActivitySummary: 'activity-summary', AgentActivity: 'agent-activity' };
    if (module === '../agent-memory') return { ContextUsage: 'context-usage', AgentMemory: 'agent-memory' };
    if (module === '../agent-scheduler') return { AgentScheduler: 'agent-scheduler' };
    if (module === '../agent-specialists') return { AgentSpecialists: 'agent-specialists' };
    if (module === '../vendor/affectui/empty-state-clean') return { EmptyState: 'empty-state' };
    if (module === '../pipeline-trace') return { PipelineTrace: 'pipeline-trace' };
    if (module === '../host-provider') return { useHost: () => host };
    if (module.endsWith('.module.css')) return { default: {} };
    return new Proxy({}, { get: () => () => null });
  } });
  return { render(props) { cursor = 0; return elements(exports.ActivityPanel(props)); } };
}
function elements(tree) {
  if (!React.isValidElement(tree)) return [];
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)];
}
const words = tree => tree.map(el => React.Children.toArray(el.props.children).filter(child => typeof child === 'string' || typeof child === 'number').join('')).join(' ');
const event = (index, stage = 'tool_completed', detail = `Reading result ${index}`) => ({ index, stage, detail, at: '2026-11-12T12:00:00Z', taskId: 'task-a' });
const props = changes => ({ run: { id: 'task-a', title: 'Inspect model', taskVersion: 7, mode: 'ask', model: 'reported/model-a', status: 'completed', data: {} }, runId: 'task-a',
  currentActivity: { index: 0, events: [event(0)], waiting: false, evidence: [], todos: [] }, executing: false, mode: 'build', model: 'fallback/model', eventDetail: row => row.detail, ...changes });
const summary = tree => tree.find(row => row.type === 'activity-summary');
const input = tree => tree.find(row => row.type === 'input');
const toggle = (tree, name) => {
  const disclosure = tree.find(row => row.type === 'details' && words(elements(row.props.children[0])).includes(name));
  assert.ok(disclosure, `Missing disclosure: ${name}`);
  disclosure.props.onToggle({ currentTarget: { open: !disclosure.props.open } });
};

test('panel preserves selected task identity and one chronological default summary', () => {
  const h = harness(), p = props({ currentActivity: { index: 0, events: [event(3), { ...event(2), taskId: 'other-task' }, event(1)], evidence: [], todos: [] } });
  const tree = h.render(p), text = words(tree);
  assert.match(text, /Latest turn/); assert.doesNotMatch(text, /Inspect model/); assert.match(text, /Mode Ask/); assert.match(text, /reported\/model-a/);
  assert.doesNotMatch(text, /task-a|Task version/);
  assert.equal(tree.filter(row => row.type === 'activity-summary').length, 1);
  assert.deepEqual(Array.from(summary(tree).props.events, row => row.index), [1, 3]);
  assert.equal(tree.some(row => row.type === 'pipeline-trace' || row.type === 'agent-activity'), false);
  assert.equal(tree.find(row => row.type === 'context-usage').props.usage, undefined);
  const unavailable = h.render({ ...p, runId: 'other-task' });
  assert.match(unavailable.find(row => row.type === 'empty-state').props.title, /Selected task activity is unavailable/);
  assert.doesNotMatch(words(unavailable), /Inspect model|task-a|reported\/model-a/);
  assert.equal(summary(unavailable), undefined);
});

test('task and model names are readable by default while exact IDs and version are retained in diagnostics', () => {
  const h = harness(), base = props(), id = '72dbe37c-204a-4bd6-996c-e03e05674576';
  const p = { ...base, runId: id, run: { ...base.run, id, title: 'Plan a two bedroom home', mode: 'plan', model: 'openai/gpt-6-luna' }, currentActivity: { index: 0, events: [], evidence: [], todos: [] } };
  let tree = h.render(p);
  assert.match(words(tree), /Latest turn/);
  assert.doesNotMatch(words(tree), /Plan a two bedroom home/);
  assert.match(words(tree), /Mode Plan/);
  assert.match(words(tree), /Model GPT-6 Luna/);
  assert.doesNotMatch(words(tree), /72dbe37c|openai\/|Task version/);
  toggle(tree, 'Task diagnostics');
  tree = h.render(p);
  assert.match(words(tree), /Plan a two bedroom home/);
  assert.match(words(tree), /72dbe37c-204a-4bd6-996c-e03e05674576/);
  assert.match(words(tree), /openai\/gpt-6-luna/);
  assert.match(words(tree), /Task version 7/);
});

test('loaded-event search combines all words with exact loaded type and has a working clear action', () => {
  const h = harness(), p = props({ currentActivity: { index: 0, events: [event(0, 'tool_completed', 'Read north wall'), event(1, 'tool_failed', 'Read south wall'), event(2, 'tool_completed', 'Read south door')], evidence: [], todos: [] } });
  input(h.render(p)).props.onChange({ currentTarget: { value: ' READ south ' } });
  let tree = h.render(p);
  assert.deepEqual(Array.from(summary(tree).props.events, row => row.index), [1, 2]);
  tree.find(row => row.type === 'select').props.onChange({ currentTarget: { value: 'tool_failed' } });
  tree = h.render(p);
  assert.deepEqual(Array.from(summary(tree).props.events, row => row.index), [1]);
  input(tree).props.onChange({ currentTarget: { value: 'no such result' } });
  tree = h.render(p);
  assert.match(words(tree), /No loaded events match/); assert.equal(summary(tree), undefined);
  tree.find(row => row.type === 'button' && words([row]).includes('Clear filters')).props.onClick();
  assert.equal(summary(h.render(p)).props.events.length, 3);
});

test('empty turn has an honest no-evidence state while authoritative lifecycle survives stale question records', () => {
  for (const [status, expected] of [['failed', 'Failed'], ['cancelled', 'Stopped'], ['completed', 'Completed'], ['paused_limit', 'Paused at task limit']]) {
    const h = harness(), base = props(), tree = h.render({ ...base, run: { ...base.run, status }, currentActivity: { index: 0, events: [], waiting: true, evidence: [], todos: [] } });
    assert.match(words(tree), /No runtime events were recorded for this turn/);
    assert.equal(tree.find(row => row.props.role === 'status').props.children, expected);
    assert.equal(input(tree), undefined);
    assert.equal(tree.some(row => row.type === 'agent-specialists' || row.type === 'agent-scheduler'), false);
  }
  assert.match(harness().render(props({ run: null, runId: '' })).find(row => row.type === 'empty-state').props.title, /Start a task/);
});

test('queued lifecycle stays queued and a transport ending never marks the running snapshot completed', () => {
  for (const executing of [true, false]) {
    const base = props(), tree = harness().render({ ...base, executing, run: { ...base.run, status: 'queued' } });
    assert.equal(tree.find(row => row.props.role === 'status').props.children, 'Queued');
  }
  const base = props(), tree = harness().render({ ...base, executing: false, run: { ...base.run, status: 'running' } });
  assert.equal(tree.find(row => row.props.role === 'status').props.children, 'Running');
  assert.doesNotMatch(words(tree), /Completed/);
});

test('task and turn switches synchronously reset query, event type and diagnostic disclosures', () => {
  const h = harness(), p = props();
  input(h.render(p)).props.onChange({ currentTarget: { value: 'result' } });
  h.render(p).find(row => row.type === 'select').props.onChange({ currentTarget: { value: 'tool_completed' } });
  toggle(h.render(p), 'Task diagnostics');
  toggle(h.render(p), 'Local pipeline trace');
  assert.ok(h.render(p).find(row => row.type === 'pipeline-trace'));
  const other = { ...p, runId: 'task-b', run: { ...p.run, id: 'task-b' }, currentActivity: { ...p.currentActivity, events: [{ ...event(0), taskId: 'task-b' }] } };
  const switched = h.render(other);
  assert.equal(input(switched).props.value, '');
  assert.equal(switched.find(row => row.type === 'select').props.value, '');
  assert.equal(switched.some(row => row.type === 'pipeline-trace'), false);
  assert.equal(switched.find(row => row.type === 'context-usage').props.usage, undefined);
  assert.equal(input(h.render(p)).props.value, '', 'Returning to a task must not resurrect an old filter');
  input(h.render(p)).props.onChange({ currentTarget: { value: 'result' } });
  assert.equal(input(h.render({ ...p, currentActivity: { ...p.currentActivity, index: 1 } })).props.value, '');
});

test('usage and native checklist are visible for the selected task without opening diagnostics', () => {
  const base = props(), usage = { rootTaskId: 'task-a' };
  const tree = harness().render({ ...base, currentActivity: { ...base.currentActivity, usage, todos: [{ content: 'Inspect walls', status: 'in_progress' }] } });
  assert.equal(tree.find(row => row.type === 'context-usage').props.usage, usage);
  const checklist = tree.find(row => row.type === 'plan-dock');
  assert.ok(tree.indexOf(checklist) < tree.findIndex(row => row.type === 'activity-summary'));
  assert.ok(tree.findIndex(row => row.type === 'context-usage') < tree.findIndex(row => row.type === 'activity-summary'));
  assert.equal(tree.find(row => row.type === 'context-usage').props.compact, true);
  assert.equal(summary(tree).props.compact, true);
  assert.equal(checklist.props.title, 'Latest turn checklist');
  assert.equal(checklist.props.items[0].title, 'Inspect walls');
  assert.equal(checklist.props.items[0].status, 'unconfirmed');
});

test('native context is scoped to the selected task and its recorded root session', () => {
  const base=props(), native_usage={taskId:'task-a',scope:'root_session',sessionId:'session-a'};
  const render = (record, sessionId='session-a') => harness().render({...base,run:{...base.run,data:{native_usage:record}},currentActivity:{...base.currentActivity,manifest:{taskId:'task-a',sessionId,children:[]}}}).find(row=>row.type==='context-usage').props.nativeUsage;
  assert.equal(render(native_usage), native_usage);
  assert.equal(render({...native_usage,taskId:'task-b'}),undefined);
  assert.equal(render(native_usage,'session-b'),undefined);
});

test('hosted usage binds only to the execution supplied by the selected task', () => {
  const base=props(), usage={rootTaskId:'execution-a'};
  const render=(record, executionId='execution-a')=>harness().render({...base,run:{...base.run,executionId,data:{usage:record}}}).find(row=>row.type==='context-usage').props.usage;
  assert.equal(render(usage).ledgerExecutionId,'execution-a');
  assert.equal(render(usage).ownerTaskId,'task-a');
  assert.equal(render(usage,'execution-b'),undefined);
  assert.equal(render({...usage,ownerTaskId:'task-b'}),undefined);
  assert.equal(render(usage,null),undefined);
});

test('hosted task plans remain visible with unrecorded turn attribution', () => {
  const base=props(), tree=harness().render({...base,run:{...base.run,data:{agent_task_plan:{steps:[{key:'one',title:'Inspect walls'}],progress:[{key:'one',status:'completed'}]}}}});
  const checklist=tree.find(row=>row.type==='plan-dock');
  assert.equal(checklist.props.title,'Task plan · turn not recorded');
  assert.equal(checklist.props.items[0].status,'done');
});

test('diagnostic readers mount deliberately and use exact selected record bindings', () => {
  const h = harness(), base = props(), p = { ...base, executing: true, run: { ...base.run, data: { agent_memory: { version: 2 }, agent_scheduler: { steps: [] }, agent_specialists: [{ role: 'actual-role' }] } }, currentActivity: { ...base.currentActivity, usage: { rootTaskId: 'other-task' }, manifest: { taskId: 'other-task', children: [] }, evidence: [{ tool: 'foreign-tool', status: 'completed' }], todos: [{ content: 'Foreign task' }], nativeMessages: [{ id: 'foreign', text: 'Foreign text' }] } };
  toggle(h.render(p), 'Task diagnostics');
  let tree = h.render(p);
  assert.equal(tree.find(row => row.type === 'context-usage').props.usage, undefined);
  assert.equal(tree.find(row => row.type === 'agent-specialists'), undefined);
  toggle(tree, 'Recorded specialist reviews'); tree = h.render(p);
  assert.equal(tree.find(row => row.type === 'agent-specialists').props.taskId, 'task-a');
  assert.match(words(tree), /Recorded for this task; timing within the task is not specified/);
  assert.equal(tree.some(row => row.type === 'agent-memory' || row.type === 'pipeline-trace' || row.type === 'agent-activity'), false);
  toggle(tree, 'Runtime and tool evidence'); tree = h.render(p);
  assert.equal(tree.find(row => row.type === 'agent-activity').props.manifest, undefined);
  assert.equal(tree.find(row => row.type === 'agent-activity').props.nativeMessages, undefined);
  assert.equal(tree.find(row => row.type === 'agent-activity').props.evidence.length, 0);
  assert.equal(tree.find(row => row.type === 'agent-activity').props.todos.length, 0);
  assert.match(words(tree), /belongs to a different task/);
  toggle(tree, 'Saved task memory'); tree = h.render(p);
  assert.equal(tree.find(row => row.type === 'agent-memory').props.runId, 'task-a');
  toggle(tree, 'Local pipeline trace'); tree = h.render(p);
  assert.equal(tree.find(row => row.type === 'pipeline-trace').props.taskId, 'task-a');
  toggle(tree, 'Task diagnostics');
  assert.equal(h.render(p).some(row => row.type === 'pipeline-trace'), false);
});

test('recorded reviews are conditional, closed by default and reset on selected-task changes', () => {
  const h = harness(), base = props(), results = [{ role: 'report_preparer', status: 'completed' }, { role: 'checker', status: 'partial' }, { role: 'reviewer', status: 'failed' }, { role: 'other', status: 'stale' }];
  const p = { ...base, run: { ...base.run, data: { agent_specialists: results } } };
  let tree = h.render(p);
  assert.match(words(tree), /Recorded specialist reviews/);
  assert.equal(tree.find(row => row.type === 'agent-specialists'), undefined);
  toggle(tree, 'Recorded specialist reviews'); tree = h.render(p);
  assert.equal(tree.find(row => row.type === 'agent-specialists').props.results, results);
  const other = { ...p, runId: 'task-b', run: { ...p.run, id: 'task-b', data: { agent_specialists: [{ role: 'other-task' }] } } };
  tree = h.render(other);
  assert.equal(tree.find(row => row.type === 'agent-specialists'), undefined);
  toggle(tree, 'Recorded specialist reviews'); tree = h.render(other);
  assert.equal(tree.find(row => row.type === 'agent-specialists').props.taskId, 'task-b');
  assert.equal(tree.find(row => row.type === 'agent-specialists').props.results[0].role, 'other-task');
  assert.equal(h.render({ ...p, runId: 'task-b' }).some(row => row.type === 'agent-specialists'), false);
  assert.doesNotMatch(words(h.render(base)), /Recorded specialist reviews/);
});

test('raw diagnostic event record retains unknown public events and never renders model bookkeeping as reasoning', () => {
  const h = harness(), p = props({ currentActivity: { index: 0, events: [event(0, 'provider_public_note', 'A supplied public note'), event(1, 'model_turn', 'step 4 private chain text')], evidence: [], todos: [] } });
  toggle(h.render(p), 'Task diagnostics');
  const tree = h.render(p), raw = tree.find(row => row.props['aria-label'] === 'Loaded event record');
  assert.match(words(elements(raw)), /A supplied public note/);
  assert.match(words(elements(raw)), /step 4/);
  assert.doesNotMatch(words(elements(raw)), /private chain text/);
  input(tree).props.onChange({ currentTarget: { value: 'private chain' } });
  assert.equal(summary(h.render(p)), undefined, 'Hidden model text is not searchable');
});

test('activity shows the recorded stop request without changing the saved lifecycle',()=>{
 const run={...props().run,status:'paused_recovery',events:[event(0,'cancel_requested','Stop requested')]};
 const tree=harness().render(props({run,currentActivity:{index:0,events:run.events,evidence:[],todos:[]}}));
 assert.ok(tree.some(node=>node.props.role==='status'&&node.props.children==='Stop requested'));
 assert.equal(run.status,'paused_recovery');
});

test('bound hosted plans and normalized shared usage require exact selected identities',()=>{
 const base=props(), plan={turnId:'turn-a',steps:[{key:'a',title:'First'},{key:'b',title:'Second'}],progress:[{key:'a',status:'completed'},{key:'b',status:'pending'}]};
 const usage={rootTaskId:'task-a',ownerTaskId:'task-a',ledgerExecutionId:'ledger-a',scope:'execution_ledger',ledgerShared:true};
 const render=(turnId,record=usage)=>harness().render({...base,run:{...base.run,data:{agent_task_plan:plan,usage:record}},currentActivity:{...base.currentActivity,turnId,usage:record}});
 let tree=render('turn-a'); assert.equal(tree.find(n=>n.type==='plan-dock').props.title,'Latest turn checklist'); assert.equal(tree.find(n=>n.type==='plan-dock').props.items[1].status,'unconfirmed'); assert.equal(tree.find(n=>n.type==='context-usage').props.usage,usage);
 tree=render('turn-b'); assert.equal(tree.find(n=>n.type==='plan-dock'),undefined);
 for(const record of [{...usage,ownerTaskId:'task-b'},{...usage,ownerTaskId:undefined},{...usage,ledgerExecutionId:undefined}]) assert.equal(render('turn-a',record).find(n=>n.type==='context-usage').props.usage,undefined);
});

test('the trace disclosure is hidden on the web host and shown when the host turns runTrace on', () => {
  const traceRows = tree => tree.filter(row => row.type === 'details' && words(elements(row.props.children[0])).includes('Local pipeline trace'));
  const rows = host => { const h = harness(host); toggle(h.render(props()), 'Task diagnostics'); return traceRows(h.render(props())); };
  assert.equal(rows(createWebHost()).length, 0);
  assert.equal(rows({ capabilities: { has: flag => flag === 'runTrace' } }).length, 1);
});
