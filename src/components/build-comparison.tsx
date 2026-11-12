'use client';

import { useRef, useState } from 'react';
import { Button } from './ui/button';
import review from './review/review-panels.module.css';
import styles from './build-comparison.module.css';

export type BuildFeedback = { id: string; version: number; prompt: string };
export type BuildComparison = {
  comparisonId: string; goalVersion: number; documentId: string; revision: number;
  native_verified: boolean; goal_satisfied: boolean | null; feedbackImplemented?: boolean;
  user_review: 'pending' | 'accepted'; overlaySvg: string | null;
  image: { base64: string; contentType: 'image/png'; viewName: string };
  checks: { key: string; kind: string; status: 'pass' | 'mismatch' | 'unknown'; issue?: string | null; expected?: Record<string, unknown>; actual?: Record<string, unknown> }[];
  targets: { key: string; id: string; kind: string }[];
};

function Measurement({ evidence }: { evidence?: Record<string, unknown> }) {
  if (!evidence || !Object.keys(evidence).length) return <p className={review.note}>Not reported</p>;
  return <dl className={styles.measurements}>{Object.entries(evidence).map(([key, value]) => (
    <div key={key}><dt>{key.replaceAll('_', ' ').replace(/([a-z])([A-Z])/g, '$1 $2')}</dt><dd>{value == null ? 'Not reported' : typeof value === 'object' ? 'See technical evidence' : String(value)}</dd></div>
  ))}</dl>;
}

export function BuildComparisonCard({ comparison, feedback, revisions, active, onCommand }: {
  comparison?: BuildComparison; feedback: BuildFeedback[]; revisions: number; active: boolean;
  onCommand: (command: Record<string, unknown>) => Promise<void>;
}) {
  const lock = useRef(false);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [text, setText] = useState('');
  const [selection, setSelection] = useState({ comparisonId: '', key: '' });
  const [action, setAction] = useState<'move' | 'delete'>('move');
  const [dx, setDx] = useState('0'), [dy, setDy] = useState('0');
  const latest = feedback.at(-1);
  const target = selection.comparisonId === comparison?.comparisonId ? selection.key : '';
  const validDelta = (value: string) => value.trim() !== '' && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= 2000;
  const deltasValid = action === 'delete' || (validDelta(dx) && validDelta(dy));
  const canPrepare = Boolean(comparison && latest && comparison.targets.some(item => item.key === target) && revisions < 3 && (action === 'move' || action === 'delete') && deltasValid);
  const canAccept = Boolean(comparison?.native_verified && (comparison.goal_satisfied === true || comparison.feedbackImplemented) && comparison.user_review !== 'accepted');
  const send = async (command: Record<string, unknown>, success = '') => {
    if (lock.current || active) return false;
    lock.current = true;
    setPending(String(command.type)); setError(''); setNotice('');
    try { await onCommand(command); setNotice(success); return true; }
    catch (e) { setError(e instanceof Error ? e.message : 'The request could not be completed. Try again.'); return false; }
    finally { lock.current = false; setPending(''); }
  };
  const saveFeedback = async () => {
    const captured = text;
    if (!captured.trim() || captured.length > 2000) return;
    if (await send({ type: 'build_feedback', prompt: captured.trim() }, 'Feedback saved in this chat.')) {
      setText(current => current === captured ? '' : current);
    }
  };
  const prepareRevision = async () => {
    if (!canPrepare || !comparison || !latest) return;
    await send({ type: 'prepare_revision', feedbackId: latest.id, comparisonId: comparison.comparisonId, targetKey: target, action,
      deltaXmm: action === 'move' ? Number(dx) : 0, deltaYmm: action === 'move' ? Number(dy) : 0 }, 'Revision preparation requested. Review the fresh exact proposal before approving native changes.');
  };
  const unavailable = Boolean(pending) || active;
  const passed = comparison?.checks.filter(check => check.status === 'pass').length ?? 0;
  return <section className={review.panel} aria-label="Measured build comparison" aria-busy={Boolean(pending)}>
    <header className={review.header}>
      <div className={review.heading}><h3 className={review.title}>Compare with Revit</h3><p className={review.description}>Review measured results against the goal, then record your decision.</p></div>
      <span className={review.status} data-tone={comparison?.user_review === 'accepted' ? 'success' : undefined}>{comparison ? comparison.user_review === 'accepted' ? 'Result accepted' : 'Review pending' : 'No comparison yet'}</span>
    </header>
    {comparison ? <>
      <div className={review.metadata}><span>Document <code>{comparison.documentId}</code></span><span>Model revision {comparison.revision}</span><span>Goal version {comparison.goalVersion}</span></div>
      <dl className={review.facts}>
        <div><dt>Native measurements</dt><dd>{comparison.native_verified ? 'Verified' : 'Not verified'}</dd></div>
        <div><dt>Goal checks</dt><dd>{comparison.goal_satisfied === null ? 'Unknown' : comparison.goal_satisfied ? 'Passed' : 'Mismatch'}</dd></div>
        <div><dt>Measured checks</dt><dd>{passed} of {comparison.checks.length} pass</dd></div>
      </dl>
      <div className={styles.checks} aria-label="Expected and actual measurements">
        {comparison.checks.length === 0 && <p className={review.note}>No measured check rows were reported for this comparison.</p>}
        {comparison.checks.map((check, index) => <article key={`${check.key}-${index}`} className={styles.check}>
          <div className={styles.checkHeading}><h4>{check.key}</h4><span className={review.status} data-tone={check.status === 'pass' ? 'success' : check.status === 'mismatch' ? 'warning' : undefined}>{check.status === 'pass' ? 'Pass' : check.status === 'mismatch' ? 'Mismatch' : 'Unknown'}</span></div>
          {check.issue && <p className={styles.issue}>{check.issue}</p>}
          <div className={styles.beforeAfter}><div><h5>Expected</h5><Measurement evidence={check.expected} /></div><div><h5>Actual</h5><Measurement evidence={check.actual} /></div></div>
          <details className={review.details}><summary>Technical evidence · {check.kind}</summary><pre>{JSON.stringify({ expected: check.expected, actual: check.actual }, null, 2)}</pre></details>
        </article>)}
      </div>
      <details className={review.details}><summary>Drawing evidence · {comparison.image.viewName}</summary>
        {comparison.overlaySvg && <figure className={styles.figure}><img src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(comparison.overlaySvg)} alt="Expected blue and actual orange measured wall positions" /><figcaption>Blue: expected walls. Orange: actual walls.</figcaption></figure>}
        <figure className={styles.figure}><img src={'data:image/png;base64,' + comparison.image.base64} alt={`Native Revit plan at model revision ${comparison.revision}`} /><figcaption>Native Revit image · model revision {comparison.revision}</figcaption></figure>
        <p className={review.note}>Comparison <code>{comparison.comparisonId}</code></p>
      </details>
      <div className={review.actions}><Button disabled={unavailable || !canAccept} onClick={() => { if (canAccept) void send({ type: 'review_result', comparisonId: comparison.comparisonId }); }}>{comparison.user_review === 'accepted' ? 'Result accepted' : pending === 'review_result' ? 'Recording review…' : 'I inspected Revit — accept this result'}</Button></div>
      {!canAccept && comparison.user_review !== 'accepted' && <p className={review.note}>Acceptance requires verified native measurements and passed goal checks or implemented feedback.</p>}
    </> : <p className={review.note}>Read the current Revit measurements to compare the retained result with your goal.</p>}
    <div className={review.actions}><Button variant="secondary" disabled={unavailable} onClick={() => void send({ type: 'compare_result' })}>{pending === 'compare_result' ? 'Reading Revit…' : 'Refresh measured comparison'}</Button></div>
    <form className={review.form} onSubmit={e => { e.preventDefault(); void saveFeedback(); }}>
      <label>What should change?<textarea aria-label="Post-build feedback" value={text} disabled={unavailable} onChange={e => { if (!lock.current) setText(e.target.value); }} maxLength={2000} placeholder="For example: make the kitchen bigger" /></label>
      <div className={review.actions}><Button type="submit" variant="secondary" disabled={unavailable || !text.trim()}>{pending === 'build_feedback' ? 'Saving feedback…' : 'Save feedback in this chat'}</Button></div>
    </form>
    {latest && <>
      <div className={review.notice}><strong>Saved feedback · goal version {latest.version}</strong><p>{latest.prompt}</p></div>
      {comparison && <form className={review.form} onSubmit={e => { e.preventDefault(); void prepareRevision(); }}>
        <div><h4 className={styles.subheading}>Prepare a revision</h4><p className={review.note}>Choose a retained element and a measured edit. Preparation rehearses the edit and opens a fresh exact proposal for your approval; it does not apply changes to Revit.</p></div>
        <fieldset disabled={unavailable} className={styles.fields}>
          <label>Retained element<select aria-label="Revision target" value={target} onChange={e => setSelection({ comparisonId: comparison.comparisonId, key: e.target.value })}><option value="">Choose an element</option>{comparison.targets.map(t => <option key={t.id} value={t.key}>{t.key} · {t.kind} · {t.id.slice(-8)}</option>)}</select></label>
          <label>Edit<select aria-label="Revision action" value={action} onChange={e => setAction(e.target.value as 'move' | 'delete')}><option value="move">Move</option><option value="delete">Delete with reviewed dependents</option></select></label>
          {action === 'move' && <div className={styles.displacements}><label>X displacement (mm)<input aria-label="X displacement in millimetres" type="number" min={-2000} max={2000} step="any" value={dx} onChange={e => setDx(e.target.value)} aria-invalid={!validDelta(dx)} required /></label><label>Y displacement (mm)<input aria-label="Y displacement in millimetres" type="number" min={-2000} max={2000} step="any" value={dy} onChange={e => setDy(e.target.value)} aria-invalid={!validDelta(dy)} required /></label></div>}
        </fieldset>
        {!deltasValid && <p className={review.error} role="status">Enter both displacements as finite numbers between −2,000 and 2,000 mm.</p>}
        <p className={review.note}>{revisions} of 3 revision preparations used.{revisions >= 3 ? ' No further preparations are available in this task.' : ''}</p>
        <div className={review.actions}><Button type="submit" disabled={unavailable || !canPrepare}>{pending === 'prepare_revision' ? 'Preparing revision…' : 'Prepare minimal revision'}</Button></div>
      </form>}
    </>}
    {notice && <p className={review.note} role="status">{notice}</p>}
    {error && <p className={review.error} role="alert">{error}</p>}
  </section>;
}
