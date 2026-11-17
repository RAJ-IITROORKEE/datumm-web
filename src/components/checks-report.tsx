'use client';
import {useMemo,useState} from 'react';
import {CircleAlert,CircleCheck,CircleX,Eye,EyeOff,TriangleAlert} from 'lucide-react';
import {groupFindings,parseFindings,refsSummary,refsToHighlights,statusLabel,type Finding} from '@/lib/plan-checks.mjs';
import {Button} from './ui/button';
import styles from './checks-report.module.css';

type Props={
  /** Raw `findings` from the plan-version response; `null` or unparseable means "not available". */
  findings:unknown;
  loading?:boolean;
  roomNames?:Record<string,string>;
  /** Keys currently highlighted in the drawing, so Show can toggle. */
  activeKeys?:string[];
  onShow:(keys:string[])=>void;
  onRetry?:()=>void;
};
const statusIcon={pass:CircleCheck,warn:TriangleAlert,fail:CircleX} as const;

function Row({finding,roomNames,active,onShow}:{finding:Finding;roomNames?:Record<string,string>;active:boolean;onShow:(finding:Finding)=>void}){
  const blocking=finding.severity==='blocking',keys=refsToHighlights(finding),where=refsSummary(finding,roomNames);
  const Icon=blocking?CircleX:CircleAlert;
  return <li className={styles.row} data-severity={finding.severity}>
    <div className={styles.rowHead}>
      <span className={styles.severity}><Icon size={14} aria-hidden/>{blocking?'Problem':'Advice'}</span>
      {keys.length>0&&<Button type="button" size="sm" variant="secondary" aria-pressed={active} onClick={()=>onShow(finding)}>{active?<EyeOff size={13} aria-hidden/>:<Eye size={13} aria-hidden/>}{active?'Hide':'Show'}<span className={styles.sr}> {finding.message} in the plan</span></Button>}
    </div>
    <p className={styles.message}>{finding.message}</p>
    {where&&<p className={styles.where}>Where: {where}</p>}
    {(finding.expected||finding.actual)&&<dl className={styles.compare}>{finding.expected&&<div><dt>Expected</dt><dd>{finding.expected}</dd></div>}{finding.actual&&<div><dt>Found</dt><dd>{finding.actual}</dd></div>}</dl>}
    {(finding.why||finding.fix)&&<details className={styles.more}><summary>Why and how to fix</summary>{finding.why&&<p><strong>Why</strong>{finding.why}</p>}{finding.fix&&<p><strong>How to fix</strong>{finding.fix}</p>}</details>}
  </li>;
}

export function ChecksReport({findings,loading=false,roomNames,activeKeys=[],onShow,onRetry}:Props){
  const report=useMemo(()=>parseFindings(findings),[findings]);
  const [note,setNote]=useState<{report:unknown;text:string}>({report:null,text:''});
  const groups=useMemo(()=>report?groupFindings(report.findings):[],[report]);
  if(!report)return <section className={styles.report} aria-label="Plan checks" aria-busy={loading}>
    <p className={styles.unavailable} role="status">{loading?'Loading the plan checks…':'Checks are not available for this version yet.'}</p>
    {!loading&&onRetry&&<Button type="button" variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
  </section>;
  const StatusIcon=statusIcon[report.status],active=(finding:Finding)=>{const keys=refsToHighlights(finding);return keys.length>0&&keys.length===activeKeys.length&&keys.every(key=>activeKeys.includes(key));};
  const show=(finding:Finding)=>{
    const keys=refsToHighlights(finding),hide=active(finding);
    onShow(hide?[]:keys);
    const place=refsSummary(finding,roomNames);
    setNote({report,text:hide?'Highlight removed from the plan.':`Showing in the 2D and 3D plan${place?`: ${place}`:''}. ${finding.message}`});
  };
  return <section className={styles.report} aria-label="Plan checks">
    <header className={styles.header} data-status={report.status}>
      <h3><StatusIcon size={16} aria-hidden/>{statusLabel(report.status)}</h3>
      {report.findings.length>0&&<p>{report.blocking} {report.blocking===1?'problem':'problems'} · {report.advisory} advice {report.advisory===1?'note':'notes'}</p>}
      <small>Checked against the standard plan rules</small>
      <details className={styles.more}><summary>Exact details</summary><p>Rule set: <code>{report.ruleSet}</code></p></details>
    </header>
    {report.findings.length===0?<p className={styles.empty}>No problems found by the plan checks.</p>
      :groups.map(group=><div key={group.category} className={styles.group}>
        <h4>{group.label}<span>{group.findings.length}</span></h4>
        <ul>{group.findings.map((finding,index)=><Row key={`${finding.code}:${index}`} finding={finding} roomNames={roomNames} active={active(finding)} onShow={show}/>)}</ul>
      </div>)}
    <p className={styles.sr} role="status" aria-live="polite">{note.report===report?note.text:''}</p>
  </section>;
}
