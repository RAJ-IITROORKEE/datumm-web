'use client';
import {useEffect,useState} from 'react';
import {Check, Circle, CircleAlert, CircleHelp, Loader2} from 'lucide-react';
import {settledPoll} from '@/lib/settled-poll.mjs';
import styles from './review/review-panels.module.css';
import nativeStyles from './native-build-review.module.css';

type Span={spanId:string;traceId:string;name:string;startedAt:number;status:string;error?:{message?:string};attributes?:any};
const stages=[['demo.inspect-target','Inspect active project'],['demo.placement','Find clear placement'],['demo.bind-types','Match loaded construction types'],['demo.preview','Validate exact proposal'],['demo.commit','Create & verify elements']];
export function buildProgress(spans:Span[],fingerprint:string,startedAt:number|null){
 const root=spans.filter(span=>span.name==='demo.build'&&(startedAt!==null?span.startedAt>=startedAt:span.attributes?.target?.fingerprint===fingerprint)).at(-1);
 if(!root)return null;
 return {root,stages:stages.map(([name,label])=>({name,label,span:spans.findLast(span=>span.traceId===root.traceId&&span.startedAt>=root.startedAt&&span.name===name)}))};
}
export function NativeBuildProgress({taskId,fingerprint,startedAt,working,error}:{taskId:string;fingerprint:string;startedAt:number|null;working:boolean;error:string}){
 const traceKey=`${taskId}:${fingerprint}:${startedAt}`;
 const [trace,setTrace]=useState<{key:string;spans:Span[]}>(),[traceError,setTraceError]=useState('');
 useEffect(()=>{
  let live=true;
  const update=async()=>{try{if(!window.desktop?.readTrace)throw Error('Local trace unavailable');const value=await window.desktop.readTrace(taskId);if(live){setTrace({key:traceKey,spans:value.spans});setTraceError('');}}catch{if(live)setTraceError('Live progress is unavailable. The build request may still be running.');}};
  const stop=working?settledPoll(update,1000):(void update(),()=>{});
  return()=>{live=false;stop();};
 },[taskId,working,startedAt,fingerprint,traceKey]);
 const progress=buildProgress(trace?.key===traceKey?trace.spans:[],fingerprint,startedAt);
 if(!working&&!progress&&!error)return null;
 const failed=Boolean(error||progress?.root.status==='failed'),rows=progress?.stages??stages.map(([name,label])=>({name,label,span:undefined}));
 const unsettled=!working&&!failed&&progress?.root.status!=='completed';
 const detail=error||progress?.root.error?.message;
 const title=working?'Building in Revit':failed?'Build blocked · review required':unsettled?'Build status needs checking':'Build request finished';
 return <section className={styles.panel} aria-label="Revit build progress" aria-busy={working}>
  <header className={styles.header}>
   <div className={styles.heading}><h3 className={styles.title}>{title}</h3><p className={styles.description}>Local Revit tool activity. The native result determines whether changes were applied and verified.</p></div>
   <span className={styles.status} data-tone={failed?'error':unsettled?'warning':'default'} role="status">{working?<Loader2 className="spin" aria-hidden="true"/>:failed?<CircleAlert aria-hidden="true"/>:unsettled?<CircleHelp aria-hidden="true"/>:<Check aria-hidden="true"/>}{working?'In progress':failed?'Needs review':unsettled?'Unconfirmed':'Request finished'}</span>
  </header>
  <ol className={nativeStyles.progressList}>{rows.map(row=><li key={row.name} data-state={row.span?.status??'pending'}>{row.span?.status==='completed'?<Check size={14} aria-hidden="true"/>:row.span?.status==='failed'?<CircleAlert size={14} aria-hidden="true"/>:row.span?.status==='running'&&working?<Loader2 size={14} className="spin" aria-hidden="true"/>:<Circle size={14} aria-hidden="true"/>}<span>{row.label}</span><small>{row.span?.status==='completed'?'Done':row.span?.status==='failed'?'Blocked':row.span?.status==='running'?working?'In progress':'Unconfirmed':'Not reported'}</small></li>)}</ol>
  {working&&!progress&&<p className={styles.note} role="status">Waiting for local Revit activity to be reported…</p>}
  {detail&&<p className={styles.error} role="alert">{detail}</p>}{traceError&&working&&<p className={styles.note} role="status">{traceError}</p>}
  {unsettled&&<p className={styles.note}>This request has no confirmed final trace. Inspect the original operation before retrying.</p>}
 </section>;
}
