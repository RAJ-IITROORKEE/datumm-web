'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Download, FileSpreadsheet, RotateCw, X } from 'lucide-react';
import { MAX_REPORT_BYTES, parseReviewReport, reportTableCsv, type ReviewReport } from '@/lib/review-report.mjs';
import styles from './review-report.module.css';

type PanelProps = { taskId: string; taskVersion?: number; onClose: () => void; fetcher?: typeof fetch };
type ReportState =
  | { kind: 'loading' }
  | { kind: 'ready'; report: ReviewReport }
  | { kind: 'empty' | 'unavailable' | 'configuration' | 'access' | 'error'; title: string; message: string };
type TableKind = 'boq' | 'elements';
const PREVIEW_ROWS = 200;
const sourceLabels: Record<ReviewReport['sourceKind'], string> = {
  proposed: 'Proposed design', measured: 'Measured source', verified: 'Verified source', unavailable: 'Source unavailable',
};

/** Reads a bounded body before parsing; the upstream report can be much larger than its preview. */
async function readReportResponse(response: Response) {
  const length = Number(response.headers.get('content-length'));
  if (length > MAX_REPORT_BYTES) {
    await response.body?.cancel();
    throw new Error('This report exceeds the 2 MiB preview limit. Ask the agent for a smaller report scope.');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const next = await reader.read();
      if (next.done) break;
      bytes += next.value.byteLength;
      if (bytes > MAX_REPORT_BYTES) {
        await reader.cancel();
        throw new Error('This report exceeds the 2 MiB preview limit. Ask the agent for a smaller report scope.');
      }
      chunks.push(next.value);
    }
  } finally { reader.releaseLock(); }
  const body = new Uint8Array(bytes);
  let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(body);
}

export function ReviewReportPanel(props: PanelProps) {
  // Reading a saved report is stable through background task updates; reopening reloads it.
  return <LoadedReport key={props.taskId} {...props} />;
}

function LoadedReport({ taskId, onClose, fetcher = fetch }: PanelProps) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ReportState>({ kind: 'loading' });
  useEffect(() => {
    if (!taskId.trim()) {
      setState({ kind: 'empty', title: 'Choose a task to review', message: 'Open a saved task to load its BOQ and element report.' });
      return;
    }
    const controller = new AbortController();
    setState({ kind: 'loading' });
    void (async () => {
      try {
        const response = await fetcher(`/api/service/runs/${encodeURIComponent(taskId)}/export/report-json`, {
          signal: controller.signal, cache: 'no-store', headers: { Accept: 'application/json' },
        });
        if (controller.signal.aborted) return;
        if (response.status === 401 || response.status === 403) {
          setState({ kind: 'access', title: 'Report access unavailable', message: response.status === 401 ? 'Your session may have expired. Sign in again, then retry.' : 'This account does not have access to this task report.' });
          await response.body?.cancel();
          return;
        }
        if (response.status === 404 || response.status === 422) {
          setState({ kind: 'unavailable', title: 'No review report available', message: response.status === 404 ? 'The service has no report for this task yet. Ask the agent to generate a BOQ or element report, then retry.' : 'This task does not currently provide a supported review report. Ask the agent to generate a structured BOQ or element report.' });
          await response.body?.cancel();
          return;
        }
        if (response.status === 503) {
          setState({ kind: 'configuration', title: 'Report service unavailable', message: 'The report service is unavailable or has not been configured. Try again later.' });
          await response.body?.cancel();
          return;
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new Error('The service could not load this report. Retry to request it again.');
        }
        const payload = await readReportResponse(response);
        if (controller.signal.aborted) return;
        if (!payload.trim()) {
          setState({ kind: 'empty', title: 'The report is empty', message: 'The service returned no report data. Ask the agent to generate the report, then retry.' });
          return;
        }
        // Root task and report execution IDs can differ. The keyed request owns that association.
        const report = parseReviewReport(payload);
        setState({ kind: 'ready', report });
      } catch (error) {
        if (controller.signal.aborted) return;
        setState({ kind: 'error', title: 'Report could not be opened', message: error instanceof Error ? error.message : 'The report could not be read. Retry to request it again.' });
      }
    })();
    return () => controller.abort();
  }, [taskId, attempt, fetcher]);

  if (state.kind === 'ready') return <ReportFrame onClose={onClose}><ReviewReportContent report={state.report}/></ReportFrame>;
  return <ReportFrame onClose={onClose}>
    <div className={styles.state} role={state.kind === 'error' ? 'alert' : 'status'} aria-live="polite">
      <h3>{state.kind === 'loading' ? 'Loading review report…' : state.title}</h3>
      <p>{state.kind === 'loading' ? 'Reading the task’s BOQ, element data and source details.' : state.message}</p>
      {state.kind !== 'loading' && taskId.trim() && <button type="button" className={styles.button} onClick={() => setAttempt(value => value + 1)}><RotateCw size={14} aria-hidden="true" />Retry report</button>}
    </div>
  </ReportFrame>;
}

function ReportFrame({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const headingId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  return <section className={styles.panel} aria-labelledby={headingId} onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !(event.target instanceof Element && event.target.closest('[role="dialog"]'))) { event.stopPropagation(); onClose(); }
  }}>
    <header className={styles.header}>
      <div><FileSpreadsheet size={17} aria-hidden="true" /><h2 id={headingId} ref={titleRef} tabIndex={-1}>BOQ &amp; elements</h2></div>
      <button type="button" className={styles.iconButton} aria-label="Close report and return to drawing" onClick={onClose}><X size={17} aria-hidden="true" /></button>
    </header>
    {children}
  </section>;
}

/** Ready view, shared with clearly labelled synthetic development fixtures. */
export function ReviewReportView({ report, onClose, fixture = false }: { report: ReviewReport; onClose: () => void; fixture?: boolean }) {
  return <ReportFrame onClose={onClose}><ReviewReportContent report={report} fixture={fixture}/></ReportFrame>;
}

function ReviewReportContent({report, fixture = false}: {report: ReviewReport; fixture?: boolean}) {
  const [activeTab, setActiveTab] = useState<TableKind>('boq');
  const [feedback, setFeedback] = useState('');
  const id = useId();
  const table = report[activeTab];
  const columns = table.columns.filter(column => table.rows.some(row => row[column.key] != null));
  const shownRows = table.rows.slice(0, PREVIEW_ROWS);
  const switchTab = (kind: TableKind) => { setActiveTab(kind); setFeedback(''); };
  const onTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const kind = event.key === 'Home' ? 'boq' : event.key === 'End' ? 'elements' : activeTab === 'boq' ? 'elements' : 'boq';
    switchTab(kind);
    document.getElementById(`${id}-${kind}-tab`)?.focus();
  };
  const download = () => {
    try {
      const csv = reportTableCsv(report, activeTab);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `${fixture ? 'fixture-' : ''}report-preview-${report.runId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80)}-${activeTab}.csv`;
      document.body.appendChild(link);
      try { link.click(); } finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      setFeedback(`Preview CSV downloaded with all ${table.rows.length.toLocaleString()} ${activeTab === 'boq' ? 'BOQ' : 'element'} rows and report source metadata.`);
    } catch { setFeedback('The preview CSV could not be downloaded. Try again.'); }
  };
  return <div className={styles.body}>
      {fixture && <p className={styles.fixture}>Synthetic development fixture · Illustrative data only</p>}
      <div className={styles.provenance}>
        <p className={styles.source}><strong>{sourceLabels[report.sourceKind]}</strong><span>Read only</span></p>
        {report.summary && <p className={styles.summary}>{report.summary}</p>}
        <dl className={styles.metadata}>
          <div><dt>Document</dt><dd>{report.documentId ?? 'Not supplied'}</dd></div>
          <div><dt>Source model revision</dt><dd>{report.modelRevision ?? 'Not supplied'}</dd></div>
          <div><dt>Source plan version</dt><dd>{report.planVersion ?? 'Not supplied'}</dd></div>
          <div><dt>Scope</dt><dd>{report.scope ?? 'Not supplied'}</dd></div>
          <div><dt>Report status</dt><dd>{report.status ?? 'Not supplied'}</dd></div>
          <div><dt>Coverage</dt><dd>{report.coverage ?? 'Not supplied'}</dd></div>
        </dl>
        {report.limitations.length > 0 && <div className={styles.limitations}><h3>Limitations</h3><ul>{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
        <details className={styles.details}><summary>Source details</summary>
          <dl><div><dt>Source</dt><dd>{report.source ?? 'Not supplied'}</dd></div><div><dt>Report execution</dt><dd>{report.runId}</dd></div></dl>
          <p>The model revision identifies the saved source. Reopening reloads saved task evidence. Ask the agent to read the model again for current quantities.</p>
        </details>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Report tables">
          {(['boq', 'elements'] as const).map(kind => <button type="button" role="tab" key={kind} id={`${id}-${kind}-tab`} aria-selected={activeTab === kind} aria-controls={`${id}-${kind}-panel`} tabIndex={activeTab === kind ? 0 : -1} onClick={() => switchTab(kind)} onKeyDown={onTabKeyDown}>{kind === 'boq' ? 'BOQ' : 'Elements'}<span>{report[kind].rows.length.toLocaleString()}</span></button>)}
        </div>
        <button type="button" className={styles.button} onClick={download} disabled={!table.rows.length}><Download size={14} aria-hidden="true" />Download preview CSV</button>
      </div>
      <section id={`${id}-${activeTab}-panel`} role="tabpanel" aria-labelledby={`${id}-${activeTab}-tab`} className={styles.tablePanel}>
        <p className={styles.count} id={`${id}-preview-count`}>Showing {shownRows.length.toLocaleString()} of {table.rows.length.toLocaleString()} rows{table.rows.length > PREVIEW_ROWS ? ` · Preview limited to ${PREVIEW_ROWS} rows` : ''}. CSV includes every row in this report table.</p>
        {shownRows.length > 0 ? <div className={styles.tableScroll} role="region" aria-label={`${activeTab === 'boq' ? 'BOQ' : 'Elements'} table, scroll to see all columns`} aria-describedby={`${id}-preview-count`} tabIndex={0}>
          <table><caption className="sr-only">{activeTab === 'boq' ? 'Bill of quantities' : 'Element schedule'} report preview</caption><thead><tr>{columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead><tbody>{shownRows.map((row, index) => <tr key={index}>{columns.map(column => <td key={column.key} className={typeof row[column.key] === 'number' ? styles.numeric : undefined}>{row[column.key] ?? '—'}</td>)}</tr>)}</tbody></table>
        </div> : <p className={styles.emptyTable}>No {activeTab === 'boq' ? 'BOQ' : 'element'} rows were supplied in this report.</p>}
      </section>
      <p className={styles.exportNote}>CSV includes the retained rows and their source details. Refreshing this report does not reread Revit.</p>
      <p className={styles.feedback} role="status" aria-live="polite">{feedback}</p>
    </div>;
}
