'use client';
import {Download,Printer} from 'lucide-react';
import {
  savedOn,summariseChecks,type ChecksSummary,type RevisionPackage,
} from '@/lib/revision-package.mjs';
import {statusLabel} from '@/lib/plan-checks.mjs';
import type {DrawingVersion} from '../plan-canvas';
import {Button} from '../ui/button';
import styles from './revision-package.module.css';

const svgSrc=(drawing:DrawingVersion)=>
  'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(drawing.lineworkSvg??drawing.svg);

export type RevisionPackageViewProps={
  /** The task's title, when the task could be read. */
  title:string;
  pkg:RevisionPackage;
  first:DrawingVersion;
  last:DrawingVersion;
  log:{version:number;text:string}[];
  /** Null leaves the line out: the task could not be read, so acceptance is unknown. */
  accepted:boolean|null;
  dataHref:string;
  onPrint:()=>void;
};

function Figure({caption,drawing}:{caption:string;drawing:DrawingVersion}){
  const alt=`Floor plan, ${caption.toLowerCase()}, version ${drawing.version}`;
  return <figure className={styles.figure}>
    <figcaption>{caption} · Version {drawing.version}</figcaption>
    <img src={svgSrc(drawing)} alt={alt}/>
  </figure>;
}

function Lines({title,items}:{title:string;items:string[]}){
  if(!items.length)return null;
  return <><h4>{title}</h4>
    <ul className={styles.list}>{items.map((text,index)=><li key={index}>{text}</li>)}</ul></>;
}

function Check({heading,summary}:{heading:string;summary:ChecksSummary|null}){
  return <div className={styles.check}><h3>{heading}</h3>
    {!summary?<p className={styles.note}>Checks were not available for this version.</p>:<>
      <p>{statusLabel(summary.status)} · {summary.line}</p>
      <Lines title="Problems" items={summary.problems}/>
      <Lines title="Advice" items={summary.advice}/>
    </>}
  </div>;
}

export function RevisionPackageView(
  {title,pkg,first,last,log,accepted,dataHref,onPrint}:RevisionPackageViewProps,
){
  const rows=pkg.versions,current=rows[rows.length-1],original=rows[0],single=rows.length===1;
  const saved=savedOn(current.createdAt);
  return <main className={styles.page}><div className={styles.sheet}>
    <div className={styles.controls}>
      <Button type="button" onClick={onPrint}><Printer aria-hidden/>Print or save as PDF</Button>
      <Button asChild variant="secondary">
        <a href={dataHref} download={`revision-package-v${pkg.version}.json`}>
          <Download aria-hidden/>Download data (JSON)</a>
      </Button>
    </div>
    <header><h1>Revision package</h1>
      <p className={styles.sub}>{title} · Version {pkg.version}{saved?` · Saved ${saved}`:''}</p>
      {accepted!==null&&<p className={styles.accepted}>
        {accepted?'This version is the accepted plan.':'This version has not been accepted.'}</p>}
    </header>
    <section className={styles.section} aria-labelledby="rp-drawings">
      <h2 id="rp-drawings">Drawings</h2>
      {single?<><div className={styles.pair}><Figure caption="This version" drawing={last}/></div>
        <p className={styles.note}>
          This is the first version, so there is nothing to compare it with.</p></>
        :<div className={styles.pair}>
          <Figure caption="As first generated" drawing={first}/>
          <Figure caption="This version" drawing={last}/>
        </div>}
    </section>
    <section className={styles.section} aria-labelledby="rp-changes">
      <h2 id="rp-changes">What changed</h2>
      <ol className={styles.log}>{log.map(row=><li key={row.version}>{row.text}</li>)}</ol>
    </section>
    <section className={styles.section} aria-labelledby="rp-checks"><h2 id="rp-checks">Checks</h2>
      <div className={styles.checks}>
        {!single&&<Check heading={`As first generated · Version ${original.version}`}
          summary={summariseChecks(original)}/>}
        <Check heading={`This version · Version ${current.version}`}
          summary={summariseChecks(current)}/>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="rp-assumptions">
      <h2 id="rp-assumptions">Assumptions</h2>
      {current.assumptions.length
        ?<ul className={styles.list}>
          {current.assumptions.map((text,index)=><li key={index}>{text}</li>)}</ul>
        :<p className={styles.note}>No assumptions were reported for this plan.</p>}
    </section>
    <dl className={styles.ids} aria-label="Exact details">
      <div><dt>Plan ID</dt><dd><code>{pkg.planId}</code></dd></div>
      <div><dt>Version</dt><dd>{pkg.version}</dd></div>
      <div><dt>Fingerprint</dt><dd><code>{current.fingerprint}</code></dd></div>
    </dl>
  </div></main>;
}
