import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

// @lat: [[contracts#Hosted contract tests#Ask and Plan proxy routes]]
test('Ask and Plan controls reach v2 without opening native routes or changing Azure routing',async()=>{
  const calls=[];
  const backend=async(path,init)=>{calls.push({path,init});return Response.json(path==='/v2/tasks/saved-build'?{executionId:'original-execution'}:{ok:true});};
  const source=readFileSync(new URL('../src/app/api/service/[...path]/route.ts',import.meta.url),'utf8');
  const context={exports:{},Response,Headers,URL,Buffer,console,require:name=>{
    if(name==='@/lib/backend')return {backend};
    if(name==='@/lib/request-body')return {requestBody:request=>request.text()};
    if(name==='@/lib/plan-pdf')return {};
    throw Error(`Unexpected import: ${name}`);
  }};
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  const proxy=async(path,method='POST')=>context.exports[method](new Request(`https://preview.example/api/service/${path}?after=3`,{method,body:method==='GET'?undefined:'{"answer":"Keep the plan"}'}),{params:Promise.resolve({path:path.split('/')})});
  for(const [action,method] of [['questions/answer','POST'],['cancel','POST'],['queue','POST'],['queue/resume','POST'],['queue/1234-abcd','DELETE'],['design-review','POST'],['commands','POST'],['events','GET']]){
    calls.length=0;
    assert.equal((await proxy(`tasks/canary-task/${action}`,method)).status,200,action);
    assert.equal(calls.length,1);
    assert.equal(calls[0].path,`/v2/tasks/canary-task/${action}?after=3`);
    assert.equal(calls[0].init.method,method);
    assert.equal(calls[0].init.body,method==='GET'?undefined:'{"answer":"Keep the plan"}');
  }
  for(const action of ['build/approve','design/build','queue/not-a-hex-id','questions/unknown','unknown']){
    calls.length=0;
    assert.equal((await proxy(`tasks/canary-task/${action}`)).status,404,action);
    assert.equal(calls.length,0);
  }
  calls.length=0;
  assert.equal((await proxy('runs/saved-build/cancel')).status,200);
  assert.deepEqual(calls.map(call=>call.path),['/v2/tasks/saved-build','/v1/runs/original-execution/cancel?after=3']);
});
