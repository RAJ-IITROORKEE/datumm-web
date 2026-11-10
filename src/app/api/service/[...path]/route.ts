import { planPdf } from '@/lib/plan-pdf';
import { backend } from '@/lib/backend';
import { requestBody } from '@/lib/request-body';
export const maxDuration=240;
const allowed=/^(?:config|tools|devices(?:\/[a-zA-Z0-9-]+(?:\/(?:context|control|agent-control|tools))?)?|device-authorizations\/[a-zA-Z0-9_-]+(?:\/approve)?|pairing|runs(?:\/[a-zA-Z0-9-]+(?:\/(?:events|resume|reply|access|cancel|pause|continue|recover|pin|archive|export\/(?:json|analysis-json|report-json|csv|elements-csv|svg|preview-png|preview-jpeg|plan-pdf|md|pdf|docx|xlsx|concept|native-png|native-jpeg|handoff|plan)))?)?|variable\/(?:briefs\/[a-zA-Z0-9-]+\/(?:alternatives|selection)|plans\/[a-zA-Z0-9-]+\/versions\/[0-9]+|diff))$/;
function boundedRasterSvg(svg:string):Buffer|null{
 const root=svg.match(/<svg\b[^>]*>/i)?.[0];
 const viewBox=root?.match(/\bviewBox\s*=\s*["']([^"']+)["']/i)?.[1];
 const values=viewBox?.trim().split(/[\s,]+/).map(Number);
 if(!root||!values||values.length!==4||values.some(value=>!Number.isFinite(value))||values[2]<=0||values[3]<=0)return null;
 const scale=Math.min(1,2400/Math.max(values[2],values[3]));
 const width=Math.max(1,Math.round(values[2]*scale));
 const height=Math.max(1,Math.round(values[3]*scale));
 const sizedRoot=root.replace(/\s(?:width|height)\s*=\s*(["']).*?\1/gi,'').replace(/>$/,` width="${width}" height="${height}">`);
 return Buffer.from(svg.replace(root,sizedRoot),'utf8');
}
async function proxy(request:Request,context:{params:Promise<{path:string[]}>}){
 const {path}=await context.params;const suffix=path.join('/');
    const taskRoute=/^tasks(?:\/[a-zA-Z0-9-]+(?:\/(?:commands|build-context|events|questions\/answer|cancel|queue(?:\/(?:resume|[a-f0-9-]+))?|design-review|specialist-artifacts\/[a-f0-9]{64}|history\/(?:pin|archive|delete)))?)?$/.test(suffix);
 if(!allowed.test(suffix)&&!taskRoute)return new Response('Not found',{status:404});
 let phase='backend';
 try{
 const preview=suffix.match(/^runs\/([a-zA-Z0-9-]+)\/export\/(?:preview-(png|jpeg)|(plan-pdf))$/);
 let upstream=taskRoute?`/v2/${suffix}`:`/v1/${preview?`runs/${preview[1]}/export/svg`:suffix}`;
  const payload=['GET','HEAD'].includes(request.method)?undefined:await requestBody(request);
  if(payload instanceof Response)return payload;
 const runRoute=suffix.match(/^runs(?:\/([a-zA-Z0-9-]+)(?:\/(.*))?)?$/);
 if(runRoute){
  const [,id,action]=runRoute;
  if(!id||!action||action.startsWith('export/')||action==='events')upstream=`/v2/tasks${id?'/'+id:''}${action?'/'+(preview?'export/svg':action):''}`;
  else if(action==='pin'||action==='archive')upstream=`/v2/tasks/${id}/history/${action}`;
   else {
    const snapshot=await backend(`/v2/tasks/${id}`);
   if(!snapshot.ok)return new Response(await snapshot.text(),{status:snapshot.status});
   const task=await snapshot.json();
   upstream=`/v1/runs/${task.executionId}/${action}`;
  }
  if(id&&!action&&request.method==='DELETE')upstream=`/v2/tasks/${id}/history/delete`;
 }
 const response=await backend(`${upstream}${new URL(request.url).search}`,{method:request.method,body:payload});
 if(preview&&response.ok){
  const source=Buffer.from(await response.arrayBuffer());
  if(source.length>2_000_000)return new Response('Preview too large',{status:413});
  const svg=source.toString('utf8');
  if(/<!DOCTYPE|<!ENTITY|<(?:script|foreignObject|image)\b|(?:href|xlink:href)\s*=|url\s*\(/i.test(svg))return new Response('Unsupported preview content',{status:422});
  const bounded=boundedRasterSvg(svg);
  if(!bounded)return new Response('Preview has no valid viewBox',{status:422});
  phase='raster';
  const {renderPreviewRaster}=await import('@/lib/preview-raster.mjs');
  const body=await renderPreviewRaster(bounded,(preview[3]?'jpeg':preview[2]) as 'png'|'jpeg');
  if(preview[3]){
   const root=bounded.toString('utf8').match(/<svg\b[^>]*>/)?.[0]??'';
   const width=Number(root.match(/ width="(\d+)"/)?.[1]),height=Number(root.match(/ height="(\d+)"/)?.[1]);
   const extents=svg.match(/viewBox\s*=\s*["']([^"']+)["']/)?.[1].trim().split(/[\s,]+/).map(Number);
   if(!extents||extents.length!==4)return new Response('Invalid drawing extents',{status:422});
   return new Response(new Uint8Array(planPdf(body,width,height,extents[2],extents[3])),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="datumm-plan-${preview[1]}.pdf"`,'Cache-Control':'private, no-store'}});
  }
  return new Response(new Uint8Array(body),{headers:{'Content-Type':preview[2]==='jpeg'?'image/jpeg':'image/png','Content-Disposition':`attachment; filename="datumm-${preview[1]}.${preview[2]==='jpeg'?'jpg':'png'}"`,'Cache-Control':'private, no-store'}});
 }
  const headers=new Headers();for(const key of ['content-type','content-disposition','cache-control','x-datumm-project-export-projection']){const value=response.headers.get(key);if(value)headers.set(key,value);}
 return new Response(response.body,{status:response.status,headers});
 }catch(error){
  const message=error instanceof Error?error.message:'';
  const category=phase==='raster'?
   (/sharp|libvips|linux-x64/i.test(message)?'runtime':/input image exceeds pixel limit|input buffer|unsupported image|svg/i.test(message)?'image':'unknown'):'upstream';
  console.error('DATUMM service proxy failure',phase,category,error instanceof Error?error.name:'unknown');
  return Response.json({detail:phase==='raster'?'Preview image conversion failed. The SVG remains available.':'Orchestrator unavailable. Check your connection.'},{status:503});
 }
}
export {proxy as GET,proxy as POST,proxy as DELETE};
