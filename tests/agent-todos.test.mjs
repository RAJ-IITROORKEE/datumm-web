import assert from 'node:assert/strict';
import test from 'node:test';
import {deriveTodos,todoSummary} from '../src/lib/agent-todos.mjs';

const plan={steps:[{key:'a',title:'Read model'},{key:'b',title:'Draft plan'},{key:'c',title:'Check'}],progress:[{key:'a',status:'completed'}]};

// @lat: [[contracts#Hosted contract tests#Agent plan checklist]]
test('plan steps map progress to done and pending',()=>{
 const items=deriveTodos({plan});
 assert.deepEqual(items.map(i=>i.status),['done','pending','pending']);
 assert.deepEqual(todoSummary(items),{done:1,total:3,allDone:false,current:undefined,optional:0});
});

test('an active task does not invent which pending plan step is running',()=>{
 const items=deriveTodos({plan,active:true});
 assert.deepEqual(items.map(i=>i.status),['done','pending','pending']);
 assert.equal(todoSummary(items).current,undefined);
});

test('falls back to native todos and reports all done',()=>{
 const items=deriveTodos({todos:[{content:'One',status:'completed'},{content:'Two',status:'completed'}]});
 assert.equal(todoSummary(items).allDone,true);
 assert.deepEqual(deriveTodos({todos:[{content:'X',status:'in_progress'}],active:true}).map(i=>i.status),['running']);
 assert.deepEqual(deriveTodos({todos:[{content:'X',status:'in_progress'}]}).map(i=>i.status),['unconfirmed']);
});

test('only required steps count toward completion, and optional skips need a saved status',()=>{
 const items=deriveTodos({plan:{
  steps:[...plan.steps.map(step=>({...step,required:step.key==='a'})),{key:'legacy',title:'Legacy'}],
  progress:[...plan.progress,{key:'b',status:'skipped'},{key:'legacy',status:'skipped'}],
 },settled:true});
 assert.deepEqual(items.map(item=>item.status),['done','skipped','unconfirmed','unknown']);
 assert.deepEqual(todoSummary(items),{done:1,total:2,allDone:false,current:undefined,optional:2});
 const saved=deriveTodos({todos:[{content:'Required',status:'completed'},{content:'Optional',status:'skipped',required:false}]});
 assert.deepEqual(saved.map(item=>item.status),['done','skipped']);
 assert.deepEqual(todoSummary(saved),{done:1,total:1,allDone:true,current:undefined,optional:1});
});

test('no plan and no todos yields nothing',()=>{
 assert.deepEqual(deriveTodos({active:true}),[]);
 assert.equal(todoSummary([]).allDone,false);
});

test('stage spans remain process evidence and never become invented checklist completion',()=>{
 const spans=[{id:'1',title:'Read',done:true},{id:'5',title:'Answer',done:false}];
 assert.deepEqual(deriveTodos({spans,active:true}),[]);
 assert.deepEqual(deriveTodos({spans,active:false}),[]);
 assert.equal(deriveTodos({plan,spans}).length,3);
});

test('recorded failure, stopped and unknown states cannot become success or running',()=>{
 const todos=['failed','cancelled','new_server_status','pending'].map((status,index)=>({content:String(index),status}));
 assert.deepEqual(deriveTodos({todos,active:true}).map(item=>item.status),['failed','stopped','unknown','pending']);
});

test('settled recorded pending steps remain unconfirmed, and partial and failed stay distinct',()=>{
 const fixture=JSON.parse(readFileSync(new URL('./fixtures/revision-flow-v4-progress-usage.json',import.meta.url),'utf8'));
 assert.deepEqual(deriveTodos({plan:fixture.data.agent_task_plan,settled:true}).map(i=>i.status),['done','unconfirmed','unconfirmed']);
 assert.deepEqual(deriveTodos({todos:[{content:'Partial',status:'partial'},{content:'Failed',status:'failed'},{content:'Unknown',status:'future'}],settled:true}).map(i=>i.status),['partial','failed','unknown']);
});
import {readFileSync} from 'node:fs';
