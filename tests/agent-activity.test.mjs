import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import {activityStateLabel} from '../src/lib/process-activity.mjs';
import * as conversationHelpers from '../src/lib/conversation-turns.mjs';

// Execute the actual licensed M6 components, with their hooks and asynchronous handlers.
function vendorHarness(name, clipboard) {
 const slots=[], pending=[], timers=new Map(); let cursor=0, timerId=0, intervals=0;
 const slot=initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial();return i;};
 const hooks={...React,
  useState(initial){const i=slot(()=>typeof initial==='function'?initial():initial);return[slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];},
  useRef(initial){return slots[slot(()=>({current:initial}))];},useId(){return 'vendor-test';},
  useEffect(setup,deps){const i=cursor++;const old=slots[i];if(!old||!deps||deps.some((d,j)=>!Object.is(d,old.deps?.[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:setup()};});},
  useLayoutEffect(setup,deps){return hooks.useEffect(setup,deps);},
 };
 const module={};const path=`../src/components/vendor/affectui/${name}-clean.tsx`;
 const source=readFileSync(new URL(path,import.meta.url),'utf8')+(name==='tool-call-card'?'\nexport { toText as testToText, formatMs as testFormatMs, CodeSection as TestCodeSection, CopyButton as TestCopyButton };':'');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(compiled,{exports:module,Date,navigator:{clipboard},document:{createElement(){return {value:'',style:{},select(){},remove(){}};},body:{appendChild(){}},execCommand(){return false;}},window:{setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},setInterval(){intervals++;return ++timerId;},clearInterval(){},matchMedia(){return{matches:true};}},require(id){if(id==='react')return hooks;if(id==='react/jsx-runtime')return jsxRuntime;throw Error(id);}});
 return{module,render(name,props){cursor=0;return module[name](props);},flush(){pending.splice(0).forEach(fn=>fn());},unmount(){slots.forEach(s=>s?.cleanup?.());},timers,intervals:()=>intervals};
}

test('licensed tool card preserves exact strings, non-string values and zero duration',()=>{
 const h=vendorHarness('tool-call-card');
 for(const value of [' {"id":9007199254740993} \n','{"a":1,"a":2}','',null,false,0,[],{}]){
  const serialized=h.module.testToText(value);
  assert.equal(serialized.text,typeof value==='string'?value:JSON.stringify(value,null,2));
  assert.equal(serialized.json,typeof value!=='string');
  const section=h.render('TestCodeSection',{label:'Result',value,cap:220});
  assert.equal(text(find(section,e=>e.type==='pre')),serialized.text);
 }
 assert.equal(h.module.testFormatMs(0,false),'0ms');
});

test('recorded tool cards keep extended states neutral and never mount a stopwatch',()=>{
 const h=vendorHarness('tool-call-card');
 for(const [status,label] of [['pending','Pending'],['queued','Queued'],['waiting','Waiting for input'],['awaiting_approval','Waiting for approval'],['stopped','Stopped'],['interrupted','Interrupted'],['blocked','Blocked'],['partial','Partially complete'],['stale','Source changed'],['skipped','Skipped'],['paused_limit','Paused at task limit'],['paused_recovery','Recovery required'],['reconciling','Checking operation status'],['unconfirmed','Outcome unconfirmed'],['unknown','Unknown status']]){
  const tree=h.render('ToolCallCard',{name:'read_model',status,duration:0,timing:'recorded',openOnError:false});
  assert.match(text(tree),new RegExp(label));assert.match(text(tree),/0ms/);
  assert.equal(all(tree,e=>typeof e.type==='function'&&['Spinner','ErrorIcon','LiveDuration'].includes(e.type.name)).length,0);
 }
 for(const duration of [undefined,-1,NaN,Infinity]){
  const tree=h.render('ToolCallCard',{name:'read_model',status:'running',duration,timing:'recorded'});
  assert.doesNotMatch(text(find(tree,e=>e.props.className==='ui-tclc__time')),/NaN|Infinity|\d+ms|\d+\.\d+s/);
  assert.equal(all(tree,e=>typeof e.type==='function'&&e.type.name==='LiveDuration').length,0);
 }
 h.flush();assert.equal(h.intervals(),0);
});

const copyAction=tree=>find(tree,e=>e.type==='button'&&e.props['aria-label']==='Copy message');
test('message copy awaits the exclusive operation and reports denied or missing clipboard',async()=>{
 let release, fallbackCalls=0;const deferred=new Promise(resolve=>{release=resolve;});
 const h=vendorHarness('message-actions',{writeText(){fallbackCalls++;}});
 const props={text:'exact\nanswer',actions:['copy'],onCopy:value=>{assert.equal(value,'exact\nanswer');return deferred;}};
 let tree=h.render('MessageActions',props);h.flush();const pending=copyAction(tree).props.onClick();
 tree=h.render('MessageActions',props);assert.doesNotMatch(text(tree),/Copied/);assert.equal(fallbackCalls,0);
 release();await pending;tree=h.render('MessageActions',props);assert.match(text(tree),/Copied/);
 for(const clipboard of [undefined,{writeText:async()=>{throw Error('denied');}}]){
  const denied=vendorHarness('message-actions',clipboard);let rendered=denied.render('MessageActions',{text:'answer',actions:['copy']});denied.flush();
  await copyAction(rendered).props.onClick();rendered=denied.render('MessageActions',{text:'answer',actions:['copy']});
  assert.match(text(rendered),/Copy failed/);assert.doesNotMatch(text(rendered),/Copied/);
 }
});

test('message copy rejects obsolete text, disabled and unmounted completions synchronously',async()=>{
 for(const change of ['text','disabled','unmount']){
  let release;const h=vendorHarness('message-actions');const props={text:'before',actions:['copy'],onCopy:()=>new Promise(resolve=>{release=resolve;})};
  let tree=h.render('MessageActions',props);h.flush();const pending=copyAction(tree).props.onClick();
  const next=change==='text'?{...props,text:'after'}:change==='disabled'?{...props,disabled:true}:props;
  tree=h.render('MessageActions',next);if(change==='unmount')h.unmount();release();await pending;
  tree=h.render('MessageActions',next);assert.doesNotMatch(text(tree),/Copied/);
  if(change==='disabled')assert.ok(all(tree,e=>e.type==='button').every(e=>e.props.disabled));
 }
});

const code=ts.transpileModule(readFileSync(new URL('../src/components/agent-activity.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
const evidenceChildren=[];
const recordedToolHarness=vendorHarness('tool-call-card');
runInNewContext(code,{exports,Date,require(name){
 if(name==='react/jsx-runtime')return jsxRuntime;
 if(name==='./vendor/affectui/tool-call-card-clean')return {ToolCallCard:props=>recordedToolHarness.render('ToolCallCard',props)};
 if(name==='@/lib/process-activity.mjs')return {activityStateLabel};
 if(name==='@/lib/conversation-turns.mjs')return conversationHelpers;
 if(name.endsWith('.module.css'))return {default:new Proxy({},{get:(_,key)=>key})};
 if(name==='lucide-react')return new Proxy({},{get:(_,key)=>Object.assign(()=>null,{displayName:key})});
 if(name==='./ai-elements/message')return {MessageResponse:({children})=>children};
 if(name==='./evidence-results')return Object.fromEntries(['PublicResearchEvidence','PdfReviewEvidence','CompanionReviewEvidence'].map(name=>[name,props=>{evidenceChildren.push([name,props.evidence]);return null;}]));
 throw Error(`Unexpected dependency: ${name}`);
}});

function expand(tree){
 if(!React.isValidElement(tree))return tree;
 if(typeof tree.type==='function')return expand(tree.type(tree.props));
 return React.cloneElement(tree,{},...React.Children.toArray(tree.props.children).map(expand));
}
function elements(tree){if(!React.isValidElement(tree))return [];return [tree,...React.Children.toArray(tree.props.children).flatMap(elements)];}
function text(tree){if(typeof tree==='string'||typeof tree==='number')return String(tree);if(!React.isValidElement(tree)||tree.type==='style')return '';return React.Children.toArray(tree.props.children).map(text).join('');}
const find=(tree,predicate)=>elements(tree).find(predicate);
const all=(tree,predicate)=>elements(tree).filter(predicate);
const props={events:[],mode:'ask',model:'recorded-model'};
const render=(input={})=>expand(exports.AgentActivity({...props,...input}));
const tool=(input={})=>({callId:'call-1',tool:'read_context',status:'completed',...input});
const event=(stage,index=0,detail=stage)=>({stage,index,detail});
const manifest=(input={})=>({taskId:'task-1',sessionId:'session-1',model:'actual-model',mode:'plan',state:'completed',children:[],...input});

test('tool evidence preserves zero, false, null and empty values, with exact identity behind disclosure',()=>{
 for(const value of [0,false,null,'']){
  const tree=render({evidence:[tool({arguments:value,result:value,elapsedMs:0,role:'reader',sessionId:'native-7'})]});
  const blocks=all(tree,e=>e.type==='pre');
  assert.equal(blocks.length,2);
  const expected=typeof value==='string'?value:JSON.stringify(value);
  assert.equal(text(blocks[0]),expected);assert.equal(text(blocks[1]),expected);
  assert.equal(blocks[0].props.tabIndex,0);
  const identity=find(tree,e=>e.type==='details'&&text(e.props.children[0]).startsWith('Tool identity'));
  assert.ok(identity);assert.match(text(identity),/call-1.*native-7.*reader/);
  assert.match(text(tree),/0ms/);
 }
});

test('missing arguments and results stay explicitly unrecorded while a recorded failure remains visible',()=>{
 const tree=render({evidence:[tool({status:'failed'})]});
 assert.match(text(tree),/Arguments were not recorded/);
 assert.match(text(tree),/No result was recorded/);
 assert.match(text(tree),/1 failed/);
 assert.match(text(tree),/Error \/ result/);
 assert.equal(all(tree,e=>e.type==='pre').length,0);
 assert.equal(find(tree,e=>e.props.className==='tool').props['data-state'],'failed');
 assert.doesNotMatch(text(tree),/0\.0s|\$0\.0000/);
});

test('pending, stopped, interrupted and unknown tools never turn into successes after the task ends',()=>{
 const cases=[['pending','Outcome unconfirmed'],['queued','Outcome unconfirmed'],['running','Outcome unconfirmed'],['cancelled','Stopped'],['interrupted','Interrupted'],['future_state','Unknown status']];
 for(const [status,label] of cases){
  const tree=render({evidence:[tool({status})]});
  const summary=find(tree,e=>e.props.className==='ui-tclc__head');
  assert.match(text(summary),new RegExp(label));assert.doesNotMatch(text(summary),/Completed/);
  assert.match(text(tree),new RegExp(status));
  if(['pending','queued','running'].includes(status))assert.match(text(tree),/No final tool outcome was recorded/);
 }
 assert.match(text(find(render({active:true,evidence:[tool({status:'pending'})]}),e=>e.props.className==='ui-tclc__head')),/Pending/);
});

test('a completed manifest retains failed substeps and only supplied duration and cost',()=>{
 const tree=render({manifest:manifest({elapsedMs:1500,budget:{calls:0,reservedUsd:0}}),evidence:[tool({status:'failed',result:{error:'Permission denied'}})]});
 const summary=find(tree,e=>e.props.className==='summary');
 assert.match(text(summary),/Completed.*1 step.*1 failed.*1\.5s/);
 assert.match(text(tree),/Permission denied/);
 assert.match(text(tree),/\$0\.0000/);
 const unknown=render({manifest:manifest({state:'running'})});
 assert.match(text(unknown),/Outcome unconfirmed/);
 assert.doesNotMatch(text(unknown),/elapsed time unavailable while running/);
});

test('long results remain complete inside focusable bounded details and task state never controls disclosure',()=>{
 const result=`line one\n${'x'.repeat(24000)}`;
 for(const active of [true,false]){
  const tree=render({active,evidence:[tool({result})]});
  assert.equal(text(find(tree,e=>e.type==='pre'&&text(e)===result)),result);
  assert.ok(all(tree,e=>e.type==='details').every(e=>!Object.hasOwn(e.props,'open')),'Native disclosure state belongs to the user across event changes');
  assert.equal(find(tree,e=>e.props.className==='ui-tclc__head').props['aria-expanded'],false);
 }
});

test('model events expose the recorded step number without exposing raw model text',()=>{
 const events=[event('model_turn',0,'step 4 · private sample never display'),event('tool_failed',1,'read_context: denied')];
 const tree=render({events});
 assert.doesNotMatch(text(tree),/private sample never display/);
 assert.match(text(tree),/step 4/);
 const summary=expand(exports.ActivitySummary({events,eventDetail:row=>row.detail}));
 assert.doesNotMatch(text(summary),/private sample never display/);
 assert.match(text(summary),/step 4/);
});

test('empty, waiting, stopped and active views use actual lifecycle evidence without invented tools',()=>{
 assert.equal(render(),null);
 assert.match(text(render({waiting:true})),/Waiting for your input/);
 assert.match(text(render({active:true})),/Working/);
 assert.match(text(render({events:[event('cancelled',0,'User stopped task')]})),/Stopped/);
 assert.match(text(render({events:[event('failed',0,'Service failed')]})),/Failed/);
 assert.equal(all(render({active:true}),e=>e.props.className==='tool').length,0);
});

test('queued snapshots stay queued and the selected task lifecycle outranks stale waiting or manifest state',()=>{
 const queued=render({active:true,manifest:manifest({state:'queued'})});
 assert.equal(text(find(queued,e=>e.props.className==='summaryLabel')),'Queued');
 const selected=render({status:'queued',active:true,manifest:manifest({state:'running'})});
 assert.equal(text(find(selected,e=>e.props.className==='summaryLabel')),'Queued');
 for(const [status,label] of [['cancelled','Stopped'],['failed','Failed'],['completed','Completed'],['interrupted','Interrupted']]){
  const tree=render({status,active:true,waiting:true,manifest:manifest({state:'running'}),evidence:[tool({status:'running'})]});
  assert.equal(text(find(tree,e=>e.props.className==='summaryLabel')),label);
  assert.match(text(find(tree,e=>e.props.className==='ui-tclc__head')),/Outcome unconfirmed/);
 }
 const eventFailure=render({events:[event('tool_failed',0,'read_context: access denied')]});
 assert.match(text(find(eventFailure,e=>e.props.className==='summary')),/1 failed/);
});

test('recorded specialists keep identities, incomplete state and partial reported cost',()=>{
 const tree=render({manifest:manifest({children:[{sessionId:'child-1',role:'reader',model:'specialist-model',state:'running',calls:3,knownCostCalls:1,reservedUsd:0.1,reportedUsd:0.02,elapsedMs:100,result:'Inventory result'}]})});
 assert.match(text(tree),/Recorded specialists1/);
 assert.match(text(tree),/Outcome unconfirmed/);
 assert.match(text(tree),/child-1/);
 assert.match(text(tree),/\$0\.0200 · partial/);
 assert.match(text(tree),/Inventory result/);
});

test('public evidence renderers receive the unchanged supplied evidence',()=>{
 const evidence=[tool({result:false})];evidenceChildren.length=0;
 render({evidence});
 assert.equal(evidenceChildren.length,3);
 assert.ok(evidenceChildren.every(([,value])=>value===evidence));
});

test('shared activity batching, turn grouping and latest-task selection preserve their source semantics',()=>{
 const setup=event('skill_loaded',0,'Local setup'),first=event('model_turn',1,'step 1'),read=event('tool_running',2,'Reading datumm_revit_read_context'),vision=event('model_turn',3,'vision · observation'),second=event('model_turn',4,'step 2');
 const batches=exports.activityBatches([second,read,setup,vision,first]);
 assert.deepEqual(Array.from(batches,batch=>Array.from(batch,row=>row.index)),[[0,1,2,3],[4]]);
 const events=[event('queued',0),event('running',1),event('completed',2),event('queued',3),event('tool_failed',4)];
 assert.deepEqual(Array.from(exports.activityTurns(events),turn=>Array.from(turn,row=>row.index)),[[0,1,2],[3,4]]);
 const old=manifest({taskId:'old'}),current=manifest({taskId:'current'}),evidence=[tool()];
 const activity=exports.latestTaskActivity({id:'task-1',status:'failed',conversation:[{},{}],events,data:{run_manifest:old,turns:[{conversationIndex:1,result:{manifest:current,evidence,todos:[]}}]}});
 assert.equal(activity.manifest,current);assert.equal(activity.evidence,evidence);assert.equal(activity.active,false);
 assert.deepEqual(Array.from(activity.events,row=>row.index),[]); assert.equal(activity.taskEvents.length,5);
});


test('actual RecordedTool maps every approved source alias and preserves raw state without terminal promotion',()=>{
 const cases=[['completed','success','Completed'],['complete','success','Completed'],['done','success','Completed'],['succeeded','success','Completed'],['failed','error','Failed'],['error','error','Failed'],['running','running','Running'],['in_progress','running','Running'],['pending','pending','Pending'],['queued','queued','Queued'],['cancelled','stopped','Stopped'],['stopped','stopped','Stopped'],['interrupted','interrupted','Interrupted'],['waiting','waiting','Waiting for input'],['waiting_for_input','waiting','Waiting for input'],['needs_input','waiting','Waiting for input'],['awaiting_approval','awaiting_approval','Waiting for approval'],['blocked','blocked','Blocked'],['partial','partial','Partially complete'],['stale','stale','Source changed'],['skipped','skipped','Skipped'],['paused_limit','paused_limit','Paused at task limit'],['paused_recovery','paused_recovery','Recovery required'],['reconciling','reconciling','Checking operation status'],['recorded','recorded','Recorded activity'],['unconfirmed','unconfirmed','Outcome unconfirmed'],['future_state','unknown','Unknown status'],['','unknown','Unknown status']];
 for(const [source,status,label] of cases){
  const tree=render({active:true,status:'running',evidence:[tool({status:source,elapsedMs:NaN})]});
  const card=find(tree,e=>e.props.className==='ui-tclc');
  assert.equal(card.props['data-status'],status,source);
  assert.match(text(find(card,e=>e.props.className==='ui-tclc__head')),new RegExp(label));
  assert.match(text(tree),new RegExp(source||'Not recorded'));
  assert.equal(all(card,e=>e.props.className==='ui-tclc__spinner').length,status==='running'?1:0);
  assert.equal(all(card,e=>e.props.className==='ui-tclc__retry').length,0);
 }
 const completed=render({active:true,status:'cancelled',evidence:[tool({status:'completed'})]});
 assert.equal(find(completed,e=>e.props.className==='ui-tclc').props['data-status'],'success');
});

test('actual tool payload clipboard preserves exact JSON-looking strings and reports success only after write',async()=>{
 for(const value of [' {"id":9007199254740993} \n','{"a":1,"a":2}','']){
  const writes=[];let release;const h=vendorHarness('tool-call-card',{writeText(text){writes.push(text);return new Promise(resolve=>{release=resolve;});}});
  let tree=h.render('TestCopyButton',{text:value,label:'result'});h.flush();const pending=tree.props.onClick();
  assert.deepEqual(writes,[value]);assert.equal(h.render('TestCopyButton',{text:value,label:'result'}).props['data-copied'],undefined);
  release();await pending;tree=h.render('TestCopyButton',{text:value,label:'result'});assert.equal(tree.props['data-copied'],true);
 }
 const h=vendorHarness('tool-call-card',{writeText:async()=>{throw Error('denied');}});const tree=h.render('TestCopyButton',{text:'result',label:'result'});h.flush();await tree.props.onClick();
 assert.equal(h.render('TestCopyButton',{text:'result',label:'result'}).props['data-copied'],undefined);
});

test('hosted split records and lifecycle commands preserve latest activity without invented turns',()=>{
 const ev=(index,stage,detail)=>({index,stage,detail,at:'2026-11-12T00:00:00Z'});
 const events=[ev(0,'command_accepted','Accepted submit in this task.'),ev(1,'agent_stage_start','Started'),ev(2,'command_accepted','Accepted cancel in this task.'),ev(3,'cancelled','Stopped')];
 assert.equal(exports.activityTurns(events).length,1);
 let result=exports.latestTaskActivity({id:'t',status:'cancelled',conversation:[{prompt:'Inspect'},{answer:'Partial'}],events,data:{}});
 assert.deepEqual(Array.from(result.events,row=>row.index),[]);assert.equal(result.taskEvents.length,4);assert.equal(result.index,0);
 const next=[...events,ev(4,'command_accepted','Accepted chat followup in this task.'),ev(5,'tool_running','Read')];
 result=exports.latestTaskActivity({id:'t',status:'running',conversation:[{prompt:'Inspect'},{answer:'Partial'},{prompt:'Try again'}],events:next,data:{turns:[{conversationIndex:2,result:{todos:[{content:'Inspect',status:'running'}]}}]}});
 assert.deepEqual(Array.from(result.events,row=>row.index),[]); assert.equal(result.taskEvents.length,6);assert.equal(result.todos[0].content,'Inspect');assert.equal(result.index,2);
 const ambiguous=exports.latestTaskActivity({id:'t',status:'running',conversation:[{prompt:'Inspect'},{answer:'Which level?'},{prompt:'Level 2'}],events,data:{opencode_todos:[{content:'Unowned'}]}});
 assert.equal(ambiguous.events.length,0);assert.equal(ambiguous.todos.length,0);
});

test('activity summary keeps answer bodies in diagnostics and names orchestration actions',()=>{
 const answer='| Large | Markdown |\n| --- | --- |\n| private | body |';
 const events=[event('queued',0,'raw queue'),event('running',1,'raw running'),event('agent_action',2,'capture_intent'),event('agent_action',3,'finish_answer'),event('agent_action',4,'lookup_evidence'),event('answer',5,answer),event('completed',6,'raw completion'),event('tool_failed',7,'read failed')];
 const summary=expand(exports.ActivitySummary({events,eventDetail:row=>row.detail}));
 const value=text(summary);
 assert.doesNotMatch(value,/private|raw queue|raw running|raw completion/);
 for(const expected of ['Task queued','Task started','Response saved','Model response finished','Agent action','Understand request','Prepare answer','lookup evidence','read failed'])assert.ok(value.includes(expected),expected);
 assert.equal(events[5].detail,answer,'Full answer event remains unchanged for diagnostics');
});
test('compact activity keeps event details, types and timestamps without changing the default view',()=>{
 const events=[{...event('tool_failed',0,'read failed'),at:'2026-11-15T00:00:00Z'},event('model_turn',1,'step 2 hidden reasoning')];
 const compact=expand(exports.ActivitySummary({events,eventDetail:row=>row.detail,compact:true}));
 const value=text(compact);assert.match(value,/read failed/);assert.match(value,/Tool failed/);assert.match(value,/step 2/);assert.doesNotMatch(value,/hidden reasoning/);
 assert.equal(compact.props['aria-label'],'Task activity');
 const normal=expand(exports.ActivitySummary({events,eventDetail:row=>row.detail}));assert.match(text(normal),/Tool failed/);assert.match(text(normal),/read failed/);
});

test('compact known process steps have readable names while raw records and default labels remain intact',()=>{
 const events=[event('agent_stage_complete',0,'create_design'),event('agent_stage_complete',1,'finish_answer'),event('agent_action',2,'create_design'),event('agent_stage_complete',3,'unknown_step')];
 const compact=text(expand(exports.ActivitySummary({events,compact:true})));
 assert.match(compact,/Create design/);assert.match(compact,/Prepare answer/);assert.match(compact,/unknown_step/);
 const normal=text(expand(exports.ActivitySummary({events})));assert.match(normal,/create_design/);assert.match(normal,/finish_answer/);
 assert.equal(events[0].detail,'create_design');
});
