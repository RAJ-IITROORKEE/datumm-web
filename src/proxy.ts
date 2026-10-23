import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextRequest, NextResponse, type NextFetchEvent } from 'next/server';
const clerk=clerkMiddleware();
export default async function proxy(request:NextRequest,event:NextFetchEvent){
  if(!['GET','HEAD','OPTIONS'].includes(request.method)&&request.nextUrl.pathname.startsWith('/api/')&&request.headers.get('origin')!==request.nextUrl.protocol+'//'+request.headers.get('host'))return NextResponse.json({detail:'Same-origin workspace requests only.'},{status:403});
  if(!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)return NextResponse.next();
  const response=await clerk(request,event);
  const rewrite=response?.headers.get('x-middleware-rewrite');
  if(rewrite&&response){const target=new URL(rewrite),source=new URL(request.url);if(target.origin===source.origin&&target.pathname===source.pathname&&target.search===source.search){response.headers.delete('x-middleware-rewrite');response.headers.set('x-middleware-next','1');}}
  return response;
}
export const config={matcher:['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)','/(api)(.*)']};
