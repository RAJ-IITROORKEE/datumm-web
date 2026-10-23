import { auth } from '@clerk/nextjs/server';

export async function backend(path:string,init:RequestInit={}) {
  if(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)return Response.json({detail:'Account sign-in is not configured.'},{status:503});
  const token=await (await auth()).getToken();
  if(!token)return Response.json({detail:'Sign in to connect your workspace.'},{status:401});
  const base=new URL(process.env.ORCHESTRATOR_URL??'');
  if(base.protocol!=='https:'||base.username||base.password||base.pathname!=='/'||base.search||base.hash||!/^\/v[12]\//.test(path))throw Error('Invalid hosted service origin.');
  return fetch(`${base.origin}${path}`,{...init,cache:'no-store',redirect:'error',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},signal:init.signal??AbortSignal.timeout(path.includes('/events')?240000:30000)});
}
