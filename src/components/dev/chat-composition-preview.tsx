'use client';

import {useEffect,useState} from 'react';
import {ConversationAnswer} from '../workspace/conversation-answer';
import {OutputWorkspaceProvider} from '../workspace/output-workspace';

const tableSource='| Review step | minutes |\n| --- | ---: |\n| Brief | 5 |\n| Concept | 15 |\n| Review | 10 |';
const flowSource='Brief -> Concept -> Review';
const answer=`Example time allocation\n\n${tableSource}\n\nReview sequence\n\n${flowSource}\n\nThese are illustrative values, not Revit measurements or task timings.`;
const evidenceAnswer='Revision 3 is the saved concept report for the studio plan.\n\nIt lists six proposed rooms.';
const spanIn=(text:string,word:string)=>({start:text.indexOf(word),end:text.indexOf(word)+word.length});
const span=(word:string)=>spanIn(answer,word);
const digest=(text:string)=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)).then(bytes=>Array.from(new Uint8Array(bytes),byte=>byte.toString(16).padStart(2,'0')).join(''));
// Display values are what the server would resolve from the saved revision; nothing here is measured.
const evidence=(contentHash:string)=>({type:'evidence',ref:{kind:'report-revision',revisionId:'ab12'.repeat(16),contentHash},display:{revisionNumber:3,createdAt:'2026-11-16T10:00:00+00:00',planTitle:'Studio concept A',planVersion:2,rowCount:6,proposedRoomCount:6,proposedAreaM2:104.5}});
const flow={type:'flow',source:span(flowSource)};
const bars={type:'bars',source:span(tableSource)};
const table={type:'table',source:span(tableSource)};

export function ChatCompositionPreview(){
 const [hashes,setHashes]=useState<{base:string;evidence:string}|null>(null),[layout,setLayout]=useState('comparison'),[invalid,setInvalid]=useState(false),[foreign,setForeign]=useState(false),[tamper,setTamper]=useState(false),[announce,setAnnounce]=useState('');
 useEffect(()=>{void Promise.all([digest(answer),digest(evidenceAnswer)]).then(([base,evidence])=>setHashes({base,evidence}));},[]);
 const cited=layout==='evidence',text=cited?evidenceAnswer:answer,hash=hashes?(cited?hashes.evidence:hashes.base):'';
 const root=cited?{type:'stack',children:[{type:'text',text:spanIn(evidenceAnswer,'Revision 3 is the saved concept report for the studio plan.')},evidence(tamper?'f'.repeat(63):'cd34'.repeat(16))]}:layout==='comparison'?{type:'stack',children:[{type:'grid',children:[table,bars]},{type:'details',label:span('Review sequence'),children:[flow]}]}:flow;
 const composition=cited?{schemaVersion:2,taskId:foreign?'other-task':'local-composition',turnId:'local-turn',answerHash:invalid?'0'.repeat(64):hash,kind:'evidence-backed-explanation',root}:{schemaVersion:1,taskId:foreign?'other-task':'local-composition',turnId:'local-turn',answerHash:invalid?'0'.repeat(64):hash,kind:'illustrative-explanation',root};
 return <main style={{maxWidth:960,margin:'0 auto',padding:'24px 20px',minWidth:0}}>
  <h1 style={{fontSize:20}}>Chat composition · local preview</h1><p style={{color:'var(--muted-foreground)',marginBlock:'12px 20px'}}>Controlled fixture. No agent, provider or Revit execution. The production chat uses this same renderer only for validated saved presentations.</p>
  <div style={{display:'flex',flexWrap:'wrap',gap:12,alignItems:'center',marginBlock:20}}>
   <label>Layout <select aria-label="Composition layout" value={layout} onChange={event=>setLayout(event.target.value)} style={{minHeight:44,background:'var(--panel)',padding:8}}><option value="comparison">Table and chart</option><option value="flow">Flow</option><option value="evidence">Evidence card</option></select></label>
   <label style={{minHeight:44,display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={invalid} onChange={event=>setInvalid(event.target.checked)}/>Tamper answer hash</label>
   <label style={{minHeight:44,display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={foreign} onChange={event=>setForeign(event.target.checked)}/>Different task</label>
   <label style={{minHeight:44,display:'flex',alignItems:'center',gap:6}}><input type="checkbox" checked={tamper} onChange={event=>setTamper(event.target.checked)}/>Tamper revision hash</label>
   <a href="/">Actual workspace</a>
  </div>
  <OutputWorkspaceProvider scopeKey="local-composition" scopeInput={{key:'local-composition',taskId:'local-composition',accountKey:'controlled-fixture',sourceKey:'controlled-answer'}} onOpenReport={revision=>setAnnounce(`Fixture only, no request sent: would open cited revision ${revision.revisionId.slice(0,12)}… in the work area.`)}>{hash&&<ConversationAnswer text={text} source={{key:'local-composition:answer',taskId:'local-composition',conversationIndex:0,state:'saved'}} turnId="local-turn" completed presentation={{composition}}/>}</OutputWorkspaceProvider>
  <p role="status" style={{marginTop:12,color:'var(--muted-foreground)'}}>{announce}</p>
 </main>;
}
