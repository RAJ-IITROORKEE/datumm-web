'use client';
import {useEffect,useState} from 'react';
import {Check, Circle, CircleAlert, CircleHelp, Loader2} from 'lucide-react';
import {settledPoll} from '@/lib/settled-poll.mjs';

type Span={spanId:string;traceId:string;name:string;startedAt:number;status:string;error?:{message?:string};attributes?:any};
const stages=[['demo.inspect-target','Inspect active project'],['demo.placement','Find clear placement'],['demo.bind-types','Match loaded construction types'],['demo.preview','Validate exact proposal'],['demo.commit','Create & verify elements']];
export function buildProgress(spans:Span[],fingerprint:string,startedAt:number|null){
 const root=spans.filter(span=>span.name==='demo.build'&&(startedAt!==null?span.startedAt>=startedAt:span.attributes?.target?.fingerprint===fingerprint)).at(-1);
 if(!root)return null;
 return {root,stages:stages.map(([name,label])=>({name,label,span:spans.findLast(span=>span.traceId===root.traceId&&span.startedAt>=root.startedAt&&span.name===name)}))};
}
export function NativeBuildProgress({taskId,fingerprint,startedAt,working,error}:{taskId:string;fingerprint:string;startedAt:number|null;working:boolean;error:string}){
 const [trace,setTrace]=useState<{spans:Span[]}>(),[traceError,setTraceError]=useState('');
 useEffect(()=>{
  let live=true;
  const update=async()=>{try{const value=await window.desktop?.readTrace(taskId);if(live){setTrace(value);setTraceError('');}}catch{if(live)setTraceError('Live progress is unavailable. The build request may still be running.');}};
  const stop=working?settledPoll(update,1000):(void update(),()=>{});
  return()=>{live=false;stop();};
 },[taskId,working,startedAt,fingerprint]);
 const progress=buildProgress(trace?.spans??[],fingerprint,startedAt);
 if(!working&&!progress&&!error)return null;
 const failed=Boolean(error||progress?.root.status==='failed'),rows=progress?.stages??stages.map(([name,label])=>({name,label,span:undefined}));
 const unsettled=!working&&progress?.root.status==='running';
 const detail=error||progress?.root.error?.message;
 return <section className="native-build-progress" aria-label="Revit build progress" aria-busy={working}>
  <div className="native-progress-heading" role="status">{working?<Loader2 size={16} className="spin"/>:failed?<CircleAlert size={16}/>:unsettled?<CircleHelp size={16}/>:<Check size={16}/>}<strong>{working?'Building in Revit':failed?'Build blocked · review required':unsettled?'Build status needs checking':'Build request finished'}</strong></div>
  <ol>{rows.map(row=><li key={row.name} data-state={row.span?.status??'pending'}>{row.span?.status==='completed'?<Check size={14}/>:row.span?.status==='failed'?<CircleAlert size={14}/>:row.span?.status==='running'&&working?<Loader2 size={14} className="spin"/>:<Circle size={14}/>}<span>{row.label}</span><small>{row.span?.status==='completed'?'Done':row.span?.status==='failed'?'Blocked':row.span?.status==='running'?working?'In progress':'Unconfirmed':working?'Waiting':'Not run'}</small></li>)}</ol>
  {working&&!progress&&<p role="status">Connecting to the active Revit project…</p>}
  {detail&&<p role="alert">{detail}</p>}{traceError&&working&&<p role="status">{traceError}</p>}
  {unsettled&&<p>A previous request has no final trace. Inspect the original operation before retrying.</p>}
  <small>Stages reflect actual local tool calls. The final result reports whether native verification passed.</small>
 </section>;
}
