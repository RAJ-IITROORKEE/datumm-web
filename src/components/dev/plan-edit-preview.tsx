'use client';

import {useRef,useState} from 'react';
import {PlanCanvas,type DrawingVersion} from '../plan-canvas';
import {PlanEditPanel,type PlanEditControls} from '../workspace/plan-edit-panel';
import type {PlanEditNotice} from '../workspace/use-plan-edit';
import {acceptAgainNote,refusalMessage,successMessage,type PlanEdit} from '@/lib/plan-edits.mjs';

type Graph=DrawingVersion['graph'];
type Rooms=Graph['rooms'];
const room=(key:string,name:string,rect:number[],kind='habitable')=>({key,name,kind,rect,areaMm2:(rect[2]-rect[0])*(rect[3]-rect[1])});
const wall=(key:string,start:number[],end:number[],roomKeys:string[])=>({key,start,end,roomKeys});
const start:Graph={schemaVersion:3,provenance:{source:'deterministic'},site:{widthMm:9000,depthMm:7000},wallThicknessMm:200,wallHeightMm:3000,
  rooms:[room('living','Living',[0,0,6000,4000]),room('kitchen','Kitchen',[6000,0,9000,4000]),room('bedroom','Bedroom',[0,4000,6000,7000]),room('bath','Bathroom',[6000,4000,9000,7000])],
  walls:[wall('south',[0,0],[9000,0],['living','kitchen']),wall('east',[9000,0],[9000,7000],['kitchen','bath']),wall('north',[9000,7000],[0,7000],['bedroom','bath']),wall('west',[0,7000],[0,0],['bedroom','living']),
    wall('mid-v-1',[6000,0],[6000,4000],['living','kitchen']),wall('mid-v-2',[6000,4000],[6000,7000],['bedroom','bath']),wall('mid-h-1',[0,4000],[6000,4000],['living','bedroom']),wall('mid-h-2',[6000,4000],[9000,4000],['kitchen','bath'])],
  openings:[{key:'door-1',wallKey:'mid-v-1',kind:'door',offsetMm:300,widthMm:900,heightMm:2100,sillMm:0},{key:'window-1',wallKey:'south',kind:'window',offsetMm:2000,widthMm:1500,heightMm:1200,sillMm:900}]};
// Outer walls are really bounded by one room each; the fixture marks them with one key so they stay non-movable.
start.walls=start.walls!.map(row=>['south','east','north','west'].includes(row.key)?{...row,roomKeys:[row.roomKeys![0]]}:row);

const passReport={schema:'datumm.findings.v1',ruleSet:'plan-rules@1',status:'pass',summary:{blocking:0,advisory:0},findings:[]};
const modes={save:'Saves',stale:'Plan changed elsewhere (409)',refused:'Refused with a reason (422)',unintended:'Unintended change (422)'} as const;
type Mode=keyof typeof modes;

/** Local stand-in for the server: applies the edit to a copy of the graph and reports what changed. */
function applyLocally(graph:Graph,edit:PlanEdit){
  const next=structuredClone(graph),changes={rooms:[] as {key:string}[],walls:[] as string[],openings:[] as string[]};
  const resize=(rows:Rooms)=>rows.forEach(row=>{row.areaMm2=(row.rect[2]-row.rect[0])*(row.rect[3]-row.rect[1]);});
  if(edit.kind==='rename'){next.rooms.find(row=>row.key===edit.roomKey)!.name=edit.name;changes.rooms.push({key:edit.roomKey});}
  else if(edit.kind==='swap'){
    const [a,b]=edit.roomKeys.map(key=>next.rooms.find(row=>row.key===key)!);[a.rect,b.rect]=[b.rect,a.rect];resize(next.rooms);
    next.walls=next.walls!.map(row=>({...row,roomKeys:row.roomKeys!.map(key=>key===a.key?b.key:key===b.key?a.key:key)}));changes.rooms.push({key:a.key},{key:b.key});
  }else if(edit.kind==='move-wall'){
    const target=next.walls!.find(row=>row.key===edit.wallKey)!,axis=target.start[0]===target.end[0]?0:1,line=target.start[axis];
    const faces=next.rooms.filter(row=>row.rect[axis]===line||row.rect[axis+2]===line);
    faces.forEach(row=>{if(row.rect[axis]===line)row.rect[axis]+=edit.offsetMm;else row.rect[axis+2]+=edit.offsetMm;});
    if(next.rooms.some(row=>row.rect[0]>=row.rect[2]||row.rect[1]>=row.rect[3]))throw Object.assign(new Error('Requested wall offset would collapse or invert a room. Choose a smaller offset.'),{status:422});
    resize(next.rooms);changes.rooms.push(...faces.map(row=>({key:row.key})));
    next.walls!.forEach(row=>{if(row.start[axis]===line&&row.end[axis]===line)changes.walls.push(row.key);for(const point of [row.start,row.end])if(point[axis]===line)point[axis]+=edit.offsetMm;});
  }else if(edit.opening.kind==='delete'){const {openingKey}=edit.opening;next.openings=next.openings!.filter(row=>row.key!==openingKey);changes.openings.push(openingKey);}
  else{const {openingKey,widthMm,offsetMm}=edit.opening;Object.assign(next.openings!.find(row=>row.key===openingKey)!,{widthMm,offsetMm});changes.openings.push(openingKey);}
  return {next,changes};
}

const version=(n:number,graph:Graph):DrawingVersion=>({planId:'fixture-edits',version:n,fingerprint:`fixture-edit-v${n}`,svg:'',graph});

export function PlanEditPreview(){
  const [versions,setVersions]=useState<DrawingVersion[]>([version(1,start)]),[view,setView]=useState(0),[mode,setMode]=useState<Mode>('save');
  const [accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState<PlanEditNotice|null>(null),[selected,setSelected]=useState('');
  const lock=useRef(false);
  const latest=versions[versions.length-1],drawing=versions[view]??latest,earlierOf=drawing===latest?0:latest.version;
  const apply=async(edit:PlanEdit)=>{
    if(lock.current)return;lock.current=true;setBusy(true);setNotice(null);
    await new Promise(resolve=>setTimeout(resolve,700));
    try{
      if(mode==='stale')throw Object.assign(new Error('The plan changed after you opened it.'),{status:409,serviceCode:'edit.stale'});
      if(mode==='refused')throw Object.assign(new Error('Choose a shared interior wall.'),{status:422,serviceCode:'edit.refused'});
      if(mode==='unintended')throw Object.assign(new Error('Edit would also change: Hall.'),{status:422,serviceCode:'edit.unintended-change'});
      const {next,changes}=applyLocally(latest.graph,edit),saved=version(latest.version+1,next);
      setVersions(rows=>[...rows,saved]);setView(versions.length);setSelected('');
      setNotice({tone:'ok',text:successMessage({planId:saved.planId,version:saved.version,fingerprint:saved.fingerprint,changes,findings:passReport},next)+(accepted?` · ${acceptAgainNote(saved.version)}`:''),back:latest.version});
    }catch(failure){
      const e=failure as {status?:number;message?:string;serviceCode?:string};
      setNotice({tone:'error',text:refusalMessage({status:e.status,message:e.message,code:e.serviceCode})});
    }finally{lock.current=false;setBusy(false);}
  };
  const open=async(n:number)=>{setView(versions.findIndex(row=>row.version===n));setNotice(null);setSelected('');};
  const edit:PlanEditControls={visible:true,reason:earlierOf?`This is an earlier saved version. Open Version ${earlierOf} to edit.`:'',earlierOf,busy,notice,apply,open,dismiss:()=>setNotice(null)};
  return <div style={{display:'flex',flexDirection:'column',height:'calc(100dvh - 64px)',minHeight:0}}>
    <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',padding:'8px 16px',borderBottom:'1px solid var(--separator)'}}>
      <strong>Plan edits fixture</strong><span>Mocked server · nothing is sent · Version {drawing.version} of {latest.version}</span>
      <label>Next edit <select aria-label="Mocked server answer" value={mode} onChange={event=>setMode(event.target.value as Mode)}>{(Object.keys(modes) as Mode[]).map(key=><option key={key} value={key}>{modes[key]}</option>)}</select></label>
      <label><input type="checkbox" checked={accepted} onChange={event=>setAccepted(event.target.checked)}/> Version was accepted</label>
      <button onClick={()=>{setVersions([version(1,start)]);setView(0);setNotice(null);setSelected('');}}>Reset</button>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(300px,380px)',flex:1,minHeight:0}}>
      <div style={{display:'flex',flexDirection:'column',minWidth:0,minHeight:0}}><PlanCanvas drawing={drawing} selectedElement={selected} onSelectElement={setSelected} canvasInputEnabled={false} persistentProperties={false}/></div>
      <aside className="desktop-workspace" aria-label="Fixture edit panel" style={{overflow:'auto',padding:16,borderLeft:'1px solid var(--separator)'}}>
        <PlanEditPanel drawing={drawing} selected={selected} edit={edit}/>
      </aside>
    </div>
  </div>;
}
