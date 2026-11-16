type Receipt={id:string;taskVersion?:number;state?:string;error?:string|null};
type Failure={code:'DATUMM_CHAT_COMMAND';message:string;state?:string;taskId?:string;taskVersion?:number;blockingTask?:{id:string;title:string;status:string}};

/** Never display an upstream HTML error page as a workspace message. */
export function serviceErrorMessage(message:unknown,status?:number,contentType=''):string {
 const text=typeof message==='string'?message.trim():'';
 const html=/\b(?:text\/html|application\/xhtml\+xml)\b/i.test(contentType)||/<\s*(?:!doctype\b|\/?(?:html|head|body|script|style|title|div|pre|h[1-6])\b)/i.test(text);
 const genericUpstream=Boolean(status && status>=500 && /^(?:bad gateway|gateway timeout|service unavailable|internal server error|error\s*5\d\d)[.!]?$/i.test(text));
 if(!text||html||genericUpstream){
  if(status===401)return 'Your session could not be verified. Sign in again and retry.';
  if(status===403)return 'You do not have permission for this request. Check your account access.';
  if(status && status>=500)return 'DATUMM service is temporarily unavailable. Check your saved task before trying again.';
  return 'DATUMM could not complete the request. Check your connection and saved task before trying again.';
 }
 // A disabled model is refused at admission; say what the person can do about it.
 if(/^Model is not enabled\.?$/i.test(text))return 'This model was turned off by an admin; pick another model.';
 return text;
}

// The service currently returns budget failures as command error strings. Only
// recognize its leading code (or an explicit structured code), not mentions
// of a limit inside arbitrary errors. Scope is stated only when supplied.
export function admissionMessage(message:string,code?:unknown):string{
 const shared=/^(?:admission\s+)?BUDGET_EXHAUSTED: the shared (?:model_calls|tool_calls|image_calls|graph_decisions|plan_candidates|repair_attempts|agent_model_calls|agent_tool_calls|agent_plan_candidates|agent_vision_calls|agent_research_calls|agent_web_searches|agent_knowledge_searches|continuation_segments|input-token|USD) allowance is exhausted\.$/i.test(message);
 if(shared)return 'This chat has reached its usage limit. You can review your saved work or start a new chat.';
 const reported=typeof code==='string'?code:message.match(/^(?:admission\s+)?(BUDGET_EXHAUSTED|BUDGET_UNAVAILABLE)(?::|$)/)?.[1];
 if(reported==='BUDGET_EXHAUSTED')return 'This task has reached a usage limit. You can review your saved work.';
 if(reported==='BUDGET_UNAVAILABLE')return 'DATUMM could not check the usage allowance. Check the saved task before trying again.';
 return message;
}

// Rejected commands are durable receipts, not a newly started event stream.
export async function chatStartResult(response:Response):Promise<Receipt|Response>{
 const raw=await response.text();
 let value:any;try{value=JSON.parse(raw);}catch{value=null;}
 const detail=value?.detail??value??(response.ok?null:raw);
 if(!response.ok||detail?.state==='rejected'||detail?.state==='interrupted'){
  const rawMessage=typeof detail==='string'?detail:typeof detail?.error==='string'?detail.error:typeof detail?.message==='string'?detail.message:
   response.status===503?'The orchestrator is unavailable. Check the saved task before retrying.':'The request could not be completed. Check the saved task before retrying.';
  const message=admissionMessage(serviceErrorMessage(rawMessage,response.status,response.headers.get('content-type')??''),detail?.code);
  const failure:Failure={code:'DATUMM_CHAT_COMMAND',message};
  if(typeof detail?.blockingTask?.id==='string'&&/^[a-zA-Z0-9-]{1,128}$/.test(detail.blockingTask.id)&&typeof detail.blockingTask.title==='string'&&['queued','running','awaiting_approval'].includes(detail.blockingTask.status))failure.blockingTask=detail.blockingTask;
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
 return task.data?.error?serviceErrorMessage(task.data.error):'Your task is saved. Review its status below before continuing.';
}
