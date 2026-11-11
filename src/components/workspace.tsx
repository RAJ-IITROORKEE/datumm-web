'use client';

import './studio-workspace.css';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import {
  Ellipsis,
  Pin,
  FolderOpen,
  Archive,
  Plus,
  Loader2,
  Monitor,
  Check,
  Workflow,
  ChevronRight,
  ArrowUpRight,
  Clock3,
  PencilRuler,
  ChevronDown,
  Unplug,
  ShieldCheck,
  Download,
} from 'lucide-react';
import { AccountAdmission } from './account-admission';
import { DesktopTitlebar } from './desktop-titlebar';
import { DemoMode } from './demo-mode';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { workflowState } from '@/lib/workflow-state';
import { ContextUsage } from './agent-memory';
import { ActivitySummary, AgentActivity, WorkingIndicator } from './agent-activity';
import { PipelineTrace } from './pipeline-trace';
import { AgentScheduler } from './agent-scheduler';
import { PlanCanvas } from './plan-canvas';
import { ComposerMedia } from './composer-media';
import { studioPipeline } from '@/lib/studio-pipeline';
import installerRelease from '../../public/downloads/release.json';
import { candidateDrawing } from './design-review';
import { DesktopSettings } from './desktop-settings';
import { ProjectContext } from './project-context';
import { useWorkspaceState, api, type Run } from './workspace/use-workspace-state';
import { Sidebar } from './workspace/sidebar';
import { ConversationPanel } from './workspace/conversation';
import { PlanDetails } from './workspace/plan-details';
import { Inspector } from './workspace/inspector';

export function Workspace({
  authConfigured,
  desktopPreview = false,
}: {
  authConfigured: boolean;
  desktopPreview?: boolean;
}) {
  const w = useWorkspaceState({ authConfigured, desktopPreview });
  const {
    actionBusy,
    run,
    busy,
    updateHistory,
    setProjectContextOpen,
    newTask,
    sendShortcut,
    mediaBusy,
    setSendShortcut,
    canvasInputEnabled,
    setCanvasInputEnabled,
    persistentProperties,
    setPersistentProperties,
    needsAccountAdmission,
    accountStatus,
    accountStatusError,
    accountActionError,
    accountBusy,
    accountWorkspaceLoading,
    accountAction,
    settingsOpen,
    panelWidths,
    desktopAvailable,
    changeSettingsOpen,
    left,
    right,
    toggleLeft,
    showDesktopAssistant,
    toggleRight,
    currentProject,
    buildUnavailable,
    deviceId,
    selectRun,
    setRight,
    setTab,
    refresh,
    hasContent,
    studioView,
    viewportReady,
    selectedDevice,
    accountExpired,
    renameTarget,
    setRenameTarget,
    setActionBusy,
    setError,
    renameTitle,
    runId,
    setRun,
    setRenameTitle,
    error,
    accessDialog,
    setAccessDialog,
    setAccessReview,
    restoreDialogFocus,
    accessBatches,
    setAccessBatches,
    setAccessMargin,
    plannedAccessBatches,
    accessMargin,
    reviewTaskAccess,
    accessReview,
    enableTaskAccess,
    buildSetupOpen,
    buildStep,
    setBuildSetupOpen,
    planAccepted,
    designVersion,
    drawingCurrent,
    drawingError,
    setDrawingRetry,
    reviewAssumptions,
    drawingLoading,
    revitSessions,
    acceptDrawing,
    placementTask,
    placementContext,
    reviewPlacement,
    placementView,
    setPlacementView,
    setConfirmedPlacement,
    placementX,
    setPlacementX,
    placementY,
    setPlacementY,
    placementRotation,
    setPlacementRotation,
    confirmPlacement,
    setDeviceDialog,
    activeDrawing,
    focusReview,
    queueData,
    activityView,
    activityFilter,
    setActivityFilter,
    activityRuns,
    activityRun,
    setActivitySelection,
    setStudioView,
    hasRenderablePlan,
    selectedDesignElement,
    setDrawingStyle,
    designHighlights,
    setSelectedDesignElement,
    selectedSource,
    askFromCanvas,
    providerStatus,
    sources,
    setSources,
    setMediaBusy,
    liveRuntime,
    
    previewLabel,
    previewSvg,
    executing,
    traceTurns,
    nativeQuestions,
    mode,
    model,
    nativeTodos,
    savedTurns,
    deviceDialog,
    devices,
    setDeviceId,
    revoke,
    setControl,
    connected,
    deleteTarget,
    setDeleteTarget,
    removeTask,
    deleteAllOpen,
    setDeleteAllOpen,
    deletePhrase,
    setDeletePhrase,
    removeAllTasks,
    canvasOpen,
    setCanvasOpen,
    canvasTrigger,
    plannedCandidate,
    separateNativeFollowup,
    offlineFixture,
    
    models,
    projectContextOpen,
    localConnections,
    setLocalConnections,
  } = w;
  const conversationPanel = <ConversationPanel {...w} />;
  const chatOptions = (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger asChild>
        <button className="desktop-panel-toggle" aria-label="Chat options" title="Chat options" disabled={actionBusy}>
          <Ellipsis size={18} />
        </button>
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content className="action-menu" align="end" sideOffset={6}>
          {run ? (
            <>
              <DropdownMenuPrimitive.Item
                disabled={busy}
                onSelect={() => void updateHistory(run, run.pinned_at ? 'unpin' : 'pin')}
              >
                <Pin size={14} />
                {run.pinned_at ? 'Unpin chat' : 'Pin chat'}
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item disabled={busy} onSelect={() => setProjectContextOpen(true)}>
                <FolderOpen size={14} />
                Projects & local files
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Item
                disabled={busy}
                onSelect={() => void updateHistory(run, run.archived_at ? 'unarchive' : 'archive')}
              >
                <Archive size={14} />
                {run.archived_at ? 'Restore chat' : 'Archive chat'}
              </DropdownMenuPrimitive.Item>
              <DropdownMenuPrimitive.Separator />
            </>
          ) : null}
          <DropdownMenuPrimitive.Item onSelect={() => newTask()}>
            <Plus size={14} />
            New chat
          </DropdownMenuPrimitive.Item>
          <DropdownMenuPrimitive.Item onSelect={() => setProjectContextOpen(true)}>
            <FolderOpen size={14} />
            Projects & local files
          </DropdownMenuPrimitive.Item>
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
  const generalSettingsContent = (
    <div className="settings-general" aria-label="General preferences">
      <label className="setting-row">
        <span>
          <strong>Send messages with</strong>
          <small>Choose how you send a multiline request.</small>
        </span>
        <select
          aria-label="Send messages with"
          value={sendShortcut}
          disabled={mediaBusy}
          onChange={(event) => {
            setSendShortcut(event.target.value);
            localStorage.setItem('datumm-send-shortcut', event.target.value);
          }}
        >
          <option value="ctrl-enter">Ctrl + Enter</option>
          <option value="enter">Enter</option>
        </select>
      </label>
      <label className="setting-row">
        <span>
          <strong>Follow-up messages</strong>
          <small>Finish the current run before sending another request.</small>
        </span>
        <select aria-label="Follow-up behavior" value="wait" disabled>
          <option value="wait">Wait for the current run</option>
        </select>
      </label>
      <label className="setting-row">
        <span>
          <strong>Canvas input</strong>
          <small>Keep a floating assistant input on the drawing.</small>
        </span>
        <input
          type="checkbox"
          aria-label="Floating canvas input"
          checked={canvasInputEnabled}
          disabled={mediaBusy}
          onChange={(event) => {
            setCanvasInputEnabled(event.target.checked);
            localStorage.setItem('datumm-canvas-input', String(event.target.checked));
          }}
        />
      </label>
      <label className="setting-row">
        <span>
          <strong>Persistent properties</strong>
          <small>Always show essential details below your drawing.</small>
        </span>
        <input
          type="checkbox"
          aria-label="Persistent properties"
          checked={persistentProperties}
          onChange={(event) => {
            setPersistentProperties(event.target.checked);
            localStorage.setItem('datumm-persistent-properties', String(event.target.checked));
          }}
        />
      </label>
      <label className="setting-row">
        <span>
          <strong>Units</strong>
          <small>Measurements and dimensions use the current geometry units.</small>
        </span>
        <select aria-label="Measurement units" value="mm" disabled>
          <option value="mm">Millimetres</option>
        </select>
      </label>
    </div>
  );
  if (needsAccountAdmission)
    return (
      <AccountAdmission
        status={accountStatus}
        statusError={accountStatusError}
        actionError={accountActionError}
        busy={accountBusy}
        workspaceLoading={accountWorkspaceLoading}
        onSignIn={() => void accountAction('signIn')}
        onCancel={() => void accountAction('signOut')}
        onRetry={() => void accountAction('status')}
      />
    );
  return (
    <>
      <DesktopTitlebar
        settingsOpen={settingsOpen}
        leftWidth={panelWidths.left}
        nativeAvailable={desktopAvailable}
        onSettings={() => changeSettingsOpen(true)}
        left={left}
        right={right}
        onToggleLeft={toggleLeft}
        onToggleRight={showDesktopAssistant ? toggleRight : undefined}
        title={run?.title ?? 'New chat'}
        project={currentProject?.title}
        options={
          <details
            className="studio-titlebar-options"
            onKeyDown={(event) => {
              if (event.key === 'Escape') event.currentTarget.open = false;
            }}
          >
            <summary aria-label="Workspace options" title="Workspace options">
              <Ellipsis size={17} />
            </summary>
            <div>
              <DemoMode
                disabled={!desktopAvailable || busy || buildUnavailable}
                sessionId={deviceId || undefined}
                onComplete={(task) => {
                  selectRun(task);
                  setRight(true);
                  setTab('preview');
                  void refresh();
                }}
              />
              {chatOptions}
            </div>
          </details>
        }
      />
      <div
        className={cn(
          'workspace',
          'desktop-workspace',
          !showDesktopAssistant && 'studio-new-chat',
          hasContent && studioView === 'workspace' && 'studio-has-pipeline',
          settingsOpen && 'studio-settings-open',
          studioView !== 'workspace' && 'studio-secondary-view',
          !left && 'left-closed',
          !right && 'right-closed',
          viewportReady && 'viewport-ready',
        )}
        style={
          {
            '--left-panel-width': `${panelWidths.left}px`,
            '--right-panel-width': `${panelWidths.right}px`,
          } as React.CSSProperties
        }
      >
        {settingsOpen && (
          <header className="studio-settings-header">
            <div>
              <h1>Settings</h1>
              <p>Preferences for your architectural workspace</p>
            </div>
            <span className="studio-settings-connection">
              <i className={selectedDevice?.online ? 'connected' : ''} />
              {selectedDevice?.online ? 'Revit connected' : 'Revit not connected'}
            </span>
          </header>
        )}
        {accountExpired && (
          <div className="runtime-notice" role="alert">
            <div>
              <strong>DATUMM session expired</strong>
              <span>
                {accountActionError ||
                  accountStatus?.error ||
                  'Your saved workspace stays available. Refresh your account before submitting new work.'}
              </span>
            </div>
            <Button variant="secondary" disabled={accountBusy} onClick={() => void accountAction('refreshAuth')}>
              {accountBusy ? 'Refreshing…' : 'Retry account'}
            </Button>
          </div>
        )}

        <Sidebar {...w} />
        <Dialog
          open={Boolean(renameTarget)}
          onOpenChange={(open) => {
            if (!open && !actionBusy) setRenameTarget(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Rename {renameTarget?.kind}</DialogTitle>
              <DialogDescription>
                Change the display name. Saved context and original requests stay attached.
              </DialogDescription>
            </DialogHeader>
            <form
              className="context-form"
              onSubmit={async (event) => {
                event.preventDefault();
                if (!renameTarget || actionBusy) return;
                setActionBusy(true);
                setError('');
                try {
                  await api(
                    `${renameTarget.kind === 'project' ? 'projects' : 'tasks'}/${renameTarget.id}/title`,
                    'POST',
                    {
                      title: renameTitle,
                      ...(renameTarget.kind === 'project'
                        ? { expectedRevision: renameTarget.revision }
                        : { expectedTaskVersion: renameTarget.revision }),
                    },
                  );
                  await refresh();
                  if (runId === renameTarget.id) setRun(await api<Run>('tasks/' + runId));
                  setRenameTarget(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setActionBusy(false);
                }
              }}
            >
              <label>
                Display name
                <input
                  autoFocus
                  aria-label="Display name"
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                  maxLength={120}
                />
              </label>
              <Button disabled={actionBusy || !renameTitle.trim()}>Save name</Button>
              {error && <p role="alert">{error}</p>}
            </form>
          </DialogContent>
        </Dialog>
        <Dialog
          open={accessDialog}
          onOpenChange={(open) => {
            setAccessDialog(open);
            if (!open) setAccessReview(null);
          }}
        >
          <DialogContent className="task-access-dialog" onCloseAutoFocus={restoreDialogFocus}>
            <DialogHeader>
              <DialogTitle>Task Full Access</DialogTitle>
              <DialogDescription>
                Choose finite limits for this project and task. DATUMM will still dry-run and verify each native batch,
                stop at the limits, and never save the project.
              </DialogDescription>
            </DialogHeader>
            <div className="task-access-fields">
              <label>
                Verified batches
                <select
                  value={accessBatches}
                  onChange={(event) => {
                    const count = Number(event.target.value);
                    setAccessBatches(count);
                    if (count === 1) setAccessMargin(0);
                    setAccessReview(null);
                  }}
                >
                  <option value={plannedAccessBatches}>
                    {plannedAccessBatches} {plannedAccessBatches === 1 ? 'batch' : 'batches'}
                  </option>
                </select>
              </label>
              {accessBatches > 1 && (
                <label>
                  Additional geometry margin
                  <select
                    value={accessMargin}
                    onChange={(event) => {
                      setAccessMargin(Number(event.target.value));
                      setAccessReview(null);
                    }}
                  >
                    {[0, 5000, 10000, 20000].map((value) => (
                      <option key={value} value={value}>
                        {value === 0 ? 'No margin' : `${value / 1000} m beyond first preview`}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <p className="task-access-note">
              Only the first proposal’s operation kinds, Revit types and exact existing-element edits are allowed. The
              selected margin expands its XY envelope; it does not allow deletion. Access expires after 30 minutes or
              the approved batch count.
            </p>
            <Button variant="secondary" disabled={actionBusy} onClick={() => void reviewTaskAccess()}>
              Review exact limits
            </Button>
            {accessReview && accessReview.runId === run?.id && (
              <div className="task-access-scope" role="status">
                <strong>
                  {accessReview.commits} {accessReview.commits === 1 ? 'batch' : 'batches'} ·{' '}
                  {run?.data.context?.title ?? 'Current project'}
                </strong>
                <span>
                  Allowed: {accessReview.scope.operationKinds.join(', ')} · {accessReview.scope.typeIds.length} native
                  type {accessReview.scope.typeIds.length === 1 ? 'ID' : 'IDs'}
                </span>
                <span>
                  Per batch: {accessReview.scope.maxOperations} operations, {accessReview.scope.maxElements} elements.
                  Total: {accessReview.scope.maxTotalOperations ?? accessReview.scope.maxOperations} operations,{' '}
                  {accessReview.scope.maxTotalElements ?? accessReview.scope.maxElements} elements.
                </span>
                <span>
                  XY bounds (mm):{' '}
                  {accessReview.scope.boundsMm
                    ? `X ${accessReview.scope.boundsMm.x[0]} to ${accessReview.scope.boundsMm.x[1]}; Y ${accessReview.scope.boundsMm.y[0]} to ${accessReview.scope.boundsMm.y[1]}`
                    : 'Exact edited targets only'}
                  .
                </span>
                <small>
                  Document {accessReview.scope.documentId.slice(0, 8)} · Level {accessReview.scope.levelId.slice(0, 8)}{' '}
                  · Scope {accessReview.fingerprint.slice(0, 12)}…
                </small>
              </div>
            )}
            {error && (
              <p className="error-banner" role="alert">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => setAccessDialog(false)}>
                Cancel
              </Button>
              <Button disabled={actionBusy || accessReview?.runId !== run?.id} onClick={() => void enableTaskAccess()}>
                Enable reviewed scope
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={buildSetupOpen && Boolean(buildStep)} onOpenChange={setBuildSetupOpen}>
          <DialogContent className="build-setup-dialog" onCloseAutoFocus={restoreDialogFocus}>
            <DialogHeader>
              <DialogTitle>Build this plan in Revit</DialogTitle>
              <DialogDescription>
                Keep this exact drawing. Choose its placement, then review Revit’s preview before approving model
                changes.
              </DialogDescription>
            </DialogHeader>
            <ol className="build-flow-steps" aria-label="Plan to Build progress">
              <li aria-current={!planAccepted ? 'step' : undefined}>
                1. {planAccepted ? 'Plan accepted' : 'Accept plan'}
              </li>
              <li aria-current={planAccepted ? 'step' : undefined}>2. Revit placement</li>
              <li>3. Preview and approve</li>
            </ol>
            {designVersion && drawingCurrent && (
              <div className="build-plan-summary">
                <img
                  src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(designVersion.svg)}
                  alt={`Selected plan version ${designVersion.version}`}
                />
                <span>
                  Alternative{' '}
                  {(run?.data.agent_design?.candidates.findIndex((c) => c.planId === designVersion.planId) ?? -1) + 1} ·
                  version {designVersion.version}
                  <small>{planAccepted ? 'Accepted drawing' : 'The displayed drawing will be used'}</small>
                </span>
              </div>
            )}
            {!drawingCurrent || drawingError ? (
              <p role="alert">
                Load the current exact drawing before continuing.{' '}
                <Button onClick={() => setDrawingRetry((n) => n + 1)}>Retry drawing</Button>
              </p>
            ) : !planAccepted ? (
              <>
                <p>Accept this drawing and its assumptions to continue to placement.</p>
                <ul className="build-assumptions">
                  {reviewAssumptions.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
                <Button
                  disabled={busy || drawingLoading || !selectedDevice?.online || revitSessions !== 1}
                  onClick={() => void acceptDrawing()}
                >
                  {actionBusy ? <Loader2 className="spin" size={15} /> : null}Accept plan and choose placement
                </Button>
              </>
            ) : (
              <section aria-label="Native placement review">
                {placementTask !== run?.id || !placementContext ? (
                  <>
                    <p>Read the active Revit project and available plan views.</p>
                    <Button
                      disabled={busy || !selectedDevice?.online || revitSessions !== 1}
                      onClick={() => void reviewPlacement()}
                    >
                      {actionBusy ? <Loader2 className="spin" size={15} /> : null}Choose Revit placement
                    </Button>
                  </>
                ) : (
                  <>
                    <p className="build-project">
                      <Monitor size={16} />
                      <strong>{placementContext.title}</strong>
                      <span>Revision {placementContext.revision}</span>
                    </p>
                    <label>
                      Plan view and level
                      <select
                        aria-label="Native plan view"
                        value={placementView}
                        onChange={(e) => {
                          setPlacementView(e.target.value);
                          setConfirmedPlacement(null);
                        }}
                      >
                        <option value="">Choose plan view and level</option>
                        {placementContext.plans.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name} · {placementContext.levels.find((l) => l.id === v.levelId)?.name ?? v.levelId}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="build-placement-fields">
                      <label>
                        Origin X (mm)
                        <input
                          aria-label="Origin X (mm)"
                          inputMode="decimal"
                          value={placementX}
                          onChange={(e) => {
                            setPlacementX(e.target.value);
                            setConfirmedPlacement(null);
                          }}
                        />
                      </label>
                      <label>
                        Origin Y (mm)
                        <input
                          aria-label="Origin Y (mm)"
                          inputMode="decimal"
                          value={placementY}
                          onChange={(e) => {
                            setPlacementY(e.target.value);
                            setConfirmedPlacement(null);
                          }}
                        />
                      </label>
                      <label>
                        Rotation (degrees)
                        <input
                          aria-label="Rotation (degrees)"
                          inputMode="decimal"
                          value={placementRotation}
                          onChange={(e) => {
                            setPlacementRotation(e.target.value);
                            setConfirmedPlacement(null);
                          }}
                        />
                      </label>
                    </div>
                    <p>
                      Coordinates use Revit’s internal origin. Confirm the intended location; DATUMM will check the
                      geometry in a temporary preview.
                    </p>
                    <Button disabled={busy || !placementView} onClick={() => void confirmPlacement()}>
                      {actionBusy ? <Loader2 className="spin" size={15} /> : null}Confirm placement and prepare preview
                    </Button>
                  </>
                )}
              </section>
            )}
            {planAccepted && placementContext && placementView && (
              <p>
                Build level:{' '}
                {
                  placementContext.levels.find(
                    (l) => l.id === placementContext.plans.find((v) => v.id === placementView)?.levelId,
                  )?.name
                }{' '}
                · elevation{' '}
                {
                  placementContext.levels.find(
                    (l) => l.id === placementContext.plans.find((v) => v.id === placementView)?.levelId,
                  )?.elevationMm
                }{' '}
                mm from Revit’s internal origin. Wall heights and opening sills are relative to this level.
              </p>
            )}
            {(!selectedDevice?.online || revitSessions !== 1) && (
              <p role="status">
                Connect one Revit session to continue.{' '}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setBuildSetupOpen(false);
                    setDeviceDialog(true);
                  }}
                >
                  Open Connections
                </Button>
              </p>
            )}
            {(error || drawingError) && (
              <p className="error-banner" role="alert">
                {error || drawingError}
              </p>
            )}
          </DialogContent>
        </Dialog>

        <header className="studio-artifact-header">
          <div className="studio-heading">
            <div>
              <h1>
                {studioView === 'activity'
                  ? 'Activity'
                  : studioView === 'schedules'
                    ? 'Scheduled tasks'
                    : (run?.title ?? 'New chat')}
              </h1>
              <p>
                {studioView === 'workspace'
                  ? (currentProject?.title ?? 'Architectural workspace') +
                    (activeDrawing ? ` · Proposed design v${activeDrawing.version}` : ' · Your next idea starts here')
                  : studioView === 'activity'
                    ? 'Saved runs, public tool evidence and outcomes'
                    : 'Scheduling capabilities'}
              </p>
            </div>
            {studioView === 'workspace' && run && (
              <span className="studio-status" data-state={workflowState(run).kind}>
                {workflowState(run).label}
              </span>
            )}
          </div>
          <div className="studio-artifact-actions">
            <button type="button" className="studio-connection" onClick={() => setDeviceDialog(true)}>
              <span className={cn('connection-dot', selectedDevice?.online && revitSessions === 1 && 'online')} />
              {selectedDevice?.online && revitSessions === 1 ? 'Revit connected' : 'Connect Revit'}
            </button>
            {hasRenderablePlan && (run?.mode ?? mode) !== 'ask' && studioView === 'workspace' && (
              <Button
                className="studio-review-primary"
                onClick={() =>
                  focusReview(
                    queueData?.native_build
                      ? '[aria-label="Native build review"]'
                      : queueData?.design
                        ? '[aria-label="Validated design preview"]'
                        : '.conversation',
                  )
                }
              >
                <Check size={15} />
                Review {queueData?.native_build ? 'proposal' : 'design'}
              </Button>
            )}
          </div>
        </header>
        <section className="studio-stage" aria-label="Architectural workspace">
          {studioView === 'activity' ? (
            <div className="studio-page">
              <div className="studio-page-heading">
                <div>
                  <h2>Your workspace, in motion</h2>
                  <p>Open a run to inspect its conversation, tools and recorded result.</p>
                </div>
                <ContextUsage usage={activityView?.usage} busy={activityView?.active} />
              </div>
              <div className="studio-filter-tabs" role="group" aria-label="Filter activity">
                {[
                  ['all', 'All runs'],
                  ['in_progress', 'Running'],
                  ['needs_input', 'Needs input'],
                  ['ready_review', 'Needs review'],
                  ['done', 'Completed'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={activityFilter === value}
                    onClick={() => setActivityFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="studio-activity-layout">
                <div className="studio-run-list">
                  {activityRuns.length ? (
                    activityRuns.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        disabled={mediaBusy || actionBusy}
                        aria-pressed={activityRun?.id === item.id}
                        onClick={() => setActivitySelection(item.id)}
                      >
                        <span className="studio-run-icon">
                          <Workflow size={19} />
                        </span>
                        <span>
                          <strong>{item.title}</strong>
                          <small>
                            {item.mode} · {item.model}
                          </small>
                        </span>
                        <span className="studio-status" data-state={workflowState(item).kind}>
                          {workflowState(item).label}
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ))
                  ) : (
                    <div className="studio-empty">
                      <Workflow size={28} />
                      <h2>No runs in this view</h2>
                      <p>Your saved tasks will appear here as you work.</p>
                    </div>
                  )}
                </div>
                <aside className="studio-activity-detail" aria-label="Selected activity details">
                  {activityRun && activityView ? (
                    <>
                      <h3>{activityRun.title}</h3>
                      <p>{workflowState(activityRun).next}</p>
                      <span className="studio-status" data-state={workflowState(activityRun).kind}>
                        {workflowState(activityRun).label}
                      </span>
                      <dl>
                        <div>
                          <dt>Mode</dt>
                          <dd>{activityRun.mode}</dd>
                        </div>
                        <div>
                          <dt>Model</dt>
                          <dd>{activityRun.model}</dd>
                        </div>
                        <div>
                          <dt>Tool results</dt>
                          <dd>{activityView.evidence.length}</dd>
                        </div>
                      </dl>
                      <ActivitySummary events={activityView.events} />
                      <AgentActivity
                        nativeMessages={activityView.active ? activityView.nativeMessages : undefined}
                        events={activityView.events}
                        active={activityView.active}
                        waiting={activityView.waiting}
                        mode={activityRun.mode}
                        model={activityRun.model}
                        todos={activityView.todos}
                        manifest={activityView.manifest}
                        evidence={activityView.evidence}
                        showFeed={false}
                      />
                      <Button
                        variant="secondary"
                        disabled={mediaBusy || actionBusy}
                        onClick={() => selectRun(activityRun)}
                      >
                        Open chat
                        <ArrowUpRight size={14} />
                      </Button>
                      {desktopAvailable && <PipelineTrace taskId={activityRun.id} />}
                    </>
                  ) : (
                    <p>Select a task to inspect its recorded work.</p>
                  )}
                </aside>
              </div>
            </div>
          ) : studioView === 'schedules' ? (
            <div className="studio-page">
              <div className="studio-page-heading">
                <div>
                  <h2>Scheduled tasks</h2>
                  <p>Keep recurring work together.</p>
                </div>
                <Button
                  variant="secondary"
                  disabled
                  title="Calendar scheduling is not available in the current runtime"
                >
                  <Plus size={15} />
                  Create schedule
                </Button>
              </div>
              <div className="studio-empty studio-schedule-empty">
                <Clock3 size={30} />
                <h2>Calendar scheduling is not available yet</h2>
                <p>Recurring calendar runs are unavailable in the hosted workspace.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStudioView('activity');
                    setActivityFilter('in_progress');
                  }}
                >
                  View running tasks
                  <ArrowUpRight size={15} />
                </Button>
              </div>
              {run?.data.agent_scheduler && <AgentScheduler value={run.data.agent_scheduler} />}
            </div>
          ) : hasRenderablePlan ? (
            <div className="studio-canvas-stage">
              {activeDrawing ? (
                <PlanCanvas
                  canvasInputEnabled={canvasInputEnabled}
                  persistentProperties={persistentProperties}
                  key={activeDrawing.fingerprint}
                  drawing={activeDrawing}
                  label="Workspace design"
                  selectedElement={selectedDesignElement}
                  onProperties={() => {
                    setRight(true);
                    setTab('preview');
                  }}
                  onStyleChange={setDrawingStyle}
                  highlights={designHighlights}
                  onSelectElement={setSelectedDesignElement}
                  source={
                    selectedSource?.image
                      ? {
                          id: selectedSource.id,
                          sha256: selectedSource.sha256,
                          name: selectedSource.name,
                          image: selectedSource.image,
                          page: selectedSource.page,
                        }
                      : undefined
                  }
                  reference={queueData?.design?.reference}
                  onAsk={askFromCanvas}
                  voiceControl={(onTranscript) => (
                    <ComposerMedia
                      voiceOnly
                      voiceStatus={providerStatus?.voice}
                      locked={mediaBusy}
                      nativeAvailable={desktopAvailable}
                      sources={sources}
                      onChange={setSources}
                      onBusy={setMediaBusy}
                      disabled={actionBusy || (!liveRuntime && !desktopPreview)}
                      onTranscript={onTranscript}
                      onContext={() => setProjectContextOpen(true)}
                      onTools={() => changeSettingsOpen(true)}
                      onSettings={() => changeSettingsOpen(true)}
                      onSkill={() => {}}
                      onCommand={() => {}}
                    />
                  )}
                />
              ) : (
                <div className="studio-static-preview">
                  <div className="studio-preview-label">
                    <PencilRuler size={16} />
                    {previewLabel}
                  </div>
                  <img alt={previewLabel} src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(previewSvg)} />
                </div>
              )}
            </div>
          ) : (
            conversationPanel
          )}
        </section>
        {hasContent && studioView === 'workspace' && (
          <details className="studio-pipeline">
            <summary>
              <Workflow size={15} />
              <span>Pipeline</span>
              <span className="studio-pipeline-steps">
                {studioPipeline({
                  planReady: Boolean(activeDrawing),
                  accepted: Boolean(queueData?.design?.selected || planAccepted),
                  build: queueData?.native_build,
                  executing,
                  mode: run?.mode ?? mode,
                }).map((step) => (
                  <span key={step.label} data-state={step.state}>
                    {step.state === 'done' ? (
                      <Check size={12} />
                    ) : step.state === 'current' ? (
                      <i aria-hidden="true" />
                    ) : null}
                    {step.label}
                  </span>
                ))}
              </span>
              <strong className="studio-pipeline-status">
                {run ? workflowState(run).label : executing ? 'Working' : 'Conversation'}
              </strong>
              {executing && <WorkingIndicator />}
              <ChevronDown size={14} />
            </summary>
            <div>
              {run && <p>{workflowState(run).next}</p>}
              {run?.data.agent_scheduler && <AgentScheduler value={run.data.agent_scheduler} />}
              <AgentActivity
                nativeMessages={executing ? run?.data.native_messages : undefined}
                events={traceTurns.at(-1) ?? []}
                active={executing}
                waiting={nativeQuestions.length > 0}
                mode={run?.mode ?? mode}
                model={run?.model ?? model}
                todos={nativeTodos}
                manifest={run?.data.run_manifest}
                evidence={savedTurns.at(-1)?.result?.evidence ?? run?.data.run_manifest?.tools ?? []}
              />
              {desktopAvailable && runId && <PipelineTrace taskId={runId} />}
            </div>
          </details>
        )}

        <Inspector {...w} conversationPanel={conversationPanel} planDetails={<PlanDetails {...w} />} />

        <Dialog open={deviceDialog} onOpenChange={setDeviceDialog}>
          <DialogContent className="device-dialog" onCloseAutoFocus={restoreDialogFocus}>
            <DialogHeader>
              <DialogTitle>Connect your workspace</DialogTitle>
              <DialogDescription>
                Authorize your Windows connector with this account. Choose how DATUMM approves plans for your Revit
                project.
              </DialogDescription>
            </DialogHeader>
            <div className="device-list">
              {devices.map((device) => (
                <div key={device.id}>
                  <Monitor size={22} />
                  <span>
                    <strong>{device.name}</strong>
                    <small>
                      {!device.online
                        ? 'Offline'
                        : device.id === deviceId && revitSessions === 1
                          ? 'Revit ready'
                          : device.id === deviceId && revitSessions === 0
                            ? 'Connector online · Enable Revit bridge'
                            : 'Connector online'}{' '}
                      · {device.fullControl ? 'Scoped grant saved' : 'Approve in chat'}
                    </small>
                  </span>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setDeviceId(device.id);
                      setDeviceDialog(false);
                    }}
                    disabled={!device.online}
                  >
                    {deviceId === device.id ? 'Selected' : 'Use device'}
                  </Button>
                  <button
                    className="icon-button"
                    aria-label={`Disconnect ${device.name}`}
                    onClick={() => revoke(device.id)}
                  >
                    <Unplug size={17} />
                  </button>
                </div>
              ))}
            </div>
            {selectedDevice && (
              <div className="control-box">
                <div>
                  <ShieldCheck size={18} />
                  <strong>Approval mode</strong>
                </div>
                <p>
                  {selectedDevice.fullControl
                    ? 'A Full Control grant is saved for its original Revit session and project. If you changed projects or restarted Revit, turn it off and enable it again for the current project.'
                    : 'Approve every exact plan in the chat before DATUMM changes your model.'}
                </p>
                <Button
                  variant={selectedDevice.fullControl ? 'secondary' : 'default'}
                  disabled={actionBusy || (!selectedDevice.fullControl && revitSessions !== 1)}
                  onClick={() => setControl(selectedDevice)}
                >
                  {selectedDevice.fullControl ? 'Turn off Full Control' : 'Enable Full Control'}
                </Button>
                <small>
                  Full Control applies only to validated 3BHK builds in the granted project and session. It expires
                  after one hour or ten builds, whichever comes first. Revit still validates the exact proposal.
                  Disconnect or turn it off anytime.
                </small>
              </div>
            )}
            <div className="pairing-box">
              <strong>Connect from Revit</strong>
              <p>
                In Revit, open Add-Ins / DATUMM Agent / Connection Settings. Choose Sign in with browser, then authorize
                your computer. No pairing code is needed.
              </p>
              <a className="installer-download" href={installerRelease.file}>
                <Download size={17} />
                <span>
                  Download public Revit add-in
                  <small>
                    Windows x64 · Revit 2026 · public candidate {installerRelease.version} · unsigned development build
                  </small>
                </span>
              </a>
              <a className="checksum-link" href={installerRelease.checksumUrl}>
                SHA-256 checksum
              </a>
            </div>
            <p className="settings-note">
              <ShieldCheck size={15} /> Revoking removes this device access. Authorize it again from Revit to reconnect.
            </p>
            {error && (
              <p className="error-banner" role="alert">
                {error}
              </p>
            )}
            {!connected && <p className="error-banner">Sign in before authorizing a device.</p>}
          </DialogContent>
        </Dialog>

        <Dialog
          open={Boolean(deleteTarget)}
          onOpenChange={(open) => {
            if (!open) setDeleteTarget(null);
          }}
        >
          <DialogContent onCloseAutoFocus={restoreDialogFocus}>
            <DialogHeader>
              <DialogTitle>Delete this chat?</DialogTitle>
              <DialogDescription>
                “{deleteTarget?.title}” will be removed from your chat history. Its local context, agent history and
                app-managed files will be permanently removed. Built Revit elements and external exports remain. Cleanup
                failures stay pending and can be retried.
              </DialogDescription>
            </DialogHeader>
            {error && (
              <p role="alert" className="error-banner">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
                Keep chat
              </Button>
              <Button className="delete-button" disabled={actionBusy} onClick={() => void removeTask()}>
                Delete chat
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
          <DialogContent onCloseAutoFocus={restoreDialogFocus}>
            <DialogHeader>
              <DialogTitle>Delete all chats?</DialogTitle>
              <DialogDescription>
                This removes all recent, pinned and archived chats from this account's history. It does not delete Revit
                elements. Finish or cancel running tasks first. Local context and agent history are permanently removed.
                Built Revit elements and external exports remain. Cleanup failures stay pending.
              </DialogDescription>
            </DialogHeader>
            <label className="delete-confirm-label">
              Type DELETE to confirm
              <input value={deletePhrase} onChange={(e) => setDeletePhrase(e.target.value)} autoComplete="off" />
            </label>
            {error && (
              <p role="alert" className="error-banner">
                {error}
              </p>
            )}
            <div className="dialog-actions">
              <Button variant="secondary" onClick={() => setDeleteAllOpen(false)}>
                Cancel
              </Button>
              <Button
                className="delete-button"
                disabled={actionBusy || deletePhrase !== 'DELETE'}
                onClick={() => void removeAllTasks()}
              >
                Delete all chats
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={canvasOpen} onOpenChange={setCanvasOpen}>
          <DialogContent
            className="canvas-dialog"
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (canvasTrigger.current?.isConnected) canvasTrigger.current.focus();
            }}
          >
            <DialogHeader>
              <DialogTitle>
                {plannedCandidate && separateNativeFollowup ? 'Saved design reference' : 'Design preview'}
              </DialogTitle>
              <DialogDescription>
                {plannedCandidate && separateNativeFollowup
                  ? 'Saved geometry excludes the separate native proposal and later native room-name changes.'
                  : 'Proposed geometry · select a room to inspect dimensions'}
              </DialogDescription>
            </DialogHeader>
            {plannedCandidate ? (
              <PlanCanvas
                canvasInputEnabled={canvasInputEnabled}
                persistentProperties={persistentProperties}
                drawing={candidateDrawing(plannedCandidate)}
                label="Expanded design"
                onAsk={askFromCanvas}
              />
            ) : designVersion ? (
              <PlanCanvas
                canvasInputEnabled={canvasInputEnabled}
                persistentProperties={persistentProperties}
                drawing={designVersion}
                onAsk={askFromCanvas}
              />
            ) : previewSvg ? (
              <div className="canvas-scroll">
                <img alt={previewLabel} src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(previewSvg)} />
              </div>
            ) : (
              <p>No current design preview.</p>
            )}
          </DialogContent>
        </Dialog>
        <footer className="studio-global-footer">
          <span>
            <span className={cn('connection-dot', connected && 'online')} />
            {offlineFixture
              ? 'Offline preview · sample workspace'
              : desktopPreview && liveRuntime
                ? 'Live preview · Ask / Plan connected'
                : (currentProject?.title ?? 'Design workspace')}
          </span>
          <span>
            {offlineFixture
              ? 'Sample data · no live Revit writes'
              : desktopPreview && liveRuntime
                ? 'Live preview · no Revit writes'
                : selectedDevice?.online && revitSessions === 1
                  ? 'Connected workspace · changes require approval'
                  : 'Hosted workspace · exact Revit approval required'}
          </span>
          <span>
            {activeDrawing?.graph.rooms.find((room) => room.key === selectedDesignElement)?.name ||
              (selectedDesignElement ? 'Selected element' : 'Architectural workspace')}
            {activeDrawing ? ` · v${activeDrawing.version}` : ''}
          </span>
        </footer>
        <DesktopSettings
          open={settingsOpen}
          onOpenChange={changeSettingsOpen}
          authConfigured={authConfigured}
          models={models}
          generalContent={generalSettingsContent}
          revitContent={
            <>
              <p>
                Connect the separately installed DATUMM Revit add-in to this account. Keep Revit and its connector
                running on your Windows computer.
              </p>
              <div className="device-list">
                {devices.map((device) => (
                  <div key={device.id}>
                    <Monitor size={18} />
                    <span>
                      <strong>{device.name}</strong>
                      <small>{device.online ? 'Connector online' : 'Offline'}</small>
                    </span>
                    <Button variant="ghost" disabled={!device.online} onClick={() => setDeviceId(device.id)}>
                      {deviceId === device.id ? 'Selected' : 'Use device'}
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="secondary" onClick={() => setDeviceDialog(true)}>
                Manage Revit connections
              </Button>
              <p className="settings-note">Review the exact proposal in chat before approving model changes.</p>
            </>
          }
        />
        <ProjectContext open={projectContextOpen} onOpenChange={setProjectContextOpen} />
      </div>
      <Dialog open={localConnections} onOpenChange={setLocalConnections}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Local Revit MCP</DialogTitle>
            <DialogDescription>
              The installed DATUMM plugin is discovered locally. Ask/Plan can inspect it without cloud connector
              pairing.
            </DialogDescription>
          </DialogHeader>
          {devices.length ? (
            devices.map((device) => (
              <div className="device-list" key={device.id}>
                <Monitor size={18} />
                <strong>{device.name}</strong>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setDeviceId(device.id);
                    setLocalConnections(false);
                  }}
                >
                  {deviceId === device.id ? 'Selected' : 'Use session'}
                </Button>
              </div>
            ))
          ) : (
            <p>No Revit session was discovered. Open Revit 2026, enable the DATUMM bridge, and refresh.</p>
          )}
          <Button variant="secondary" onClick={() => void refresh()}>
            Refresh sessions
          </Button>
          <p>
            Read tools inspect the model; design and native proposal tools prepare reviewable geometry. Exact design
            acceptance and native execution use the trusted desktop controls.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
