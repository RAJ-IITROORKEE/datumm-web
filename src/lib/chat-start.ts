type Receipt={id:string;taskVersion?:number;state?:string;error?:string|null};
type Failure={code:'DATUMM_CHAT_COMMAND';message:string;state?:string;taskId?:string;taskVersion?:number};

// Rejected commands are durable receipts, not a newly started event stream.
export async function chatStartResult(response:Response):Promise<Receipt|Response>{
 const value=await response.json().catch(()=>null);
 const detail=value?.detail??value;
 if(!response.ok||detail?.state==='rejected'||detail?.state==='interrupted'){
  const message=typeof detail==='string'?detail:typeof detail?.error==='string'?detail.error:
   response.status===503?'The orchestrator is unavailable. Check the saved task before retrying.':'The request could not be completed. Check the saved task before retrying.';
  const failure:Failure={code:'DATUMM_CHAT_COMMAND',message};
  if(detail?.state==='rejected'||detail?.state==='interrupted'){
   failure.state=detail.state;
   if(typeof detail.id==='string')failure.taskId=detail.id;
   if(Number.isSafeInteger(detail.taskVersion)&&detail.taskVersion>=0)failure.taskVersion=detail.taskVersion;
  }
  return Response.json(failure,{status:response.ok?409:response.status});
 }
 if(typeof value?.id!=='string'||!value.id){
  return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The response was incomplete. Check the saved task before retrying.'},{status:502});
 }
 return value;
}

// AI SDK transports pass an unsuccessful response body as Error.message.
export function chatStartFailure(error:unknown):Failure|null{
 if(!(error instanceof Error))return null;
 try{
  const value=JSON.parse(error.message);
  if(value?.code!=='DATUMM_CHAT_COMMAND'||typeof value.message!=='string')return null;
  return value;
 }catch{return null;}
}

// Recover presentation from durable state; a broken stream never authorizes replay.
export function savedTaskConnectionNotice(task:{status:string;data?:{opencode_questions?:unknown[];error?:string}}):string {
 if(task.data?.opencode_questions?.length)return 'The agent is waiting for your answers below. Your task is saved.';
 if(['queued','running'].includes(task.status))return 'Live streaming ended. Saved task updates continue automatically; do not resend this message.';
 if(task.status==='awaiting_approval')return 'Your proposal is saved and awaiting review below.';
 if(['completed','cancelled'].includes(task.status))return '';
 return task.data?.error??'Your task is saved. Review its status below before continuing.';
}
