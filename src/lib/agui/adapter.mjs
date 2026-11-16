import { EventSchema, RunAgentInputSchema, PROTOCOL_VERSION } from '@ag-ui/core/schemas';
import { z } from 'zod';
import { hostedCommand, postHostedCommand } from '../hosted-command.mjs';

const id = z.string().min(1).max(128);
const propsSchema = z.object({
  taskId: z.string().regex(/^[a-zA-Z0-9-]{1,128}$/).optional(),
  projectId: id.optional(), idempotencyKey: id,
  expectedTaskVersion: z.number().int().nonnegative(), expectedPlanVersion: z.number().int().nonnegative(),
  eventCursor: z.number().int().nonnegative().optional(),
  mode: z.enum(['ask','plan','build']).optional(), model: id.optional(),
  reasoningEffort: z.enum(['low','medium','high']).optional(),
  modelContextRequirement: z.enum(['auto','read']).optional(), deviceId: id.nullish(), recipe: z.boolean().optional(),
  visiblePlan: z.unknown().optional(), acceptedAssumptions: z.array(z.string().max(500)).max(40).optional(),
  placement: z.unknown().optional(), attachmentIds: z.array(z.string()).max(0).optional(),
}).strict();
const answerSchema = z.object({questionId:id,questionVersion:z.number().int().positive(),
  answer:z.string().min(1).max(12000).optional(),
  answers:z.array(z.object({question_id:id,option_id:id.optional(),value:z.string().max(12000).optional()}).strict()).min(1).max(40).optional(),
}).strict().refine(value => (value.answer !== undefined) !== (value.answers !== undefined));

export function prepareInput(value) {
  const input=RunAgentInputSchema.parse(value);
  if (!input.threadId || input.threadId.length>128 || !input.runId || input.runId.length>128) throw new Error('Invalid run identity.');
  if (input.tools.length || input.context.length) throw new Error('Client tools and context are not supported by this chat.');
  const props=propsSchema.parse(input.forwardedProps);
  if (input.resume?.length) {
    if (!props.taskId || input.threadId!==props.taskId || input.messages.length || input.resume.length!==1 || input.resume[0].status!=='resolved') throw new Error('Invalid question continuation.');
    const answer=answerSchema.parse(input.resume[0].payload);
    if (input.resume[0].interruptId!==`${answer.questionId}:${answer.questionVersion}`) throw new Error('Invalid question identity.');
    const command={schemaVersion:2,type:'answer',...answer};
    return {input,props,envelope:hostedCommand(props,command),answer};
  }
  const message=input.messages.filter(m=>m.role==='user').at(-1);
  if (!message || typeof message.content!=='string' || !message.content.trim() || message.content.length>12000) throw new Error('Send one text prompt of up to 12,000 characters.');
  const prompt=message.content;
  const command=props.taskId ? {schemaVersion:2,type:'chat_followup',prompt,visiblePlan:props.visiblePlan??null,
    acceptedAssumptions:props.acceptedAssumptions??[],placement:props.placement??null,model:props.model,
    reasoningEffort:props.reasoningEffort,modelContextRequirement:props.modelContextRequirement==='read'?'read':'auto',deviceId:props.deviceId||null} :
    {schemaVersion:2,type:'submit',prompt,mode:props.mode??'plan',model:props.model,reasoningEffort:props.reasoningEffort,
      modelContextRequirement:props.modelContextRequirement==='read'?'read':'auto',deviceId:props.deviceId||null,recipe:props.recipe===true};
  return {input,props,envelope:hostedCommand(props,command),answer:null};
}

function event(value) { return EventSchema.parse(value); }
export function startEvents(threadId,runId,taskId) {
  return [event({type:'RUN_STARTED',threadId,runId,protocolVersion:PROTOCOL_VERSION}),
    activity(runId,taskId,null)];
}
export function activity(runId,taskId,item) {
  return event({type:'ACTIVITY_SNAPSHOT',messageId:`datumm-activity:${runId}`,activityType:'datumm.task',
    content:{taskId,event:item},replace:true});
}
export function terminalEvents(threadId,runId,taskId,snapshot) {
  if (!snapshot || snapshot.id!==taskId || typeof snapshot.status!=='string') throw new Error('Invalid task snapshot.');
  const status=snapshot.status, data=snapshot.data && typeof snapshot.data==='object'?snapshot.data:{};
  const finish=outcome=>event({type:'RUN_FINISHED',threadId,runId,outcome});
  if (status==='needs_input') {
    const q=data.agent_question;
    if (!q || typeof q.id!=='string' || !q.id || !Number.isInteger(q.version) || q.version<1 || typeof q.question!=='string')
      return [event({type:'RUN_ERROR',message:'The saved task is waiting for input. Open the task to continue.',code:'DATUMM_WAITING'})];
    return [event({type:'STATE_SNAPSHOT',snapshot:{datumm:{taskId,question:{id:q.id,version:q.version}}}}),
      event({type:'MESSAGES_SNAPSHOT',messages:[{id:`question:${q.id}:${q.version}`,role:'assistant',content:q.question}]}),
      finish({type:'interrupt',interrupts:[{id:`${q.id}:${q.version}`,reason:'question',message:q.question,
      metadata:{taskId,questionId:q.id,questionVersion:q.version}}]})];
  }
  if (status==='awaiting_approval') {
    const draft=data.agent_draft;
    if (draft && typeof draft.fingerprint==='string' && /^[a-f0-9]{64}$/i.test(draft.fingerprint))
      return [finish({type:'interrupt',interrupts:[{id:`approval:${draft.fingerprint}`,reason:'approval',
        message:'Review the saved proposal before continuing.',metadata:{taskId}}]})];
    return [event({type:'RUN_ERROR',message:'The saved proposal needs review. Open the task before continuing.',code:'DATUMM_APPROVAL_REVIEW'})];
  }
  if (status==='cancelled') return [finish({type:'cancelled'})];
  if (status==='failed') return [event({type:'RUN_ERROR',message:'The task stopped. Open the saved task for recovery details.',code:'DATUMM_TASK_FAILED'})];
  if (status!=='completed') return [event({type:'RUN_ERROR',message:'The task is saved and needs attention. Open it before continuing.',code:'DATUMM_TASK_NOT_COMPLETE'})];
  const answer=typeof data.agent_result?.answer==='string'?data.agent_result.answer:typeof data.answer==='string'?data.answer:'';
  const result=[];
  if (answer) {
    const messageId=`datumm-answer:${runId}`;
    result.push(event({type:'TEXT_MESSAGE_START',messageId,role:'assistant'}),
      event({type:'TEXT_MESSAGE_CONTENT',messageId,delta:answer}),event({type:'TEXT_MESSAGE_END',messageId}));
  }
  result.push(finish({type:'success'}));
  return result;
}

export function isCurrentSnapshot(snapshot,taskId,commandId,minimumVersion) {
  return !!snapshot && snapshot.id===taskId && Number.isSafeInteger(snapshot.taskVersion)
    && snapshot.taskVersion>=minimumVersion && typeof snapshot.executionId==='string'
    && Array.isArray(snapshot.commandReceipts)
    && snapshot.commandReceipts.some(row=>row?.commandId===commandId && row.state==='applied')
    && Array.isArray(snapshot.events)
    && snapshot.events.some(row=>row?.turnId===commandId && row.executionId===snapshot.executionId);
}

// Parse SSE incrementally without treating a disconnected stream as completion.
export async function consumeTaskStream(reader,onItem) {
  const decoder=new TextDecoder(); let buffer='';
  for (;;) {
    const {done,value}=await reader.read();
    if (done) break;
    buffer=(buffer+decoder.decode(value,{stream:true})).replace(/\r\n/g,'\n');
    if (buffer.length>8_388_608) throw new Error('Task event exceeds the supported size.');
    let end;
    while ((end=buffer.indexOf('\n\n'))>=0) {
      const frame=buffer.slice(0,end); buffer=buffer.slice(end+2);
      const lines=frame.split('\n').filter(line=>line.startsWith('data:')).map(line=>line.slice(5).replace(/^ /,''));
      if (lines.length && await onItem(JSON.parse(lines.join('\n')))) return true;
    }
  }
  return false;
}

export async function openAgui(value, backend, parseStart, requestSignal) {
  let prepared;
  try { prepared=prepareInput(value); }
  catch { return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The chat request is invalid or unsupported.'},{status:422}); }
  const {input,props,envelope,answer}=prepared;
  let answerStartCursor=0;
  if (answer) {
    let response, current;
    try { const timeout=AbortSignal.timeout(10000);const signal=requestSignal?AbortSignal.any([requestSignal,timeout]):timeout;response=await backend(`/v2/tasks/${encodeURIComponent(props.taskId)}`,{signal}); if(response.ok)current=await response.json(); }
    catch { return Response.json({code:'DATUMM_CHAT_COMMAND',message:'Could not check the saved question. Your answers are preserved.'},{status:503}); }
    if (!response.ok) {
      try { const failure=await parseStart(response); if (failure instanceof Response) return failure; } catch {}
      return Response.json({code:'DATUMM_CHAT_COMMAND',message:'Could not check the saved question. Your answers are preserved.'},{status:response.status});
    }
    const question=current?.data?.agent_question;
    if (current?.id!==props.taskId || current.status!=='needs_input' || !Number.isSafeInteger(current.eventCursor) || current.eventCursor<0 || !question || question.id!==answer.questionId || (question.version??1)!==answer.questionVersion)
      return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The saved question changed. Review the current question before answering.'},{status:409});
    answerStartCursor=Math.max(current.eventCursor,props.eventCursor??0);
  }
  let admission;
  if (requestSignal?.aborted) return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The request was interrupted. Check the saved task before retrying.'},{status:499});
  try { admission=await postHostedCommand(backend,props.taskId,envelope); }
  catch { return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The orchestrator is unavailable. Check the saved task before retrying.'},{status:503}); }
  let receipt;
  try { receipt=await parseStart(admission); }
  catch { return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The response was interrupted. Check the saved task before retrying.'},{status:503}); }
  if (receipt instanceof Response) return receipt;
  const taskId=receipt.id, encoder=new TextEncoder(), observation=new AbortController(); let reader, detached=false;
  if (typeof taskId!=='string' || !/^[a-zA-Z0-9-]{1,128}$/.test(taskId) || (props.taskId && taskId!==props.taskId)
      || receipt.commandId!==props.idempotencyKey || !Number.isSafeInteger(receipt.taskVersion) || receipt.taskVersion<1)
    return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The response was incomplete. Check the saved task before retrying.'},{status:502});
  if (answer) {
    let confirmed=false;const deadline=Date.now()+10000;
    for(let attempt=0;attempt<40 && Date.now()<deadline && !requestSignal?.aborted;attempt++){
      let verified;
      try { const timeout=AbortSignal.timeout(Math.max(1,deadline-Date.now()));const signal=requestSignal?AbortSignal.any([requestSignal,timeout]):timeout;const response=await backend(`/v2/tasks/${encodeURIComponent(taskId)}`,{signal}); if(response.ok)verified=await response.json(); }
      catch {}
      const command=verified?.id===taskId&&Array.isArray(verified.commandReceipts)?verified.commandReceipts.find(row=>row?.commandId===receipt.commandId):null;
      if(command&&['rejected','interrupted'].includes(command.state))return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The answer was not applied. Review the saved question before retrying.',state:command.state},{status:409});
      if(verified?.id===taskId && command?.state==='applied' && verified.data?.agent_reply_receipt?.questionId===answer.questionId && verified.data.agent_reply_receipt.version===answer.questionVersion){confirmed=true;break;}
      if(attempt<39 && Date.now()<deadline && !requestSignal?.aborted)await new Promise(resolve=>setTimeout(resolve,Math.max(0,Math.min(250,deadline-Date.now()))));
    }
    if (!confirmed) return Response.json({code:'DATUMM_CHAT_COMMAND',message:'The saved answer is not yet confirmed. Check the saved task before retrying.'},{status:503});
  }
  const stream=new ReadableStream({
    start(controller) { void (async()=>{
      const send=value=>{ if (!detached) controller.enqueue(encoder.encode(`data: ${JSON.stringify(event(value))}\n\n`)); };
      try {
        for (const item of startEvents(input.threadId,input.runId,taskId)) send(item);
        let cursor=props.eventCursor??0, finished=false;
        for (let attempt=0;attempt<80 && !detached;attempt++) {
          let staleSnapshot=false;
          const response=await backend(`/v2/tasks/${encodeURIComponent(taskId)}/events?after=${cursor}`,
            {signal:AbortSignal.any([observation.signal,AbortSignal.timeout(240000)])});
          if (detached) { try { await response.body?.cancel(); } catch {} break; }
          if (!response.ok || !response.body) throw new Error('Task stream unavailable.');
          reader=response.body.getReader();
          const ended=await consumeTaskStream(reader,item=>{
            if (!item || typeof item!=='object') throw new Error('Invalid task event.');
            if (item.stage==='snapshot') {
              if (!item.run || item.run.id!==taskId) throw new Error('Invalid task snapshot.');
              const command=Array.isArray(item.run.commandReceipts)?item.run.commandReceipts.find(row=>row?.commandId===receipt.commandId):null;
              if (command && ['rejected','interrupted'].includes(command.state)) {
                send(activity(input.runId,taskId,item));
                send({type:'RUN_ERROR',message:'The request did not complete. Open the saved task before retrying.',code:'DATUMM_COMMAND_STOPPED'});
                finished=true; return true;
              }
              const questionReceipt=item.run.data?.agent_reply_receipt;
              const answerEvent=Array.isArray(item.run.events)?item.run.events.find(row=>row?.stage==='user_answer' && row.executionId===item.run.executionId && Number.isSafeInteger(row.sequence) && row.sequence>answerStartCursor):null;
              const answerBound=answer && item.run.id===taskId && Number.isSafeInteger(item.run.taskVersion) && item.run.taskVersion>=receipt.taskVersion
                && questionReceipt?.questionId===answer.questionId && questionReceipt?.version===answer.questionVersion
                && !(item.run.status==='needs_input' && item.run.data?.agent_question?.id===answer.questionId && (item.run.data.agent_question.version??1)===answer.questionVersion)
                && Array.isArray(item.run.commandReceipts) && item.run.commandReceipts.some(row=>row?.commandId===receipt.commandId && row.state==='applied')
                && typeof item.run.executionId==='string' && answerEvent && item.run.events.some(row=>row?.stage===item.run.status && row.executionId===item.run.executionId && Number.isSafeInteger(row.sequence) && row.sequence>answerEvent.sequence);
              if (!(answer ? answerBound : isCurrentSnapshot(item.run,taskId,receipt.commandId,receipt.taskVersion))) { staleSnapshot=true; return true; }
              send(activity(input.runId,taskId,item));
              for (const next of terminalEvents(input.threadId,input.runId,taskId,item.run)) send(next);
              finished=true; return true;
            }
            if (item.taskId && item.taskId!==taskId) throw new Error('Unexpected task event.');
            if (Number.isSafeInteger(item.sequence) && item.sequence>cursor) cursor=item.sequence;
            send(activity(input.runId,taskId,item)); return false;
          });
          if (ended) { try { await reader.cancel(); } catch {} }
          if (finished || detached) break;
          if (!ended || !staleSnapshot) break;
          await new Promise(resolve=>setTimeout(resolve,250));
        }
        if (!finished && !detached) send({type:'RUN_ERROR',message:'The stream ended. Open the saved task to check its status.',code:'DATUMM_STREAM_INTERRUPTED'});
      } catch {
        try { send({type:'RUN_ERROR',message:'The stream disconnected. Open the saved task to check its status.',code:'DATUMM_STREAM_INTERRUPTED'}); } catch {}
      } finally {
        observation.abort();
        try { await reader?.cancel(); } catch {}
        try { reader?.releaseLock(); } catch {}
        try { controller.close(); } catch {}
      }
    })(); },
    async cancel() { detached=true; observation.abort(); try { await reader?.cancel(); } catch {} },
  });
  return new Response(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','X-Accel-Buffering':'no'}});
}
