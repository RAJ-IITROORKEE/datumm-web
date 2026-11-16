import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

// @lat: [[contracts#Hosted contract tests#Admin proxy routes]]
test('admin routes reach /v1/admin and nothing else under admin is open',async()=>{
  const calls=[];
  const source=readFileSync(new URL('../src/app/api/service/[...path]/route.ts',import.meta.url),'utf8');
  const context={exports:{},Response,Headers,URL,Buffer,console,require:name=>{
    if(name==='@/lib/backend')return {backend:async(path,init)=>{calls.push({path,method:init.method});return Response.json({ok:true});}};
    if(name==='@/lib/request-body')return {requestBody:request=>request.text()};
    if(name==='@/lib/plan-pdf')return {};
    throw Error(`Unexpected import: ${name}`);
  }};
  runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  const call=(path,method)=>context.exports[method](new Request(`https://x.example/api/service/${path}`,{method,body:method==='GET'?undefined:'{}'}),{params:Promise.resolve({path:path.split('/')})});
  for(const [path,method] of [['admin/config','GET'],['admin/config','PUT'],['admin/config/history','GET'],['admin/config/history/12','GET'],['admin/config/restore','POST'],['admin/audit','GET'],['admin/overview','GET'],['admin/traces','GET'],['admin/knowledge/sources','GET'],['admin/knowledge/sources','POST'],['admin/knowledge/sources/abc-1','DELETE'],['admin/knowledge/sources/abc-1/reindex','POST']]){
    calls.length=0;
    assert.equal((await call(path,method)).status,200,path);
    assert.deepEqual(calls,[{path:`/v1/${path}`,method}]);
  }
  calls.length=0;
  const hist=await context.exports.GET(new Request('https://x.example/api/service/admin/config/history?before=9&limit=20'),{params:Promise.resolve({path:['admin','config','history']})});
  assert.equal(hist.status,200);
  assert.deepEqual(calls,[{path:'/v1/admin/config/history?before=9&limit=20',method:'GET'}]);
  calls.length=0;
  const traces=await context.exports.GET(new Request('https://x.example/api/service/admin/traces?period=7d&feedback=down'),{params:Promise.resolve({path:['admin','traces']})});
  assert.equal(traces.status,200);
  assert.deepEqual(calls,[{path:'/v1/admin/traces?period=7d&feedback=down',method:'GET'}]);
  for(const path of ['admin','admin/other','admin/config/x','admin/config/other','admin/config/history/x','admin/config/history/12/x','admin/config/history/1234567890','admin/config/restore/1','admin/config/history/-1','admin/traces/x','admin/traces/a/b','admin/knowledge/sources/a/b/c']){
    const blocked=await call(path,'GET');
    assert.equal(blocked.status,404,path);
    assert.equal((await blocked.json()).code,'DATUMM_PROXY_NOT_ALLOWED',path);
  }
});
