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
  for(const [path,method] of [['admin/config','GET'],['admin/config','PUT'],['admin/audit','GET'],['admin/overview','GET'],['admin/knowledge/sources','GET'],['admin/knowledge/sources','POST'],['admin/knowledge/sources/abc-1','DELETE'],['admin/knowledge/sources/abc-1/reindex','POST']]){
    calls.length=0;
    assert.equal((await call(path,method)).status,200,path);
    assert.deepEqual(calls,[{path:`/v1/${path}`,method}]);
  }
  for(const path of ['admin','admin/other','admin/config/x','admin/knowledge/sources/a/b/c'])assert.equal((await call(path,'GET')).status,404,path);
});
