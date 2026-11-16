import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {RunAgentInputSchema} from '@ag-ui/core/schemas';

const require=createRequire(import.meta.url);
function transport(fetch){
 const exports={};
 const chatStart={};const chatSource=readFileSync(new URL('../src/lib/chat-start.ts',import.meta.url),'utf8');
 runInNewContext(ts.transpileModule(chatSource,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:chatStart,Response,Error});
 const source=readFileSync(new URL('../src/lib/agui-chat-transport.ts',import.meta.url),'utf8');
 const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{exports,require:name=>name==='./chat-start'?chatStart:require(name),fetch,crypto:webcrypto,ReadableStream,TextDecoder,Error,JSON,Number,RegExp});
 return new exports.AguiChatTransport();
}
const options={trigger:'submit-message',chatId:'local',messageId:undefined,messages:[{id:'old',role:'user',parts:[{type:'text',text:'old'}]},{id:'new',role:'user',parts:[{type:'text',text:'hello'}]}],body:{taskId:'task-1',idempotencyKey:'stable-key',eventCursor:4,clientSubmissionId:'client-1'}};
const event=(type,extra={})=>({type,...extra});
const wire=events=>events.map(value=>'data: '+JSON.stringify(value)+'\r\n\r\n').join('');
const response=(text,split=7)=>new Response(new ReadableStream({start(controller){const bytes=new TextEncoder().encode(text);for(let i=0;i<bytes.length;i+=split)controller.enqueue(bytes.slice(i,i+split));controller.close();}}),{headers:{'Content-Type':'text/event-stream'}});
const read=async stream=>{const values=[];for await(const value of stream)values.push(value);return values;};
const frames=input=>[
 event('RUN_STARTED',{threadId:input.threadId,runId:input.runId,protocolVersion:'1.0'}),
 event('ACTIVITY_SNAPSHOT',{messageId:'activity',activityType:'datumm.task',content:{taskId:'task-1',event:null}}),
 event('ACTIVITY_SNAPSHOT',{messageId:'activity',activityType:'datumm.task',content:{taskId:'task-1',event:{index:4,stage:'running',detail:'Working',at:'now',taskId:'task-1'}}}),
 event('TEXT_MESSAGE_START',{messageId:'answer',role:'assistant'}),event('TEXT_MESSAGE_CONTENT',{messageId:'answer',delta:'Saved ✓'}),event('TEXT_MESSAGE_END',{messageId:'answer'}),
 event('RUN_FINISHED',{threadId:input.threadId,runId:input.runId,outcome:{type:'success'}}),
];

test('posts one AG-UI request and maps fragmented UTF-8/SSE to owned chat updates',async()=>{
 let count=0,input;
 const client=transport(async(url,request)=>{count++;assert.equal(url,'/api/agui');input=JSON.parse(request.body);assert.equal(RunAgentInputSchema.safeParse(input).success,true);return response(': heartbeat\r\n\r\n'+wire(frames(input)),1);});
 const values=await read(await client.sendMessages(options));
 assert.equal(count,1);assert.equal(input.messages.length,1);assert.equal(input.messages[0].content,'hello');assert.equal(input.forwardedProps.idempotencyKey,'stable-key');assert.equal(input.forwardedProps.clientSubmissionId,undefined);
 assert.deepEqual(values.map(value=>value.type),['start','data-run','data-progress','text-start','text-delta','text-end','finish']);
 assert.equal(values[1].data.id,'task-1');assert.equal(values[1].data.clientSubmissionId,'client-1');assert.equal(values[2].data.record.index,4);assert.equal(values[4].delta,'Saved ✓');
 assert.equal(await client.reconnectToStream({chatId:'local'}),null);
});

test('interrupt and cancelled outcomes finish protocol without fabricating an answer',async()=>{
 for(const outcome of [{type:'interrupt',interrupts:[{id:'q',reason:'input'}]},{type:'cancelled'}]){
  const client=transport(async(_url,request)=>{const input=JSON.parse(request.body);const all=frames(input);return response(wire([all[0],all[1],event('RUN_FINISHED',{threadId:input.threadId,runId:input.runId,outcome})]));});
  const values=await read(await client.sendMessages(options));assert.deepEqual(values.map(value=>value.type),['start','data-run','finish']);
 }
});

test('disconnected, mismatched and error streams fail without a second request',async()=>{
 for(const kind of ['eof','wrong-task','run-error','wrong-run','unknown-outcome']){
  let calls=0;
  const client=transport(async(_url,request)=>{calls++;const input=JSON.parse(request.body);const all=frames(input);let events;
   if(kind==='eof')events=all.slice(0,2);
   if(kind==='wrong-task')events=[all[0],event('ACTIVITY_SNAPSHOT',{messageId:'activity',activityType:'datumm.task',content:{taskId:'other',event:null}})];
   if(kind==='run-error')events=[all[0],all[1],event('RUN_ERROR',{message:'Failed safely'})];
   if(kind==='wrong-run')events=[event('RUN_STARTED',{threadId:input.threadId,runId:'other',protocolVersion:'1.0'})];
   if(kind==='unknown-outcome')events=[all[0],all[1],event('RUN_FINISHED',{threadId:input.threadId,runId:input.runId,outcome:{type:'unrecognized'}})];
   return response(wire(events));});
  const stream=await client.sendMessages(options);await assert.rejects(read(stream));assert.equal(calls,1);
 }
});

test('malformed streams cancel their upstream reader and never invent completion',async()=>{
 let cancelled=false;
 const client=transport(async(_url,request)=>{const input=JSON.parse(request.body);const content=wire([frames(input)[0],{type:'ACTIVITY_SNAPSHOT',messageId:'bad'}]);
  return new Response(new ReadableStream({start(controller){controller.enqueue(new TextEncoder().encode(content));},cancel(){cancelled=true;}}),{headers:{'Content-Type':'text/event-stream'}});});
 await assert.rejects(read(await client.sendMessages(options)));assert.equal(cancelled,true);
});

test('an admitted task is delivered before an immediate later stream error',async()=>{
 const client=transport(async(_url,request)=>{const input=JSON.parse(request.body),all=frames(input);return response(wire([all[0],all[1],event('RUN_ERROR',{message:'Disconnected'})]),100000);});
 const reader=(await client.sendMessages(options)).getReader();
 assert.equal((await reader.read()).value.type,'start');
 assert.equal((await reader.read()).value.type,'data-run');
 await assert.rejects(reader.read());
});

test('a superseded stream cannot publish late task or answer data into a newer request',async()=>{
 let oldController,calls=0,oldInput;
 const client=transport(async(_url,request)=>{const input=JSON.parse(request.body);calls++;
  if(calls===1){oldInput=input;return new Response(new ReadableStream({start(controller){oldController=controller;controller.enqueue(new TextEncoder().encode(wire([frames(input)[0]])));}}),{headers:{'Content-Type':'text/event-stream'}});}
  return response(wire(frames(input)));
 });
 const oldReader=(await client.sendMessages(options)).getReader();assert.equal((await oldReader.read()).value.type,'start');
 const next=await client.sendMessages({...options,body:{...options.body,clientSubmissionId:'client-2'}});
 oldController.enqueue(new TextEncoder().encode(wire(frames(oldInput).slice(1))));
 assert.equal((await oldReader.read()).done,true);
 const values=await read(next);assert.equal(values.find(value=>value.type==='data-run').data.clientSubmissionId,'client-2');
});

test('a successful non-SSE response is rejected before consumption',async()=>{
 const client=transport(async()=>new Response('<html>Login</html>',{headers:{'Content-Type':'text/html'}}));
 await assert.rejects(client.sendMessages(options),/activity stream was unavailable/i);
});

test('pre-admission HTTP rejection retains the command error body for draft recovery',async()=>{
 const body=JSON.stringify({code:'DATUMM_CHAT_COMMAND',message:'Try later',state:'rejected'});
 const client=transport(async()=>new Response(body,{status:409}));
 await assert.rejects(client.sendMessages(options),error=>error.message===body);
});

test('hosted question continuation uses AG-UI resume and retains the original command identity',async()=>{
 let sent,calls=0;
 const client=transport(async(_url,request)=>{calls++;sent=JSON.parse(request.body);const all=frames(sent);return response(wire([all[0],all[1],all.at(-1)]));});
 const payload={questionId:'q',questionVersion:3,answers:[{question_id:'level',option_id:'beginner'}]};
 const values=await read(await client.resumeQuestion({taskId:'task-1',idempotencyKey:'same-command',expectedTaskVersion:2,expectedPlanVersion:0},'q',3,payload,'client-resume'));
 assert.equal(calls,1);assert.equal(RunAgentInputSchema.safeParse(sent).success,true);assert.equal(sent.threadId,'task-1');assert.equal(sent.messages.length,0);
 assert.equal(sent.resume[0].interruptId,'q:3');assert.deepEqual(sent.resume[0].payload,payload);assert.equal(sent.forwardedProps.idempotencyKey,'same-command');
 assert.deepEqual(values.map(value=>value.type),['start','data-run','finish']);
});

test('question errors display safe plain messages while preserving HTTP status',async()=>{
 for(const [body,status,contentType,expected] of [['<html>private upstream</html>',502,'text/html','temporarily unavailable'],[JSON.stringify({code:'DATUMM_CHAT_COMMAND',message:'Question changed'}),409,'application/json','Question changed']]){
  const client=transport(async()=>new Response(body,{status,headers:{'content-type':contentType}}));
  await assert.rejects(client.resumeQuestion({taskId:'task-1'},'q',3,{questionId:'q',questionVersion:3,answer:'one'},'client'),error=>error.status===status&&error.message.includes(expected)&&!error.message.includes('<html>')&&!error.message.includes('DATUMM_CHAT_COMMAND'));
 }
});
