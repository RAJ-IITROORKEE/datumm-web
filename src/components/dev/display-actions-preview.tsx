'use client';

import {useEffect,useRef,useState} from 'react';
import {DisplayActionsTurn,useDisplayActions} from '../workspace/display-actions';
import {TurnProcess} from '../workspace/turn-process';
import type {DisplayScope,DisplaySection,DisplayView} from '@/lib/display-actions.mjs';

const TASK='fixture-task';
const answer='The kitchen is 12 m² and the living room is 24 m². '+
 'Illustrative fixture text, not a Revit measurement.';
const turns=[
 {turnId:'turn-0001',prompt:'List the room areas',answer:'Living 24 m², Kitchen 12 m².'},
 {turnId:'turn-0002',prompt:'Which room is smallest?',answer:'The bathroom, at 9 m².'},
 {turnId:'turn-0003',prompt:'Summarise the layout',answer},
];
const sets={
 'Open Activity + expand turn 1':[
  {action:'open_work_area',section:'activity'},{action:'expand_process',turnId:'turn-0001'},
 ],
 'Scroll to turn 1 + suggest a follow-up':[
  {action:'scroll_to_turn',turnId:'turn-0001'},
  {action:'suggest_followup',text:'Compare the two alternatives’ areas'},
 ],
};
type Mode='live'|'stale'|'history';
const sections:DisplaySection[]=['design','activity','assets','exports'];
const hex=(bytes:ArrayBuffer)=>
 Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('');

function Scenario({mode,narrow,actionSet}:{mode:Mode;narrow:boolean;actionSet:keyof typeof sets}) {
 const [hash,setHash]=useState(''),[finished,setFinished]=useState(mode==='history');
 const [section,setSection]=useState<DisplaySection>('design');
 const [open,setOpen]=useState<boolean|null>(null);
 const [pane,setPane]=useState<'chat'|'drawing'>('chat');
 const [draft,setDraft]=useState('');
 const scope=useRef<DisplayScope>({key:TASK,epoch:1});
 const captured=useRef<DisplayScope>({key:TASK,epoch:1});
 const [,tick]=useState(0);
 useEffect(()=>{
  const digest=crypto.subtle.digest('SHA-256',new TextEncoder().encode(answer));
  void digest.then(bytes=>setHash(hex(bytes)));
 },[]);
 const api=useDisplayActions({
  enabled:true,scopeNow:()=>({...scope.current}),
  // History has no captured submission, exactly like a reload.
  liveScope:(_task,_turn,_sequence,last)=>mode!=='history'&&last?{...captured.current}:null,
  split:!narrow,view:{section,workAreaOpen:open,workspacePane:pane},composerEmpty:draft==='',
  openSection:next=>{setSection(next);setOpen(true);setPane('drawing');},
  restoreView:(fields:DisplayView)=>{
   if(fields.section!==undefined)setSection(fields.section);
   if(fields.workAreaOpen!==undefined)setOpen(fields.workAreaOpen);
   if(fields.workspacePane!==undefined)setPane(fields.workspacePane);
  },
 });
 const completion=finished&&hash?{schemaVersion:1,taskId:TASK,turnId:'turn-0003',
  executionId:'fixture-run',answerHash:hash,status:'completed',completionSequence:9}:undefined;
 const actions=hash?{schemaVersion:1,kind:'display-actions',answerHash:hash,taskId:TASK,
  turnId:'turn-0003',items:sets[actionSet]}:undefined;
 const chatHidden=narrow&&pane==='drawing';
 const newEpoch=()=>{scope.current={key:TASK,epoch:scope.current.epoch+1};tick(value=>value+1);};
 const status=mode==='history'?'Reloaded: nothing has been applied.'
  :finished?'Stream finished.':'Streaming…';
 const columns=narrow?'minmax(0,1fr)':'minmax(0,1fr) minmax(0,1fr)';
 const viewportStyle={height:300,overflow:'auto',border:'1px solid var(--separator)',padding:12,
  display:'grid',gap:20,alignContent:'start'} as const;
 return <div style={{display:'grid',gridTemplateColumns:columns,gap:16,padding:16}}>
  <section id="workspace-chat" aria-label="Fixture chat" hidden={chatHidden} style={{minWidth:0}}>
   <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:8}}>
    {mode!=='history'&&<button onClick={()=>setFinished(true)} disabled={finished}>
     Finish simulated stream</button>}
    {mode==='stale'&&<button onClick={newEpoch}>Switch chat and back (new epoch)</button>}
    <span role="status">{status}</span>
   </div>
   <div className="transcript-viewport" style={viewportStyle}>
    {turns.map(turn=><div key={turn.turnId} data-turn-id={turn.turnId}>
     <p><strong>You:</strong> {turn.prompt}</p>
     <TurnProcess events={[]} active={false} waiting={false}
      status={turn.turnId==='turn-0003'&&!finished?'running':'completed'}
      open={api.processOpen(TASK,turn.turnId)}
      onOpenChange={value=>api.setProcessOpen(TASK,turn.turnId,value)}
      actionRows={api.rows(TASK,turn.turnId)}/>
     <p>{turn.answer}</p>
     {turn.turnId==='turn-0003'&&<DisplayActionsTurn api={api} taskId={TASK} turnId={turn.turnId}
      last text={answer} completion={completion} actions={actions}
      turnIds={turns.map(row=>row.turnId)}/>}
    </div>)}
    <div style={{height:200}} aria-hidden="true"/>
   </div>
   <textarea aria-label="Message DATUMM" rows={2} style={{width:'100%',marginTop:8}} value={draft}
    placeholder={!draft&&api.placeholder?api.placeholder:'Ask a follow-up or describe your task…'}
    onChange={event=>{setDraft(event.target.value);api.dismissPlaceholder();}}/>
  </section>
  <section aria-label="Fixture work area"
   style={{minWidth:0,border:'1px solid var(--separator)',padding:12}}>
   <div role="group" aria-label="Work area sections" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
    {sections.map(item=><button key={item} data-section={item} aria-pressed={section===item}
     onClick={()=>{setSection(item);setOpen(true);setPane('drawing');}}>{item}</button>)}
    {narrow&&pane==='drawing'&&<button onClick={()=>setPane('chat')}>Back to chat</button>}
   </div>
   <p>Section: <strong data-testid="section">{section}</strong>
    {' '}· work area {open===null?'automatic':open?'open':'closed'} · pane {pane}</p>
  </section>
 </div>;
}

export function DisplayActionsPreview() {
 const [mode,setMode]=useState<Mode>('live'),[narrow,setNarrow]=useState(false);
 const [actionSet,setActionSet]=useState<keyof typeof sets>('Open Activity + expand turn 1');
 const [run,setRun]=useState(0);
 const reset=()=>setRun(value=>value+1);
 return <main style={{maxWidth:1100,margin:'0 auto'}}>
  <div style={{display:'flex',gap:16,flexWrap:'wrap',padding:16,alignItems:'center'}}>
   <strong>Display actions</strong>
   <span>Controlled fixture. No transport, agent or Revit execution.</span>
   <label>Case <select value={mode}
    onChange={event=>{setMode(event.target.value as Mode);reset();}}>
    <option value="live">Live answer</option>
    <option value="stale">Stale (view changes before finish)</option>
    <option value="history">History (reload)</option>
   </select></label>
   <label>Actions <select value={actionSet}
    onChange={event=>{setActionSet(event.target.value as keyof typeof sets);reset();}}>
    {Object.keys(sets).map(name=><option key={name}>{name}</option>)}
   </select></label>
   <label><input type="checkbox" checked={narrow}
    onChange={event=>{setNarrow(event.target.checked);reset();}}/>
    {' '}Narrow screen (chat hides behind the work area)</label>
   <button onClick={reset}>Reset</button>
  </div>
  <Scenario key={run} mode={mode} narrow={narrow} actionSet={actionSet}/>
 </main>;
}
