'use client';

import {useCallback,useRef,useState} from 'react';
import {PlanCanvas,type DrawingVersion} from '../plan-canvas';
import {AccountOnboarding} from '../onboarding/account-onboarding';
import {AnswerContent,OutputPanel,OutputWorkspaceProvider,useOutputWorkspace} from '../workspace/output-workspace';
import {ReviewReportPanel,ReviewReportView} from '../workspace/review-report';
import {MessageResponse} from '../ai-elements/message';
import {parseReviewReport} from '@/lib/review-report.mjs';
import {AdminPreview,SettingsPreview} from './admin-preview';
import {ReviewPreview} from './review-preview';
import {ActivityPreview} from './activity-preview';
import {DisplayActionsPreview} from './display-actions-preview';

const ignoreReport = () => {};
const reviewReport = parseReviewReport({schemaVersion:1,runId:'synthetic-execution',documentId:'synthetic-model',revision:12,planVersion:3,sourceKind:'measured',source:'Synthetic retained Revit quantity pages',scope:'document',status:'completed',coverage:'partial',summary:'Illustrative quantity report for UI testing.',boqRows:[{recordType:'quantity',category:'Walls',count:12,centerlineLengthMm:48500,centerlineLengthKnownCount:12},{recordType:'quantity',category:'Doors',count:5}],elements:[{id:'fixture-wall-1',category:'Walls',name:'Living partition',heightMm:3000},{id:'fixture-door-1',category:'Doors',name:'Entrance door',hostId:'fixture-wall-1'}],limitations:['Synthetic development fixture. No model was inspected.','Only retained pages are included.'],artifacts:[]});

const drawing:DrawingVersion={planId:'development-fixture',version:1,fingerprint:'fixture-v1',svg:'',graph:{site:{widthMm:9000,depthMm:7000},wallThicknessMm:200,wallHeightMm:3000,openings:[],rooms:[{key:'living',name:'Living',areaMm2:24000000,rect:[0,0,6000,4000]},{key:'kitchen',name:'Kitchen',areaMm2:12000000,rect:[6000,0,9000,4000]},{key:'bedroom',name:'Bedroom',areaMm2:18000000,rect:[0,4000,6000,7000]},{key:'bath',name:'Bathroom',areaMm2:9000000,rect:[6000,4000,9000,7000]}],walls:[{key:'south',start:[0,0],end:[9000,0]},{key:'east',start:[9000,0],end:[9000,7000]},{key:'north',start:[9000,7000],end:[0,7000]},{key:'west',start:[0,7000],end:[0,0]},{key:'horizontal',start:[0,4000],end:[9000,4000]},{key:'vertical',start:[6000,0],end:[6000,7000]}]}};
const report='# Design review\n\nSynthetic UI fixture, not a Revit measurement.\n\n## Room schedule\n\n| Room | Area (m²) | Status |\n| --- | ---: | --- |\n| Living | 24 | Proposed |\n| Kitchen | 12 | Proposed |\n| Bedroom | 18 | Proposed |\n| Bathroom | 9 | Proposed |\n\n## Review workflow\n\n```mermaid\nflowchart LR\n Brief --> Plan\n Plan --> Review\n Review --> Approval\n Approval --> Revit\n```';

const largeReport={...reviewReport,boq:{...reviewReport.boq,rows:Array.from({length:1200},(_,index)=>({...reviewReport.boq.rows[0],name:`Fixture item ${index}`,count:index+1}))}};

function StreamingFixture() {
  const [complete,setComplete]=useState(false);
  const {activeOutput}=useOutputWorkspace();
  return <div style={{height:'calc(100dvh - 64px)',display:'grid',gridTemplateColumns:'minmax(0,1fr) minmax(0,1fr)',overflow:'hidden'}}>
    <section style={{overflow:'auto',padding:24}}><button onClick={()=>setComplete(true)} disabled={complete}>Finish simulated stream</button><p>Synthetic fixture · the answer text stays identical on completion.</p><AnswerContent text={report} source={{key:'stream-fixture',taskId:'fixture-stream',conversationIndex:0,state:complete?'saved':'streaming'}}/></section>
    <section style={{minHeight:0,minWidth:0}}>{activeOutput?<OutputPanel/>:<p style={{padding:24}}>Open an answer output to check completion controls.</p>}</section>
  </div>;
}

function ReportLifecycleFixture({onClose}:{onClose:()=>void}) {
  const [version,setVersion]=useState(1),[task,setTask]=useState(1),[requests,setRequests]=useState(0);
  const unavailable=useRef(false);
  const fetcher=useCallback<typeof fetch>(async(_input,init)=>{
    setRequests(value=>value+1);
    await new Promise(resolve=>setTimeout(resolve,250));
    if(init?.signal?.aborted)throw new DOMException('Aborted','AbortError');
    if(unavailable.current)return Response.json({detail:'Synthetic unavailable report'},{status:404});
    return Response.json({schemaVersion:1,runId:'fixture-execution',sourceKind:'measured',documentId:'fixture-document',revision:12,coverage:'partial',limitations:['Synthetic saved evidence only.'],boqRows:[{category:'Walls',count:12}],elements:[{id:'fixture-wall',name:'Fixture wall'}],artifacts:[]});
  },[]);
  return <div style={{height:'calc(100dvh - 64px)',display:'flex',flexDirection:'column'}}><div style={{padding:12,display:'flex',gap:18,flexWrap:'wrap'}}><span role="status">Fixture requests: {requests}</span><button onClick={()=>setVersion(value=>value+1)}>Background task update</button><button onClick={()=>setTask(value=>value+1)}>Switch fixture task</button><button onClick={()=>{unavailable.current=true;setTask(value=>value+1);}}>Load unavailable report</button></div><ReviewReportPanel scope={{key:JSON.stringify(['development-fixture','task',`fixture-task-${task}`]),epoch:task,accountKey:'development-fixture',taskId:`fixture-task-${task}`,sourceKey:'fixture-source'}} openId={1} onReport={ignoreReport} taskId={`fixture-task-${task}`} taskVersion={version} onClose={onClose} fetcher={fetcher}/></div>;
}

function PreviewWorkspace() {
  const {activeOutput,closeOutput}=useOutputWorkspace();
  const [focus,setFocus]=useState(false),[prompt,setPrompt]=useState('');
  return <div className="desktop-workspace" style={{position:'relative',height:'calc(100dvh - 64px)',display:'grid',gridTemplateColumns:focus?'0 minmax(0,1fr)':'minmax(280px,38%) minmax(0,1fr)',overflow:'hidden'}}>
    <section aria-label="Fixture conversation" style={{visibility:focus?'hidden':'visible',minWidth:0,overflow:'auto',padding:24,borderRight:'1px solid var(--separator)'}}><AnswerContent text={report} source={{key:'fixture-answer',taskId:'development-fixture',conversationIndex:1,state:'saved'}}/><label style={{display:'block',marginTop:24}}>Context draft<textarea aria-label="Fixture context draft" value={prompt} onChange={event=>setPrompt(event.target.value)} style={{width:'100%',minHeight:100,border:'1px solid var(--border)',padding:12}}/></label></section>
    <section style={{minWidth:0,minHeight:0,display:'flex',flexDirection:'column'}}><div style={{display:'flex',gap:16,padding:12,borderBottom:'1px solid var(--separator)'}}><button onClick={closeOutput}>Drawing</button><button onClick={()=>setFocus(value=>!value)} aria-pressed={focus}>{focus?'Exit focus':'Focus drawing'}</button><span style={{color:'var(--muted-foreground)'}}>Synthetic 9 × 7 m fixture</span></div><div style={{flex:1,minHeight:0,display:activeOutput?'none':'flex'}}><PlanCanvas drawing={drawing} canvasInputEnabled={false} persistentProperties={false} onAsk={value=>{setPrompt(value);setFocus(false);}}/></div>{activeOutput&&<OutputPanel/>}</section>
  </div>;
}

export function UxPreview() {
  const [surface,setSurface]=useState<'workspace'|'onboarding'|'report'|'large'|'lifecycle'|'stream'|'diagram'|'admin'|'settings'|'review'|'activity'|'display-actions'>('workspace');
  const [failSave,setFailSave]=useState(false);
  return <><nav aria-label="Development fixtures" style={{minHeight:64,padding:16,display:'flex',flexWrap:'wrap',gap:20,borderBottom:'1px solid var(--separator)',alignItems:'center'}}><strong>Development preview</strong><span>Illustrative content · no agent or Revit execution</span><button onClick={()=>setSurface('workspace')}>Workspace fixture</button><button onClick={()=>setSurface('onboarding')}>Onboarding fixture</button><button onClick={()=>setSurface('report')}>BOQ fixture</button><button onClick={()=>setSurface('large')}>Large BOQ</button><button onClick={()=>setSurface('lifecycle')}>Report lifecycle</button><button onClick={()=>setSurface('stream')}>Streaming fixture</button><button onClick={()=>setSurface('diagram')}>Broken diagram</button><a href="/">Actual workspace</a></nav>
    <div style={{display:'flex',gap:20,padding:'8px 16px',borderBottom:'1px solid var(--separator)',flexWrap:'wrap'}}><button onClick={()=>setSurface('settings')}>Settings fixture</button><button onClick={()=>setSurface('admin')}>Admin fixture</button><button onClick={()=>setSurface('review')}>Review fixture</button><button onClick={()=>setSurface('activity')}>Activity fixture</button><button onClick={()=>setSurface('display-actions')}>Display actions</button></div>
    {surface==='display-actions'?<DisplayActionsPreview/>:surface==='activity'?<ActivityPreview onClose={()=>setSurface('workspace')}/>:surface==='review'?<ReviewPreview onClose={()=>setSurface('workspace')}/>:surface==='admin'?<AdminPreview onClose={()=>setSurface('workspace')}/>:surface==='settings'?<SettingsPreview onClose={()=>setSurface('workspace')}/>:surface==='workspace'?<OutputWorkspaceProvider scopeKey={JSON.stringify(['development-fixture','task','development-fixture'])} scopeInput={{key:JSON.stringify(['development-fixture','task','development-fixture']),accountKey:'development-fixture',taskId:'development-fixture',sourceKey:'fixture-source'}}><PreviewWorkspace/></OutputWorkspaceProvider>
    :surface==='report'||surface==='large'?<div style={{height:'calc(100dvh - 64px)'}}><ReviewReportView key={surface} report={surface==='large'?largeReport:reviewReport} fixture onClose={()=>setSurface('workspace')}/></div>
    :surface==='lifecycle'?<ReportLifecycleFixture onClose={()=>setSurface('workspace')}/>
    :surface==='stream'?<OutputWorkspaceProvider scopeKey={JSON.stringify(['development-fixture','task','fixture-stream'])} scopeInput={{key:JSON.stringify(['development-fixture','task','fixture-stream']),accountKey:'development-fixture',taskId:'fixture-stream',sourceKey:'fixture-source'}}><StreamingFixture/></OutputWorkspaceProvider>
    :surface==='diagram'?<section style={{padding:24}}><h1>Synthetic malformed diagram</h1><MessageResponse>{'```mermaid\nflowchart LR\n A[Unclosed\n```'}</MessageResponse></section>
    :<><label style={{display:'block',padding:16}}><input type="checkbox" checked={failSave} onChange={event=>setFailSave(event.target.checked)}/>Fail next onboarding save</label><AccountOnboarding initial={{name:'',domain:'',useCases:[],step:'profile'}} accountControl={<span>Preview account</span>} saveProfile={async()=>{if(failSave){setFailSave(false);throw new Error('Synthetic save failure. Your entries are preserved; try again.');}}} onComplete={()=>setSurface('workspace')}/></>}
  </>;
}
