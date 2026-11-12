'use client';
import {useRef,useState} from 'react';
import {ArrowUpRight,Check,FileCheck2,Loader2} from 'lucide-react';
import {Button} from '../ui/button';
import styles from './review-panels.module.css';

type Props={alternatives:number;planVersion?:number;planId?:string;fingerprint?:string;accepted:boolean;mode:string;busy:boolean;drawingLoading:boolean;drawingError?:string;drawingCurrent:boolean;buildReady:boolean;showPlacement:boolean;onRequestChanges:()=>void;onDetails:()=>void;onAccept:()=>Promise<void>;onSwitchToBuild:()=>Promise<void>;onPrepare:()=>Promise<void>;onPlacement:()=>void};
export function PlanReviewCard(props:Props){
  const [working,setWorking]=useState(false),[error,setError]=useState('');const inFlight=useRef(false);
  const blocked=props.busy||working;
  const drawingReady=!props.drawingLoading&&!props.drawingError&&props.drawingCurrent;
  const action=async(kind:'accept'|'build'|'prepare')=>{if(inFlight.current||props.busy||!drawingReady||kind==='prepare'&&!props.buildReady)return;inFlight.current=true;setWorking(true);setError('');try{await (kind==='accept'?props.onAccept:kind==='build'?props.onSwitchToBuild:props.onPrepare)();}catch(failure){setError(failure instanceof Error?failure.message:'The plan action failed. Your saved drawing remains available.');}finally{inFlight.current=false;setWorking(false);}};
  return <section className={styles.panel} aria-label="Plan review" aria-busy={blocked}><header className={styles.header}><div className={styles.heading}><h3 className={styles.title}>Review this plan</h3><p className={styles.description}>{props.alternatives} {props.alternatives===1?'alternative':'alternatives'} available{props.planVersion!==undefined?' · Plan v'+props.planVersion:''}.</p></div><span className={styles.status} data-tone={props.accepted?'success':'warning'}>{props.accepted?<Check aria-hidden/>:<FileCheck2 aria-hidden/>}{props.accepted?'Plan accepted':'Review required'}</span></header>
    <p className={styles.note}>Accept the displayed plan and its assumptions before preparing native changes. Plan acceptance does not commit a Revit build.</p>
    {(props.planId||props.fingerprint)&&<dl className={styles.facts}>{props.planId&&<div><dt>Plan</dt><dd><code>{props.planId}</code></dd></div>}{props.fingerprint&&<div><dt>Fingerprint</dt><dd><code>{props.fingerprint.slice(0,16)}</code></dd></div>}</dl>}
    {props.drawingLoading&&<p className={styles.note} role="status">Loading the exact drawing…</p>}{props.drawingError&&<p className={styles.error} role="status">The drawing could not be loaded. Open the details to retry.</p>}{!props.drawingCurrent&&!props.drawingLoading&&!props.drawingError&&<p className={styles.note} role="status">The displayed drawing is not the current plan. Review the exact version before accepting.</p>}
    <div className={styles.actions}><Button type="button" variant="secondary" onClick={props.onRequestChanges}>Request changes</Button><Button type="button" variant="ghost" onClick={props.onDetails}>View details <ArrowUpRight size={13} aria-hidden/></Button>{!props.accepted?<Button type="button" disabled={blocked||!drawingReady} onClick={()=>void action('accept')}>{working&&<Loader2 size={15} className="spin" aria-hidden/>}Accept this plan</Button>:props.mode!=='build'?<Button type="button" disabled={blocked||!drawingReady} onClick={()=>void action('build')}>Switch to Build</Button>:<Button type="button" disabled={blocked||!drawingReady||!props.buildReady} onClick={()=>void action('prepare')}>Prepare accepted plan</Button>}</div>
    {props.accepted&&<p className={styles.note} role="status">{props.mode==='build'?'Plan accepted · Build mode':'Plan accepted · switch to Build to continue'}</p>}{props.showPlacement&&<div className={styles.actions}><Button type="button" variant="secondary" disabled={blocked} onClick={props.onPlacement}>Choose Revit placement</Button></div>}{error&&<p className={styles.error} role="alert">{error}</p>}
  </section>;
}
