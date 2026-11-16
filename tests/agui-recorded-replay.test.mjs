import test from 'node:test';
import assert from 'node:assert/strict';
import {replayRecordedTask} from '../src/lib/agui/recorded-replay.mjs';
import {EventSchema} from '@ag-ui/core/schemas';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
import {webcrypto} from 'node:crypto';
import ts from 'typescript';
import {conversationTurns,answerCompletionCandidate,verifyAnswerCompletionHash} from '../src/lib/conversation-turns.mjs';
import {validateChatComposition} from '../src/lib/chat-composition.mjs';

const input={threadId:'local-task',runId:'local-transport-run',messages:[{id:'local-prompt',role:'user',content:'Replay the captured task'}],forwardedProps:{taskId:'local-task',idempotencyKey:'local-command',expectedTaskVersion:2,expectedPlanVersion:0,mode:'ask'}};
const snapshot={id:'local-task',status:'completed',taskVersion:2,executionId:'local-execution',data:{answer:'Recorded answer'},conversation:[{turnId:'local-command',answer:'Recorded answer',completion:{fixture:true},presentation:{fixture:true}}],commandReceipts:[{commandId:'local-command',state:'applied'}],events:[{index:0,sequence:1,stage:'completed',taskId:'local-task',turnId:'local-command',executionId:'local-execution',detail:'Recorded completion'}]};

test('recorded local playback traverses real adapter and preserves exact saved answer fields',async()=>{
 const response=await replayRecordedTask(input,snapshot);
 assert.equal(response.status,200);assert.match(response.headers.get('content-type'),/text\/event-stream/);
 const events=(await response.text()).split('\n\n').filter(Boolean).map(frame=>EventSchema.parse(JSON.parse(frame.slice(6))));
 assert.equal(events[0].type,'RUN_STARTED');assert.equal(events.at(-1).outcome.type,'success');
 assert.deepEqual(events.find(row=>row.type==='ACTIVITY_SNAPSHOT'&&row.content.event?.stage==='snapshot').content.event.run.conversation,snapshot.conversation);
 assert.equal(events.find(row=>row.type==='TEXT_MESSAGE_CONTENT').delta,'Recorded answer');
});

test('recorded endpoint never routes unknown tasks, arbitrary commands or interrupted runs',async()=>{
 for(const props of [{...input.forwardedProps,taskId:'other'},{...input.forwardedProps,idempotencyKey:'other'},{...input.forwardedProps,unknownAuthority:true}])assert.equal((await replayRecordedTask({...input,forwardedProps:props},snapshot)).status,422);
 assert.equal((await replayRecordedTask(input,{...snapshot,status:'needs_input'})).status,422);
 assert.equal((await replayRecordedTask(input,{...snapshot,commandReceipts:[]})).status,422);
});

test('actual controlled graph projection survives production AG-UI adapter, client and composition gates',async()=>{
 const captured=JSON.parse(readFileSync(new URL('./fixtures/agui-produced-task.json',import.meta.url),'utf8'));
 const require=createRequire(import.meta.url),exports={};let requests=0;
 const source=readFileSync(new URL('../src/lib/agui-chat-transport.ts',import.meta.url),'utf8');
 runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>name==='./chat-start'?{}:require(name),crypto:webcrypto,ReadableStream,TextDecoder,Error,JSON,Number,RegExp,fetch:async(url,options)=>{requests++;assert.equal(url,'/api/dev/agui-replay');return replayRecordedTask(JSON.parse(options.body),captured);}});
 const command=captured.commandReceipts.find(row=>row.state==='applied');
 const client=new exports.AguiChatTransport('/api/dev/agui-replay');
 const stream=await client.sendMessages({trigger:'submit-message',chatId:'controlled',messageId:undefined,messages:[{id:'prompt',role:'user',parts:[{type:'text',text:'Replay controlled graph output'}]}],body:{taskId:captured.id,idempotencyKey:command.commandId,clientSubmissionId:'local-client',expectedTaskVersion:captured.taskVersion,expectedPlanVersion:0,mode:'ask'}});
 const chunks=[];for await(const chunk of stream)chunks.push(chunk);
 assert.equal(requests,1);assert.equal(chunks.at(-1).type,'finish');
 const saved=chunks.find(row=>row.type==='data-progress'&&row.data.record.stage==='snapshot').data.record.run;
 const turns=conversationTurns(saved.conversation),turn=turns.find(row=>row.completion);
 assert.equal(answerCompletionCandidate({turn,turns,taskId:saved.id,events:saved.events}),true);
 assert.equal(await verifyAnswerCompletionHash(turn.completion,turn.answer,webcrypto.subtle),true);
 const composition=await validateChatComposition(turn.presentation.composition,{taskId:saved.id,turnId:turn.turnId,text:turn.answer,state:'saved'},webcrypto.subtle);
 assert.ok(composition);assert.equal(composition.root.children[1].items[0].display,'2');
 assert.equal(chunks.filter(row=>row.type==='text-delta').map(row=>row.delta).join(''),turn.answer);
 assert.equal(await verifyAnswerCompletionHash(turn.completion,turn.answer+' changed',webcrypto.subtle),false);
});
