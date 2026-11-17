'use client';

import {useMemo,useState} from 'react';
import {PlanCanvas,type DrawingVersion} from '../plan-canvas';
import {ChecksReport} from '../checks-report';
import {PlanReviewCard} from '../review/plan-review-card';
import {alternativeChecks} from '@/lib/plan-checks.mjs';

// Synthetic plan: every ref below names a room, wall or opening that exists in this graph.
const graph:DrawingVersion['graph']={site:{widthMm:9000,depthMm:7000},wallThicknessMm:200,wallHeightMm:3000,
  rooms:[{key:'living',name:'Living',areaMm2:24000000,rect:[0,0,6000,4000]},{key:'kitchen',name:'Kitchen',areaMm2:12000000,rect:[6000,0,9000,4000]},{key:'bedroom',name:'Bedroom',areaMm2:18000000,rect:[0,4000,6000,7000]},{key:'bath',name:'Bathroom',areaMm2:9000000,rect:[6000,4000,9000,7000]}],
  walls:[{key:'south',start:[0,0],end:[9000,0]},{key:'east',start:[9000,0],end:[9000,7000]},{key:'north',start:[9000,7000],end:[0,7000]},{key:'west',start:[0,7000],end:[0,0]},{key:'horizontal',start:[0,4000],end:[9000,4000]},{key:'vertical',start:[6000,0],end:[6000,7000]}],
  openings:[{key:'door-1',wallKey:'vertical',kind:'door',offsetMm:300,widthMm:900,heightMm:2100,sillMm:0}]};
const finding=(code:string,category:string,severity:string,message:string,rest:object)=>({code,category,severity,message,ruleVersion:1,...rest});
const failing=[
  finding('circulation.clear-width','circulation','blocking','The passage between the bedroom and the bathroom is narrower than it should be.',{why:'People, and anyone using a wheelchair or carrying furniture, need room to pass.',fix:'Widen the opening or move the dividing wall so the clear width reaches the minimum.',expected:'at least 1200 mm',actual:'1100 mm',refs:{rooms:['bedroom','bath'],walls:['horizontal'],openings:[]}}),
  finding('code.habitable-light','code','blocking','The bathroom has no window or vent to the outside.',{why:'Wet rooms need fresh air to stay dry and healthy.',fix:'Add a window or vent on an outside wall, or an extract fan.',expected:'an opening to the outside',actual:'none',refs:{rooms:['bath'],walls:['east'],openings:[]}}),
  finding('openings.end-clearance','openings','blocking','The door in the middle wall sits too close to the corner.',{why:'A door needs wall on both sides so the frame can be fixed.',fix:'Slide the door along the wall, away from the corner.',expected:'at least 450 mm from the end',actual:'300 mm',refs:{rooms:[],walls:[],openings:['door-1']}}),
  finding('brief.area-band','brief','advisory','The kitchen is smaller than the brief asks for.',{why:'The brief stated a target size for this room.',fix:'Move the dividing wall east, or accept the smaller kitchen.',expected:'about 14 m²',actual:'12 m²',refs:{rooms:['kitchen'],walls:['vertical'],openings:[]}}),
  finding('geometry.note','geometry','advisory','This finding has no location, so it has no Show button.',{why:'Some checks apply to the whole plan.'}),
];
const wrap=(status:string,findings:object[])=>({schema:'datumm.findings.v1',ruleSet:'plan-rules@1',status,summary:{blocking:findings.filter((row:any)=>row.severity==='blocking').length,advisory:findings.filter((row:any)=>row.severity==='advisory').length},findings});
const scenarios={
  failing:wrap('fail',failing),
  warnings:wrap('warn',failing.filter((row:any)=>row.severity==='advisory')),
  pass:wrap('pass',[]),
  unavailable:null,
} as const;
type Scenario=keyof typeof scenarios;
const candidates=[
  {planId:'fixture-plan',version:1,fingerprint:'a',checks:{status:'fail',blocking:3,advisory:2,codes:['circulation.clear-width']}},
  {planId:'fixture-plan',version:2,fingerprint:'b',checks:{status:'warn',blocking:0,advisory:1,codes:['brief.area-band']}},
  {planId:'fixture-plan',version:3,fingerprint:'c',checks:{status:'pass',blocking:0,advisory:0,codes:[]}},
];

export function ChecksPreview(){
  const [scenario,setScenario]=useState<Scenario>('failing'),[highlights,setHighlights]=useState<string[]>([]),[retries,setRetries]=useState(0);
  const drawing=useMemo<DrawingVersion>(()=>({planId:'fixture-plan',version:1,fingerprint:'fixture-checks',svg:'',graph,findings:scenarios[scenario]}),[scenario]);
  const roomNames=useMemo(()=>Object.fromEntries(graph.rooms.map(room=>[room.key,room.name])),[]);
  const review=alternativeChecks(candidates,{planId:'fixture-plan',version:3,reason:'Recommended alternative 3: it has the fewest check problems (all checks pass).'});
  return <div style={{display:'flex',flexDirection:'column',height:'calc(100dvh - 64px)',minHeight:0}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',padding:'8px 16px',borderBottom:'1px solid var(--separator)'}}>
      <strong>Plan checks fixture</strong><span>Synthetic findings · no agent or Revit execution</span>
      {(Object.keys(scenarios) as Scenario[]).map(key=><button key={key} aria-pressed={scenario===key} onClick={()=>{setScenario(key);setHighlights([]);}}>{key}</button>)}
      <span role="status">Retry presses: {retries}</span>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(300px,380px)',flex:1,minHeight:0}}>
      <div style={{display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}><PlanCanvas drawing={drawing} highlights={highlights} canvasInputEnabled={false} persistentProperties={false}/></div>
      <aside aria-label="Fixture checks panel" style={{overflow:'auto',padding:16,borderLeft:'1px solid var(--separator)',display:'flex',flexDirection:'column',gap:16}}>
        <ChecksReport findings={drawing.findings} roomNames={roomNames} activeKeys={highlights} onShow={setHighlights} onRetry={()=>setRetries(value=>value+1)}/>
        <PlanReviewCard alternativeChecks={review} alternatives={3} planVersion={3} planTitle="Fixture concept" accepted={false} mode="plan" busy={false} drawingLoading={false} drawingCurrent buildReady={false} showPlacement={false} onRequestChanges={()=>{}} onDetails={()=>{}} onAccept={async()=>{}} onSwitchToBuild={async()=>{}} onPrepare={async()=>{}} onPlacement={()=>{}}/>
      </aside>
    </div>
  </div>;
}
