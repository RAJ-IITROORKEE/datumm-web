import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';

const compile = path => ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),
  {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const chat={exports:{},Response,Error,JSON,Number};
runInNewContext(compile('../src/lib/chat-start.ts'),chat);

async function stream(events) {
  const writes=[];
  const source=events.map(event=>'data: '+JSON.stringify(event)+'\n\n').join('');
  const context={exports:{},Response,Request,TextDecoder,JSON,Math,Number,crypto:webcrypto,require:name=>{
    if(name==='@/lib/chat-start')return chat.exports;
    if(name==='@/lib/hosted-command.mjs')return {hostedCommand:()=>({}),postHostedCommand:async()=>Response.json({id:'task'})};
    if(name==='@/lib/backend')return {backend:async()=>new Response(source)};
    if(name==='@/lib/request-body')return {requestBody:request=>request.text()};
    if(name==='ai')return {createUIMessageStream:options=>options,createUIMessageStreamResponse:({stream})=>stream};
    throw Error('Unexpected import: '+name);
  }};
  runInNewContext(compile('../src/app/api/chat/route.ts'),context);
  const request=new Request('https://example.test/api/chat',{method:'POST',body:JSON.stringify({messages:[{role:'user',parts:[{type:'text',text:'Prompt'}]}]})});
  const handler=await context.exports.POST(request);
  await handler.execute({writer:{write:value=>writes.push(value)}});
  return writes;
}

test('failed stream events never expose HTML while retaining event provenance',async()=>{
  for(const html of ['<!DOCTYPE HTML><html><body>CloudFront error</body></html>',
    '<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body>Gateway</body></html>']){
    const event={stage:'failed',detail:html,taskId:'task',turnId:'turn',executionId:'run',failureCode:'SERVICE_FAILED',index:2};
    const writes=await stream([event]);
    const progress=writes.find(item=>item.type==='data-progress').data;
    const failure=writes.find(item=>item.type==='text-delta').delta;
    assert.ok(!failure.includes('<')&&!progress.detail.includes('<'));
    assert.match(failure,/saved task/i);
    for(const key of ['taskId','turnId','executionId','failureCode','index'])assert.equal(progress[key],event[key]);
    assert.equal(event.detail,html);
  }
});

test('answers and examples stay exact; meaningful failures and usage retain their meaning',async()=>{
  const answer='Example markup: `<html><body>Keep this</body></html>`.';
  const usage='BUDGET_EXHAUSTED: the shared agent_model_calls allowance is exhausted.';
  const writes=await stream([{stage:'answer',detail:answer,index:0},
    {stage:'failed',detail:usage,failureCode:'BUDGET_EXHAUSTED',index:1}]);
  assert.equal(writes.find(item=>item.type==='text-delta'&&item.id==='answer').delta,answer);
  assert.match(writes.find(item=>item.type==='text-delta'&&item.id==='failure').delta,/usage limit/i);
  assert.equal(writes.filter(item=>item.type==='data-progress')[1].data.failureCode,'BUDGET_EXHAUSTED');
  const ordinary=await stream([{stage:'failed',detail:'Connect Revit and select one session.',index:0}]);
  assert.match(ordinary.find(item=>item.type==='text-delta').delta,/Connect Revit and select one session/);
});
