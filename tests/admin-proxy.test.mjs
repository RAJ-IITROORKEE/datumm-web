import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

// @lat: [[contracts#Hosted contract tests#Admin proxy routes]]
test('me/permissions reaches /v1/me/permissions and nothing else under me',async()=>{
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
  for(const method of ['GET','PUT']){calls.length=0;assert.equal((await call('me/permissions',method)).status,200);assert.deepEqual(calls,[{path:'/v1/me/permissions',method}]);}
  for(const path of ['me','me/other','me/permissions/x','me/../config'])assert.equal((await call(path,'GET')).status,404,path);
});

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
  for(const [path,method] of [['admin/config','GET'],['admin/config','PUT'],['admin/config/history','GET'],['admin/config/history/12','GET'],['admin/config/restore','POST'],['admin/audit','GET'],['admin/overview','GET'],['admin/traces','GET'],['admin/models','GET'],['admin/models/test','POST'],['admin/models/usage','GET'],['admin/models/openai/gpt-6-luna/tests','GET'],['admin/models/anthropic/claude-sonnet-5:beta/tests','GET'],['admin/knowledge/sources','GET'],['admin/knowledge/sources','POST'],['admin/knowledge/sources/abc-1','DELETE'],['admin/knowledge/sources/abc-1/reindex','POST']]){
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
  calls.length=0;
  const usage=await context.exports.GET(new Request('https://x.example/api/service/admin/models/usage?period=30d&model=openai%2Fgpt-6-luna'),{params:Promise.resolve({path:['admin','models','usage']})});
  assert.equal(usage.status,200);
  assert.deepEqual(calls,[{path:'/v1/admin/models/usage?period=30d&model=openai%2Fgpt-6-luna',method:'GET'}]);
  for(const path of ['admin/models/x','admin/models/x/y','admin/models/x/y/z','admin/models/x/y/tests/z','admin/models/../config','admin/models/../x/tests','admin/models/x/../tests','admin/models/./y/tests','admin/models/test/x','admin/models/usage/x','admin/models/x/y/test','admin/models//y/tests','admin/models/a b/y/tests','admin/models/'+'x'.repeat(81)+'/y/tests','admin','admin/other','admin/config/x','admin/config/other','admin/config/history/x','admin/config/history/12/x','admin/config/history/1234567890','admin/config/restore/1','admin/config/history/-1','admin/traces/x','admin/traces/a/b','admin/knowledge/sources/a/b/c']){
    const blocked=await call(path,'GET');
    assert.equal(blocked.status,404,path);
    assert.equal((await blocked.json()).code,'DATUMM_PROXY_NOT_ALLOWED',path);
  }
});
