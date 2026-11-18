'use client';
import {useState, type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {
  groupChecks, healthPath, imageLabel, NO_MODEL_GUIDANCE, onlySession, parseModelHealth,
  parsePlanImage, parseViews, planImageRequest, revitFailureMessage, showElementsRequest,
  toolsPath, viewsRequest, type HealthCheck, type ModelHealth, type PlanImage, type PlanView,
} from '@/lib/model-health.mjs';
import styles from './revit-panel.module.css';

export type RevitCall = <T>(path: string, method?: string, body?: unknown) => Promise<T>;
type Tool = {name: string; arguments: Record<string, unknown>};

const NEEDS_UPDATE = 'Revit warnings and room boundaries are not checked yet: they need the DATUMM add-in update.';
const noSession = 'Open one Revit project and connect DATUMM, then try again.';

/**
 * Details drawer "Revit" tab: check the open model, select the affected elements in Revit and
 * compare a Revit floor-plan image with the DATUMM plan. Every call is a read; nothing here
 * writes the model. `call` is the workspace `api` helper, so a fixture can stand in for the service.
 */
export function RevitPanel({deviceId, online, call, plan}: {
  deviceId: string | null; online: boolean; call: RevitCall; plan?: ReactNode;
}) {
  const [health, setHealth] = useState<ModelHealth | null>(null);
  const [checking, setChecking] = useState(false);
  const [problem, setProblem] = useState('');
  const [shown, setShown] = useState<{code: string; ok: boolean; text: string} | null>(null);
  const [busyCode, setBusyCode] = useState('');
  const [views, setViews] = useState<PlanView[] | null>(null);
  const [more, setMore] = useState(false);
  const [viewId, setViewId] = useState('');
  const [image, setImage] = useState<PlanImage | null>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [imageProblem, setImageProblem] = useState('');
  if (!online || !deviceId) return <p className={styles.note}>{NO_MODEL_GUIDANCE}</p>;

  const tool = <T,>(request: Tool) => call<T>(toolsPath(deviceId), 'POST', request);
  const session = async () => onlySession(await tool<unknown>({name: 'list_revit_sessions', arguments: {}}));

  const check = async () => {
    setChecking(true); setProblem(''); setShown(null);
    try {
      const parsed = parseModelHealth(await call<unknown>(healthPath(deviceId)));
      if (parsed) setHealth(parsed);
      else { setHealth(null); setProblem('DATUMM could not read the model check. Try again.'); }
    } catch (error) { setHealth(null); setProblem(revitFailureMessage(error)); }
    finally { setChecking(false); }
  };

  const show = async (item: HealthCheck, action: 'select' | 'show') => {
    setBusyCode(item.code); setShown(null);
    try {
      const request = showElementsRequest(health, item, action);
      if (!request) { setShown({code: item.code, ok: false, text: 'There is nothing to show for this result.'}); return; }
      await tool<unknown>(request);
      setShown({code: item.code, ok: true, text: action === 'show' ? 'Shown in Revit.' : 'Selected in Revit.'});
    } catch (error) { setShown({code: item.code, ok: false, text: revitFailureMessage(error)}); }
    finally { setBusyCode(''); }
  };

  const loadViews = async () => {
    setImageBusy(true); setImageProblem(''); setImage(null);
    try {
      const id = await session();
      if (!id) { setImageProblem(noSession); return; }
      const page = parseViews(await tool<unknown>(viewsRequest(id)));
      if (!page || !page.views.length) { setImageProblem('Revit has no floor-plan views to show.'); return; }
      setViews(page.views); setMore(page.more); setViewId(page.views[0].id);
    } catch (error) { setImageProblem(revitFailureMessage(error)); }
    finally { setImageBusy(false); }
  };

  const loadImage = async () => {
    setImageBusy(true); setImageProblem(''); setImage(null);
    try {
      const id = await session();
      if (!id) { setImageProblem(noSession); return; }
      const parsed = parsePlanImage(await tool<unknown>(planImageRequest(id, viewId)));
      if (parsed) setImage(parsed);
      else setImageProblem('Revit sent an image DATUMM cannot show. Try another view.');
    } catch (error) { setImageProblem(revitFailureMessage(error)); }
    finally { setImageBusy(false); }
  };

  const groups = health ? groupChecks(health) : null;
  const row = (item: HealthCheck) => <li key={item.code} className={styles.check}>
    <div className={styles.checkText}><span>{item.message}</span><b aria-label={`${item.count} found`}>{item.count}</b></div>
    {item.elementIds.length > 0 && <div className={styles.actions}>
      <Button size="sm" variant="secondary" disabled={busyCode !== ''} onClick={() => void show(item, 'select')}>{busyCode === item.code ? 'Working…' : 'Select in Revit'}</Button>
      <Button size="sm" variant="ghost" disabled={busyCode !== ''} onClick={() => void show(item, 'show')}>Zoom to them in Revit</Button>
    </div>}
    {shown?.code === item.code && <p role="status" className={shown.ok ? styles.ok : styles.fail}>{shown.text}</p>}
  </li>;
  const section = (title: string, items: HealthCheck[]) => items.length > 0 && <section aria-label={title}>
    <h3 className={styles.h}>{title}</h3><ul className={styles.list}>{items.map(row)}</ul></section>;

  return <div className={styles.panel}>
    <section aria-label="Model health">
      <h3 className={styles.h}>Model health</h3>
      <p className={styles.note}>Reads your open Revit model. Nothing in the model is changed.</p>
      <Button size="sm" disabled={checking} onClick={() => void check()}>{checking ? 'Checking…' : health ? 'Check again' : 'Check the model'}</Button>
      {problem && <p role="alert" className={styles.fail}>{problem}</p>}
      {health && groups && <div className={styles.result}>
        <p className={styles.meta}>{health.title ? `${health.title} · ` : ''}model revision {health.revision}
          {Object.keys(health.counts).length > 0 && ` · ${Object.entries(health.counts).map(([name, n]) => `${n} ${name}`).join(', ')}`}</p>
        <p className={styles.meta}>{health.coverage === 'complete'
          ? 'Everything the add-in could read was checked.' : 'Partial check: only part of the model could be read.'}</p>
        {health.checks.length === 0 && <p className={styles.ok}>No problems found in what was checked.</p>}
        {section('Problems', groups.problems)}
        {section('Notes', groups.notes)}
        <ul className={styles.limits}>
          {!health.limitations.some(line => /add-in/i.test(line)) && <li>{NEEDS_UPDATE}</li>}
          {health.limitations.map(line => <li key={line}>{line}</li>)}
        </ul>
      </div>}
    </section>
    <section aria-label="Validate in Revit" className={styles.validate}>
      <h3 className={styles.h}>Validate in Revit</h3>
      <p className={styles.note}>Pick a floor plan and see how Revit draws it, next to your DATUMM plan.</p>
      {!views ? <Button size="sm" variant="secondary" disabled={imageBusy} onClick={() => void loadViews()}>{imageBusy ? 'Reading views…' : 'Validate in Revit'}</Button>
        : <div className={styles.pick}>
          <label>Floor plan<select value={viewId} onChange={event => { setViewId(event.target.value); setImage(null); }}>
            {views.map(view => <option key={view.id} value={view.id}>{view.name} (1:{view.scale})</option>)}</select></label>
          <Button size="sm" disabled={imageBusy || !viewId} onClick={() => void loadImage()}>{imageBusy ? 'Reading…' : 'Show the plan'}</Button>
        </div>}
      {more && <p className={styles.note}>Only the first views are listed.</p>}
      {imageProblem && <p role="alert" className={styles.fail}>{imageProblem}</p>}
      {image && <div className={styles.compare}>
        <figure><img src={image.src} width={image.width} height={image.height} alt={`Revit floor plan, ${imageLabel(image)}`} />
          <figcaption>Revit · {imageLabel(image)}</figcaption></figure>
        {plan ? <figure><div className={styles.drawing}>{plan}</div><figcaption>DATUMM plan</figcaption></figure>
          : <p className={styles.note}>Select a DATUMM plan to see it next to this view.</p>}
        {health && image.revision !== health.revision && <p className={styles.note}>The model changed after the last check. Check the model again.</p>}
      </div>}
    </section>
  </div>;
}
