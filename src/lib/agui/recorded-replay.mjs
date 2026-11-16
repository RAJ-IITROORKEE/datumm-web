import {openAgui,prepareInput} from './adapter.mjs';

/** Development-only playback of a captured local harness projection, with no real commands. */
export async function replayRecordedTask(input,snapshot,signal) {
  let prepared;
  try{prepared=prepareInput(input);}catch{return Response.json({message:'Invalid replay request.'},{status:422});}
  const {props}=prepared;
  const receipt=snapshot?.commandReceipts?.find(row=>row.commandId===props.idempotencyKey&&row.state==='applied');
  if(!snapshot||snapshot.status!=='completed'||props.taskId!==snapshot.id||!receipt||prepared.answer)return Response.json({message:'This replay is bound to its recorded task and command.'},{status:422});
  const backend=async(path)=>{
    if(path===`/v2/tasks/${snapshot.id}/commands`)return Response.json({id:snapshot.id,commandId:receipt.commandId,taskVersion:snapshot.taskVersion,state:'applied'});
    if(path.startsWith(`/v2/tasks/${snapshot.id}/events?after=`)){
      const encoder=new TextEncoder();
      return new Response(new ReadableStream({start(controller){
        for(const record of snapshot.events??[])controller.enqueue(encoder.encode(`data: ${JSON.stringify(record)}\n\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({stage:'snapshot',run:snapshot})}\n\n`));controller.close();
      }}),{headers:{'Content-Type':'text/event-stream'}});
    }
    return Response.json({message:'Unsupported recorded path.'},{status:404});
  };
  return openAgui(input,backend,async response=>response.ok?response.json():response,signal);
}
