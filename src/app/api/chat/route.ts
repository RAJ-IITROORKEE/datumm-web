import { hostedCommand, postHostedCommand } from '@/lib/hosted-command.mjs';
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { backend } from '@/lib/backend';
import { chatStartResult } from '@/lib/chat-start';
import { requestBody } from '@/lib/request-body';
export const maxDuration=240;
export async function POST(request:Request){
  const raw=await requestBody(request);if(raw instanceof Response)return Response.json({code:'DATUMM_CHAT_COMMAND',message:'Chat request exceeds 64 KiB. Send only the current prompt.'},{status:raw.status});
 let body;
 try{body=JSON.parse(raw);if(!body||typeof body!=='object'||!Array.isArray(body.messages))throw new Error();}
 catch{return Response.json({detail:'Invalid chat request.'},{status:422});}
 if(body.taskId!==undefined&&(typeof body.taskId!=='string'||! /^[a-zA-Z0-9-]{1,128}$/.test(body.taskId)))return Response.json({detail:'Invalid task ID.'},{status:422});
 const message=body.messages.filter((m:{role:string}|null)=>m?.role==='user').at(-1);
 const prompt=Array.isArray(message?.parts)?message.parts.filter((p:{type:string;text:string}|null)=>p?.type==='text'&&typeof p.text==='string').map((p:{text:string})=>p.text).join('\n'):'';
 let response:Response;
 const taskId=body.taskId;
 const command=taskId?{schemaVersion:2,type:'chat_followup',prompt,visiblePlan:body.visiblePlan??null,acceptedAssumptions:body.acceptedAssumptions??[],placement:body.placement??null,model:body.model,reasoningEffort:body.reasoningEffort,modelContextRequirement:body.modelContextRequirement==='read'?'read':'auto',deviceId:body.deviceId||null}:{schemaVersion:2,type:'submit',prompt,mode:body.mode??'plan',model:body.model,reasoningEffort:body.reasoningEffort,modelContextRequirement:body.modelContextRequirement==='read'?'read':'auto',deviceId:body.deviceId||null,recipe:body.recipe===true};
 let envelope;try{envelope=hostedCommand(body,command);}catch(error){return Response.json({code:'DATUMM_CHAT_COMMAND',message:error instanceof Error?error.message:'Unsupported web request.'},{status:422});}
 try{response=await postHostedCommand(backend,taskId,envelope);}
 catch{return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The orchestrator is unavailable. Check the saved task before retrying.'},{status:503});}
 const result=await chatStartResult(response);
 if(result instanceof Response)return result;
 const {id}=result;
 const stream=createUIMessageStream({execute:async({writer})=>{
  writer.write({type:'start',messageId:crypto.randomUUID()});
   writer.write({type:'data-run',data:{id},transient:true});
  const events=await backend(`/v2/tasks/${id}/events?after=${Math.max(0,Number(body.eventCursor)||0)}`);
  if(!events.ok||!events.body)throw new Error('Run created. Reopen it from history to check progress.');
  const reader=events.body.getReader();const decoder=new TextDecoder();let buffer='';let answered=false;
  while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});
   let split;while((split=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,split);buffer=buffer.slice(split+2);
    if(!packet.startsWith('data: '))continue;const event=JSON.parse(packet.slice(6));
    writer.write({type:'data-progress',data:event,transient:true});
     if(event.stage==='answer'){if(!answered)writer.write({type:'text-start',id:'answer'});answered=true;writer.write({type:'text-delta',id:'answer',delta:event.detail});}
    if(event.stage==='failed'){writer.write({type:'text-start',id:'failure'});writer.write({type:'text-delta',id:'failure',delta:`\n\n${event.detail}`});writer.write({type:'text-end',id:'failure'});}
   }
  }
   if(answered)writer.write({type:'text-end',id:'answer'});writer.write({type:'finish'});
 },onError:()=> 'The stream disconnected. Open this run from history to recover its status.'});
 return createUIMessageStreamResponse({stream});
}
