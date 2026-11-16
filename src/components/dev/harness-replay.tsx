'use client';

import {useEffect,useRef,useState} from 'react';
import {AguiChatTransport} from '@/lib/agui-chat-transport';
import {conversationTurns,answerCompletionCandidate} from '@/lib/conversation-turns.mjs';
import type {Run} from '../workspace/use-workspace-state';
import {OutputWorkspaceProvider,OutputPanel,useOutputWorkspace} from '../workspace/output-workspace';
import {ConversationAnswer} from '../workspace/conversation-answer';
import {Button} from '../ui/button';

export type RecordedReplayRun=Run&{commandReceipts:{commandId:string;state:string}[]};
function ReplayAnswers({record}:{record:Run}){
 const {activeOutput}=useOutputWorkspace(),turns=conversationTurns(record.conversation??[]);
 return <>{turns.map((turn,index)=>{
  if(!turn.answer)return null;
  const completion=answerCompletionCandidate({turn,turns,taskId:record.id,events:record.events??[]})?turn.completion:undefined;
  return <ConversationAnswer key={index} text={turn.answer} source={{key:`${record.id}:answer:${index}`,taskId:record.id,conversationIndex:index,state:'saved'}} turnId={turn.turnId} completion={completion} presentation={turn.presentation}/>;
 })}{activeOutput&&<div style={{height:420,minWidth:0,marginTop:16,border:'1px solid var(--separator)',borderRadius:12,overflow:'hidden'}}><OutputPanel/></div>}</>;
}
export function HarnessReplay({snapshot}:{snapshot:RecordedReplayRun}){
 const [record,setRecord]=useState<Run|null>(null),[state,setState]=useState('Ready to replay'),[error,setError]=useState('');
 const active=useRef<AbortController|null>(null);
 useEffect(()=>()=>active.current?.abort(),[]);
 const replay=async()=>{
  active.current?.abort();const controller=new AbortController();active.current=controller;
  setRecord(null);setState('Replaying captured events');setError('');
  try{
   const command=snapshot.commandReceipts?.find(row=>row.state==='applied');
   if(!command)throw Error('The captured task has no applied command.');
   const transport=new AguiChatTransport('/api/dev/agui-replay');
   const stream=await transport.sendMessages({trigger:'submit-message',chatId:'controlled-harness-replay',messageId:undefined,messages:[{id:'replay-prompt',role:'user',parts:[{type:'text',text:'Replay the recorded local harness result; no real execution.'}]}],body:{taskId:snapshot.id,idempotencyKey:command.commandId,clientSubmissionId:crypto.randomUUID(),expectedTaskVersion:snapshot.taskVersion??0,expectedPlanVersion:0,mode:'ask'},abortSignal:controller.signal});
   const reader=stream.getReader();let saved:Run|null=null,finished=false;
   try{for(;;){const next=await reader.read();if(next.done)break;if(active.current!==controller)return;const chunk=next.value;
    if(chunk.type==='data-progress'){
     const item=(chunk.data as {record?:{stage:string;run?:Run}}).record;
     if(item?.stage==='snapshot'&&item.run?.id===snapshot.id)saved=item.run;
    }
    if(chunk.type==='finish')finished=true;
   }}finally{reader.releaseLock();}
   if(active.current!==controller)return;
   if(!finished||!saved)throw Error('The replay did not confirm a saved result.');
   setRecord(saved);setState('Replay completed · recorded local harness output');
  }catch(failure){if(active.current===controller&&!controller.signal.aborted){setError(failure instanceof Error?failure.message:'Replay unavailable.');setState('Replay stopped');}}
 };
 const showEvicted=()=>{
  active.current?.abort();active.current=null;
  const answer=conversationTurns(snapshot.conversation??[]).find(row=>row.completion);
  setRecord({...snapshot,events:answer?(snapshot.events??[]).filter(event=>event.turnId!==answer.turnId):snapshot.events});
  setError('');setState('Rendered captured answer without its events · no network');
 };
 return <section aria-label="Recorded local harness replay" style={{marginTop:32,borderTop:'1px solid var(--separator)',paddingTop:20}}>
  <h2 style={{fontSize:16}}>Saved harness response</h2>
  <p style={{color:'var(--muted-foreground)',marginBlock:12}}>Captured from the local agent graph with controlled model decisions, saved through its checkpoint and public task projection. Replay uses the AG-UI adapter and client. No live provider or Revit execution.</p>
  <Button onClick={()=>void replay()} disabled={state==='Replaying captured events'}>Replay saved harness response</Button><Button onClick={()=>showEvicted()}>Saved answer after eviction</Button><p role="status" style={{marginBlock:12}}>{state}</p>{error&&<p role="alert">{error}</p>}
  {record&&<OutputWorkspaceProvider scopeKey={`controlled-replay:${record.id}`} scopeInput={{key:`controlled-replay:${record.id}`,accountKey:'controlled-replay',taskId:record.id,sourceKey:'captured-harness-answer'}}><ReplayAnswers record={record}/></OutputWorkspaceProvider>}
 </section>;
}
