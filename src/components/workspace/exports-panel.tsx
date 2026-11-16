'use client';



import { Download, ArrowUpRight } from 'lucide-react';

import type { ExportsPanelProps } from '@/lib/work-area-contract';

import { PlanDetails } from './plan-details';

import styles from './exports-panel.module.css';



const noSelection = async () => {};


export function ExportsPanel({workspace, scope, outputs, report, actions}: ExportsPanelProps) {

  const run = workspace.run?.id === scope.taskId ? workspace.run : null;

  const supported = workspace.runtimeConfig?.supportedExports;

  const available = workspace.exportItems.filter(item => (!supported || supported.includes(item.ext)) && !['preview-png','plan-pdf'].includes(item.ext) && (item.ext !== 'svg' || !run?.data.agent_design));

  const scopedOutputs = outputs.filter(output => output.source.taskId == null || output.source.taskId === scope.taskId);

  return <section className={styles.panel} aria-label="Workspace exports">

    <header className={styles.header}><h2>Exports</h2><p>Choose a saved task export or open a loaded output for its available actions.</p></header>

    {run ? <>

      <section className={styles.section} aria-label="Saved reports"><h3>Saved report</h3>

        <p className={styles.note}>Review the saved report and its history. Downloads in the report are bound to the selected revision when available.</p>

        {(!supported || supported.includes('report-json')) ? <button type="button" className={styles.open} onClick={event => actions.openSavedReport(event.currentTarget)}>Open saved BOQ &amp; elements report<ArrowUpRight size={13} aria-hidden="true"/></button> : <p>Report preview is not currently supported.</p>}

        {report?.savedRevision && <p className={styles.note}>{report.savedRevision.revisionNumber == null ? 'A saved report revision is open.' : `Viewed report revision ${report.savedRevision.revisionNumber}.`} Open the report for its history and downloads bound to this revision.</p>}

      </section>

      <div className={styles.section}><PlanDetails {...workspace} scope={scope} surface="exports" onSelectAlternative={noSelection}/>

      {workspace.designVersion && <><button className={styles.open} type="button" onClick={event => actions.openDrawing(event.currentTarget)}>Preview drawing<ArrowUpRight size={13} aria-hidden="true"/></button><details className={styles.source}><summary>Browser drawing exports</summary><p>Open the drawing to export a white 2D sheet or capture the current 3D viewport.</p></details></>}

      {workspace.designVersion && !run.data.agent_design && <details className={styles.source}><summary>Loaded drawing source</summary><p>Saved task exports use the task endpoint. The loaded drawing identity is not passed to that request, so its fingerprint is not verified for the export.</p><dl><div><dt>Loaded plan ID</dt><dd><code>{workspace.designVersion.planId}</code></dd></div><div><dt>Loaded version</dt><dd>{workspace.designVersion.version}</dd></div><div><dt>Loaded fingerprint</dt><dd><code>{workspace.designVersion.fingerprint}</code></dd></div></dl></details>}</div>

      <details className={`${styles.section} ${styles.directory}`}>

        <summary>Latest task evidence downloads</summary>

        <p className={styles.note}>These downloads use latest task evidence and may differ from a saved report revision. Older tasks may provide legacy evidence without revision history.</p>

        {available.length ? <ul className={styles.list}>{available.map(item => <li key={item.ext} className={styles.fileRow}><span className={styles.fileInfo}><strong>{item.name}</strong><small>{item.detail}</small></span><div className={styles.fileActions}><a href={`/api/service/runs/${encodeURIComponent(run.id)}/export/${encodeURIComponent(item.ext)}`} download aria-label={`Download ${item.name}`}><Download size={14} aria-hidden="true"/>Download</a></div></li>)}</ul> : <p>No saved task export formats are currently supported.</p>}

        <details className={styles.source}><summary>About report previews and sources</summary><p>The report opens a dataset, not a formatted file preview. Its saved revision may differ from latest task evidence. Use the report for revision-bound downloads.</p>{report && <><dl><div><dt>Source</dt><dd>{report.sourceKind}{report.source ? ` · ${report.source}` : ''}</dd></div><div><dt>Source model revision</dt><dd>{report.modelRevision ?? 'Not recorded'}</dd></div><div><dt>Plan version</dt><dd>{report.planVersion ?? 'Not recorded'}</dd></div><div><dt>Document ID</dt><dd><code>{report.documentId ?? 'Not recorded'}</code></dd></div></dl><p>Source model revision is not a saved report revision.</p></>}</details>

      </details>

    </> : <p className={styles.empty}>Open a saved task to use its available exports.</p>}

    <section className={styles.section} aria-label="Answer output exports"><h3>Answer outputs</h3>

      {scopedOutputs.length ? <ul className={styles.list}>{scopedOutputs.map(output => <li key={output.id}><button type="button" onClick={event => actions.openAnswerOutput(output.id,event.currentTarget)}><ArrowUpRight size={15} aria-hidden="true"/><span><strong>{output.title}</strong><small>Answer {output.source.answerNumber ?? output.source.conversationIndex + 1} · {output.source.state} · {output.complete && output.source.state !== 'streaming' ? output.kind === 'table' ? 'Open for table CSV and copy' : 'Open to copy' : 'Preview available · export awaits completion'}</small></span></button><details className={styles.source}><summary>Answer source details</summary><p>Task: {output.source.taskId ?? 'Not recorded'} · conversation record {output.source.conversationIndex + 1}. CSV is available only for a completed table.</p></details></li>)}</ul> : <p>No answer outputs are registered for this workspace.</p>}

    </section>

  </section>;

}

