'use client';
import {useEffect,useRef,useState} from 'react';
import {CircleAlert,Loader2,ShieldCheck} from 'lucide-react';
import {Button} from '../ui/button';
import {OperationChangeSummary,type ReviewOperation} from './change-summary';
import styles from './review-panels.module.css';

export type ExactProposal={proposalId:string;approvalHash:string;documentId:string;revision:number;expiresAt:string};
type Props={proposal?:ExactProposal;pending:boolean;expired?:boolean;projectName?:string;annotationView?:string;operations?:ReviewOperation[];canRefresh:boolean;onAction:(action:'resume'|'refresh-proposal'|'cancel')=>Promise<void>;onConfigureAccess?:(trigger:HTMLButtonElement)=>void;/** Approve stays off until the Review screen was opened for this version; it never grants authority. */reviewLocked?:boolean;onReview?:()=>void};
export function ProposalApprovalPanel({proposal,pending,expired=false,projectName,annotationView,operations,canRefresh,onAction,onConfigureAccess,reviewLocked=false,onReview}:Props){
  const [now,setNow]=useState(Date.now),[sending,setSending]=useState(false),[error,setError]=useState('');
  const inFlight=useRef(false);
  const expiration=proposal?Date.parse(proposal.expiresAt):NaN;
  const complete=Boolean(proposal?.proposalId?.trim()&&proposal.approvalHash?.trim()&&proposal.documentId?.trim()&&Number.isInteger(proposal.revision)&&proposal.revision>=0);
  const stale=expired||!Number.isFinite(expiration)||expiration<=now;
  const blocked=pending||sending;
  useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[proposal?.proposalId,proposal?.expiresAt]);
  const act=async(action:'resume'|'refresh-proposal'|'cancel')=>{
    if(inFlight.current||pending)return;
    if(action==='resume'&&reviewLocked)return;
    if(action==='resume'&&(!complete||expired||!Number.isFinite(expiration)||expiration<=Date.now())){setNow(Date.now());setError('This exact proposal is unavailable or expired. Refresh it before approving.');return;}
    if(action==='refresh-proposal'&&(!canRefresh||!complete))return;
    inFlight.current=true;setSending(true);setError('');
    try{await onAction(action);}catch(failure){setError(failure instanceof Error?failure.message:'The request could not be completed. Review the saved task before retrying.');}
    finally{inFlight.current=false;setSending(false);}
  };
  return <section className={`${styles.panel} ${styles.approval}`} aria-label="Exact proposal approval" aria-busy={blocked}><header className={styles.header}><span className={styles.approvalIcon}><ShieldCheck size={18} aria-hidden/></span><div className={styles.heading}><h3 className={styles.title}>Approve these exact changes</h3><p className={styles.description}>Review the project and the changes before they are written to Revit.</p><span className={styles.status} data-tone="warning">{!complete?'Review unavailable':stale?'Review expired':'Awaiting your approval'}</span></div></header>
    <dl className={styles.facts}><div><dt>Project</dt><dd>{projectName||'Connected project'}</dd></div>{annotationView&&<div><dt>Annotation view</dt><dd>{annotationView}</dd></div>}<div><dt>Expires</dt><dd>{Number.isFinite(expiration)?new Date(expiration).toLocaleString():'Not supplied'}</dd></div></dl>
    <div className={styles.notice}><strong>Approval commits this exact proposal in Revit.</strong><p>DATUMM will commit and verify the reviewed changes. It does not save or synchronize the project file.</p></div>
    {operations&&<OperationChangeSummary operations={operations} title="Changes awaiting approval"/>}
    {!complete&&<p className={styles.note} role="status">The exact proposal identity is incomplete. Reload the saved task before approving.</p>}
    {complete&&stale&&<p className={styles.note} role="status">This review is expired or its expiry could not be established. Refresh the measured proposal before approving.</p>}
    {reviewLocked&&<p className={styles.note} role="status">Open Review to see the exact changes before you approve.</p>}
    <div className={styles.actions}>{onReview&&<Button type="button" variant={reviewLocked?'secondary':'ghost'} onClick={onReview}>Review</Button>}{stale&&canRefresh&&complete&&<Button type="button" variant="secondary" disabled={blocked} onClick={()=>void act('refresh-proposal')}>Refresh expired review</Button>}<Button type="button" disabled={blocked||stale||!complete||reviewLocked} onClick={()=>void act('resume')}>{blocked&&<Loader2 size={15} className="spin" aria-hidden/>}Approve exact proposal and build</Button><Button type="button" variant="ghost" disabled={blocked} onClick={()=>void act('cancel')}>Cancel</Button>{onConfigureAccess&&<Button type="button" variant="secondary" disabled={blocked} onClick={event=>onConfigureAccess(event.currentTarget)}>Configure task Full Access</Button>}</div>
    {error&&<p className={styles.error} role="alert"><CircleAlert size={15} aria-hidden/> {error}</p>}
    <details className={styles.details}><summary>Exact details</summary><dl className={styles.facts}><div><dt>Document</dt><dd><code>{proposal?.documentId||'Not supplied'}</code></dd></div><div><dt>Model revision</dt><dd>{proposal?.revision??'Not supplied'}</dd></div><div><dt>Proposal ID</dt><dd><code>{proposal?.proposalId||'Not supplied'}</code></dd></div><div><dt>Approval hash</dt><dd><code>{proposal?.approvalHash||'Not supplied'}</code></dd></div></dl><p className={styles.note}>Approval is bound to these exact operations, document and revision. A changed proposal requires a fresh review.</p></details>
  </section>;
}
