'use client';
import {useState,type FormEvent} from 'react';
import {Pencil,Trash2,Undo2,X} from 'lucide-react';
import {interiorWalls,isMovableWall,moveDirectionHint,movePreview,moveWallEdit,NAME_MAX,openingEdit,parseMm,renameEdit,swapEdit,type EditCheck} from '@/lib/plan-edits.mjs';
import type {DrawingVersion} from '../plan-canvas';
import {Button} from '../ui/button';
import {RedlinePanel} from './redline-panel';
import type {WorkspaceState} from './use-workspace-state';
import styles from './plan-edit-panel.module.css';

export type PlanEditControls=WorkspaceState['planEdit'];
type Graph=DrawingVersion['graph'];
type Props={drawing:DrawingVersion;selected:string;edit:PlanEditControls;/** The `redlines` capability is on. */redlines?:boolean};

/** Edit actions for the selected room, wall or opening, inside the Design side panel's Details tab. */
export function PlanEditPanel({drawing,selected,edit,redlines=false}:Props){
  const {graph}=drawing,{notice,earlierOf,reason,busy}=edit;
  const room=graph.rooms.find(row=>row.key===selected),wall=room?undefined:graph.walls?.find(row=>row.key===selected),opening=room||wall?undefined:graph.openings?.find(row=>row.key===selected);
  const off=Boolean(reason)||busy,scope=`${drawing.planId}:${drawing.version}:${drawing.fingerprint}:${selected}`;
  return <section className={styles.panel} aria-label="Edit the plan" aria-busy={busy}>
    <div className={styles.label}>Edit this plan</div>
    {notice&&<div className={styles.notice} data-tone={notice.tone} role={notice.tone==='error'?'alert':'status'}>
      <span>{notice.text}</span>
      <span className={styles.noticeActions}>
        {notice.back&&notice.tone==='ok'&&<Button variant="secondary" size="sm" disabled={busy} onClick={()=>void edit.open(notice.back!)}><Undo2 size={14}/>Back to Version {notice.back}</Button>}
        <Button variant="ghost" size="icon-sm" aria-label="Dismiss message" onClick={edit.dismiss}><X size={14}/></Button>
      </span>
    </div>}
    {earlierOf>0&&<p className={styles.earlier}>Showing Version {drawing.version}, an earlier saved version. Nothing was deleted. <Button variant="secondary" size="sm" disabled={busy} onClick={()=>void edit.open(earlierOf)}>Open Version {earlierOf}</Button></p>}
    {reason&&!earlierOf&&<p className={styles.muted} role="status">{reason}</p>}
    {room?<RoomEdits key={scope} drawing={drawing} roomKey={room.key} off={off} edit={edit}/>
      :wall?<WallEdits key={scope} graph={graph} wallKey={wall!.key} off={off} edit={edit}/>
      :opening?<OpeningEdits key={scope} graph={graph} openingKey={opening!.key} off={off} edit={edit}/>
      :<p className={styles.muted}>Select a room, wall, door or window on the drawing to edit it.</p>}
    {redlines&&<RedlinePanel key={drawing.planId} drawing={drawing} off={off} read={edit.readRedlines} apply={edit.applyMany}/>}
  </section>;
}

/** Shows the first problem and sends nothing, or sends the checked edit. */
const useSend=(edit:PlanEditControls)=>{
  const [error,setError]=useState('');
  return {error,send:(check:EditCheck)=>{if(!check.ok){setError(check.error);return;}setError('');void edit.apply(check.edit);}};
};
const Problem=({text}:{text:string})=>text?<p role="alert" className={styles.problem}>{text}</p>:null;

function RoomEdits({drawing,roomKey,off,edit}:{drawing:DrawingVersion;roomKey:string;off:boolean;edit:PlanEditControls}){
  const {graph}=drawing,room=graph.rooms.find(row=>row.key===roomKey)!;
  const [renaming,setRenaming]=useState(false),[name,setName]=useState(room.name),[other,setOther]=useState(''),[wallKey,setWallKey]=useState(''),[mm,setMm]=useState('');
  const rename=useSend(edit),swap=useSend(edit),resize=useSend(edit);
  const walls=interiorWalls(graph,roomKey),partners=graph.rooms.filter(row=>row.key!==roomKey&&row.kind!=='circulation');
  const wall=wallKey||walls[0]?.key||'',preview=movePreview(graph,wall,mm);
  const submit=(event:FormEvent,run:()=>void)=>{event.preventDefault();if(!off)run();};
  return <>
    {renaming?<form className={styles.row} onSubmit={event=>submit(event,()=>rename.send(renameEdit(roomKey,name,graph)))} onKeyDown={event=>{if(event.key==='Escape'){event.stopPropagation();setRenaming(false);setName(room.name);}}}>
      <label className={styles.field}>Room name<input aria-label="New room name" autoFocus maxLength={NAME_MAX} value={name} disabled={off} onChange={event=>setName(event.target.value)}/></label>
      <div className={styles.buttons}><Button type="submit" size="sm" disabled={off}>Rename</Button><Button type="button" variant="ghost" size="sm" onClick={()=>{setRenaming(false);setName(room.name);}}>Cancel</Button></div>
      <Problem text={rename.error}/>
    </form>:<Button variant="secondary" size="sm" disabled={off} onClick={()=>setRenaming(true)}><Pencil size={14}/>Rename {room.name}</Button>}
    {partners.length>0&&room.kind!=='circulation'&&<form onSubmit={event=>submit(event,()=>swap.send(swapEdit(roomKey,other,graph)))}>
      <label className={styles.field}>Swap with…<select aria-label="Swap with room" value={other} disabled={off} onChange={event=>setOther(event.target.value)}><option value="">Choose a room</option>{partners.map(row=><option key={row.key} value={row.key}>{row.name}</option>)}</select></label>
      <Button type="submit" variant="secondary" size="sm" disabled={off||!other}>Swap places</Button>
      <p className={styles.muted}>The two rooms trade places and keep their names.</p><Problem text={swap.error}/>
    </form>}
    {walls.length>0&&<form onSubmit={event=>submit(event,()=>resize.send(moveWallEdit(wall,mm,graph)))}>
      <div className={styles.label}>Resize</div>
      <label className={styles.field}>Wall<select aria-label="Interior wall to move" value={wall} disabled={off} onChange={event=>setWallKey(event.target.value)}>{walls.map(row=><option key={row.key} value={row.key}>{row.label}</option>)}</select></label>
      <MoveFields graph={graph} wall={wall} mm={mm} setMm={setMm} off={off} preview={preview}/>
      <Button type="submit" variant="secondary" size="sm" disabled={off||!preview}>Move wall</Button><Problem text={resize.error}/>
    </form>}
  </>;
}

function MoveFields({graph,wall,mm,setMm,off,preview}:{graph:Graph;wall:string;mm:string;setMm:(value:string)=>void;off:boolean;preview:string}){
  return <>
    <label className={styles.field}>Move by · mm<input aria-label="Move wall by millimetres" type="number" step={1} inputMode="numeric" placeholder="for example 300" value={mm} disabled={off} onChange={event=>setMm(event.target.value)}/></label>
    <p className={styles.muted}>{moveDirectionHint(graph,wall)}</p>
    <p className={styles.preview} role="status">{preview||'Enter a whole number of millimetres to see the change.'}</p>
  </>;
}

function WallEdits({graph,wallKey,off,edit}:{graph:Graph;wallKey:string;off:boolean;edit:PlanEditControls}){
  const wall=graph.walls!.find(row=>row.key===wallKey)!,[mm,setMm]=useState(''),move=useSend(edit),preview=movePreview(graph,wallKey,mm);
  if(!isMovableWall(wall))return <p className={styles.muted}>Only straight walls between two rooms can be moved here. Outer and curved walls cannot.</p>;
  return <form onSubmit={event=>{event.preventDefault();if(!off)move.send(moveWallEdit(wallKey,mm,graph));}}>
    <MoveFields graph={graph} wall={wallKey} mm={mm} setMm={setMm} off={off} preview={preview}/>
    <Button type="submit" variant="secondary" size="sm" disabled={off||!preview}>{preview?`Move by ${parseMm(mm).toLocaleString('en-US')} mm`:'Move wall'}</Button><Problem text={move.error}/>
  </form>;
}

function OpeningEdits({graph,openingKey,off,edit}:{graph:Graph;openingKey:string;off:boolean;edit:PlanEditControls}){
  const opening=graph.openings!.find(row=>row.key===openingKey)!,label=opening.kind==='window'?'window':'door';
  const [width,setWidth]=useState(String(opening.widthMm)),[offset,setOffset]=useState(String(opening.offsetMm)),[confirming,setConfirming]=useState(false);
  const update=useSend(edit),remove=useSend(edit);
  return <>
    <form onSubmit={event=>{event.preventDefault();if(!off)update.send(openingEdit(graph,openingKey,'update',{widthMm:width,offsetMm:offset}));}}>
      <p className={styles.muted}>This is a {label}. Its type is fixed; delete it to start over.</p>
      <div className={styles.pair}>
        <label className={styles.field}>Width · mm<input aria-label="Opening width in millimetres" type="number" step={1} value={width} disabled={off} onChange={event=>setWidth(event.target.value)}/></label>
        <label className={styles.field}>Offset · mm<input aria-label="Opening offset along its wall in millimetres" type="number" step={1} value={offset} disabled={off} onChange={event=>setOffset(event.target.value)}/></label>
      </div>
      <Button type="submit" variant="secondary" size="sm" disabled={off}>Apply to this {label}</Button><Problem text={update.error}/>
    </form>
    {confirming?<div className={styles.confirm} role="group" aria-label={`Confirm deleting this ${label}`}>
      <p>Delete this {label}? A new version is saved without it. The earlier version is kept.</p>
      <div className={styles.buttons}>
        <Button variant="destructive" size="sm" disabled={off} onClick={()=>{setConfirming(false);remove.send(openingEdit(graph,openingKey,'delete'));}}><Trash2 size={14}/>Delete {label}</Button>
        <Button variant="ghost" size="sm" onClick={()=>setConfirming(false)}>Keep it</Button>
      </div>
    </div>:<Button variant="ghost" size="sm" disabled={off} onClick={()=>setConfirming(true)}><Trash2 size={14}/>Delete {label}…</Button>}
    <Problem text={remove.error}/>
  </>;
}
