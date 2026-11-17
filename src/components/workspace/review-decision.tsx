'use client';
import { alternativeChecks } from '@/lib/plan-checks.mjs';
import { drawingTitle } from '@/lib/drawing-presentation.mjs';
import type { WorkAreaActions } from '@/lib/work-area-contract';
import { DeletionClosureReview } from '../review/change-summary';
import { PlanReviewCard } from '../review/plan-review-card';
import { ProposalApprovalPanel } from '../review/proposal-approval';
import type { WorkspaceState } from './use-workspace-state';

/**
 * The same plan card and exact Revit approval panel the chat shows, wired to the same actions with
 * the same props. Nothing here changes what an approval sends; `locked` only keeps it off until
 * the Review screen has been opened for this version.
 */
export function ReviewDecision({w, locked, actions}: {w: WorkspaceState; locked: boolean; actions: WorkAreaActions}) {
  const {run, designVersion} = w;
  if (!run) return null;
  const design = run.data.agent_design;
  return <>
    {run.data.proposal?.deletions?.map(closure => <DeletionClosureReview key={closure.key} closure={closure} />)}
    {(run.status === 'awaiting_approval' || run.data.error === 'APPROVAL_REQUIRED') && <ProposalApprovalPanel
      key={[run.id, run.data.proposal?.proposalId, run.data.proposal?.approvalHash, run.data.proposal?.revision].join(':')}
      proposal={run.data.proposal} pending={w.actionBusy || w.cancelPending} expired={w.proposalExpired}
      projectName={run.data.context?.title} annotationView={run.data.annotation_view_review?.name}
      operations={run.data.compiled?.changes?.operations}
      canRefresh={Boolean((run.data.variable_selection || run.data.m09_revision) && !w.committedBuild)}
      onAction={async action => { await w.act(action); }}
      onConfigureAccess={run.data.agent_execution && !run.data.proposal?.deletions?.length ? trigger => {
        w.dialogTrigger.current = trigger; w.setAccessBatches(w.plannedAccessBatches); w.setAccessMargin(0); w.setAccessReview(null); w.setAccessDialog(true);
      } : undefined}
      reviewLocked={locked} />}
    {design && <PlanReviewCard
      key={[run.id, run.currentPlanRef?.planId, run.currentPlanRef?.version, run.currentPlanRef?.fingerprint].join(':')}
      alternatives={design.candidates.length} alternativeChecks={alternativeChecks(design.candidates, design.recommended)}
      planVersion={run.currentPlanRef?.version ?? designVersion?.version ?? design.candidates[0]?.version}
      planTitle={drawingTitle(run.currentPlanRef ?? designVersion, design.candidates)}
      revisionBlockedReason={w.planRevisionBlockedReason} selectionUncertain={w.selectionUncertain}
      planId={run.currentPlanRef?.planId ?? designVersion?.planId} fingerprint={run.currentPlanRef?.fingerprint ?? designVersion?.fingerprint}
      accepted={w.planAccepted} mode={run.mode} busy={w.busy}
      drawingLoading={w.drawingLoading} drawingError={w.drawingError} drawingCurrent={w.drawingCurrent}
      buildReady={Boolean(w.buildStep === 'prepare' && !w.busy && w.selectedDevice?.online && w.revitSessions === 1 && !w.drawingError && w.placementTask === run.id && w.confirmedPlacement)}
      showPlacement={Boolean(w.planAccepted && run.mode === 'build' && !run.data.compiled)}
      onRequestChanges={() => { if (w.preparePlanRevision()) actions.focusReview('textarea[aria-label="Message DATUMM"]'); }}
      onDetails={() => actions.openProperties()}
      onAccept={w.acceptDrawing} onSwitchToBuild={w.switchDrawingToBuild} onPrepare={() => w.buildVariable()}
      onPlacement={() => { w.setBuildSetupOpen(true); void w.reviewPlacement(); }}
      reviewLocked={locked} />}
  </>;
}
