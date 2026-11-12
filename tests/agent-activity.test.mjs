import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import {activityStateLabel} from '../src/lib/process-activity.mjs';

const code=ts.transpileModule(readFileSync(new URL('../src/components/agent-activity.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};
const evidenceChildren=[];
runInNewContext(code,{exports,Date,require(name){
 if(name==='react/jsx-runtime')return jsxRuntime;
 if(name==='@/lib/process-activity.mjs')return {activityStateLabel};
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
function text(tree){if(typeof tree==='string'||typeof tree==='number')return String(tree);if(!React.isValidElement(tree))return '';return React.Children.toArray(tree.props.children).map(text).join('');}
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
  assert.match(text(tree),/0\.0s/);
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
  const summary=find(tree,e=>e.props.className==='toolSummary');
  assert.match(text(summary),new RegExp(label));assert.doesNotMatch(text(summary),/Completed/);
  assert.match(text(tree),new RegExp(status));
  if(['pending','queued','running'].includes(status))assert.match(text(tree),/No final tool outcome was recorded/);
 }
 assert.match(text(find(render({active:true,evidence:[tool({status:'pending'})]}),e=>e.props.className==='toolSummary')),/Pending/);
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
  assert.equal(text(find(tree,e=>e.type==='pre'&&e.props['aria-label']==='Result details')),result);
  assert.ok(all(tree,e=>e.type==='details').every(e=>!Object.hasOwn(e.props,'open')),'Native disclosure state belongs to the user across event changes');
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
  assert.match(text(find(tree,e=>e.props.className==='toolSummary')),/Outcome unconfirmed/);
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
 assert.deepEqual(Array.from(activity.events,row=>row.index),[3,4]);
});
