import assert from 'node:assert/strict';
import test from 'node:test';
import {deriveTodos,todoSummary} from '../src/lib/agent-todos.mjs';

const plan={steps:[{key:'a',title:'Read model'},{key:'b',title:'Draft plan'},{key:'c',title:'Check'}],progress:[{key:'a',status:'completed'}]};

// @lat: [[contracts#Hosted contract tests#Agent plan checklist]]
test('plan steps map progress to done and pending',()=>{
 const items=deriveTodos({plan});
 assert.deepEqual(items.map(i=>i.status),['done','pending','pending']);
 assert.deepEqual(todoSummary(items),{done:1,total:3,allDone:false,current:undefined});
});

test('an active turn marks the first unfinished step as running',()=>{
 const items=deriveTodos({plan,active:true});
 assert.deepEqual(items.map(i=>i.status),['done','running','pending']);
 assert.equal(todoSummary(items).current.title,'Draft plan');
});

test('falls back to native todos and reports all done',()=>{
 const items=deriveTodos({todos:[{content:'One',status:'completed'},{content:'Two',status:'completed'}]});
 assert.equal(todoSummary(items).allDone,true);
 assert.deepEqual(deriveTodos({todos:[{content:'X',status:'in_progress'}]}).map(i=>i.status),['running']);
});

test('no plan and no todos yields nothing',()=>{
 assert.deepEqual(deriveTodos({active:true}),[]);
 assert.equal(todoSummary([]).allDone,false);
});
