'use client';

import { Button } from '@/components/ui/button';
import { PlanCanvas } from '../plan-canvas';
import type { PlanDetailsSelectionProps, PlanIdentity } from '@/lib/work-area-contract';
import type { WorkspaceState } from './use-workspace-state';
import { drawingTitle } from '@/lib/drawing-presentation.mjs';
import { exactConceptName } from '@/lib/drawing-export-identity.mjs';
import review from '../review/review-panels.module.css';
import styles from './plan-details.module.css';

/**
 * Everything the chat's compact plan card leaves out: alternatives, saved-version
 * comparison, assumptions and limits; exact downloads have their own surface.
 */
export function PlanDetails(w: WorkspaceState & PlanDetailsSelectionProps & { surface: 'design' | 'exports' }) {
  const {
    run, busy, scope, onSelectAlternative, drawingLoading, drawingError, drawingMissing, setDrawingRetry, designVersion,
    drawingCurrent, compareVersion, compareDrawing, setCompareVersion, canvasInputEnabled, persistentProperties,
    drawingStyle, askFromCanvas, designDiff, reviewAssumptions, comparisonError, comparisonLoading, comparisonKind,
  } = w;
  const design = run?.data.agent_design;
  if (!run || run.id !== scope.taskId || !design) return null;
  const drawingName = (plan: PlanIdentity) => drawingTitle(plan, design.candidates);
  const identityDetails = (plan: PlanIdentity) => <details className={styles.identity}>
    <summary>Drawing technical details</summary>
    <dl><div><dt>Plan ID</dt><dd><code>{plan.planId}</code></dd></div>
      <div><dt>Version</dt><dd>{plan.version}</dd></div>
      <div><dt>Fingerprint</dt><dd><code>{plan.fingerprint}</code></dd></div></dl>
  </details>;
  const savedVector = drawingStyle === 'linework' ? designVersion?.lineworkSvg : designVersion?.svg;
  const query = designVersion ? new URLSearchParams({planId:designVersion.planId,version:String(designVersion.version),style:drawingStyle}).toString() : '';
  if (w.surface === 'exports') return <section className={styles.exports} aria-label="Saved drawing exports">
    <h3>Saved drawing export</h3>
    {designVersion ? <><p>{drawingName(designVersion)} · {drawingCurrent ? 'Current drawing' : 'Retained reference'} · {drawingStyle}</p>
      <div className={styles.formats}>{[{format:'svg',label:'SVG'},{format:'preview-png',label:'PNG'},{format:'plan-pdf',label:'Plan PDF'}].map(item => w.runtimeConfig?.supportedExports && !w.runtimeConfig.supportedExports.includes(item.format)
        ? <span key={item.format} className={styles.unavailable}>{item.label} unavailable</span>
        : <a key={item.format} className={styles.download} href={`/api/service/runs/${encodeURIComponent(run.id)}/export/${item.format}?${query}`} download>{item.label}</a>)}</div>
      <p className={styles.note}>Saved exports retain their recorded area labels. {savedVector?.includes('data-renderer="dimensioned-v1"') ? 'The loaded vector’s room areas include a wall allowance, not clear area.' : 'The loaded vector’s room area basis is not specified.'}</p>
      <p className={styles.note}>Requests this saved plan and version in the selected style. Use Drawing → Display for a white sheet generated from the loaded geometry.</p>
      <details className={styles.identity}><summary>Export source details</summary><p>The server request includes task, plan, version and style. Its response fingerprint is not independently verified by this interface.</p><p>A source model revision does not establish a saved report revision.</p></details>
      {identityDetails(designVersion)}</> : <p>Load an exact saved drawing to export it.</p>}
  </section>;
  return (
    <section className={review.panel} aria-label="Plan details">
      <header className={review.header}>
        <div className={review.heading}><h3 className={review.title}>Plan details</h3><p className={review.description}>Review concepts, their recorded versions and assumptions.</p></div>
        <span className={review.status}>{design.candidates.length} {design.candidates.length === 1 ? 'alternative' : 'alternatives'}</span>
      </header>
      {designVersion && <><div className={review.metadata}><span>{drawingName(designVersion)}</span><span>{drawingCurrent ? 'Current drawing' : 'Retained drawing'}</span></div>{identityDetails(designVersion)}</>}
      {w.preparePlanRevision && <div className={review.actions}><Button variant="secondary" disabled={busy||Boolean(w.planRevisionBlockedReason)} onClick={()=>{if(w.preparePlanRevision())w.focusReview('textarea[aria-label="Message DATUMM"]');}}>Revise brief</Button>{w.planRevisionBlockedReason && <p className={review.note}>{w.planRevisionBlockedReason}</p>}</div>}
      {w.selectionError && <div className={review.error} role="alert"><strong>{w.selectionUncertain ? 'Check the saved selection' : 'Alternative unavailable'}</strong><p>{w.selectionError}</p>{w.selectionUncertain && <><div className={review.actions}><Button variant="secondary" disabled={busy} onClick={()=>void w.reconcilePlanSelection()}>Check saved selection</Button>{w.newTask && <Button variant="secondary" disabled={busy} onClick={()=>w.newTask()}>Start a new chat</Button>}</div><p>If the selection remains unconfirmed, keep this drawing as a reference or start a new chat for further planning. The selection request is never retried automatically.</p></>}</div>}
      <div className={review.actions} role="group" aria-label="Concept alternatives">
        {design.candidates.map((candidate) => (
          <Button
            key={JSON.stringify([candidate.planId,candidate.version,candidate.fingerprint])}
            variant={run.currentPlanRef?.planId === candidate.planId && run.currentPlanRef?.version === candidate.version && run.currentPlanRef?.fingerprint === candidate.fingerprint ? 'default' : 'secondary'}
            aria-pressed={run.currentPlanRef?.planId === candidate.planId && run.currentPlanRef?.version === candidate.version && run.currentPlanRef?.fingerprint === candidate.fingerprint}
            title="Changes the selected task alternative. Plan acceptance and native approval remain separate."
            disabled={busy || w.selectionUncertain || Boolean(run.currentPlanRef?.planId === candidate.planId && candidate.version <= run.currentPlanRef.version)}
            onClick={() => void onSelectAlternative({scope,taskId:run.id,briefId:design.briefId,plan:{planId:candidate.planId,version:candidate.version,fingerprint:candidate.fingerprint}})}
          >
            Review/select {drawingName(candidate)}
          </Button>
        ))}
      </div>
      {drawingLoading && <p className={review.note} role="status">Loading the saved exact drawing…</p>}
      {drawingError && (
        <div className={review.error} role="alert">
          {drawingMissing
            ? 'Saved plan geometry is unavailable. Request a change in this task.'
            : 'Geometry is saved; the drawing could not be loaded.'}{' '}
          {drawingError}
          <div className={review.actions}><Button variant="secondary" disabled={drawingLoading} onClick={() => setDrawingRetry((n) => n + 1)}>
            Retry exact drawing
          </Button></div>
        </div>
      )}
      {designVersion && (
        <>
          {drawingError && <p className={review.note} role="status">Last valid drawing retained for reference.</p>}
          {!drawingCurrent && (
            <p className={review.note} role="status">Retained reference · {drawingName(designVersion)}. {w.selectionUncertain ? 'The saved selection must be confirmed before this drawing can be approved.' : drawingLoading ? 'The current drawing is loading.' : 'Its identity does not match the current selected drawing.'}</p>
          )}
          {compareVersion && (
            <div className={styles.comparison}>
              <div className={styles.version}>
                <h4>{comparisonKind === 'alternative' ? 'Alternative concept' : comparisonKind === 'previous' ? 'Previous saved version' : 'Comparison drawing'}</h4><p>{drawingName(compareVersion)}</p>{identityDetails(compareVersion)}
              <PlanCanvas
                canvasInputEnabled={canvasInputEnabled}
                persistentProperties={persistentProperties}
                key={JSON.stringify(['compare',compareVersion.planId,compareVersion.version,compareVersion.fingerprint])}
                drawing={compareVersion}
                exportOwnerKey={JSON.stringify([scope.key,scope.epoch])}
                exportLabel={exactConceptName(compareVersion, design.candidates)}
                label={drawingName(compareVersion)}
                readOnly
              />
              </div>
              <div className={styles.version}>
                <h4>Selected drawing</h4><p>{drawingName(designVersion)}</p>
              <PlanCanvas
                canvasInputEnabled={canvasInputEnabled}
                persistentProperties={persistentProperties}
                key={JSON.stringify([designVersion.planId,designVersion.version,designVersion.fingerprint])}
                drawing={designVersion}
                exportOwnerKey={JSON.stringify([scope.key,scope.epoch])}
                exportLabel={drawingCurrent ? exactConceptName(designVersion, design.candidates) : undefined}
                label={drawingName(designVersion)}
                readOnly
                onAsk={askFromCanvas}
              />
              </div>
            </div>
          )}
          <div className={review.actions}>
            {designVersion.version > 1 && <Button variant="secondary" disabled={busy || comparisonLoading || !drawingCurrent || drawingLoading} onClick={() => void compareDrawing('previous')}>Compare previous version</Button>}
            {design.candidates.some(candidate=>candidate.planId!==designVersion.planId) && <Button variant="secondary" disabled={busy || comparisonLoading || !drawingCurrent || drawingLoading} onClick={() => void compareDrawing('alternative')}>Compare alternative</Button>}
            {compareVersion && (
              <Button variant="secondary" onClick={() => setCompareVersion(null)}>
                Close comparison
              </Button>
            )}
          </div>
        </>
      )}
      {comparisonLoading && <p className={review.note} role="status">Loading the requested comparison. Your drawing stays available.</p>}
      {comparisonError && <div className={review.error} role="alert"><strong>Comparison unavailable</strong><p>{comparisonError}</p><p>Your drawing and any previous comparison remain available.</p></div>}
      {!designVersion && !drawingLoading && !drawingError && (
        <p className={review.note} role="status">
          No drawing is available for this saved geometry. Retry the exact version or request changes in this task.
        </p>
      )}
      {designDiff && compareVersion && <div className={review.notice} role="status"><strong>{comparisonKind === 'alternative' ? 'Concept comparison' : 'Saved-version comparison'}</strong><p>{designDiff}</p><details className={styles.identity}><summary>Comparison source details</summary><p>{drawingName(compareVersion)} compared with {designVersion ? drawingName(designVersion) : 'the selected drawing'}.</p><p>The comparison service uses plan IDs and versions. The displayed fingerprints belong to the loaded drawings; independent fingerprint verification of the diff is not established.</p><p>This is an individual comparison, not a complete revision history.</p></details></div>}
      <details className={review.details}>
        <summary>Assumptions · {reviewAssumptions.length}</summary>
        <ul>
          {reviewAssumptions.length === 0 && <li>No assumptions were reported for this plan.</li>}
          {reviewAssumptions.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </details>
      <details className={review.details}>
        <summary>Search checks and limits</summary>
        <ul>
          {design.diagnostics.length === 0 && <li>No search checks or limits were reported.</li>}
          {design.diagnostics.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
