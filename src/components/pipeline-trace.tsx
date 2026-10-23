'use client';
import {useEffect,useState} from 'react';
import {Button} from './ui/button';

export function PipelineTrace({taskId}:{taskId:string}){
  const [trace,setTrace]=useState<any>(),[error,setError]=useState('');
  useEffect(()=>{let active=true;const update=()=>{void window.desktop?.readTrace(taskId).then(value=>{if(active){setTrace(value);setError('');}}).catch(e=>{if(active)setError(e.message);});};update();const timer=setInterval(update,2000);return()=>{active=false;clearInterval(timer);};},[taskId]);
  return <section className="pipeline-trace" aria-label="Pipeline diagnostics"><div className="section-caption">PIPELINE TRACE <span>{trace?.spans?.length??0} spans</span></div><p>Actual calls, timing and public errors. Local traces stay with this chat.</p><Button variant="secondary" onClick={()=>void window.desktop?.exportTrace(taskId).catch(e=>setError(e.message))}>Export pipeline trace</Button>{error&&<p role="alert">{error}</p>}{trace?.status?.localError&&<p role="alert">{trace.status.localError}</p>}{trace?.status?.exportError&&<p role="alert">{trace.status.exportError}</p>}{trace?.spans?.map((span:any)=><details key={span.spanId}><summary><span>{span.name}</span><small>{span.status} · {span.elapsedMs===undefined?'running':(span.elapsedMs/1000).toFixed(2)+' s'}</small></summary><p>Trace {span.traceId.slice(0,12)} · span {span.spanId}{span.parentSpanId?' · parent '+span.parentSpanId:''}</p>{span.error&&<p role="alert">{span.error.code??'ERROR'}: {span.error.message}</p>}<pre>{JSON.stringify(span.attributes,null,2)}</pre></details>)}</section>;
}
