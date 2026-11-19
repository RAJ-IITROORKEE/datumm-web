'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {
  AREA_FLAG_PCT, comparePath, differsFromPlan, parsePlanModelCompare, revitFailureMessage,
  showElementsRequest, toolsPath, type PlanModelCompare,
} from '@/lib/model-health.mjs';
import type {RevitCall} from './revit-panel';
import styles from './revit-panel.module.css';

export type PlanRef = {planId: string; version: number};
const m2 = (value: number) => `${Math.round(value * 10) / 10} m²`;

/** Compare the DATUMM plan on screen with the open Revit model, room by room. Reads only. */
export function RevitPlanCompare({deviceId, call, plan}: {deviceId: string; call: RevitCall; plan: PlanRef}) {
  const [result, setResult] = useState<PlanModelCompare | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [shown, setShown] = useState<{id: number | string; ok: boolean; text: string} | null>(null);

  const compare = async () => {
    setBusy(true); setProblem(''); setShown(null); setResult(null);
    try {
      const parsed = parsePlanModelCompare(await call<unknown>(comparePath(deviceId), 'POST', plan), plan);
      if (parsed) setResult(parsed);
      else setProblem('DATUMM could not read the comparison. Try again.');
    } catch (error) { setProblem(revitFailureMessage(error)); }
    finally { setBusy(false); }
  };

  const select = async (elementId: number | string) => {
    setShown(null);
    try {
      const request = showElementsRequest(result, {elementIds: [elementId]}, 'select');
      if (!request) return;
      await call<unknown>(toolsPath(deviceId), 'POST', request);
      setShown({id: elementId, ok: true, text: 'Selected in Revit.'});
    } catch (error) { setShown({id: elementId, ok: false, text: revitFailureMessage(error)}); }
  };

  const off = result?.matched.filter(differsFromPlan).length ?? 0;
  return <section aria-label="Compare with the DATUMM plan" className={styles.validate}>
    <h3 className={styles.h}>Compare with the DATUMM plan</h3>
    <p className={styles.note}>Matches rooms by name and checks their areas. Nothing in the model is changed.</p>
    <Button size="sm" variant="secondary" disabled={busy} onClick={() => void compare()}>{busy ? 'Comparing…' : result ? 'Compare again' : 'Compare with the DATUMM plan'}</Button>
    {problem && <p role="alert" className={styles.fail}>{problem}</p>}
    {result && <div className={styles.result}>
      <p className={styles.meta}>Plan version {result.version} · model revision {result.revision}</p>
      {result.matched.length + result.onlyInPlan.length + result.onlyInRevit.length === 0 && <p className={styles.ok}>There are no rooms to compare.</p>}
      {result.matched.length > 0 && <div>
        <h4 className={styles.h}>Rooms in both ({result.matched.length})</h4>
        <p className={off ? styles.flag : styles.ok}>{off ? `${off} differ by more than ${AREA_FLAG_PCT} % in area.` : `All areas are within ${AREA_FLAG_PCT} %.`}</p>
        <ul className={styles.list}>{result.matched.map(row => <li key={`${row.name}-${row.revitElementId}`} className={styles.check}>
          <div className={styles.checkText}><span>{row.name}: plan {m2(row.planAreaM2)}, Revit {m2(row.revitAreaM2)}</span>
            <b className={differsFromPlan(row) ? styles.flag : undefined}>{row.differencePct > 0 ? '+' : ''}{Math.round(row.differencePct * 10) / 10} %</b></div>
        </li>)}</ul></div>}
      {result.onlyInPlan.length > 0 && <div>
        <h4 className={styles.h}>Only in the DATUMM plan ({result.onlyInPlan.length})</h4>
        <p className={styles.note}>{result.onlyInPlan.join(', ')}</p></div>}
      {result.onlyInRevit.length > 0 && <div>
        <h4 className={styles.h}>Only in Revit ({result.onlyInRevit.length})</h4>
        <ul className={styles.list}>{result.onlyInRevit.map(row => <li key={row.elementId} className={styles.check}>
          <div className={styles.checkText}><span>{row.name || 'Unnamed room'}</span></div>
          <div className={styles.actions}><Button size="sm" variant="secondary" onClick={() => void select(row.elementId)}>Select in Revit</Button></div>
          {shown?.id === row.elementId && <p role="status" className={shown.ok ? styles.ok : styles.fail}>{shown.text}</p>}
        </li>)}</ul></div>}
      <ul className={styles.limits}>{result.limitations.map(line => <li key={line}>{line}</li>)}</ul>
    </div>}
  </section>;
}
