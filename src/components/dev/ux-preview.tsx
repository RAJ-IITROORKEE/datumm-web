'use client';

import {useState} from 'react';
import {PlanCanvas,type DrawingVersion} from '../plan-canvas';
import {AccountOnboarding} from '../onboarding/account-onboarding';
import {AnswerContent,OutputPanel,OutputWorkspaceProvider,useOutputWorkspace} from '../workspace/output-workspace';
import {ReviewReportView} from '../workspace/review-report';
import {parseReviewReport} from '@/lib/review-report.mjs';

const reviewReport = parseReviewReport({schemaVersion:1,runId:'synthetic-execution',documentId:'synthetic-model',revision:12,planVersion:3,sourceKind:'measured',source:'Synthetic retained Revit quantity pages',scope:'document',status:'completed',coverage:'partial',summary:'Illustrative quantity report for UI testing.',boqRows:[{recordType:'quantity',category:'Walls',count:12,centerlineLengthMm:48500,centerlineLengthKnownCount:12},{recordType:'quantity',category:'Doors',count:5}],elements:[{id:'fixture-wall-1',category:'Walls',name:'Living partition',heightMm:3000},{id:'fixture-door-1',category:'Doors',name:'Entrance door',hostId:'fixture-wall-1'}],limitations:['Synthetic development fixture. No model was inspected.','Only retained pages are included.'],artifacts:[]});

const drawing:DrawingVersion={planId:'development-fixture',version:1,fingerprint:'fixture-v1',svg:'',graph:{site:{widthMm:9000,depthMm:7000},wallThicknessMm:200,wallHeightMm:3000,openings:[],rooms:[{key:'living',name:'Living',areaMm2:24000000,rect:[0,0,6000,4000]},{key:'kitchen',name:'Kitchen',areaMm2:12000000,rect:[6000,0,9000,4000]},{key:'bedroom',name:'Bedroom',areaMm2:18000000,rect:[0,4000,6000,7000]},{key:'bath',name:'Bathroom',areaMm2:9000000,rect:[6000,4000,9000,7000]}],walls:[{key:'south',start:[0,0],end:[9000,0]},{key:'east',start:[9000,0],end:[9000,7000]},{key:'north',start:[9000,7000],end:[0,7000]},{key:'west',start:[0,7000],end:[0,0]},{key:'horizontal',start:[0,4000],end:[9000,4000]},{key:'vertical',start:[6000,0],end:[6000,7000]}]}};
const report='# Design review\n\nSynthetic UI fixture, not a Revit measurement.\n\n## Room schedule\n\n| Room | Area (m²) | Status |\n| --- | ---: | --- |\n| Living | 24 | Proposed |\n| Kitchen | 12 | Proposed |\n| Bedroom | 18 | Proposed |\n| Bathroom | 9 | Proposed |\n\n## Review workflow\n\n```mermaid\nflowchart LR\n Brief --> Plan\n Plan --> Review\n Review --> Approval\n Approval --> Revit\n```';

function PreviewWorkspace() {
  const {activeOutput,closeOutput}=useOutputWorkspace();
  const [focus,setFocus]=useState(false),[prompt,setPrompt]=useState('');
  return <div className="desktop-workspace" style={{position:'relative',height:'calc(100dvh - 64px)',display:'grid',gridTemplateColumns:focus?'0 minmax(0,1fr)':'minmax(280px,38%) minmax(0,1fr)',overflow:'hidden'}}>
    <section aria-label="Fixture conversation" style={{visibility:focus?'hidden':'visible',minWidth:0,overflow:'auto',padding:24,borderRight:'1px solid var(--separator)'}}><AnswerContent text={report} source={{key:'fixture-answer',taskId:'development-fixture',conversationIndex:1,state:'saved'}}/><label style={{display:'block',marginTop:24}}>Context draft<textarea aria-label="Fixture context draft" value={prompt} onChange={event=>setPrompt(event.target.value)} style={{width:'100%',minHeight:100,border:'1px solid var(--border)',padding:12}}/></label></section>
    <section style={{minWidth:0,minHeight:0,display:'flex',flexDirection:'column'}}><div style={{display:'flex',gap:16,padding:12,borderBottom:'1px solid var(--separator)'}}><button onClick={closeOutput}>Drawing</button><button onClick={()=>setFocus(value=>!value)} aria-pressed={focus}>{focus?'Exit focus':'Focus drawing'}</button><span style={{color:'var(--muted-foreground)'}}>Synthetic 9 × 7 m fixture</span></div><div style={{flex:1,minHeight:0,display:activeOutput?'none':'flex'}}><PlanCanvas drawing={drawing} canvasInputEnabled={false} persistentProperties={false} onAsk={value=>{setPrompt(value);setFocus(false);}}/></div>{activeOutput&&<OutputPanel/>}</section>
  </div>;
}

export function UxPreview() {
  const [surface,setSurface]=useState<'workspace'|'onboarding'|'report'>('workspace');
  return <><nav aria-label="Development fixtures" style={{minHeight:64,padding:16,display:'flex',flexWrap:'wrap',gap:20,borderBottom:'1px solid var(--separator)',alignItems:'center'}}><strong>Development preview</strong><span>Illustrative content · no agent or Revit execution</span><button onClick={()=>setSurface('workspace')}>Workspace fixture</button><button onClick={()=>setSurface('onboarding')}>Onboarding fixture</button><button onClick={()=>setSurface('report')}>BOQ fixture</button><a href="/">Actual workspace</a></nav>{surface==='workspace'?<OutputWorkspaceProvider scopeKey="development-fixture"><PreviewWorkspace/></OutputWorkspaceProvider>:surface==='report'?<div style={{height:'calc(100dvh - 64px)'}}><ReviewReportView report={reviewReport} fixture onClose={()=>setSurface('workspace')}/></div>:<AccountOnboarding initial={{name:'',domain:'',useCases:[],step:'profile'}} accountControl={<span>Preview account</span>} saveProfile={async()=>{}} onComplete={()=>setSurface('workspace')}/>}</>;
}
