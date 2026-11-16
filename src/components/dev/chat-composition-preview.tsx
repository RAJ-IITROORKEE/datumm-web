'use client';

import {useEffect,useState} from 'react';
import {ConversationAnswer} from '../workspace/conversation-answer';
import {OutputWorkspaceProvider} from '../workspace/output-workspace';

const tableSource='| Review step | minutes |\n| --- | ---: |\n| Brief | 5 |\n| Concept | 15 |\n| Review | 10 |';
const flowSource='Brief -> Concept -> Review';
const answer=`Example time allocation\n\n${tableSource}\n\nReview sequence\n\n${flowSource}\n\nThese are illustrative values, not Revit measurements or task timings.`;
const span=(word:string)=>({start:answer.indexOf(word),end:answer.indexOf(word)+word.length});
const flow={type:'flow',source:span(flowSource)};
const bars={type:'bars',source:span(tableSource)};
const table={type:'table',source:span(tableSource)};

export function ChatCompositionPreview(){
 const [hash,setHash]=useState(''),[layout,setLayout]=useState('comparison'),[invalid,setInvalid]=useState(false),[foreign,setForeign]=useState(false);
 useEffect(()=>{void crypto.subtle.digest('SHA-256',new TextEncoder().encode(answer)).then(bytes=>setHash(Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join('')));},[]);
 const root=layout==='comparison'?{type:'stack',children:[{type:'grid',children:[table,bars]},{type:'details',label:span('Review sequence'),children:[flow]}]}:flow;
 const composition={schemaVersion:1,taskId:foreign?'other-task':'local-composition',turnId:'local-turn',answerHash:invalid?'0'.repeat(64):hash,kind:'illustrative-explanation',root};
 return <main style={{maxWidth:960,margin:'0 auto',padding:'24px 20px',minWidth:0}}>
  <h1 style={{fontSize:20}}>Chat composition · local preview</h1><p style={{color:'var(--muted-foreground)',marginBlock:'12px 20px'}}>Controlled fixture. No agent, provider or Revit execution. The production chat uses this same renderer only for validated saved presentations.</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',marginBlock:20}}>
   <label>Layout <select aria-label="Composition layout" value={layout} onChange={event=>setLayout(event.target.value)} style={{minHeight:44,background:'var(--panel)',padding:8}}><option value="comparison">Table and chart</option><option value="flow">Flow</option></select></label>
   <label style={{minHeight:44,display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={invalid} onChange={event=>setInvalid(event.target.checked)}/>Tamper answer hash</label>
   <label style={{minHeight:44,display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={foreign} onChange={event=>setForeign(event.target.checked)}/>Different task</label>
   <a href="/">Actual workspace</a>
  </div>
  <OutputWorkspaceProvider scopeKey="local-composition" scopeInput={{key:'local-composition',taskId:'local-composition',accountKey:'controlled-fixture',sourceKey:'controlled-answer'}}>{hash&&<ConversationAnswer text={answer} source={{key:'local-composition:answer',taskId:'local-composition',conversationIndex:0,state:'saved'}} turnId="local-turn" completed presentation={{composition}}/>}</OutputWorkspaceProvider>
 </main>;
}
