'use client';

import { Button } from '@/components/ui/button';
import { PlanCanvas } from '../plan-canvas';
import type { WorkspaceState } from './use-workspace-state';

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
    <div className="plan-details" aria-label="Plan details">
      <div className="section-caption">
        PLAN DETAILS · {design.candidates.length} {design.candidates.length === 1 ? 'ALTERNATIVE' : 'ALTERNATIVES'}
      </div>
      <div className="plan-actions" role="group" aria-label="Concept alternatives">
        {design.candidates.map((candidate, index) => (
          <Button
            key={candidate.planId}
            variant={run.currentPlanRef?.planId === candidate.planId ? 'default' : 'secondary'}
            aria-pressed={run.currentPlanRef?.planId === candidate.planId}
            disabled={busy}
            onClick={() => void reviewAlternative(candidate)}
          >
            Alternative {index + 1}
          </Button>
        ))}
      </div>
      {drawingLoading && <p role="status">Loading the saved exact drawing…</p>}
      {drawingError && (
        <div className="error-card" role="alert">
          {drawingMissing
            ? 'Saved plan geometry is unavailable. Request a change in this task.'
            : 'Geometry is saved; the drawing could not be loaded.'}{' '}
          {drawingError}
          <Button variant="secondary" disabled={drawingLoading} onClick={() => setDrawingRetry((n) => n + 1)}>
            Retry exact drawing
          </Button>
        </div>
      )}
      {designVersion && (
        <>
          {drawingError && <p role="status">Last valid drawing retained for reference.</p>}
          {!drawingCurrent && (
            <p role="status">Older drawing v{designVersion.version} retained while the current version loads.</p>
          )}
          {compareVersion && (
            <div className="plan-comparison">
              <PlanCanvas
                canvasInputEnabled={canvasInputEnabled}
                persistentProperties={persistentProperties}
                key={'compare' + compareVersion.planId + compareVersion.version}
                drawing={compareVersion}
                label="Previous / comparison plan"
                readOnly
              />
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
          )}
          <div className="plan-actions">
            <Button variant="secondary" disabled={busy || !drawingCurrent} onClick={() => void compareDrawing()}>
              Compare saved versions
            </Button>
            {compareVersion && (
              <Button variant="secondary" onClick={() => setCompareVersion(null)}>
                Close comparison
              </Button>
            )}
            <a href={`/api/service/runs/${run.id}/export/svg?${query}`} download>
              SVG
            </a>
            <a href={`/api/service/runs/${run.id}/export/preview-png?${query}`} download>
              PNG
            </a>
            <a href={`/api/service/runs/${run.id}/export/plan-pdf?${query}`} download>
              Plan PDF
            </a>
          </div>
        </>
      )}
      {!designVersion && !drawingLoading && !drawingError && (
        <p role="status">
          No drawing is available for this saved geometry. Retry the exact version or request changes in this task.
        </p>
      )}
      {designDiff && <p role="status">{designDiff}</p>}
      <details>
        <summary>Assumptions · {reviewAssumptions.length}</summary>
        <ul>
          {reviewAssumptions.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary>Search checks and limits</summary>
        <ul>
          {design.diagnostics.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
