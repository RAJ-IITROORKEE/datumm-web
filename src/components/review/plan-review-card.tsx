'use client';
import {useRef,useState} from 'react';
import {ArrowUpRight,Check,FileCheck2,Loader2} from 'lucide-react';
import {Button} from '../ui/button';
import styles from './plan-review-card.module.css';

type Props={alternatives:number;planVersion?:number;planId?:string;fingerprint?:string;planTitle?:string;revisionBlockedReason?:string;selectionUncertain?:boolean;accepted:boolean;mode:string;busy:boolean;drawingLoading:boolean;drawingError?:string;drawingCurrent:boolean;buildReady:boolean;showPlacement:boolean;onRequestChanges:()=>void;onDetails:()=>void;onAccept:()=>Promise<void>;onSwitchToBuild:()=>Promise<void>;onPrepare:()=>Promise<void>;onPlacement:()=>void};
export function PlanReviewCard(props:Props){
  const [working,setWorking]=useState(false),[error,setError]=useState('');const inFlight=useRef(false);
  const blocked=props.busy||working;
  const drawingReady=!props.drawingLoading&&!props.drawingError&&!props.selectionUncertain&&props.drawingCurrent;
  const action=async(kind:'accept'|'build'|'prepare')=>{if(inFlight.current||props.busy||!drawingReady||kind==='prepare'&&!props.buildReady)return;inFlight.current=true;setWorking(true);setError('');try{await (kind==='accept'?props.onAccept:kind==='build'?props.onSwitchToBuild:props.onPrepare)();}catch(failure){setError(failure instanceof Error?failure.message:'The plan action failed. Your saved drawing remains available.');}finally{inFlight.current=false;setWorking(false);}};
  return <section className={styles.review} aria-label="Plan review" aria-busy={blocked}>
    <div className={styles.heading}>
      {props.accepted?<Check size={16} aria-hidden/>:<FileCheck2 size={16} aria-hidden/>}
      <div><strong>{props.accepted?'Plan accepted':'Review required'}{props.planVersion!==undefined?` · v${props.planVersion}`:''}</strong><span className={styles.identity}>{props.planTitle ?? 'Saved concept'} · {props.alternatives} {props.alternatives===1?'alternative':'alternatives'}{!props.accepted?' · Does not change Revit':''}</span></div>
    </div>
    {props.drawingLoading&&<p className={styles.note} role="status">Loading the exact drawing…</p>}{props.drawingError&&<p className={styles.error} role="status">The drawing could not be loaded. Open the details to retry.</p>}{!props.drawingCurrent&&!props.drawingLoading&&!props.drawingError&&<p className={styles.note} role="status">The displayed drawing is not the current plan. Review the exact version before accepting.</p>}
    {props.selectionUncertain && <p className={styles.note} role="status">The selected alternative is unconfirmed. Check the saved selection in details before accepting or building.</p>}
    <div className={styles.actions}>{!props.accepted?<Button type="button" disabled={blocked||!drawingReady} onClick={()=>void action('accept')}>{working&&<Loader2 size={15} className="spin" aria-hidden/>}Accept plan</Button>:props.mode!=='build'?<Button type="button" disabled={blocked||!drawingReady} onClick={()=>void action('build')}>Switch to Build</Button>:<Button type="button" disabled={blocked||!drawingReady||!props.buildReady} onClick={()=>void action('prepare')}>Prepare accepted plan</Button>}<Button type="button" variant="ghost" onClick={props.onDetails}>View details <ArrowUpRight size={13} aria-hidden/></Button>{props.showPlacement&&<Button type="button" variant="secondary" disabled={blocked} onClick={props.onPlacement}>Choose Revit placement</Button>}<details className={styles.more}><summary>More options</summary><div className={styles.moreContent}><p className={styles.note}>Accept the displayed plan and its assumptions before preparing native changes. Plan acceptance does not commit a Revit build.</p><Button type="button" variant="secondary" disabled={blocked||Boolean(props.revisionBlockedReason)} title="Adds an unsent revision request to the composer" onClick={()=>{if(!blocked&&!props.revisionBlockedReason)props.onRequestChanges();}}>Revise brief</Button><p className={styles.note}>{props.revisionBlockedReason || 'Revise brief adds a draft only. Review it before sending.'}</p>{(props.planId||props.fingerprint)&&<><p className={styles.note}>Technical plan identity</p><dl>{props.planId&&<div><dt>Plan ID</dt><dd><code>{props.planId}</code></dd></div>}{props.fingerprint&&<div><dt>Fingerprint</dt><dd><code>{props.fingerprint}</code></dd></div>}</dl></>}</div></details></div>
    {error&&<p className={styles.error} role="alert">{error}</p>}
  </section>;
}
