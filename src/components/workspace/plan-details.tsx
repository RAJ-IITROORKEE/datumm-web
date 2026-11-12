'use client';

import { Button } from '@/components/ui/button';
import { PlanCanvas } from '../plan-canvas';
import type { WorkspaceState } from './use-workspace-state';
import review from '../review/review-panels.module.css';
import styles from './plan-details.module.css';

/**
 * Everything the chat's compact plan card leaves out: alternatives, saved-version
 * comparison, exports, assumptions and limits. Rendered in the Exports tab.
 */
export function PlanDetails(w: WorkspaceState) {
  const {
    run, busy, reviewAlternative, drawingLoading, drawingError, drawingMissing, setDrawingRetry, designVersion,
    drawingCurrent, compareVersion, compareDrawing, setCompareVersion, canvasInputEnabled, persistentProperties,
    drawingStyle, askFromCanvas, designDiff, reviewAssumptions,
  } = w;
  const design = run?.data.agent_design;
  if (!run || !design) return null;
  const query = designVersion ? `planId=${designVersion.planId}&version=${designVersion.version}&style=${drawingStyle}` : '';
  return (
    <section className={review.panel} aria-label="Plan details">
      <header className={review.header}>
        <div className={review.heading}><h3 className={review.title}>Plan details</h3><p className={review.description}>Review alternatives, compare saved drawings and export the selected version.</p></div>
        <span className={review.status}>{design.candidates.length} {design.candidates.length === 1 ? 'alternative' : 'alternatives'}</span>
      </header>
      {designVersion && <div className={review.metadata}><span>Plan <code>{designVersion.planId}</code></span><span>Version {designVersion.version}</span><span>{drawingCurrent ? 'Current drawing' : 'Retained drawing'}</span></div>}
      <div className={review.actions} role="group" aria-label="Concept alternatives">
        {design.candidates.map((candidate, index) => (
          <Button
            key={candidate.planId}
            variant={run.currentPlanRef?.planId === candidate.planId ? 'default' : 'secondary'}
            aria-pressed={run.currentPlanRef?.planId === candidate.planId}
            disabled={busy}
            onClick={() => void reviewAlternative(candidate)}
          >
            Alternative {index + 1} · v{candidate.version}
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
            <p className={review.note} role="status">Older drawing v{designVersion.version} retained while the current version loads.</p>
          )}
          {compareVersion && (
            <div className={styles.comparison}>
              <div className={styles.version}>
                <h4>Previous / comparison</h4><p>Plan <code>{compareVersion.planId}</code> · v{compareVersion.version}</p>
              <PlanCanvas
                canvasInputEnabled={canvasInputEnabled}
                persistentProperties={persistentProperties}
                key={'compare' + compareVersion.planId + compareVersion.version}
                drawing={compareVersion}
                label="Previous / comparison plan"
                readOnly
              />
              </div>
              <div className={styles.version}>
                <h4>Selected drawing</h4><p>Plan <code>{designVersion.planId}</code> · v{designVersion.version}</p>
              <PlanCanvas
                canvasInputEnabled={canvasInputEnabled}
                persistentProperties={persistentProperties}
                key={designVersion.planId + designVersion.version}
                drawing={designVersion}
                label="Current plan"
                readOnly
                onAsk={askFromCanvas}
              />
              </div>
            </div>
          )}
          <div className={review.actions}>
            <Button variant="secondary" disabled={busy || !drawingCurrent} onClick={() => void compareDrawing()}>
              Compare saved versions
            </Button>
            {compareVersion && (
              <Button variant="secondary" onClick={() => setCompareVersion(null)}>
                Close comparison
              </Button>
            )}
            <a className={styles.download} href={`/api/service/runs/${run.id}/export/svg?${query}`} download>
              SVG
            </a>
            <a className={styles.download} href={`/api/service/runs/${run.id}/export/preview-png?${query}`} download>
              PNG
            </a>
            <a className={styles.download} href={`/api/service/runs/${run.id}/export/plan-pdf?${query}`} download>
              Plan PDF
            </a>
          </div>
        </>
      )}
      {!designVersion && !drawingLoading && !drawingError && (
        <p className={review.note} role="status">
          No drawing is available for this saved geometry. Retry the exact version or request changes in this task.
        </p>
      )}
      {designDiff && <div className={review.notice} role="status"><strong>Saved-version comparison</strong><p>{designDiff}</p></div>}
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
