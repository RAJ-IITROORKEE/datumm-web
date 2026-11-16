import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {requestBody} from '@/lib/request-body';
import {replayRecordedTask} from '@/lib/agui/recorded-replay.mjs';

export async function POST(request:Request){
 if(process.env.NODE_ENV!=='development')return new Response(null,{status:404});
 const body=await requestBody(request);if(body instanceof Response)return body;
 let input:unknown;try{input=JSON.parse(body);}catch{return Response.json({message:'Invalid replay request.'},{status:422});}
 try{
  const captured=JSON.parse(await readFile(join(process.cwd(),'tests/fixtures/agui-produced-task.json'),'utf8'));
  return replayRecordedTask(input,captured,request.signal);
 }catch{return Response.json({message:'The recorded local harness fixture is not available yet.'},{status:503});}
}
