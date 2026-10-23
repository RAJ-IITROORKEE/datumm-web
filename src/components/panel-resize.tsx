'use client';

import {useRef} from 'react';

export function PanelResize({side,width,onChange}:{side:'left'|'right';width:number;onChange:(width:number)=>void}) {
  const drag=useRef<{x:number;width:number}|null>(null);
  const min=side==='left'?180:240,max=side==='left'?440:620,initial=side==='left'?208:440;
  const resize=(value:number)=>onChange(Math.max(min,Math.min(max,value)));
  return <div className={`panel-resize panel-resize-${side}`} role="separator" aria-label={`Resize ${side==='left'?'navigation':'inspector'} panel`} aria-orientation="vertical" aria-valuemin={min} aria-valuemax={max} aria-valuenow={Math.round(width)} tabIndex={0}
    onPointerDown={event=>{if(event.button!==0)return;drag.current={x:event.clientX,width};event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();}}
    onPointerMove={event=>{if(drag.current)resize(drag.current.width+(event.clientX-drag.current.x)*(side==='left'?1:-1));}}
    onPointerUp={event=>{drag.current=null;event.currentTarget.releasePointerCapture(event.pointerId);}}
    onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
    onDoubleClick={()=>resize(initial)}
    onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();resize(event.key==='Home'?min:event.key==='End'?max:width+(event.key==='ArrowRight'?16:-16)*(side==='left'?1:-1));}}/>;
}
