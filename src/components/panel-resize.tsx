'use client';

import {useRef} from 'react';

export function PanelResize({side,width,onChange,label,direction,maxWidth}:{side:'left'|'right';width:number;onChange:(width:number)=>void;label?:string;direction?:'forward'|'reverse';maxWidth?:number}) {
  const drag=useRef<{x:number;width:number}|null>(null);
  const min=side==='left'?220:320,defaultMax=side==='left'?360:620,max=Number.isFinite(maxWidth)?Math.max(min,Math.min(defaultMax,maxWidth!)):defaultMax,initial=side==='left'?224:380;
  const sign=direction==='forward'||!direction&&side==='left'?1:-1;
  const resize=(value:number)=>onChange(Math.max(min,Math.min(max,value)));
  return <div className={`panel-resize panel-resize-${side}`} role="separator" aria-label={`Resize ${label??(side==='left'?'navigation':'inspector')} panel`} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.round(width)} tabIndex={0}
    onPointerDown={event=>{if(event.button!==0)return;drag.current={x:event.clientX,width};event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();}}
    onPointerMove={event=>{if(drag.current)resize(drag.current.width+(event.clientX-drag.current.x)*sign);}}
    onPointerUp={event=>{drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}}
    onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
    onDoubleClick={()=>resize(initial)}
    onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();resize(event.key==='Home'?min:event.key==='End'?max:width+(event.key==='ArrowRight'?16:-16)*sign);}}/>;
}
