import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {requestBody} from '@/lib/request-body';
import {replayRecordedTask} from '@/lib/agui/recorded-replay.mjs';

const fixture=async(name:string)=>
 JSON.parse(await readFile(join(process.cwd(),'tests/fixtures',name),'utf8'));

export async function POST(request:Request){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 const body=await requestBody(request);if(body instanceof Response)return body;
 let input:unknown;try{input=JSON.parse(body);}catch{return Response.json({message:'Invalid replay request.'},{status:422});}
 try{
  // The task id picks the recording: the controlled harness task or an answer draft recording.
  const drafts=await fixture('agui-answer-draft.json') as Record<string,{id?:string}>;
  const taskId=(input as {forwardedProps?:{taskId?:unknown}})?.forwardedProps?.taskId;
  const captured=Object.values(drafts).find(row=>row?.id===taskId)
   ??await fixture('agui-produced-task.json');
  return replayRecordedTask(input,captured,request.signal);
 }catch{return Response.json({message:'The recorded local harness fixture is not available yet.'},{status:503});}
}
