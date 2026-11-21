import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import test from 'node:test';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import * as sources from '../src/lib/project-sources.mjs';
import {conversationTurns} from '../src/lib/conversation-turns.mjs';

const {PROJECT_SOURCE_LIMIT,PROJECT_SOURCE_JSON_LIMIT,parseProjectSource,parseProjectSources,parseProjectCitations,sourceExactPath,validUpload} = sources;
const sha256 = 'a'.repeat(64);
const file = {projectId:'project-a',sourceId:'source-a',version:2,sha256,filename:'A101.pdf',
  kind:'floor_plan',mediaType:'application/pdf',createdAt:'2026-11-21T12:00:00+00:00',sizeBytes:44};
const scope = {taskId:'task-a',turnId:'turn-a',executionId:'execution-a',answerHash:'b'.repeat(64),projectId:'project-a'};
const citation = {...file, locator:{kind:'file'}};
const wire = {schemaVersion:1,taskId:scope.taskId,turnId:scope.turnId,executionId:scope.executionId,
  answerHash:scope.answerHash,sources:[citation]};
const compile = path => ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}
}).outputText;

test('uploads and revision paths are bounded without browser MIME guesses', () => {
  assert.equal(validUpload({name:'design.PNG',size:PROJECT_SOURCE_LIMIT},'design_image'),'');
  assert.match(validUpload({name:'design.PNG',size:PROJECT_SOURCE_LIMIT+1},'design_image'),/2.5 MiB/);
  assert.match(validUpload({name:'design.PNG',size:400},'specification'),/file types/);
  assert.match(validUpload({name:'pdf',size:400},'floor_plan'),/file types/);
  assert.match(validUpload({name:'sub/spec.txt',size:400},'specification'),/filename/);
  assert.equal(sourceExactPath(file,true),'projects/project-a/sources/source-a/versions/2/content?sha256='+sha256);
  for (const override of [{sourceId:'../file'},{projectId:'project/a'},{version:0},{version:7},{sha256:'unknown'}]) {
    assert.equal(sourceExactPath({...file,...override},true),null);
  }
});

test('only the current answer and exact revision can open a cited project source', () => {
  assert.equal(parseProjectCitations(wire,scope)[0].version,2);
  for (const [key,value] of [['taskId','other'],['turnId','other'],['executionId','older'],['projectId','project-b'],['answerHash','c'.repeat(64)]]) {
    assert.equal(parseProjectCitations(wire,{...scope,[key]:value}),null);
  }
  assert.equal(parseProjectCitations({...wire,sources:[{...citation,locator:{kind:'text',line:1}}]},scope),null);
  assert.equal(parseProjectCitations({...wire,sources:[{...citation,locator:{kind:'page',page:0}}]},scope),null);
  assert.equal(parseProjectSources([file],'project-b'),null);
  assert.equal(parseProjectSources([file],'project-a','another-file'),null);
  assert.equal(parseProjectSource({...file,sha256:'e'.repeat(64)},'project-a',file),null);
  assert.equal(parseProjectSource({...file,version:3},'project-a',file),null);
  assert.equal(parseProjectSource(file,'project-a',file).version,2);
  const stored = [{prompt:'/sources floor plan',turnId:'turn-a'},{answer:'Found a file',turnId:'turn-a',projectCitations:wire}];
  assert.equal(conversationTurns(stored)[0].projectCitations,wire);
});

// @lat: [[contracts#Hosted contract tests#Project file isolation]]
test('project Files discards delayed foreign results and an old request on a return to the same project', async () => {
  const pending=[], state=[], effects=[];let cursor=0;
  const hooks={...React,useId:()=> 'upload-control',
    useState(initial){const i=cursor++;if(!(i in state))state[i]=initial;return [state[i],value=>{state[i]=typeof value==='function'?value(state[i]):value;}];},
    useRef(initial){const i=cursor++;return state[i]??={current:initial};},
    useEffect(callback,deps){const i=cursor++;const row=state[i]??={};if(!row.deps||deps.some((value,j)=>!Object.is(value,row.deps[j])))effects.push(()=>{row.cleanup?.();row.cleanup=callback();row.deps=deps;});}
  };
  const exports={};
  const request=(path,init)=>new Promise(resolve=>pending.push({path,...init,resolve}));
  runInNewContext(compile('../src/components/workspace/project-files.tsx'),{exports,AbortController,require(name){
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return jsx;
    if(name==='@/lib/project-sources.mjs')return sources;
    if(name==='@/lib/host/web.mjs')return {createWebHost:()=>({tasks:{request}})};
    if(name.endsWith('.module.css'))return {default:{}};
    return new Proxy({},{get:(_target,key)=>String(key)});
  }});
  function render(projectId) {cursor=0;const result=exports.ProjectFiles({projectId,archived:false});
    while(effects.length)effects.shift()();return result;
  }
  function output(node) {
    if(typeof node==='string')return node;
    if(Array.isArray(node))return node.map(output).join('');
    return React.isValidElement(node)?output(node.props.children):'';
  }
  const ticks=()=>new Promise(resolve=>setImmediate(resolve));
  render('project-a');
  render('project-b');
  assert.equal(pending[0].signal.aborted,true);
  assert.equal(pending[1].path,'projects/project-b/sources');
  pending[0].resolve({ok:true,json:async()=>[file]});
  pending[1].resolve({ok:true,json:async()=>[file]});
  await ticks();
  assert.doesNotMatch(output(render('project-b')),/A101\.pdf/);
  assert.match(output(render('project-b')),/Files could not be loaded/);
  assert.doesNotMatch(output(render('project-a')),/A101\.pdf/);
  pending[2].resolve({ok:true,json:async()=>[file]});
  await ticks();
  assert.match(output(render('project-a')),/A101\.pdf/);
});

test('the web proxy forwards only project source routes and forces no-store attachment delivery', async () => {
  const calls=[], limits=[];
  const exports={};
  runInNewContext(compile('../src/app/api/service/[...path]/route.ts'),{exports,Response,Headers,URL,console,require(name){
    if(name==='@/lib/project-sources.mjs')return sources;
    if(name==='@/lib/request-body')return {requestBody:(request,limit)=>{limits.push(limit);return request.text();}};
    if(name==='@/lib/backend')return {backend:async(path,init)=>{
      calls.push({path,method:init.method});
      return new Response('contents',{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="file.pdf"'}});
    }};
    if(name==='@/lib/plan-pdf')return {};
    throw Error(name);
  }});
  const send=(path,method,query='')=>exports[method](new Request('https://test.example/api/service/'+path+query,{
    method,body:method==='POST'?'{}':undefined
  }),{params:Promise.resolve({path:path.split('/')})});
  const base='projects/project-a/sources';
  assert.equal((await send(base,'POST')).status,200);
  assert.equal(limits.at(-1),PROJECT_SOURCE_JSON_LIMIT);
  assert.deepEqual(calls.at(-1),{path:'/v2/'+base,method:'POST'});
  const content=base+'/source-a/versions/2/content', query='?sha256='+sha256;
  const download=await send(content,'GET',query);
  assert.equal(calls.at(-1).path,'/v2/'+content+query);
  assert.equal(download.headers.get('cache-control'),'private, no-store');
  assert.equal(download.headers.get('x-content-type-options'),'nosniff');
  assert.match(download.headers.get('content-disposition'),/^attachment/);
  for(const [path,method,status] of [[content,'POST',405],[base+'/source-a','GET',405],[content+'/extra','GET',404]]) {
    const count=calls.length;
    assert.equal((await send(path,method)).status,status);
    assert.equal(calls.length,count);
  }
});
