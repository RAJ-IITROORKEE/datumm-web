import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import { alternativeChecks } from '../src/lib/plan-checks.mjs';
import { deriveTodos, todoSummary } from '../src/lib/agent-todos.mjs';
import * as capabilities from '../src/lib/capabilities.mjs';
import { conversationResult, failedTurnRecovery } from '../src/lib/conversation-result.mjs';
import { drawingTitle } from '../src/lib/drawing-presentation.mjs';
import { stageSpans } from '../src/lib/turn-nesting.mjs';
import * as conversationHelpers from '../src/lib/conversation-turns.mjs';
import * as answerDraft from '../src/lib/agui/answer-draft.mjs';

const exports = {};
const unexpectedAction = () => { throw Error('Rendering activity must not invoke a task or native action'); };
runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/workspace/conversation.tsx', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports, require(name) {
  if (name === 'react/jsx-runtime') return jsx;
  if (name === 'react') return { useRef: value => ({current: value}) };
  if (name === '@/lib/utils') return { cn: (...values) => values.filter(Boolean).join(' ') };
  if (name === '@/lib/agent-todos.mjs') return { deriveTodos, todoSummary };
  if (name === '@/lib/capabilities.mjs') return capabilities;
  if (name === '@/lib/conversation-result.mjs') return { conversationResult, failedTurnRecovery };
  if (name === '@/lib/drawing-presentation.mjs') return { drawingTitle };
  if (name === '@/lib/plan-checks.mjs') return { alternativeChecks };
  if (name === '@/lib/conversation-turns.mjs') return conversationHelpers;
  if (name === '@/lib/turn-nesting.mjs') return { stageSpans };
  if (name === '@/lib/agui/answer-draft.mjs') return answerDraft;
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
  assert.equal(process(first).props.status, 'unknown', 'Task completion alone does not settle an unbound turn');
  assert.equal(process(switched).props.events.length, 0);
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
  assert.equal(processes[0].props.events.length, 0);
  assert.equal(processes[0].props.manifest, firstManifest);
  assert.equal(processes[0].props.active, false);
  assert.equal(processes[1].props.events.length, 0);
  assert.equal(processes[1].props.manifest, undefined);
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


test('first streamed answer binds the admitted ID before a snapshot and remains partial without authoritative completion',()=>{
 const message={id:'first-answer',role:'assistant',parts:[{type:'text',text:'| Room | Area |\n| --- | --- |\n| Living | 24 |'}]};
 const nodes=render(props(null,{runId:'admitted-b',scene:'task-loading',messages:[message],hasContent:true,executing:false,busy:false}));
 const answer=nodes.find(node=>node.type==='ConversationAnswer');assert.ok(answer);assert.equal(answer.props.source.taskId,'admitted-b');assert.equal(answer.props.source.state,'partial');
});

test('real plan review details opens Design properties where drawing recovery and assumptions live',()=>{
 const run={...task('task-plan'),mode:'plan',data:{agent_design:{briefId:'brief-a',candidates:[{planId:'plan-a',version:1,fingerprint:'exact'}],assumptions:[],diagnostics:[],previewRooms:[],brief:{site:{widthMm:10000,depthMm:12000},requirements:[]}}}};
 let opened=0;
 const nodes=render(props(run,{designTurn:0,mode:'plan',workAreaActions:{openProperties(){opened++;},selectSection(){throw Error('Details must not navigate to download-only Exports');}}}));
 const card=nodes.find(node=>node.type==='PlanReviewCard');assert.ok(card);
 card.props.onDetails();assert.equal(opened,1);
});

test('empty latest failure offers only scoped navigation and preserves earlier answers',()=>{
 const run={...task('task-a',[{prompt:'Original',answer:'Saved concept answer'},{prompt:'Revise',answer:''}]),mode:'plan',status:'failed',data:{failure:{recoveryAction:'review_progress'},error:'internal stack must not render'}};
 const calls=[];
 const actions={selectSection: section=>calls.push(section),openDrawing:()=>calls.push('drawing')};
 const base={runId:'task-a',workspaceScopeInput:{key:'account-a:task-a',taskId:'task-a'},hasRenderablePlan:true,workAreaActions:actions,submit:unexpectedAction,act:unexpectedAction};
 const nodes=render(props(run,base));
 const buttons=nodes.filter(node=>node.type==='Button');
 const activity=buttons.find(node=>node.props.children==='View Activity');
 const drawing=buttons.find(node=>node.props.children==='View saved concept');
 assert.ok(activity); assert.ok(drawing); assert.deepEqual(calls,[]);
 activity.props.onClick(); drawing.props.onClick(); assert.deepEqual(calls,['activity','drawing']);
 assert.ok(nodes.some(node=>node.type==='ConversationAnswer' && node.props.text==='Saved concept answer'));
 assert.ok(!nodes.some(node=>node.props.children==='internal stack must not render'));
 const missing=render(props(run,{...base,hasRenderablePlan:false}));
 assert.ok(!missing.some(node=>node.type==='Button' && node.props.children==='View saved concept'));
 const other=render(props(run,{...base,runId:'task-b',workspaceScopeInput:{key:'account-a:task-b',taskId:'task-b'}}));
 assert.ok(!other.some(node=>node.type==='Button' && node.props.children==='View Activity'));
 assert.ok(!other.some(node=>node.props.children==='The task stopped unexpectedly. Review its last saved step before retrying.'));
 const answered=render(props({...run,conversation:[...run.conversation.slice(0,1),{prompt:'Revise',answer:'Partial response'}]},base));
 assert.ok(!answered.some(node=>node.type==='Button' && node.props.children==='View Activity'));
 assert.ok(answered.some(node=>React.Children.toArray(node.props.children).includes('The task stopped unexpectedly. Review its last saved step before retrying.')));
 assert.ok(!answered.some(node=>node.props.children==='internal stack must not render'));
 const fallback=render(props({...run,conversation:[]},{...base,messages:[{id:'a',role:'assistant',parts:[{type:'text',text:'Partial response'}]}]}));
 assert.ok(fallback.some(node=>React.Children.toArray(node.props.children).includes('The task stopped unexpectedly. Review its last saved step before retrying.')));
});

test('only empty historical placeholders are hidden; recorded and current turn activity remains reachable',()=>{
  const run=task('task-a',[{prompt:'First'},{prompt:'Second'},{prompt:'Third'},{prompt:'Current'}]);
  run.status='needs_input';run.data.agent_question={id:'question',version:1};
  const tree=render(props(run,{traceTurns:[[],[event(1,'tool_failed')],[],[]],savedTurns:[{conversationIndex:2,result:{evidence:[]}}]}));
  const turns=tree.filter(node=>node.props.className==='conversation-turn');
  assert.equal(turns.length,4,'User prompts remain visible');
  assert.equal(elements(turns[0]).some(node=>node.type==='turn-process'),false);
  assert.equal(elements(turns[1]).some(node=>node.type==='turn-process'),false);
  assert.ok(elements(turns[2]).some(node=>node.type==='turn-process'),'Saved result remains inspectable');
  assert.equal(elements(turns[3]).find(node=>node.type==='turn-process').props.status,'needs_input');
});


test('checklists stay with indexed assistant turns and never float above the composer',()=>{
 const run=task('task-a',[{prompt:'First',answer:'First answer'},{prompt:'Follow up',answer:'Latest answer'}]);
 const old=[{content:'Earlier recorded step',status:'completed'}],current=[{content:'Current recorded step',status:'failed'}];
 const nodes=render(props(run,{savedTurns:[{conversationIndex:0,result:{todos:old}},{conversationIndex:1,result:{todos:current}}],nativeTodos:[{content:'Unowned global step',status:'completed'}]}));
 const turns=nodes.filter(node=>node.props.className==='conversation-turn');
 const first=elements(turns[0]).find(node=>node.type==='PlanDock'),last=elements(turns[1]).find(node=>node.type==='PlanDock');
 assert.equal(first.props.title,'Previous plan');assert.equal(first.props.items[0].title,'Earlier recorded step');
 assert.equal(last.props.title,'Plan');assert.equal(last.props.items[0].title,'Current recorded step');assert.equal(last.props.items[0].status,'failed');
 assert.equal(nodes.some(node=>node.props.className==='composer-dock'),false);
 assert.equal(nodes.filter(node=>node.type==='PlanDock').length,2);
});

test('unowned global plans are labeled and an indexed empty todo snapshot cannot adopt unowned native todos',()=>{
 const run=task('task-a',[{prompt:'First',answer:'Earlier'},{prompt:'Follow up',answer:'Latest'}]);
 run.data.agent_task_plan={steps:[{key:'inspect',title:'Recorded task step'}],progress:[{key:'inspect',status:'running'}]};
 let nodes=render(props(run));
 let plan=nodes.find(node=>node.type==='PlanDock');assert.equal(plan.props.title,'Plan · message not recorded');assert.equal(plan.props.items[0].status,'unconfirmed');
 nodes=render(props(run,{savedTurns:[{conversationIndex:1,result:{todos:[]}}]}));assert.equal(nodes.find(node=>node.type==='PlanDock').props.title,'Plan · message not recorded','A real task plan remains inspectable even without native todos');
 run.data.agent_task_plan=undefined;
 nodes=render(props(run,{savedTurns:[{conversationIndex:1,result:{todos:[]}}],nativeTodos:[{content:'Unowned native todo',status:'completed'}]}));assert.equal(nodes.filter(node=>node.type==='PlanDock').length,0);
 nodes=render(props(run,{traceTurns:[[],[event(1,'agent_stage_start'),event(2,'agent_stage_complete')]]}));assert.equal(nodes.filter(node=>node.type==='PlanDock').length,0,'Tool and stage events cannot manufacture a plan');
});

test('split hosted prompt and answer render one process with raw answer attribution',()=>{
 const run=task('hosted',[{prompt:'Read the model'},{answer:'Recorded answer'}]);
 const tree=render(props(run,{traceTurns:[[event(0,'command_accepted'),event(1,'completed')]]}));
 assert.equal(tree.filter(node=>node.props.className==='conversation-turn').length,1);
 assert.equal(tree.filter(node=>node.type==='turn-process').length,1);
 assert.equal(tree.find(node=>node.type==='turn-process').props.events.length,0);
 const answer=tree.find(node=>node.type==='ConversationAnswer');
 assert.equal(answer.props.source.conversationIndex,1);
 assert.equal(answer.props.source.key,'hosted:answer:1');
});

test('split followups retain raw saved indexes and withhold ambiguously owned events',()=>{
 const run=task('hosted',[{prompt:'First'},{answer:'Answer one'},{prompt:'Next'},{answer:'Answer two'}]);
 const todos=[{content:'Saved next checklist',status:'completed'}];
 let tree=render(props(run,{traceTurns:[[event(0)],[event(1)]],savedTurns:[{conversationIndex:3,result:{todos}}]}));
 assert.deepEqual(tree.filter(node=>node.type==='ConversationAnswer').map(node=>node.props.source.conversationIndex),[1,3]);
 assert.equal(tree.find(node=>node.type==='PlanDock').props.items[0].title,'Saved next checklist');
 assert.ok(tree.filter(node=>node.type==='turn-process').every(node=>node.props.events.length===0));
 // A question response adds a prompt record without proving a new event group.
 run.conversation=[{prompt:'First'},{answer:'What level?'},{prompt:'Level 2'},{answer:'Done'}];
 tree=render(props(run,{traceTurns:[[event(0,'question_pending'),event(1,'question_answered')]]}));
 assert.ok(tree.filter(node=>node.type==='turn-process').every(node=>node.props.events.length===0));
});

test('ambiguous clarification does not attach unowned live checklist or manifest to the answer',()=>{
 const run=task('hosted',[{prompt:'Inspect'},{answer:'Which level?'},{prompt:'Level 2'}]);
 run.status='running';
 run.data.run_manifest={taskId:'hosted',sessionId:'prior',children:[],tools:[{callId:'old',tool:'read',status:'completed'}]};
 run.data.native_messages=[{id:'old',text:'Earlier update',finish:null}];
 const unowned=[{content:'Prior checklist',status:'completed'}];
 const p=props(run,{executing:true,traceTurns:[[event(0,'question_pending'),event(1,'question_answered')]],nativeTodos:unowned});
 let tree=render(p);
 let last=tree.filter(node=>node.type==='turn-process').at(-1);
 assert.equal(last.props.manifest,undefined);assert.equal(last.props.nativeMessages,undefined);assert.equal(last.props.evidence.length,0);
 assert.equal(tree.some(node=>node.type==='PlanDock'),false);
 run.data.agent_task_plan={steps:[{key:'one',title:'Task-scoped step'}],progress:[{key:'one',status:'running'}]};
 tree=render(p);
 const plan=tree.find(node=>node.type==='PlanDock');assert.equal(plan.props.title,'Plan · message not recorded');assert.equal(plan.props.items[0].title,'Task-scoped step');
});

test('historical process retains its recorded failure after a later successful followup',()=>{
 const run=task('hosted',[{prompt:'First'},{answer:'Failed response'},{prompt:'Try again'},{answer:'Done'}]);
 const tree=render(props(run,{traceTurns:[[event(0,'agent_stage_start'),event(1,'failed')],[event(2,'agent_stage_start'),event(3,'completed')]]}));
 const processes=tree.filter(node=>node.type==='turn-process');
 assert.equal(processes.length,1);assert.equal(processes[0].props.status,'unknown');
 const ambiguous=render(props(run,{traceTurns:[[event(0,'failed')]]}));
 assert.equal(ambiguous.filter(node=>node.type==='turn-process').length,1,'Only the current status remains when historical events have ambiguous ownership');
 assert.deepEqual(ambiguous.filter(node=>node.type==='ConversationAnswer').map(node=>node.props.source.conversationIndex),[1,3]);
 assert.equal(ambiguous.find(node=>node.type==='ConversationAnswer').props.text,'Failed response');
 const saved=render(props(run,{traceTurns:[],savedTurns:[{conversationIndex:0,error:'Recorded error'}]}));
 assert.equal(saved.filter(node=>node.type==='turn-process')[0].props.status,'failed');
});

test('current unknown status and historical native records remain visible',()=>{
 const run=task('hosted',[{prompt:'First'},{answer:'Earlier'},{prompt:'Next'},{answer:'Latest'}]);
 run.status='unknown';run.conversation[1].nativeMessages=[{id:'native',text:'Recorded update',finish:null}];
 const tree=render(props(run));
 const processes=tree.filter(node=>node.type==='turn-process');
 assert.equal(processes.length,2);assert.equal(processes[0].props.nativeMessages[0].text,'Recorded update');
 assert.equal(processes[1].props.status,'unknown');
});

test('streamed and saved fallback answers retain actual answer text instead of a UI status summary',()=>{
 const stream=task('task-stream',[]);stream.status='running';
 const message={id:'assistant-a',role:'assistant',parts:[{type:'text',text:'Actual streamed answer with details.'}]};
 let tree=render(props(stream,{messages:[message],executing:true,busy:true,responseSummary:'Short status only.'}));
 let answer=tree.find(node=>node.type==='ConversationAnswer');assert.equal(answer.props.text,'Actual streamed answer with details.');assert.equal(answer.props.source.state,'streaming');
 const saved=task('task-saved',[]);saved.data.answer='Actual saved answer with details.';
 tree=render(props(saved,{messages:[{id:'user-a',role:'user',parts:[{type:'text',text:'Prompt'}]}],responseSummary:'Short status only.'}));
 answer=tree.find(node=>node.type==='ConversationAnswer');assert.equal(answer.props.text,'Actual saved answer with details.');assert.equal(answer.props.source.state,'saved');
});

test('a streaming answer draft shows as a draft in the latest turn until the saved answer arrives',()=>{
 const draft={id:'a',role:'assistant',parts:[{type:'text',text:'Draft so far',state:'streaming'}]};
 const running=task('task-draft',[{prompt:'Where?'}]);running.status='running';
 let tree=render(props(running,{messages:[draft],executing:true,busy:true}));
 assert.equal(tree.find(node=>node.type==='DraftAnswer').props.text,'Draft so far');
 assert.equal(tree.some(node=>node.type==='ConversationAnswer'),false);
 const saved=task('task-draft',[{prompt:'Where?',answer:'Checked answer.'}]);
 tree=render(props(saved,{messages:[draft],executing:true,busy:true}));
 assert.equal(tree.some(node=>node.type==='DraftAnswer'),false,'the saved answer replaces the draft');
 assert.equal(tree.find(node=>node.type==='ConversationAnswer').props.text,'Checked answer.');
 tree=render(props(running,{messages:[draft],executing:false}));
 assert.equal(tree.some(node=>node.type==='DraftAnswer'),false,'a finished run keeps no draft');
});

test('split answer transfers exact presentation and turn id while retaining raw source identity',()=>{
 const presentation={schemaVersion:1,taskId:'task-a',turnId:'execution-a',answerHash:'a'.repeat(64),summary:'Actual answer.',nextPrompts:[]};
 const run=task('task-a',[{prompt:'Prompt'},{answer:'Actual answer.',turnId:'execution-a',presentation}]);
 const tree=render(props(run,{traceTurns:[[event(0,'completed')]]}));
 const answers=tree.filter(node=>node.type==='ConversationAnswer');assert.equal(answers.length,1);
 assert.equal(answers[0].props.turnId,'execution-a');assert.equal(answers[0].props.presentation,presentation);
 assert.equal(answers[0].props.source.conversationIndex,1);assert.equal(answers[0].props.source.key,'task-a:answer:1');
});

test('pending stop is visible while paused controls and pending answers are withheld',()=>{
 const run=task('a',[{prompt:'Read'},{answer:'Paused'}]);run.status='paused_recovery';
 let tree=render(props(run,{cancelPending:true,traceTurns:[[event(0,'cancel_requested')]]}));
 assert.equal(tree.find(node=>node.type==='turn-process').props.status,'cancel_requested');
 assert.ok(tree.some(node=>node.props.role==='status'&&elements(node).some(child=>child.type==='strong'&&child.props.children==='Stop requested')));
 assert.equal(tree.some(node=>node.type==='Button'&&node.props.children==='Continue task'),false);
 run.status='needs_input';run.data.agent_question={id:'q',question:'Question'};
 tree=render(props(run,{cancelPending:true}));assert.equal(tree.some(node=>node.type==='AgentQuestions'),false);
});

test('turn identity is never inferred from adjacency or matching event group counts',()=>{
 const {conversationTurns,turnEvents}=conversationHelpers;
 assert.equal(conversationTurns([{prompt:'A',turnId:'a'},{answer:'B',turnId:'b'}]).length,2);
 assert.equal(conversationTurns([{prompt:'A',turnId:'a'},{answer:'B'}]).length,2);
 assert.equal(conversationTurns([{prompt:'A'},{answer:'B',turnId:'a'}]).length,2);
 const turns=conversationTurns([{prompt:'A',turnId:'a'},{answer:'A',turnId:'a'},{prompt:'B',turnId:'b'}]);
 assert.deepEqual(turnEvents(turns,[[{turnId:'b',index:0}],[{turnId:'a',index:1}]],0).map(e=>e.index),[1]);
 assert.deepEqual(turnEvents(turns,[[{index:0}],[{index:1}]],0),[]);
 assert.deepEqual(turnEvents(turns,[[{turnId:'b',index:0}]],0),[]);
});

test('task scheduler is not attributed to an unrelated conversation turn',()=>{
 const run=task('task-a',[{prompt:'Initial',answer:'Done',turnId:'initial'},{prompt:'Follow up',answer:'Done',turnId:'next'}]);
 run.data.agent_scheduler={steps:[{stepId:'prior',status:'completed'}]};
 let nodes=render(props(run)); assert.equal(nodes.filter(n=>n.type==='turn-process').at(-1).props.scheduler,undefined);
 run.data.agent_scheduler.turnId='initial';nodes=render(props(run)); assert.equal(nodes.filter(n=>n.type==='turn-process').at(-1).props.scheduler,undefined);
 run.data.agent_scheduler.turnId='next';nodes=render(props(run)); assert.equal(nodes.filter(n=>n.type==='turn-process').at(-1).props.scheduler,run.data.agent_scheduler);
});


test('room schedule describes graph estimates and preserves unknown source basis',()=>{
 const run={...task('legacy-plan'),mode:'plan',data:{plan:{version:1,fingerprint:'f',brief:{} }}};
 const schedule=previewRooms=>render(props(run,{mode:'plan',previewSvg:'<svg/>',previewRooms})).find(node=>node.type==='details'&&node.props.className==='plan-schedule');
 const words=node=>React.isValidElement(node)?React.Children.toArray(node.props.children).map(words).join(' '):node==null?'':String(node);
 const graph=words(schedule([{name:'Bedroom',expectedAreaM2:15.9831,areaBasis:'estimated-clear'},{name:'Irregular',expectedAreaM2:null,areaBasis:'estimated-clear'}]));
 assert.match(graph,/Estimated clear areas/);assert.match(graph,/16\.0 m²/);assert.match(graph,/Unavailable/);
 const legacy=words(schedule([{name:'Native',expectedAreaM2:12}]));
 assert.match(legacy,/Area basis is not provided/);assert.doesNotMatch(legacy,/Estimated clear areas/);
});

test('actual historical process refuses invalid or contradictory outcomes without borrowing completion',()=>{
 const outcome={schemaVersion:1,taskId:'task-a',turnId:'one',executionId:'exec-one',status:'needs_connection'};
 const make=(value=outcome)=>task('task-a',[{prompt:'First',answer:'Original answer',turnId:'one',recordedOutcome:value},{prompt:'Next',answer:'Later answer',turnId:'two'}]);
 const status=(run, events=[],savedTurns=[])=>render(props(run,{traceTurns:[events],savedTurns})).filter(node=>node.type==='turn-process')[0]?.props.status;
 const complete={...event(1,'completed'),turnId:'one',executionId:'exec-one'};
 assert.equal(status(make(),[complete]),'needs_connection');
 assert.equal(status(make({...outcome,taskId:'other'}),[complete]),'unknown');
 assert.equal(status(make(),[{...event(0,'failed'),turnId:'one',executionId:'exec-one'},complete]),'unknown');
 assert.equal(status(make(),[{...event(0,'paused_limit'),turnId:'one',executionId:'exec-one'}]),'paused_limit');
 assert.equal(status(make(),[complete],[{conversationIndex:0,error:'failed'}]),'failed');
 const duplicate=make(); duplicate.conversation.splice(1,0,{prompt:'Another',answer:'More',turnId:'one'});
 assert.equal(status(duplicate,[complete]),'unknown');
 assert.equal(status(make(),[{...complete,executionId:'other'}]),'unknown');
 for (const [first,second] of [['failed','paused_limit'],['paused_limit','failed'],['cancelled','failed'],['completed','failed'],['failed','completed']]) {
  assert.equal(status(make(),[first,second].map((stage,index)=>({...event(index,stage),turnId:'one',executionId:'exec-one'}))),'unknown');
 }
 for (const stage of ['failed','paused_limit']) {
  assert.equal(status(make(),[{...event(0,stage),turnId:'one',executionId:'other'}]),'unknown');
  assert.equal(status(make(),[{...event(0,stage),turnId:'one'}]),'unknown');
 }
 const nodes=render(props(make(),{traceTurns:[[complete]]}));
 assert.equal(nodes.find(node=>node.type==='ConversationAnswer').props.text,'Original answer');
 assert.equal(nodes.find(node=>node.type==='ConversationAnswer').props.source.conversationIndex,0);
});

test('concept access entry follows confirmed Build mode and keeps device grants revocable', () => {
  const run = { ...task('concept'), mode: 'plan', data: { agent_design: { briefId: 'brief-a', candidates: [] } } };
  const device = { online: true };
  let grants = 0, revocations = 0;
  const options = { selectedDevice: device, revitSessions: 1, grantVariable: () => { grants++; }, revokeVariableGrant: () => { revocations++; } };
  const findText = (tree, text) => tree.find(node => node.props.children === text);
  const words = node => React.isValidElement(node) ? React.Children.toArray(node.props.children).map(words).join(' ') : String(node ?? '');
  const card = tree => tree.find(node => node.props.className === 'agent-evidence-card' && words(node).includes('Concept access'));
  assert.equal(card(render(props(run, options))), undefined);
  assert.equal(card(render(props({ ...run, mode: undefined }, options))), undefined);
  assert.equal(card(render(props({ ...run, mode: 'build' }, { ...options, mode: 'plan' }))), undefined);
  assert.equal(card(render(props({ ...run, mode: 'build' }, { ...options, mode: 'ask' }))), undefined);
  assert.equal(card(render(props(run, { ...options, mode: 'build' }))), undefined);
  const build = render(props({ ...run, mode: 'build' }, { ...options, mode: 'build' }));
  const enable = findText(build, 'Enable for selected concept');
  assert.ok(enable);
  enable.props.onClick();
  assert.equal(grants, 1);
  assert.equal(card(render(props(run, options))), undefined, 'Returning to Plan hides the ungranted entry');
  for (const [grant, data, expected] of [
    [{ binding: { briefId: 'brief-a' }, remaining: 1 }, run.data, 'enabled for this concept'],
    [{ binding: { briefId: 'brief-b' }, remaining: 1 }, run.data, 'enabled for a different concept'],
    [{ binding: {}, remaining: 1 }, run.data, 'concept could not be identified'],
    [{ remaining: 1 }, run.data, 'concept could not be identified'],
    [{ binding: { briefId: 'brief-a' }, remaining: 1 }, {}, 'concept could not be identified'],
  ]) {
    for (const mode of ['plan', 'build', undefined]) {
      const tree = render(props({ ...run, mode, data }, { ...options, selectedDevice: { ...device, online: false, agentControl: grant } }));
      assert.match(words(card(tree)), new RegExp(expected));
      assert.equal(findText(tree, 'Enable for selected concept'), undefined);
      const revoke = findText(tree, 'Revoke access');
      assert.ok(revoke);
      revoke.props.onClick();
    }
  }
  assert.equal(revocations, 15);
});
import { nativeBatchProgress } from '../src/lib/conversation-result.mjs';

test('native progress card follows verified build history, not web concept readiness', () => {
  const base = task('progress', [{prompt:'Prepare a concept'}]);
  base.status = 'running';
  base.mode = 'plan';
  base.data.agent_result = {status:'in_progress'};
  const webCount = nativeBatchProgress(base);
  let tree = render(props(base, {batchInProgress:webCount>0,batchProgressCount:webCount}));
  assert.equal(tree.some(node => node.props.className === 'agent-evidence-card' && node.props.role === 'status'),false);
  const build = {...base,mode:'build',data:{agent_result:{status:'in_progress',batchHistory:[{operationId:'op-1',state:'verified',nativeStatus:'verified'}]}}};
  const buildCount = nativeBatchProgress(build);
  tree = render(props(build, {batchInProgress:buildCount>0,batchProgressCount:buildCount}));
  const card = tree.find(node => node.props.className === 'agent-evidence-card' && node.props.role === 'status');
  assert.ok(card);
  const strong = elements(card).find(node => node.type === 'strong');
  assert.deepEqual(React.Children.toArray(strong.props.children),[1,' verified native ','batch']);
});



test('actual conversation passes only a structurally bound completion to the saved answer',()=>{
 const completion={schemaVersion:1,taskId:'task-a',turnId:'turn-a',executionId:'exec-a',answerHash:'a'.repeat(64),status:'completed',completionSequence:8};
 const presentation={composition:{schemaVersion:1}};
 const run=task('task-a',[{prompt:'Question',turnId:'turn-a'},{answer:'Saved answer',turnId:'turn-a',completion,presentation}]);
 const events=[{...event(1,'answer'),taskId:'task-a',turnId:'turn-a',executionId:'exec-a',sequence:5,detail:'Saved answer'},{...event(2,'completed'),taskId:'task-a',turnId:'turn-a',executionId:'exec-a',sequence:8}];
 let answer=render(props(run,{traceTurns:[events]})).find(node=>node.type==='ConversationAnswer');
 assert.equal(answer.props.completion,completion);assert.equal(answer.props.presentation,presentation);assert.equal(answer.props.completed,false);
 run.conversation[1].completion={...completion,taskId:'other'};
 answer=render(props(run,{traceTurns:[events]})).find(node=>node.type==='ConversationAnswer');
 assert.equal(answer.props.completion,undefined);assert.equal(answer.props.completed,false,'malformed explicit binding cannot fall back to event proof');
 run.conversation[1].completion=completion;
 answer=render(props(run,{traceTurns:[[...events,{...event(3,'failed'),taskId:'task-a',turnId:'turn-a',executionId:'exec-a',sequence:9}]]})).find(node=>node.type==='ConversationAnswer');
 assert.equal(answer.props.completion,undefined);assert.equal(answer.props.completed,false);
 answer=render(props(run,{traceTurns:[events],savedTurns:[{conversationIndex:0,error:'Recorded failure'}]})).find(node=>node.type==='ConversationAnswer');
 assert.equal(answer.props.completion,undefined,'a saved failure vetoes completion');
 delete run.conversation[1].completion;
 answer=render(props(run,{traceTurns:[events],savedTurns:[{conversationIndex:0,error:'Recorded failure'}]})).find(node=>node.type==='ConversationAnswer');
 assert.equal(answer.props.completed,false,'a saved failure also vetoes event-proof fallback');
 run.conversation[1].completion=completion;
 run.conversation[1].recordedOutcome={schemaVersion:1,taskId:'task-a',turnId:'turn-a',executionId:'exec-a',status:'needs_connection'};
 answer=render(props(run,{traceTurns:[events]})).find(node=>node.type==='ConversationAnswer');
 assert.equal(answer.props.completion,undefined,'a conflicting recorded outcome vetoes completion');
});
