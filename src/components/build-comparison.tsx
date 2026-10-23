'use client';

import { useState } from 'react';
import { Button } from './ui/button';

export type BuildFeedback={id:string;version:number;prompt:string};
export type BuildComparison={comparisonId:string;goalVersion:number;documentId:string;revision:number;
 native_verified:boolean;goal_satisfied:boolean|null;feedbackImplemented?:boolean;user_review:'pending'|'accepted';overlaySvg:string|null;
 image:{base64:string;contentType:'image/png';viewName:string};
 checks:{key:string;kind:string;status:'pass'|'mismatch'|'unknown';issue?:string|null;expected?:Record<string,unknown>;actual?:Record<string,unknown>}[];
 targets:{key:string;id:string;kind:string}[]};

export function BuildComparisonCard({comparison,feedback,revisions,active,onCommand}:{
 comparison?:BuildComparison;feedback:BuildFeedback[];revisions:number;active:boolean;
 onCommand:(command:Record<string,unknown>)=>Promise<void>;
}){
 const [pending,setPending]=useState(false),[sending,setSending]=useState(false),[error,setError]=useState('');
 const [text,setText]=useState(''),[target,setTarget]=useState(''),[action,setAction]=useState<'move'|'delete'>('move');
 const [dx,setDx]=useState('0'),[dy,setDy]=useState('0');
 const latest=feedback.at(-1);
 const send=async(command:Record<string,unknown>)=>{setPending(true);setError('');try{await onCommand(command);}catch(e){setError((e as Error).message);}finally{setPending(false);}};
 const saveFeedback=async()=>{if(!text.trim()||sending)return;setSending(true);setError('');try{await onCommand({type:'build_feedback',prompt:text.trim()});setText('');}catch(e){setError((e as Error).message);}finally{setSending(false);}};
 return <section className="agent-evidence-card build-comparison" aria-label="Measured build comparison">
  <div className="section-caption">COMPARE WITH REVIT{comparison?` · GOAL ${comparison.goalVersion} · REVISION ${comparison.revision}`:''}</div>
  <Button variant="secondary" disabled={pending||active} onClick={()=>void send({type:'compare_result'})}>{pending?'Reading Revit…':'Refresh measured comparison'}</Button>
  {comparison&&<>
   <p>Native measurements: <strong>{comparison.native_verified?'verified':'review findings'}</strong> · Goal checks: <strong>{comparison.goal_satisfied===null?'unknown':comparison.goal_satisfied?'passed':'mismatch'}</strong> · Your review: <strong>{comparison.user_review}</strong></p>
   {comparison.overlaySvg&&<><p>Blue: expected walls. Orange: actual walls.</p><img style={{width:'100%',maxHeight:360}} src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(comparison.overlaySvg)} alt="Expected blue and actual orange measured wall positions"/></>}
   <details><summary>Native Revit image · {comparison.image.viewName}</summary><img style={{width:'100%'}} src={'data:image/png;base64,'+comparison.image.base64} alt={`Native Revit plan at model revision ${comparison.revision}`}/></details>
   <details open={comparison.checks.some(c=>c.status!=='pass')}><summary>{comparison.checks.filter(c=>c.status==='pass').length} of {comparison.checks.length} measured checks pass</summary>
    <ul>{comparison.checks.map((check,index)=><li key={`${check.key}-${index}`}><strong>{check.status.toUpperCase()} · {check.key}</strong>{check.issue&&<p>{check.issue}</p>}<details><summary>Expected and actual evidence</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({expected:check.expected,actual:check.actual},null,2)}</pre></details></li>)}</ul>
   </details>
   <Button disabled={pending||active||!comparison.native_verified||(comparison.goal_satisfied!==true&&!comparison.feedbackImplemented)||comparison.user_review==='accepted'} onClick={()=>void send({type:'review_result',comparisonId:comparison.comparisonId})}>I inspected Revit — accept this result</Button>
  </>}
  <form className="build-feedback-form" onSubmit={e=>{e.preventDefault();void saveFeedback();}}>
   <label>What should change?<textarea aria-label="Post-build feedback" value={text} onChange={e=>setText(e.target.value)} maxLength={2000} placeholder="For example: make the kitchen bigger"/></label>
   <Button type="submit" variant="secondary" disabled={sending||!text.trim()}>{sending?'Saving feedback…':'Save feedback in this chat'}</Button>
  </form>
  {latest&&<><p>Goal version {latest.version}: {latest.prompt}</p><p>Choose the retained element and a measured edit. The next step rehearses the edit and opens a fresh exact proposal for your approval.</p>
   {comparison&&<form className="build-revision-form" onSubmit={e=>{e.preventDefault();void send({type:'prepare_revision',feedbackId:latest.id,comparisonId:comparison.comparisonId,targetKey:target,action,deltaXmm:action==='move'?Number(dx):0,deltaYmm:action==='move'?Number(dy):0});}}>
    <label>Retained element<select aria-label="Revision target" value={target} onChange={e=>setTarget(e.target.value)}><option value="">Choose an element</option>{comparison.targets.map(t=><option key={t.id} value={t.key}>{t.key} · {t.kind} · {t.id.slice(-8)}</option>)}</select></label>
    <label>Edit<select aria-label="Revision action" value={action} onChange={e=>setAction(e.target.value as 'move'|'delete')}><option value="move">Move</option><option value="delete">Delete with reviewed dependents</option></select></label>
    {action==='move'&&<><label>X displacement (mm)<input aria-label="X displacement in millimetres" type="number" min={-2000} max={2000} step="any" value={dx} onChange={e=>setDx(e.target.value)} required/></label><label>Y displacement (mm)<input aria-label="Y displacement in millimetres" type="number" min={-2000} max={2000} step="any" value={dy} onChange={e=>setDy(e.target.value)} required/></label></>}
    <p>{revisions} of 3 revision preparations used.</p><Button type="submit" disabled={pending||active||!target||revisions>=3}>Prepare minimal revision</Button>
   </form>}
  </>}
  {error&&<p role="alert">{error}</p>}
 </section>;
}
