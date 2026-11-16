import { backend } from '@/lib/backend';
import { chatStartResult } from '@/lib/chat-start';
import { requestBody } from '@/lib/request-body';
import { openAgui } from '@/lib/agui/adapter.mjs';

export const maxDuration=240;

export async function POST(request:Request) {
  const body=await requestBody(request);
  if (body instanceof Response) return body;
  let input:unknown;
  try { input=JSON.parse(body); }
  catch { return Response.json({code:'DATUMM_CHAT_COMMAND',message:'Invalid chat request.'},{status:422}); }
  return openAgui(input,backend,chatStartResult,request.signal);
}
