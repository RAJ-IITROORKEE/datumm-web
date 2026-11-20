import test from 'node:test';
import assert from 'node:assert/strict';
import { EventSchema } from '@ag-ui/core/schemas';
import { prepareInput, openAgui, terminalEvents, consumeTaskStream } from '../src/lib/agui/adapter.mjs';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

const input=(props={})=>({threadId:'thread',runId:'run',messages:[{id:'m',role:'user',content:'Make a plan'}],
  forwardedProps:{idempotencyKey:'stable-key',expectedTaskVersion:0,expectedPlanVersion:0,...props}});
const parseStart=async response=>response.ok?response.json():response;
const frame=value=>`data: ${JSON.stringify(value)}\n\n`;
const receipt={id:'task-1',commandId:'stable-key',taskVersion:1,state:'applied'};
const snapshot=(status,data={})=>({id:'task-1',status,data,taskVersion:1,eventCursor:1,executionId:'e1',
  commandReceipts:[{commandId:'stable-key',state:'applied'}],events:[{turnId:'stable-key',executionId:'e1'}]});
const streamed=text=>new Response(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode(text));c.close();}}),{headers:{'Content-Type':'text/event-stream'}});
const events=async response=>(await response.text()).split('\n\n').filter(Boolean).map(line=>EventSchema.parse(JSON.parse(line.slice(6))));

test('input uses the existing command envelope and rejects unsupported authority',()=>{
  const {envelope}=prepareInput(input());
  assert.equal(envelope.idempotencyKey,'stable-key'); assert.equal(envelope.command.prompt,'Make a plan');
  assert.equal(prepareInput(input({taskId:'task-1',expectedTaskVersion:3})).envelope.command.type,'chat_followup');
  assert.throws(()=>prepareInput({...input(),resume:[{interruptId:'q',status:'resolved'}]}));
  assert.throws(()=>prepareInput(input({attachmentIds:['private-file']})));
  assert.throws(()=>prepareInput(input({unknownAuthority:true})));
  assert.throws(()=>prepareInput({...input(),messages:[{id:'x',role:'user',content:[{type:'text',text:'hi'}]}]}));
});

test('question resume uses one versioned answer command and a source-bound continuation snapshot',async()=>{
 const payload={questionId:'q',questionVersion:3,answers:[{question_id:'level',option_id:'beginner'}]};
 const request={threadId:'task-1',runId:'resume',messages:[],resume:[{interruptId:'q:3',status:'resolved',payload}],forwardedProps:{taskId:'task-1',idempotencyKey:'stable-key',expectedTaskVersion:2,expectedPlanVersion:0,eventCursor:4}};
 const calls=[];let posted=false;
 const continued={...snapshot('completed',{agent_reply_receipt:{questionId:'q',version:3},answer:'Done'}),taskVersion:3,eventCursor:6,events:[{stage:'user_answer',sequence:5,turnId:'original-turn',executionId:'e1'},{stage:'completed',sequence:6,turnId:'original-turn',executionId:'e1'}]};
 const backend=async(path,options)=>{calls.push([path,options]);if(path==='/v2/tasks/task-1')return Response.json(posted?continued:{id:'task-1',status:'needs_input',eventCursor:4,data:{agent_question:{id:'q',version:3}}});if(path.endsWith('/commands')){posted=true;return Response.json({...receipt,taskVersion:3});}return streamed(frame({stage:'snapshot',run:continued}));};
 const output=await events(await openAgui(request,backend,parseStart));
 assert.equal(calls.filter(([path])=>path.endsWith('/commands')).length,1);assert.deepEqual(JSON.parse(calls[1][1].body).command,{schemaVersion:2,type:'answer',...payload});
 assert.equal(output.at(-1).outcome.type,'success');assert.equal(output.find(row=>row.type==='TEXT_MESSAGE_CONTENT').delta,'Done');
});

test('accepted answer waits for applied receipt and saved question answer before admission',async()=>{
 const payload={questionId:'q',questionVersion:3,answer:'one'};
 const request={threadId:'task-1',runId:'resume',messages:[],resume:[{interruptId:'q:3',status:'resolved',payload}],forwardedProps:{taskId:'task-1',idempotencyKey:'stable-key',expectedTaskVersion:2,expectedPlanVersion:0,eventCursor:4}};
 let posts=0,reads=0;
 const continued={...snapshot('completed',{agent_reply_receipt:{questionId:'q',version:3},answer:'Done'}),taskVersion:3,eventCursor:6,events:[{stage:'user_answer',sequence:5,executionId:'e1'},{stage:'completed',sequence:6,executionId:'e1'}]};
 const backend=async(path)=>{if(path.endsWith('/commands')){posts++;return Response.json({...receipt,state:'accepted',taskVersion:3});}if(path==='/v2/tasks/task-1'){reads++;return Response.json(reads===1?{id:'task-1',status:'needs_input',eventCursor:4,data:{agent_question:{id:'q',version:3}}}:reads===2?{id:'task-1',commandReceipts:[{commandId:'stable-key',state:'accepted'}],data:{}}:continued);}return streamed(frame({stage:'snapshot',run:continued}));};
 const output=await events(await openAgui(request,backend,parseStart));
 assert.equal(posts,1);assert.equal(reads,3);assert.equal(output[1].content.taskId,'task-1');assert.equal(output.at(-1).outcome.type,'success');
});

test('asynchronously rejected answer never emits admission or clears the question',async()=>{
 const request={threadId:'task-1',runId:'resume',messages:[],resume:[{interruptId:'q:3',status:'resolved',payload:{questionId:'q',questionVersion:3,answer:'one'}}],forwardedProps:{taskId:'task-1',idempotencyKey:'stable-key',expectedTaskVersion:2,expectedPlanVersion:0}};
 let reads=0,posts=0;
 const backend=async(path)=>{if(path.endsWith('/commands')){posts++;return Response.json({...receipt,state:'accepted',taskVersion:3});}reads++;return Response.json(reads===1?{id:'task-1',status:'needs_input',eventCursor:4,data:{agent_question:{id:'q',version:3}}}:{id:'task-1',commandReceipts:[{commandId:'stable-key',state:'rejected'}],data:{}});};
 const output=await openAgui(request,backend,parseStart);assert.equal(output.status,409);assert.equal(posts,1);assert.equal((await output.json()).state,'rejected');
});

test('detached answer confirmation aborts read-only polling without resubmitting',async()=>{
 const request={threadId:'task-1',runId:'resume',messages:[],resume:[{interruptId:'q:3',status:'resolved',payload:{questionId:'q',questionVersion:3,answer:'one'}}],forwardedProps:{taskId:'task-1',idempotencyKey:'stable-key',expectedTaskVersion:2,expectedPlanVersion:0}};
 const controller=new AbortController();let reads=0,posts=0,aborted=false;
 const backend=async(path,options)=>{if(path.endsWith('/commands')){posts++;return Response.json({...receipt,state:'accepted',taskVersion:3});}reads++;if(reads===1)return Response.json({id:'task-1',status:'needs_input',eventCursor:4,data:{agent_question:{id:'q',version:3}}});return new Promise((_,reject)=>{options.signal.addEventListener('abort',()=>{aborted=true;reject(Error('detached'));},{once:true});setTimeout(()=>controller.abort(),10);});};
 const output=await openAgui(request,backend,parseStart,controller.signal);assert.equal(output.status,503);assert.equal(posts,1);assert.equal(aborted,true);
});

test('question resume rejects stale or foreign question without an answer command',async()=>{
 const payload={questionId:'q',questionVersion:3,answer:'one'};
 const request={threadId:'task-1',runId:'resume',messages:[],resume:[{interruptId:'q:3',status:'resolved',payload}],forwardedProps:{taskId:'task-1',idempotencyKey:'stable-key',expectedTaskVersion:2,expectedPlanVersion:0}};
 for(const question of [{id:'q',version:4},{id:'other',version:3},null]){let posts=0;const backend=async(_path,options)=>{if(options?.method==='POST')posts++;return Response.json({id:'task-1',status:'needs_input',eventCursor:4,data:{agent_question:question}});};const result=await openAgui(request,backend,parseStart);assert.equal(result.status,409);assert.equal(posts,0);}
 assert.throws(()=>prepareInput({...request,resume:[{...request.resume[0],interruptId:'q:2'}]}));
 assert.throws(()=>prepareInput({...request,resume:[{...request.resume[0],status:'cancelled'}]}));
});

test('old completed snapshot cannot borrow a new answer receipt without a later matching answer event',async()=>{
 const payload={questionId:'q',questionVersion:3,answer:'one'};
 const request={threadId:'task-1',runId:'resume',messages:[],resume:[{interruptId:'q:3',status:'resolved',payload}],forwardedProps:{taskId:'task-1',idempotencyKey:'stable-key',expectedTaskVersion:2,expectedPlanVersion:0,eventCursor:4}};
 let posted=false,observations=0;
 const saved={...snapshot('completed',{agent_reply_receipt:{questionId:'q',version:3},answer:'old'}),taskVersion:3,eventCursor:4,events:[{stage:'user_answer',sequence:4,executionId:'e1'}]};
 const backend=async(path)=>{if(path==='/v2/tasks/task-1')return Response.json(posted?saved:{id:'task-1',status:'needs_input',eventCursor:4,data:{agent_question:{id:'q',version:3}}});if(path.endsWith('/commands')){posted=true;return Response.json({...receipt,taskVersion:3});}observations++;return streamed(frame({stage:'snapshot',run:observations===1?saved:{...saved,eventCursor:6,data:{...saved.data,answer:'new'},events:[{stage:'user_answer',sequence:5,executionId:'e1'},{stage:'completed',sequence:6,executionId:'e1'}]}}));};
 const output=await events(await openAgui(request,backend,parseStart));
 assert.equal(observations,2);assert.deepEqual(output.filter(row=>row.type==='TEXT_MESSAGE_CONTENT').map(row=>row.delta),['new']);
});

test('question preflight sanitizes upstream HTML and preserves authorization status',async()=>{
 const exports={};const source=readFileSync(new URL('../src/lib/chat-start.ts',import.meta.url),'utf8');
 runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,Response,Error});
 const request={threadId:'task-1',runId:'resume',messages:[],resume:[{interruptId:'q:3',status:'resolved',payload:{questionId:'q',questionVersion:3,answer:'one'}}],forwardedProps:{taskId:'task-1',idempotencyKey:'stable-key',expectedTaskVersion:2,expectedPlanVersion:0}};
 for(const status of [401,403,502]){const response=await openAgui(request,async()=>new Response('<html>private upstream</html>',{status,headers:{'content-type':'text/html'}}),exports.chatStartResult);assert.equal(response.status,status);const body=await response.text();assert.doesNotMatch(body,/<html>|private upstream/);assert.match(body,/DATUMM_CHAT_COMMAND/);}
});

test('an answer receipt for a different task never starts observation',async()=>{
 const request={threadId:'task-1',runId:'resume',messages:[],resume:[{interruptId:'q:3',status:'resolved',payload:{questionId:'q',questionVersion:3,answer:'one'}}],forwardedProps:{taskId:'task-1',idempotencyKey:'stable-key',expectedTaskVersion:2,expectedPlanVersion:0}};
 let reads=0;const backend=async(path)=>{if(path.endsWith('/commands'))return Response.json({...receipt,id:'task-2',state:'accepted'});reads++;return Response.json({id:'task-1',status:'needs_input',eventCursor:4,data:{agent_question:{id:'q',version:3}}});};
 const output=await openAgui(request,backend,parseStart);assert.equal(output.status,502);assert.equal(reads,1);
});

// @lat: [[contracts#Hosted contract tests#Poll intervals#AG-UI saved task state]]
test('admission emits ordered activity and one authoritative task state before the full answer',async()=>{
  const calls=[]; const answer='x'.repeat(2400);
  const saved=snapshot('completed',{agent_result:{status:'completed',answer}});
  const backend=async(path,options)=>{
    calls.push([path,options]);
    if(path.includes('active=true'))return Response.json([]);
    if(path==='/v2/tasks')return Response.json(receipt);
    return streamed(frame({taskId:'task-1',sequence:1,stage:'answer',detail:'x'.repeat(2000)})+
      frame({stage:'snapshot',run:saved}));
  };
  const result=await events(await openAgui(input(),backend,parseStart));
  assert.deepEqual(result.map(e=>e.type),['RUN_STARTED','ACTIVITY_SNAPSHOT','ACTIVITY_SNAPSHOT','STATE_SNAPSHOT','TEXT_MESSAGE_START','TEXT_MESSAGE_CONTENT','TEXT_MESSAGE_END','RUN_FINISHED']);
  assert.deepEqual(result[3].snapshot.datumm,{schemaVersion:1,taskId:'task-1',run:saved});
  assert.equal(result[1].content.taskId,'task-1'); assert.equal(result[5].delta,answer);
  assert.equal(result.at(-1).outcome.type,'success');
  assert.equal(calls.filter(([path])=>path==='/v2/tasks').length,1);
  assert.equal(JSON.parse(calls[1][1].body).idempotencyKey,'stable-key');
});

test('waiting, cancellation, failure and pause never masquerade as success',()=>{
  const snap=(status,data={})=>terminalEvents('t','r','task-1',snapshot(status,data));
  const waitingEvents=snap('needs_input',{agent_question:{id:'q',version:3,question:'How many?'}});
  assert.deepEqual(waitingEvents.map(row=>row.type),['STATE_SNAPSHOT','MESSAGES_SNAPSHOT','RUN_FINISHED']);
  assert.deepEqual(waitingEvents[0].snapshot.datumm.question,{id:'q',version:3});
  assert.equal(waitingEvents[0].snapshot.datumm.run.status,'needs_input');
  const waiting=waitingEvents.at(-1);
  assert.equal(waiting.outcome.type,'interrupt'); assert.equal(waiting.outcome.interrupts[0].metadata.questionVersion,3);
  assert.equal(snap('cancelled').at(-1).outcome.type,'cancelled');
  assert.equal(snap('failed').at(-1).type,'RUN_ERROR');
  assert.equal(snap('paused_recovery').at(-1).type,'RUN_ERROR');
  assert.equal(snap('needs_input').at(-1).type,'RUN_ERROR');
  assert.equal(snap('awaiting_approval',{agent_draft:{fingerprint:'a'.repeat(64)}}).at(-1).outcome.type,'interrupt');
  assert.throws(()=>terminalEvents('t','r','task',{id:'other',status:'completed'}));
});

test('EOF without authoritative terminal snapshot is an error, not completion',async()=>{
  const backend=async(path)=>path.includes('active=true')?Response.json([]):path==='/v2/tasks'?Response.json(receipt):streamed(frame({taskId:'task-1',stage:'working'}));
  const result=await events(await openAgui(input(),backend,parseStart));
  assert.equal(result.at(-1).type,'RUN_ERROR'); assert.equal(result.at(-1).code,'DATUMM_STREAM_INTERRUPTED');
  assert.ok(!result.some(e=>e.type==='RUN_FINISHED'));
});

test('SSE parser handles fragmented CRLF and does not invent a terminal',async()=>{
  const bytes=['data: {"stage":"one"}\r','\n\r','\ndata: {"stage":"two"}\n\n'];
  const reader=new ReadableStream({start(c){for(const part of bytes)c.enqueue(new TextEncoder().encode(part));c.close();}}).getReader();
  const seen=[]; assert.equal(await consumeTaskStream(reader,item=>{seen.push(item.stage);return false;}),false);
  assert.deepEqual(seen,['one','two']);
});

test('admission rejection is returned before any protocol stream',async()=>{
  let posts=0;
  const backend=async(path)=>{if(path.includes('active=true'))return Response.json([]);posts++;return Response.json({detail:'Denied'},{status:403});};
  const response=await openAgui(input(),backend,parseStart);
  assert.equal(response.status,403); assert.equal(posts,1); assert.match(response.headers.get('content-type'),/json/);
});

test('an old completed snapshot never supplies a new turn answer',async()=>{
  let observations=0,posts=0;
  const old={...snapshot('completed',{answer:'old answer'}),executionId:'old',events:[{turnId:'old-command',executionId:'old'}]};
  const current=snapshot('completed',{answer:'new answer'});
  const backend=async(path)=>{
    if(path.includes('active=true'))return Response.json([]);
    if(path==='/v2/tasks'){posts++;return Response.json(receipt);}
    observations++;return streamed(frame({stage:'snapshot',run:observations===1?old:current}));
  };
  const result=await events(await openAgui(input(),backend,parseStart));
  assert.equal(posts,1);assert.equal(observations,2);
  assert.deepEqual(result.filter(e=>e.type==='STATE_SNAPSHOT').map(e=>e.snapshot.datumm.run),[current]);
  assert.deepEqual(result.filter(e=>e.type==='TEXT_MESSAGE_CONTENT').map(e=>e.delta),['new answer']);
  assert.equal(result.at(-1).outcome.type,'success');
});

test('a rejected admitted command stops without showing an old answer',async()=>{
  const stopped={...snapshot('completed',{answer:'old answer'}),commandReceipts:[{commandId:'stable-key',state:'rejected'}]};
  let observations=0;
  const backend=async(path)=>path.includes('active=true')?Response.json([]):path==='/v2/tasks'?Response.json(receipt):(observations++,streamed(frame({stage:'snapshot',run:stopped})));
  const result=await events(await openAgui(input(),backend,parseStart));
  assert.equal(observations,1); assert.equal(result.at(-1).code,'DATUMM_COMMAND_STOPPED');
  assert.deepEqual(result.map(e=>e.type),['RUN_STARTED','ACTIVITY_SNAPSHOT','RUN_ERROR']);
});

test('a command-bound snapshot behind streamed activity is retried without reposting',async()=>{
  const current={...snapshot('completed',{answer:'Current answer'}),eventCursor:2};
  const activity={taskId:'task-1',index:1,sequence:2,stage:'completed',detail:'Saved'};
  const calls=[];
  const backend=async path=>{
    calls.push(path);
    if(path.includes('active=true'))return Response.json([]);
    if(path==='/v2/tasks')return Response.json(receipt);
    if(path.endsWith('after=0'))return streamed(frame(activity)+frame({stage:'snapshot',run:{...current,eventCursor:1}}));
    return streamed(frame({stage:'snapshot',run:current}));
  };
  const result=await events(await openAgui(input(),backend,parseStart));
  assert.deepEqual(calls.slice(-3),['/v2/tasks','/v2/tasks/task-1/events?after=0','/v2/tasks/task-1/events?after=2']);
  assert.deepEqual(result.filter(e=>e.type==='STATE_SNAPSHOT').map(e=>e.snapshot.datumm.run),[current]);
});

test('detaching before observation connects aborts only the observer',async()=>{
  let observedSignal,posts=0;
  const backend=async(path,options)=>{
    if(path.includes('active=true')) return Response.json([]);
    if(path==='/v2/tasks'){posts++;return Response.json(receipt);}
    observedSignal=options.signal;
    return new Promise((_,reject)=>observedSignal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true}));
  };
  const response=await openAgui(input(),backend,parseStart);
  const reader=response.body.getReader();
  await reader.read(); await reader.read();
  await reader.cancel();
  assert.equal(posts,1);assert.equal(observedSignal.aborted,true);
});

test('malformed upstream frame closes the observer without retrying the command',async()=>{
  let cancelled=false,posts=0;
  const source=new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('data: {bad}\n\n'));},cancel(){cancelled=true;}});
  const backend=async(path)=>{
    if(path.includes('active=true'))return Response.json([]);
    if(path==='/v2/tasks'){posts++;return Response.json(receipt);}
    return new Response(source);
  };
  const result=await events(await openAgui(input(),backend,parseStart));
  assert.equal(result.at(-1).code,'DATUMM_STREAM_INTERRUPTED');
  assert.equal(cancelled,true);assert.equal(posts,1);
});

test('lifecycle fields on task events reach the client unchanged and an approval resume is rejected',async()=>{
  const record={taskId:'task-1',sequence:1,stage:'agent_stage_complete',detail:'Step complete',activityId:'a',controlOutcome:'continue',outcome:'failed',durationMs:420,callId:'c',failureCode:'ACTION_FAILED'};
  const backend=async(path)=>path.includes('active=true')?Response.json([]):path==='/v2/tasks'?Response.json(receipt):streamed(frame(record)+frame({stage:'snapshot',run:snapshot('completed',{agent_result:{status:'completed',answer:'Done'}})}));
  const result=await events(await openAgui(input(),backend,parseStart));
  assert.deepEqual(result.filter(e=>e.type==='ACTIVITY_SNAPSHOT').map(e=>e.content.event).find(e=>e?.stage==='agent_stage_complete'),record);
  const approval={threadId:'task-1',runId:'r',messages:[],forwardedProps:{taskId:'task-1',idempotencyKey:'k',expectedTaskVersion:2,expectedPlanVersion:0}};
  for(const payload of [undefined,{approved:true},{questionId:'q',questionVersion:3,answer:'one'}])
    assert.throws(()=>prepareInput({...approval,resume:[{interruptId:`approval:${'a'.repeat(64)}`,status:'resolved',...(payload?{payload}:{})}]}));
});
