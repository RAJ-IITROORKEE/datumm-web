import {openAgui,prepareInput} from './adapter.mjs';

/**
 * Development-only playback of a captured local harness projection, with no real commands.
 * `answerDraftFrames` (not part of the saved task) replay as backend draft frames before the
 * checked answer, paced by their `delayMs`. Like the real backend, the drafts come while the run is
 * still working: before the `answer` and `completed` events, which follow them.
 */
export async function replayRecordedTask(input,recorded,requestSignal) {
  let prepared;
  try{prepared=prepareInput(input);}catch{return Response.json({message:'Invalid replay request.'},{status:422});}
  const {props}=prepared;
  const {answerDraftFrames=[],...snapshot}=recorded??{};
  const receipt=snapshot.commandReceipts?.find(
    row=>row.commandId===props.idempotencyKey&&row.state==='applied');
  const bound=recorded&&snapshot.status==='completed'&&props.taskId===snapshot.id
    &&receipt&&!prepared.answer;
  if(!bound)return Response.json({message:'This replay is bound to its recorded task and command.'},{status:422});
  const backend=async(path)=>{
    if(path===`/v2/tasks/${snapshot.id}/commands`){
      return Response.json({id:snapshot.id,commandId:receipt.commandId,taskVersion:snapshot.taskVersion,state:'applied'});
    }
    if(path.startsWith(`/v2/tasks/${snapshot.id}/events?after=`)){
      const encoder=new TextEncoder();
      const frame=value=>encoder.encode(`data: ${JSON.stringify(value)}\n\n`);
      const events=snapshot.events??[],closing=new Set(['answer','completed']);
      const early=answerDraftFrames.length?events.filter(row=>!closing.has(row.stage)):events;
      const late=answerDraftFrames.length?events.filter(row=>closing.has(row.stage)):[];
      return new Response(new ReadableStream({async start(controller){
        for(const record of early)controller.enqueue(frame(record));
        for(const {delayMs=0,...draft} of answerDraftFrames){
          if(delayMs>0)await new Promise(resolve=>setTimeout(resolve,delayMs));
          controller.enqueue(frame(draft));
        }
        for(const record of late)controller.enqueue(frame(record));
        controller.enqueue(frame({stage:'snapshot',run:snapshot}));controller.close();
      }}),{headers:{'Content-Type':'text/event-stream'}});
    }
    return Response.json({message:'Unsupported recorded path.'},{status:404});
  };
  return openAgui(input,backend,async response=>response.ok?response.json():response,requestSignal);
}
