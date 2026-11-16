'use client';

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Download, FileSpreadsheet, RotateCw, X } from 'lucide-react';
import { MAX_REPORT_BYTES, parseReviewReport, reportTableCsv, type ReviewReport } from '@/lib/review-report.mjs';
import type { WorkScope } from '@/lib/work-area-contract';
import { ChangeSummary } from '../vendor/affectui/change-summary-clean';
import styles from './review-report.module.css';

export type ReviewReportPanelProps = { scope: WorkScope; taskId: string; taskVersion?: number; taskStatus?: string; currentPlan?: {planId: string; version: number; fingerprint: string} | null; openId: number; cited?: {revisionId: string; contentHash: string}; onClose: () => void; onReport: (scope: WorkScope, report: ReviewReport | null) => void; fetcher?: typeof fetch };
type ReportState =
  | { kind: 'loading' }
  | { kind: 'ready'; report: ReviewReport; refreshing?: boolean; notice?: string }
  | { kind: 'empty' | 'unavailable' | 'configuration' | 'access' | 'error'; title: string; message: string };
type TableKind = 'boq' | 'elements';
type Revision = { revisionId: string; reportId: string; revisionNumber?: number; sourceExecutionId: string; createdAt: string; contentHash: string; sourcePlan: {planId: string; version: number; fingerprint: string; title?: string | null} | null; sourceModel: {documentId: string | null; revision: number | null} | null; changeSummary: {previousRowCount: number | null; rowCount: number; previousSourceKind: string | null; sourceKind: string; sourceChanged: boolean; planChanged: boolean} };
type Manifest = {currentRevisionId: string | null; revisions: Revision[]; nextCursor: string | null; historyState: 'pending' | 'ready' | 'unavailable' | null};
function manifestFrom(value: unknown, page = false): Manifest {
  if (!value || typeof value !== 'object') throw new Error('The report history response is unsupported.');
  const data = value as Record<string, unknown>;
  if (data.schemaVersion !== 1 || !Array.isArray(data.revisions) || data.revisions.length > 20 || (data.currentRevisionId !== null && typeof data.currentRevisionId !== 'string') || (data.nextCursor !== null && typeof data.nextCursor !== 'string')) throw new Error('The report history response is unsupported.');
  if (data.historyState != null && !['pending','ready','unavailable'].includes(String(data.historyState))) throw new Error('The report history response is unsupported.');
  const revisions = data.revisions as Revision[];
  if (revisions.some(r => !r || typeof r.revisionId !== 'string' || !r.revisionId || typeof r.reportId !== 'string' || !r.reportId || typeof r.sourceExecutionId !== 'string' || !r.sourceExecutionId || (r.revisionNumber != null && (!Number.isSafeInteger(r.revisionNumber) || r.revisionNumber < 1)) || typeof r.contentHash !== 'string' || typeof r.createdAt !== 'string' || !r.changeSummary || !Number.isSafeInteger(r.changeSummary.rowCount) || r.changeSummary.rowCount < 0 || !(r.changeSummary.previousRowCount === null || (Number.isSafeInteger(r.changeSummary.previousRowCount) && r.changeSummary.previousRowCount >= 0)) || !(r.sourcePlan === null || (typeof r.sourcePlan === 'object' && typeof r.sourcePlan.planId === 'string' && Number.isSafeInteger(r.sourcePlan.version) && typeof r.sourcePlan.fingerprint === 'string' && (r.sourcePlan.title == null || typeof r.sourcePlan.title === 'string'))) || !(r.sourceModel === null || (typeof r.sourceModel === 'object' && (r.sourceModel.documentId === null || typeof r.sourceModel.documentId === 'string') && (r.sourceModel.revision === null || Number.isSafeInteger(r.sourceModel.revision)))) || typeof r.changeSummary.sourceKind !== 'string' || typeof r.changeSummary.sourceChanged !== 'boolean' || typeof r.changeSummary.planChanged !== 'boolean')) throw new Error('The report history response is unsupported.');
  if (new Set(revisions.map(r => r.revisionId)).size !== revisions.length) throw new Error('The report history contains duplicate revisions.');
  if (!page && data.currentRevisionId && !revisions.some(r => r.revisionId === data.currentRevisionId)) throw new Error('The current report revision is missing from history.');
  return {currentRevisionId: data.currentRevisionId as string | null, revisions, nextCursor: data.nextCursor as string | null, historyState: (data.historyState ?? null) as Manifest['historyState']};
}

function savedDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat(undefined, {dateStyle:'medium', timeStyle:'short'}).format(date);
}
const PREVIEW_ROWS = 200;
// The service keeps at most 256 revisions, so 13 pages of 20 cover any cited one.
const CITE_PAGES = 13;
const CITE_MISMATCH = 'This saved report no longer matches the cited revision';
const CITE_NOT_FOUND = 'The cited revision was not found in the loaded report history';
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

export function ReviewReportPanel(props: ReviewReportPanelProps) {
  // Reading a saved report is stable through background task updates; reopening reloads it.
  return <LoadedReport key={JSON.stringify([props.scope.accountKey,props.scope.key,props.scope.epoch,props.taskId,props.openId])} {...props} />;
}

function LoadedReport({ scope, taskId, taskVersion, taskStatus, currentPlan, openId, cited, onClose, onReport, fetcher = fetch }: ReviewReportPanelProps) {
  const [attempt, setAttempt] = useState(0);
  const [selection, setSelection] = useState<string | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [viewed, setViewed] = useState<string | null>(null);
  const [legacy, setLegacy] = useState(false);
  // An answer's cited revision is shown only while the server still reports the cited hash for it.
  const citedRef = useRef(cited);
  const [citeNotice, setCiteNotice] = useState('');
  const [pageStatus, setPageStatus] = useState('');
  const [pending, setPending] = useState(false);
  const pendingRetries = useRef(0);
  const pageAbort = useRef<AbortController | null>(null);
  const loadedOlder = useRef(false);
  const [state, setState] = useState<ReportState>({ kind: 'loading' });
  const retained = useRef<ReviewReport | null>(null);
  const viewedRef = useRef<string | null>(null);
  const manifestRef = useRef<Manifest | null>(null);
  const callback = useRef(onReport); callback.current = onReport;
  const token = JSON.stringify([scope.accountKey, scope.key, scope.epoch, taskId, openId]);
  const liveToken = useRef(token); liveToken.current = token;
  const requestId = useRef(0);
  useEffect(() => {
    if (!taskId.trim() || taskId !== scope.taskId) {
      setState({ kind: 'empty', title: 'Choose a task to review', message: 'Open a saved task to load its BOQ and element report.' });
      return;
    }
    pageAbort.current?.abort();
    const controller = new AbortController();
    const request = ++requestId.current;
    const current = () => !controller.signal.aborted && liveToken.current === token && requestId.current === request;
    const fail = (failure: Exclude<ReportState,{kind:'loading'}|{kind:'ready'}>) => {
      if (!current()) return;
      if (retained.current) setState({kind:'ready', report:retained.current,notice:`${failure.title}. ${failure.message}`});
      else { setState(failure); callback.current(scope,null); }
    };
    setState(retained.current ? {kind:'ready', report:retained.current, refreshing:true} : {kind:'loading'});
    void (async () => {
      try {
        const base = `/api/service/tasks/${encodeURIComponent(taskId)}/reports`;
        const historyResponse = await fetcher(`${base}?limit=20`, {signal:controller.signal, cache:'no-store', headers:{Accept:'application/json'}});
        if (!current()) return;
        let history: Manifest | null = null;
        if (historyResponse.status === 404) await historyResponse.body?.cancel();
        else {
          if (!historyResponse.ok) { await historyResponse.body?.cancel(); throw new Error('Report history could not be loaded. Retry to request it again.'); }
          const body = await readReportResponse(historyResponse);
          history = manifestFrom(JSON.parse(body));
          if (manifestRef.current) { const ids = new Set(history.revisions.map(item => item.revisionId)); history = {...history, revisions:[...history.revisions, ...manifestRef.current.revisions.filter(item => !ids.has(item.revisionId))], nextCursor:loadedOlder.current ? manifestRef.current.nextCursor : history.nextCursor}; }
        }
        if (!current()) return;
        const cite = citedRef.current, cited = (item: Revision) => item.revisionId === cite?.revisionId;
        let paged = false;
        // A citation older than the first page is looked up through the cursor before any verdict.
        try {
          for (let pages = 0; cite && history?.nextCursor && !history.revisions.some(cited) && pages < CITE_PAGES; pages++) {
            const before: string = history.nextCursor;
            const older = await fetcher(`${base}?limit=20&before=${encodeURIComponent(before)}`, {signal:controller.signal, cache:'no-store', headers:{Accept:'application/json'}});
            if (!current()) return;
            if (!older.ok) { await older.body?.cancel(); break; }
            const page = manifestFrom(JSON.parse(await readReportResponse(older)), true);
            if (!current()) return;
            const ids = new Set(history.revisions.map(item => item.revisionId));
            if (page.nextCursor === before || page.revisions.some(item => ids.has(item.revisionId))) break;
            history = {...history, revisions:[...history.revisions, ...page.revisions], nextCursor:page.nextCursor};
            paged = true;
          }
        } catch { if (!current()) return; }
        setPending(history?.historyState === 'pending');
        if (history && !history.currentRevisionId && history.historyState === 'pending') throw new Error('The report is still being saved. Try again shortly.');
        if (history && !history.currentRevisionId && history.historyState === 'unavailable') throw new Error('The report could not be saved. Retry after the task completes.');
        const isLegacy = !history || (!history.currentRevisionId && history.revisions.length === 0 && history.historyState === null);
        if (history && !isLegacy && !history.currentRevisionId) throw new Error('The report history has no current revision.');
        // A reader who chose an older revision stays there as the current pointer changes.
        const citeMeta = cite && history?.revisions.find(cited), citeOk = !!(cite && citeMeta && citeMeta.contentHash === cite.contentHash);
        const target = isLegacy ? null : citeOk ? cite!.revisionId : (selection && selection !== viewedRef.current ? selection : viewedRef.current && manifestRef.current && viewedRef.current !== manifestRef.current.currentRevisionId ? viewedRef.current : history!.currentRevisionId);
        if (target && !history!.revisions.some(item => item.revisionId === target)) throw new Error('The selected report revision is no longer in the loaded history.');
        const url = target ? `${base}/${encodeURIComponent(target)}` : `/api/service/runs/${encodeURIComponent(taskId)}/export/report-json`;
        const response = await fetcher(url, {signal:controller.signal, cache:'no-store', headers:{Accept:'application/json'}});
        if (!current()) return;
        if (response.status === 401 || response.status === 403) { await response.body?.cancel(); fail({kind:'access',title:'Report access unavailable',message:response.status === 401 ? 'Your session may have expired. Sign in again, then retry.' : 'This account does not have access to this task report.'}); return; }
        if (response.status === 404 || response.status === 422) { await response.body?.cancel(); fail({kind:'unavailable',title:'No review report available',message:'The service has no supported report for this task yet. Ask the agent to generate a report, then retry.'}); return; }
        if (response.status === 503) { await response.body?.cancel(); fail({kind:'configuration',title:'Report service unavailable',message:'The report service is unavailable or has not been configured. Try again later.'}); return; }
        if (!response.ok) { await response.body?.cancel(); throw new Error('The service could not load this report. Retry to request it again.'); }
        const payload = await readReportResponse(response);
        if (!payload.trim()) { fail({kind:'empty',title:'The report is empty',message:'The service returned no report data. Ask the agent to generate the report, then retry.'}); return; }
        const detail = target ? JSON.parse(payload) : null;
        if (target && (!detail || detail.schemaVersion !== 1 || !detail.dataset || (detail.revision?.revisionId ?? detail.revisionId) !== target)) throw new Error('The service returned an unsupported report revision.');
        const report = parseReviewReport(target ? detail.dataset : payload);
        if (target) {
          const meta = history!.revisions.find(item => item.revisionId === target)!;
          if (detail.revision.reportId !== meta.reportId || detail.revision.contentHash !== meta.contentHash || detail.revision.sourceExecutionId !== meta.sourceExecutionId || (detail.revision.sourcePlan?.planId ?? null) !== (meta.sourcePlan?.planId ?? null) || (detail.revision.sourcePlan?.version ?? null) !== (meta.sourcePlan?.version ?? null) || (detail.revision.sourcePlan?.fingerprint ?? null) !== (meta.sourcePlan?.fingerprint ?? null) || detail.revision.changeSummary?.sourceKind !== meta.changeSummary.sourceKind || report.runId !== meta.sourceExecutionId || (meta.sourcePlan && report.planVersion !== meta.sourcePlan.version) || report.sourceKind !== meta.changeSummary.sourceKind) throw new Error('The saved report source does not match its history.');
          report.savedRevision = {revisionId:meta.revisionId, reportId:meta.reportId, revisionNumber:meta.revisionNumber ?? null, createdAt:meta.createdAt, contentHash:meta.contentHash, sourcePlan:meta.sourcePlan};
        }
        if (!current()) return;
        if (cite) { citedRef.current = undefined; setCiteNotice(citeOk ? '' : citeMeta ? CITE_MISMATCH : CITE_NOT_FOUND); }
        if (paged) loadedOlder.current = true;
        retained.current = report; viewedRef.current = target; manifestRef.current = history;
        setManifest(history); setViewed(target); setLegacy(isLegacy); setState({kind:'ready',report, notice:history?.historyState === 'pending' ? 'A new report is being saved. The last saved report remains available.' : history?.historyState === 'unavailable' ? 'The latest report could not be saved. The last saved report remains available.' : undefined}); callback.current(scope,report);
      } catch (error) {
        if (!current()) return;
        fail({kind:'error',title:'Report could not be opened',message:error instanceof Error ? error.message : 'The report could not be read. Retry to request it again.'});
      }
    })();
    return () => { controller.abort(); pageAbort.current?.abort(); };
  }, [token, taskId, taskVersion, taskStatus, attempt, selection, fetcher]);
  useEffect(() => {
    if (!pending || pendingRetries.current >= 20 || state.kind === 'loading' || (state.kind === 'ready' && state.refreshing)) return;
    const timer = setTimeout(() => { pendingRetries.current += 1; setAttempt(value => value + 1); }, 1500);
    return () => clearTimeout(timer);
  }, [pending, attempt, token, state.kind, state.kind === 'ready' && !!state.refreshing]);
  const loadMore = async () => {
    const before = manifestRef.current?.nextCursor;
    if (!before) return;
    const controller = new AbortController(); pageAbort.current?.abort(); pageAbort.current = controller;
    const generation = requestId.current; setPageStatus('Loading older revisions…');
    try {
      const response = await fetcher(`/api/service/tasks/${encodeURIComponent(taskId)}/reports?limit=20&before=${encodeURIComponent(before)}`, {signal:controller.signal, cache:'no-store', headers:{Accept:'application/json'}});
      if (!response.ok) { await response.body?.cancel(); throw new Error('Older revisions could not be loaded.'); }
      const page = manifestFrom(JSON.parse(await readReportResponse(response)), true);
      if (page.nextCursor === before) throw new Error('The history cursor did not advance.');
      if (controller.signal.aborted || liveToken.current !== token || generation !== requestId.current || !manifestRef.current) return;
      const existing = manifestRef.current; const ids = new Set(existing.revisions.map(item => item.revisionId));
      if (page.revisions.some(item => ids.has(item.revisionId))) throw new Error('The history contains duplicate revisions.');
      const combined = {...existing, revisions:[...existing.revisions, ...page.revisions], nextCursor:page.nextCursor};
      loadedOlder.current = true;
      manifestRef.current = combined; setManifest(combined); setPageStatus('Older revisions loaded.');
    } catch { if (!controller.signal.aborted && liveToken.current === token && generation === requestId.current) setPageStatus('Older revisions could not be loaded. Try again.'); }
  };
  const choose = (revisionId: string | null) => { setCiteNotice(''); setSelection(revisionId); };
  const revision = manifest?.revisions.find(item => item.revisionId === viewed);
  const historical = !!viewed && viewed !== manifest?.currentRevisionId;
  const sourcePlan = revision?.sourcePlan;
  const differentPlan = !!(sourcePlan && currentPlan && (sourcePlan.planId !== currentPlan.planId || sourcePlan.version !== currentPlan.version || sourcePlan.fingerprint !== currentPlan.fingerprint));
  if (state.kind === 'ready') return <ReportFrame onClose={onClose}>
    {citeNotice && <div className={styles.refresh}><span role="status">{citeNotice}</span></div>}
    <div className={styles.refresh}><span role={state.notice ? 'alert' : 'status'}>{state.refreshing ? 'Refreshing saved report… Last ready report retained.' : state.notice ?? (legacy ? 'Legacy task evidence; no saved report revision.' : historical ? 'You are viewing a historical report. A newer saved report is current.' : 'Current saved report loaded.')}{pending && pendingRetries.current >= 20 ? ' Automatic checks have stopped; refresh to check again.' : ''}</span><button type="button" className={styles.button} disabled={state.refreshing} onClick={() => setAttempt(value => value + 1)}><RotateCw size={14} aria-hidden="true"/>Refresh report</button></div>
    {!legacy && revision && manifest && <div className={styles.history}>
      <label htmlFor="report-revision">Report revision</label>
      <select id="report-revision" value={viewed ?? ''} disabled={state.refreshing} onChange={event => choose(event.target.value)}>{manifest.revisions.map(item => <option value={item.revisionId} key={item.revisionId}>{item.revisionNumber != null ? `Revision ${item.revisionNumber}` : item.revisionId} {item.revisionId === manifest.currentRevisionId ? '· Current' : '· Historical'}</option>)}</select>
      {historical && <button type="button" className={styles.button} disabled={state.refreshing} onClick={() => choose(manifest.currentRevisionId)}>View current report</button>}
      {differentPlan && <p role="status">This saved report describes a different drawing or version from the selected view.</p>}
      <p>Saved {savedDate(revision.createdAt)}</p>
      <details className={styles.changeSummary}><summary>Change summary</summary><ChangeSummary title="Saved report changes" changes={[
        {label:'Rows', change: revision.changeSummary.previousRowCount !== null ? `${revision.changeSummary.previousRowCount.toLocaleString()} → ${revision.changeSummary.rowCount.toLocaleString()}` : `${revision.changeSummary.rowCount.toLocaleString()} (first saved report)`},
        {label:'Source', change:revision.changeSummary.sourceChanged ? 'Changed' : 'Unchanged or first report'},
        {label:'Source plan', change:revision.changeSummary.planChanged ? 'Changed' : 'Unchanged or first report'},
      ]}/></details>
      <p>Saved report source: {sourceLabels[state.report.sourceKind]}{revision.sourcePlan ? ` · ${revision.sourcePlan.title || 'Source plan'}, version ${revision.sourcePlan.version}` : ''}{revision.sourceModel?.revision != null ? ` · Model revision ${revision.sourceModel.revision}` : ''}</p>
      {manifest.nextCursor && <button type="button" className={styles.button} disabled={state.refreshing || pageStatus === 'Loading older revisions…'} onClick={loadMore}>Load older revisions</button>}<p role="status">{pageStatus}</p>
    </div>}
    <ReviewReportContent report={state.report} revisionExport={viewed ? `/api/service/tasks/${encodeURIComponent(taskId)}/reports/${encodeURIComponent(viewed)}/export` : undefined}/>
  </ReportFrame>;
  return <ReportFrame onClose={onClose}>
    <div className={styles.state} role={state.kind === 'error' ? 'alert' : 'status'} aria-live="polite">
      <h3>{state.kind === 'loading' ? 'Loading review report…' : state.title}</h3>
      <p>{state.kind === 'loading' ? 'Reading the task’s BOQ, element data and source details.' : state.message}{pending && pendingRetries.current >= 20 ? ' Automatic checks have stopped; retry to check again.' : ''}</p>
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
      <button type="button" className={styles.iconButton} aria-label="Close report preview" onClick={onClose}><X size={17} aria-hidden="true" /></button>
    </header>
    {children}
  </section>;
}

/** Ready view, shared with clearly labelled synthetic development fixtures. */
export function ReviewReportView({ report, onClose, fixture = false }: { report: ReviewReport; onClose: () => void; fixture?: boolean }) {
  return <ReportFrame onClose={onClose}><ReviewReportContent report={report} fixture={fixture}/></ReportFrame>;
}

function ReviewReportContent({report, fixture = false, revisionExport}: {report: ReviewReport; fixture?: boolean; revisionExport?: string}) {
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
      {fixture && <p className={styles.fixture}>Synthetic development fixture Â· Illustrative data only</p>}
      <div className={styles.provenance}>
        <p className={styles.source}><strong>{sourceLabels[report.sourceKind]}</strong><span>Read only</span></p>
        {report.summary && <p className={styles.summary}>{report.summary}</p>}
        {report.limitations.length > 0 && <div className={styles.limitations}><h3>Limitations</h3><ul>{report.limitations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
      </div>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist" aria-label="Report tables">
          {(['boq', 'elements'] as const).map(kind => <button type="button" role="tab" key={kind} id={`${id}-${kind}-tab`} aria-selected={activeTab === kind} aria-controls={`${id}-${kind}-panel`} tabIndex={activeTab === kind ? 0 : -1} onClick={() => switchTab(kind)} onKeyDown={onTabKeyDown}>{kind === 'boq' ? 'BOQ' : 'Elements'}<span>{report[kind].rows.length.toLocaleString()}</span></button>)}
        </div>
        {revisionExport ? <a className={styles.button} href={`${revisionExport}/${activeTab === 'boq' ? 'csv' : 'elements-csv'}`} download><Download size={14} aria-hidden="true" />Download revision CSV</a> : <button type="button" className={styles.button} onClick={download} disabled={!table.rows.length}><Download size={14} aria-hidden="true" />Download preview CSV</button>}
      </div>
      <section id={`${id}-${activeTab}-panel`} role="tabpanel" aria-labelledby={`${id}-${activeTab}-tab`} className={styles.tablePanel}>
        <p className={styles.count} id={`${id}-preview-count`}>Showing {shownRows.length.toLocaleString()} of {table.rows.length.toLocaleString()} rows{table.rows.length > PREVIEW_ROWS ? ` Â· Preview limited to ${PREVIEW_ROWS} rows` : ''}. {revisionExport ? 'Download is bound to this saved report revision.' : 'CSV includes every row in this report table.'}</p>
        {shownRows.length > 0 ? <div className={styles.tableScroll} role="region" aria-label={`${activeTab === 'boq' ? 'BOQ' : 'Elements'} table, scroll to see all columns`} aria-describedby={`${id}-preview-count`} tabIndex={0}>
          <table><caption className="sr-only">{activeTab === 'boq' ? 'Bill of quantities' : 'Element schedule'} report preview</caption><thead><tr>{columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}</tr></thead><tbody>{shownRows.map((row, index) => <tr key={index}>{columns.map(column => <td key={column.key} className={typeof row[column.key] === 'number' ? styles.numeric : undefined}>{row[column.key] ?? 'â€”'}</td>)}</tr>)}</tbody></table>
        </div> : <p className={styles.emptyTable}>No {activeTab === 'boq' ? 'BOQ' : 'element'} rows were supplied in this report.</p>}
      </section>
      <details className={styles.details}><summary>Source details</summary>
        <dl className={styles.metadata}><div><dt>Document</dt><dd>{report.documentId ?? 'Not supplied'}</dd></div><div><dt>Source model revision</dt><dd>{report.modelRevision ?? 'Not supplied'}</dd></div><div><dt>Source plan version</dt><dd>{report.planVersion ?? 'Not supplied'}</dd></div><div><dt>Scope</dt><dd>{report.scope ?? 'Not supplied'}</dd></div><div><dt>Report status</dt><dd>{report.status ?? 'Not supplied'}</dd></div><div><dt>Coverage</dt><dd>{report.coverage ?? 'Not supplied'}</dd></div><div><dt>Source</dt><dd>{report.source ?? 'Not supplied'}</dd></div><div><dt>Report execution</dt><dd>{report.runId}</dd></div>{report.savedRevision && <><div><dt>Report ID</dt><dd>{report.savedRevision.reportId}</dd></div><div><dt>Report revision ID</dt><dd>{report.savedRevision.revisionId}</dd></div><div><dt>Content hash</dt><dd>{report.savedRevision.contentHash}</dd></div>{report.savedRevision.sourcePlan && <><div><dt>Source plan ID</dt><dd>{report.savedRevision.sourcePlan.planId}</dd></div><div><dt>Source plan fingerprint</dt><dd>{report.savedRevision.sourcePlan.fingerprint}</dd></div></>}</>}</dl>
        <p>The model revision identifies the saved source. Reopening reloads saved task evidence. Ask the agent to read the model again for current quantities.</p>
      </details>
      <p className={styles.exportNote}>{revisionExport ? 'CSV is bound to the saved report revision shown here.' : 'CSV includes the retained rows and their source details.'} Refreshing this report does not reread Revit.</p>
      <p className={styles.feedback} role="status" aria-live="polite">{feedback}</p>
    </div>;
}
