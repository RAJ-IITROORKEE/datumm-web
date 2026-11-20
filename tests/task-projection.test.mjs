import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const compile=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const chatStart={};runInNewContext(compile('../src/lib/chat-start.ts'),{exports:chatStart,Response,Error});
const {emptyProjection,reduceProjection}=(()=>{const exports={};
  runInNewContext(compile('../src/lib/task-projection.ts'),{exports,require:()=>chatStart});return exports;})();
const failed=(detail,extra={})=>({stage:'failed',detail,taskId:'task',turnId:'turn',executionId:'run',
  failureCode:'SERVICE_FAILED',index:0,at:'now',...extra});
// Live events and reloaded snapshots both enter the UI through reduceProjection.
const shown=event=>[reduceProjection(emptyProjection(),{event}).events[0],
  reduceProjection(emptyProjection(),{snapshot:{id:'task',events:[event]}}).events[0]];

test('failed events never expose HTML while retaining provenance and the source event',()=>{
  for(const html of ['<!DOCTYPE HTML><html><body>CloudFront error</body></html>',
    '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>Gateway</body></html>']){
    const event=failed(html);
    for(const view of shown(event)){
      assert.ok(!view.detail.includes('<'));
      assert.match(view.detail,/saved task/i);
      for(const key of ['taskId','turnId','executionId','failureCode','index'])assert.equal(view[key],event[key]);
    }
    assert.equal(event.detail,html);
  }
});

test('usage limits keep their meaning; ordinary failures and answers stay exact',()=>{
  const usage=failed('BUDGET_EXHAUSTED: the shared agent_model_calls allowance is exhausted.',
    {failureCode:'BUDGET_EXHAUSTED'});
  for(const view of shown(usage)){assert.match(view.detail,/usage limit/i);assert.equal(view.failureCode,'BUDGET_EXHAUSTED');}
  for(const view of shown(failed('Connect Revit and select one session.')))
    assert.equal(view.detail,'Connect Revit and select one session.');
  const answer={stage:'answer',detail:'Use `<div>` tags: `<html><body>Keep this</body></html>`.',index:0,at:'now'};
  for(const view of shown(answer))assert.equal(view,answer);
});

test('bootstrap keeps scoped early events and a saved read drains any gap that it covers',()=>{
 const row=(sequence,taskId='task')=>({stage:'running',index:sequence-1,sequence,taskId,detail:String(sequence)});
 let state=reduceProjection(emptyProjection(),{event:row(3)});
 state=reduceProjection(state,{event:row(4,'foreign')});
 state=reduceProjection(state,{event:row(4)});
 state=reduceProjection(state,{snapshot:{id:'task',taskVersion:1,eventCursor:1,events:[row(1)]}});
 assert.equal(state.cursor,1);
 assert.equal(state.pending.length,2);
 state=reduceProjection(state,{snapshot:{id:'task',taskVersion:2,eventCursor:2,events:[row(1),row(2)]}});
 assert.equal(state.cursor,4);
 assert.equal(state.pending.length,0);
 assert.equal(state.events.map(event=>event.detail).join(),'1,2,3,4');
 state=reduceProjection(state,{snapshot:{id:'task',taskVersion:3,eventCursor:3,events:[row(1),row(2),row(3)]}});
 assert.equal(state.events.map(event=>event.detail).join(),'1,2,3,4');
});
