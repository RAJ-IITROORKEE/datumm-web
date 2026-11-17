'use client';

import {useMemo,useState} from 'react';
import {PlanCanvas,type DrawingVersion} from '../plan-canvas';
import {ARC_WALL,POLYGON_ROOM,curvedPlanGraph} from './curved-plan-fixture';

export function CurvedPlanPreview(){
  const [highlighted,setHighlighted]=useState(false);
  const drawing=useMemo<DrawingVersion>(()=>({planId:'fixture-curved-plan',version:1,fingerprint:'fixture-curved-plan',svg:'',graph:curvedPlanGraph}),[]);
  return <div style={{display:'flex',flexDirection:'column',height:'calc(100dvh - 64px)',minHeight:0}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',padding:'8px 16px',borderBottom:'1px solid var(--separator)'}}>
      <strong>Curved and polygon plan fixture</strong><span>Synthetic v6/v7-shaped graph · L-shaped room, arc wall with a window and a door</span>
      <button aria-pressed={highlighted} onClick={()=>setHighlighted(value=>!value)}>Highlight arc wall and L-shaped room</button>
    </div>
    <div style={{display:'flex',flexDirection:'column',flex:1,minHeight:0}}>
      <PlanCanvas drawing={drawing} highlights={highlighted?[ARC_WALL,POLYGON_ROOM]:[]} canvasInputEnabled={false} persistentProperties={false}/>
    </div>
  </div>;
}
