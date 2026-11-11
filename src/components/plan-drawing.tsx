'use client';
import type {MouseEvent,ReactNode,Ref} from 'react';
import {dimensionChain,planSheet,roomCentre,roomPoints,wallLength,wallPath,wallPoint} from '@/lib/plan-geometry.mjs';
import type {PlanGraph} from './plan-canvas';

/**
 * Sheet styles travel inside the SVG so an exported copy keeps them. Colours are
 * CSS variables: plan-canvas.module.css sets them per theme, the fallbacks give
 * a black-on-white sheet when the SVG stands alone.
 */
const SHEET_CSS=`
.pd text{font-family:Arial,Helvetica,sans-serif;fill:var(--pd-ink,#000);stroke:none;user-select:none;pointer-events:none}
.pd-paper{fill:var(--pd-paper,#fff)}
.pd-room{fill:transparent}
.pd[data-style=presentation] .pd-room{fill:var(--pd-fill-room,#faf0d8)}
.pd[data-style=presentation] .pd-room[data-kind=bedroom]{fill:var(--pd-fill-bedroom,#e8eff5)}
.pd[data-style=presentation] .pd-room[data-kind=bathroom]{fill:var(--pd-fill-bathroom,#e3f0eb)}
.pd[data-style=presentation] .pd-room[data-kind=circulation]{fill:var(--pd-fill-circulation,#f5f2ea)}
.pd-wall{fill:none;stroke:var(--pd-ink,#000)}
.pd-gap{fill:none;stroke:var(--pd-paper,#fff)}
.pd-med,.pd-thin{fill:none;stroke:var(--pd-ink,#000);vector-effect:non-scaling-stroke}
.pd-med{stroke-width:1.6px}
.pd-thin{stroke-width:.8px}
.pd-dash{stroke-dasharray:6 4}
.pd-solid{fill:var(--pd-ink,#000);stroke:none}
.pd-wall.pd-picked,.pd-picked .pd-med,.pd-picked .pd-thin{stroke:var(--pd-accent,#2f5fd0)}
.pd .pd-measure{fill:var(--pd-accent,#2f5fd0);stroke:var(--pd-paper,#fff);paint-order:stroke;stroke-linejoin:round}
.pd [data-wall-key],.pd [data-opening-key]{cursor:pointer}
`;

type Props={graph:PlanGraph;mode:'hidden'|'presentation';picked?:string;compact?:boolean;className?:string;label?:string;svgRef?:Ref<SVGSVGElement>;onClick?:(event:MouseEvent<SVGSVGElement>)=>void;children?:ReactNode};

/** The 2D floor plan, drawn from the validated graph in model millimetres (y flipped for the screen). */
export function PlanDrawing({graph,mode,picked,compact=false,className,label,svgRef,onClick,children}:Props){
 const w=graph.site.widthMm,d=graph.site.depthMm,t=graph.wallThicknessMm,walls=graph.walls??[],{unit:u,bounds}=planSheet(graph);
 const S=(p:number[])=>`${p[0]} ${d-p[1]}`,edge=t/2;
 const line=(a:number[],b:number[],className:string,key?:string)=><path key={key} className={className} d={`M ${S(a)} L ${S(b)}`}/>;
 // One dimension string: line, witness lines, 45° ticks and a figure per span. Screen coordinates.
 const dimension=(stops:number[],offset:number,vertical:boolean,key:string)=>{
  const at=-edge-offset,place=(along:number,across:number)=>vertical?`${across} ${d-along}`:`${along} ${across}`;
  return <g key={key}>
   <path className="pd-thin" d={`M ${place(stops[0],at)} L ${place(stops[stops.length-1],at)}`}/>
   {stops.map(stop=><g key={stop}>
    <path className="pd-thin" d={`M ${place(stop,-edge-u*.8)} L ${place(stop,at-u*.6)}`}/>
    <path className="pd-med" d={vertical?`M ${at-u*.35} ${d-stop+u*.35} L ${at+u*.35} ${d-stop-u*.35}`:`M ${stop-u*.35} ${at+u*.35} L ${stop+u*.35} ${at-u*.35}`}/>
   </g>)}
   {stops.slice(1).map((stop,i)=>{const span=stop-stops[i],middle=(stop+stops[i])/2,size=Math.max(u*.4,Math.min(u*.7,span/(String(Math.round(span)).length*.62)));
    return <text key={stop} fontSize={size} textAnchor="middle" transform={vertical?`translate(${at-u*.3} ${d-middle}) rotate(-90)`:`translate(${middle} ${at-u*.3})`}>{Math.round(span)}</text>;})}
  </g>;
 };
 const chainX=compact?[]:dimensionChain(graph.rooms,'x'),chainY=compact?[]:dimensionChain(graph.rooms,'y');
 const scale=[10000,5000,2000,1000].find(value=>value<=w/3)??500,footY=d+edge+u*3,north=graph.spatialContext?.northDegrees;
 const view=compact?[-t,-t,w+t*2,d+t*2]:bounds;
 return <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" className={`pd ${className??''}`} data-style={mode} viewBox={view.join(' ')} role="img" aria-label={label} aria-hidden={label?undefined:true} onClick={onClick}>
  <style>{SHEET_CSS}</style>
  <rect className="pd-paper" x={view[0]} y={view[1]} width={view[2]} height={view[3]}/>
  {graph.rooms.map(room=><polygon key={room.key} className="pd-room" data-room-key={room.key} data-kind={room.kind} points={roomPoints(room).map(S).join(' ')}/>)}
  {walls.map(wall=><path key={wall.key} className={`pd-wall ${picked===wall.key?'pd-picked':''}`} data-wall-key={wall.key} d={wallPath(wall,d)} strokeWidth={t} strokeLinecap={wall.curve?.kind!=='arc'&&(wall.start[0]===wall.end[0]||wall.start[1]===wall.end[1])?'square':'round'}/>)}
  {(graph.openings??[]).map(opening=>{
   const wall=walls.find(row=>row.key===opening.wallKey);if(!wall||wallLength(wall)<=0)return null;
   const p=wallPoint(wall,opening.offsetMm),q=wallPoint(wall,opening.offsetMm+opening.widthMm),chord=Math.hypot(q[0]-p[0],q[1]-p[1])||1;
   const n=[-(q[1]-p[1])/chord*edge,(q[0]-p[0])/chord*edge],shift=(point:number[],k:number)=>[point[0]+n[0]*k,point[1]+n[1]*k];
   const room=graph.rooms.find(row=>row.key===wall.roomKeys?.[0]),target=room?roomCentre(room):[w/2,d/2];
   const side=(n[0]*(target[0]-p[0])+n[1]*(target[1]-p[1])<0?-1:1)*opening.widthMm/edge,tip=shift(p,side);
   // Screen-space turn from leaf to opening decides which way the swing arc bends.
   const clockwise=(tip[0]-p[0])*-(q[1]-p[1])+(tip[1]-p[1])*(q[0]-p[0])>0;
   return <g key={opening.key} className={picked===opening.key?'pd-picked':undefined} data-opening-key={opening.key}>
    <path className="pd-gap" d={wallPath(wall,d,opening.offsetMm,opening.offsetMm+opening.widthMm)} strokeWidth={t+8}/>
    {line(shift(p,-1),shift(p,1),'pd-med')}{line(shift(q,-1),shift(q,1),'pd-med')}
    {opening.kind==='window'||compact?<>{line(shift(p,-1),shift(q,-1),'pd-thin')}{line(p,q,'pd-thin')}{line(shift(p,1),shift(q,1),'pd-thin')}</>
     :<>{line(p,tip,'pd-med')}<path className="pd-thin" d={`M ${S(tip)} A ${opening.widthMm} ${opening.widthMm} 0 0 ${clockwise?1:0} ${S(q)}`}/></>}
   </g>;
  })}
  {!compact&&<>
   {(graph.furnitureIntents??[]).map((item,index)=><rect key={index} className="pd-thin pd-dash" x={item.rect[0]} y={d-item.rect[3]} width={item.rect[2]-item.rect[0]} height={item.rect[3]-item.rect[1]}/>)}
   {graph.rooms.map(room=>{const points=roomPoints(room),xs=points.map(point=>point[0]),[x,y]=roomCentre(room),size=Math.max(u*.45,Math.min(u,(Math.max(...xs)-Math.min(...xs)-t)/(Math.max(room.name.length,6)*.62)));
    return <g key={room.key}><text x={x} y={d-y-size*.2} fontSize={size} fontWeight={600} textAnchor="middle">{room.name}</text><text x={x} y={d-y+size} fontSize={size*.8} textAnchor="middle">{(room.areaMm2/1e6).toFixed(1)} m²</text></g>;})}
   {chainX.length>0&&dimension(chainX,u*3,false,'chain-x')}{dimension([0,w],chainX.length?u*5.5:u*3,false,'overall-x')}
   {chainY.length>0&&dimension(chainY,u*3,true,'chain-y')}{dimension([0,d],chainY.length?u*5.5:u*3,true,'overall-y')}
   <g>
    <rect className="pd-thin" x={0} y={footY} width={scale} height={u*.35}/><rect className="pd-solid" x={0} y={footY} width={scale/2} height={u*.35}/>
    {[0,scale/2,scale].map(value=><text key={value} x={value} y={footY+u*1.25} fontSize={u*.6} textAnchor="middle">{value/1000}{value===scale?' m':''}</text>)}
    <text x={scale+u*2.5} y={footY+u*.45} fontSize={u*.6}>Dimensions in millimetres</text>
   </g>
   <g transform={`translate(${w-u*1.2} ${footY+u*1.4}) rotate(${north??0})`}>
    <title>{north==null?'North not provided; drawn up the sheet':`North ${north}° from sheet up`}</title>
    <circle className={`pd-thin ${north==null?'pd-dash':''}`} r={u*1.1}/><path className="pd-solid" d={`M 0 ${-u*1.1} L ${u*.42} ${u*.7} L 0 ${u*.35} L ${-u*.42} ${u*.7} Z`}/>
    <text y={-u*1.35} fontSize={u*.7} fontWeight={600} textAnchor="middle">N</text>
   </g>
  </>}
  {children}
 </svg>;
}

/** Download the sheet as PNG or one-page PDF, always black on white paper. */
export async function exportPlanSheet(svg:SVGSVGElement,format:'png'|'pdf',name:string){
 const copy=svg.cloneNode(true) as SVGSVGElement,[, ,vw,vh]=(svg.getAttribute('viewBox')??'0 0 1 1').split(' ').map(Number),k=2400/Math.max(vw,vh),width=Math.round(vw*k),height=Math.round(vh*k);
 copy.removeAttribute('class');copy.setAttribute('class','pd');copy.setAttribute('width',String(width));copy.setAttribute('height',String(height));
 const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}));
 try{
  const image=new Image();image.src=url;await image.decode();
  await exportRaster(image,width,height,format,name,vw,vh);
 }finally{URL.revokeObjectURL(url);}
}

/** Shared by the 2D sheet and the 3D canvas: paint on white, then save as PNG or wrap the JPEG in a PDF page. */
export async function exportRaster(source:CanvasImageSource,width:number,height:number,format:'png'|'pdf',name:string,extentW=width,extentH=height){
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const context=canvas.getContext('2d');if(!context)throw Error('Canvas is unavailable.');
 context.fillStyle='#fff';context.fillRect(0,0,width,height);context.drawImage(source,0,0,width,height);
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,format==='pdf'?'image/jpeg':'image/png',.92));if(!blob)throw Error('Could not render the view.');
 let file=blob;
 if(format==='pdf'){const {planPdf}=await import('@/lib/plan-pdf');file=new Blob([planPdf(new Uint8Array(await blob.arrayBuffer()),width,height,extentW,extentH) as BlobPart],{type:'application/pdf'});}
 const link=document.createElement('a'),href=URL.createObjectURL(file);link.href=href;link.download=`${name}.${format}`;link.click();URL.revokeObjectURL(href);
}
