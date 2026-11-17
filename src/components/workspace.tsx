'use client';

import './studio-workspace.css';
import {useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {OutputWorkspaceProvider, OutputPanel, useOutputWorkspace} from './workspace/output-workspace';
import {ReviewReportPanel} from './workspace/review-report';
import type { AlternativeSelection, AssetRow, Bound, SavedDrawingInput, SavedReportRevision, WorkAreaActions, WorkAreaPreview, WorkScope } from '@/lib/work-area-contract';
import type { ReviewReport } from '@/lib/review-report.mjs';
import {projectWorkspaceAssets} from '@/lib/workspace-assets.mjs';
import {drawingTitle} from '@/lib/drawing-presentation.mjs';
import {exactConceptName} from '@/lib/drawing-export-identity.mjs';
import {featureEnabled} from '@/lib/capabilities.mjs';
import {liveScopeFor} from '@/lib/display-actions.mjs';
import {AssetsPanel} from './workspace/assets-panel';
import {ExportsPanel} from './workspace/exports-panel';
import {StudioProperties} from './studio-properties';
import {BriefChips} from './workspace/brief-chips';
import {PanelResize} from './panel-resize';
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
  Maximize2,
  Minimize2,
  MessageSquare,
  PanelRight,
  ListChecks,
  PanelLeft,
  TableProperties,
  ClipboardCheck,
  Info,
} from 'lucide-react';
import { AccountAdmission } from './account-admission';
import { DesktopTitlebar } from './desktop-titlebar';
import { DemoMode } from './demo-mode';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { workflowState } from '@/lib/workflow-state';
import { ContextUsage } from './agent-memory';
import { ActivityPanel } from './workspace/activity-panel';
import activityStyles from './workspace/activity-shell.module.css';
import { AgentScheduler } from './agent-scheduler';
import { PlanCanvas } from './plan-canvas';
import { ChecksReport } from './checks-report';
import { DesignSidePanel, type DesignSideTab } from './workspace/design-side-panel';
import { PlanEditPanel } from './workspace/plan-edit-panel';
import { parseFindings, refsToHighlights } from '@/lib/plan-checks.mjs';
import installerRelease from '../../public/downloads/release.json';
import { DesktopSettings } from './desktop-settings';
import { ProjectContext } from './project-context';
import { useWorkspaceState, api, type Run, type WorkspaceState } from './workspace/use-workspace-state';
import { useAnswerFeedback } from './workspace/use-answer-feedback';
import { Sidebar } from './workspace/sidebar';
import { PanelRight as WorkAreaCloseIcon, PanelRightOpen as WorkAreaOpenIcon } from './workspace/sidebar-icons';
import { ConversationPanel } from './workspace/conversation';
import { useDisplayActions } from './workspace/display-actions';
import { PlanDetails } from './workspace/plan-details';
import { Inspector } from './workspace/inspector';
import { ModeSwitch } from './workspace/mode-switch';
import { ReviewScreen } from './workspace/review-screen';
import { TechnicalDetails } from './workspace/details-drawer';
import { useWorkModes } from './workspace/use-work-modes';
import { ShareButton } from './workspace/share-dialog';

export function Workspace({
  authConfigured,
  accountKey,
  desktopPreview = false,
}: {
  authConfigured: boolean;
  accountKey?: string;
  desktopPreview?: boolean;
}) {
  const w = useWorkspaceState({ authConfigured, accountKey, desktopPreview });
  return <WorkspaceContent w={w} />;
}

type ReportSelection = {scope: WorkScope; openId: number; revision?: SavedReportRevision};
function WorkspaceContent({w}: {w: WorkspaceState}) {
  const [reportSelection, setReportSelection] = useState<ReportSelection | null>(null);
  const [outputOpenId, setOutputOpenId] = useState(0);
  const reportTrigger = useRef<HTMLElement | null>(null), nextReportOpenId = useRef(0);
  // Filled by WorkspacePanels, which owns the work-area actions; answers reach it through the provider.
  const reportOpener = useRef<((revision: SavedReportRevision, opener: HTMLElement | null) => void) | null>(null);
  // A failed rating is announced in the composer's status line; the bar never claims more than it knows.
  const answerFeedback = useAnswerFeedback(featureEnabled(w.capabilities, 'feedback'), w.workspaceScopeInput.taskId, w.setConnectionNotice);
  // Stable callbacks keep the provider's memoized context value from changing on every render.
  const liveW = useRef(w); liveW.current = w;
  const onOpenReport = useCallback((revision: SavedReportRevision, opener: HTMLElement | null) => reportOpener.current?.(revision, opener), []);
  const onOpen = useCallback(() => {
    const w = liveW.current;
    setOutputOpenId(value => value + 1);
    setReportSelection(null); w.closeProperties(); w.setCanvasOpen(false); w.selectWorkAreaSection('design');
  }, []);
  return <OutputWorkspaceProvider scopeKey={w.workspaceScopeInput.key} scopeInput={w.workspaceScopeInput} answerFeedback={answerFeedback} onOpenReport={onOpenReport} onOpen={onOpen}><WorkspacePanels w={w} reportSelection={reportSelection} setReportSelection={setReportSelection} reportTrigger={reportTrigger} nextReportOpenId={nextReportOpenId} reportOpener={reportOpener} outputOpenId={outputOpenId}/></OutputWorkspaceProvider>;
}

function WorkspacePanels({w, reportSelection, setReportSelection, reportTrigger, nextReportOpenId, reportOpener, outputOpenId}: {
  w: WorkspaceState; reportSelection: ReportSelection | null;
  setReportSelection: (value: ReportSelection | null) => void;
  reportTrigger: React.MutableRefObject<HTMLElement | null>; nextReportOpenId: React.MutableRefObject<number>;
  reportOpener: React.MutableRefObject<((revision: SavedReportRevision, opener: HTMLElement | null) => void) | null>;
  outputOpenId: number;
}) {
  const outputWorkspace = useOutputWorkspace();
  const deviceDialogHeading = useRef<HTMLHeadingElement>(null);
  const {scope, activeOutput, closeOutput, dismissOutput} = outputWorkspace;
  const liveScope = useRef(scope); liveScope.current = scope;
  const matches = (token: WorkScope) => token.key === liveScope.current.key && token.epoch === liveScope.current.epoch;
  const [workAreaVisibility, setWorkAreaVisibility] = useState<{key:string;epoch:number;open:boolean}|null>(null);
  const recordedConcept = w.run?.id === scope.taskId && Boolean(w.run.currentPlanRef || w.run.data.agent_design?.candidates.length);
  const automaticWorkAreaOpen = Boolean(w.hasRenderablePlan || recordedConcept || activeOutput || reportSelection && matches(reportSelection.scope) || w.canvasOpen || w.workAreaSection !== 'design' || w.studioView !== 'workspace');
  const workAreaOpen = workAreaVisibility?.key === scope.key && workAreaVisibility.epoch === scope.epoch ? workAreaVisibility.open : automaticWorkAreaOpen;
  const setWorkAreaOpen = (open: boolean) => { if (matches(scope)) setWorkAreaVisibility({key: scope.key, epoch: scope.epoch, open}); };
  useEffect(() => { if (outputOpenId > 0) setWorkAreaOpen(true); }, [outputOpenId]);
  const report = reportSelection && matches(reportSelection.scope) ? reportSelection : null;
  const liveReport = useRef(report); liveReport.current = report;
  const [reportRecord, setReportRecord] = useState<{scope: WorkScope; openId: number; value: ReviewReport | null} | null>(null);
  const parsedReport = reportRecord && report && matches(reportRecord.scope) && reportRecord.openId === report.openId ? reportRecord.value : null;
  const onReport = useCallback((token: WorkScope, value: ReviewReport | null) => {
    const current = liveReport.current;
    if (!current || !matches(token) || current.openId !== report?.openId || current.scope.key !== token.key || current.scope.epoch !== token.epoch) return;
    setReportRecord({scope: token, openId: current.openId, value});
  }, [scope.key, scope.epoch, report?.openId]);
  const [assetNotice, setAssetNotice] = useState<{scope: WorkScope; text: string} | null>(null);
  const scopedRun = w.run?.id === scope.taskId ? w.run : null;
  const modes = useWorkModes({scopeKey: scope.key, run: scopedRun, section: w.workAreaSection, previewActive: Boolean(activeOutput || report)});
  const activeDrawingTitle = w.activeDrawing ? drawingTitle(w.activeDrawing,scopedRun?.data.agent_design?.candidates) : 'Drawing';
  // The new-chat project and sidebar filter are not proof of this task's project.
  const contextProject = scopedRun?.projectId ? w.projects.find(project => project.id === scopedRun.projectId) ?? null : !scope.taskId ? w.currentProject ?? null : null;
  const amendBriefDraft = () => {
    if (!matches(scope) || !scopedRun || !w.prepareBriefUpdate()) return false;
    w.setStudioView('workspace'); w.setWorkspacePane('chat');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!matches(scope)) return;
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();
    }));
    return true;
  };
  const useProjectBriefDraft = (text: string) => {
    if (!matches(scope) || w.busy || w.executing || !contextProject) return false;
    const result = w.prepareProjectBriefReference(text);
    if (result !== true) return result;
    w.setStudioView('workspace');
    w.setWorkspacePane('chat');
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (matches(scope)) document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();
    }));
    return true;
  };
  const bound = <T,>(value: T): Bound<T> => ({value, accountKey: scope.accountKey, taskId: scope.taskId, sourceKey: scope.sourceKey});
  const samePlan = (a: {planId: string; version: number; fingerprint: string} | null | undefined, b: {planId: string; version: number; fingerprint: string} | null | undefined) => Boolean(a && b && a.planId === b.planId && a.version === b.version && a.fingerprint === b.fingerprint);
  const drawingInputs: Bound<SavedDrawingInput>[] = [];
  for (const plan of scopedRun?.data.agent_design?.candidates ?? []) drawingInputs.push(bound({plan, current: samePlan(plan, scopedRun?.currentPlanRef), briefId: scopedRun?.data.agent_design?.briefId}));
  if (scopedRun?.currentPlanRef) drawingInputs.push(bound({plan: scopedRun.currentPlanRef, current: true}));
  if (scopedRun && w.activeDrawing) drawingInputs.push(bound({plan: w.activeDrawing, current: samePlan(w.activeDrawing, scopedRun.currentPlanRef)}));
  const assetRows = projectWorkspaceAssets({
    scope, snapshotTaskId: scopedRun?.id ?? null, drawings: drawingInputs,
    loadedDrawing: scopedRun && w.activeDrawing ? bound(w.activeDrawing) : null,
    answers: outputWorkspace.outputs.map(bound),
    report: scopedRun ? bound({supported: w.runtimeConfig?.supportedExports ? w.runtimeConfig.supportedExports.includes('report-json') : undefined, report: parsedReport}) : null,
    savedAttachmentIds: (scopedRun?.conversation ?? []).flatMap(turn => (turn.attachmentIds ?? []).map(bound)),
    savedSources: scopedRun ? w.savedSources.map(bound) : [],
    specialists: (scopedRun?.data.agent_specialists ?? []).flatMap(result => result.artifactRefs.map(ref => bound({role: result.role, status: result.status, ref}))),
    draftSources: w.sources.map(value => ({value, accountKey: scope.accountKey, taskId: null, sourceKey: scope.sourceKey})),
  });
  const liveAssets = useRef({scope, rows: assetRows}); liveAssets.current = {scope, rows: assetRows};
  const reportOpen = Boolean(report);
  const preview: WorkAreaPreview = activeOutput ? {kind:'answer-output',scope,outputId:activeOutput.id} : report && scope.taskId ? {kind:'saved-report',scope,taskId:scope.taskId,openId:report.openId,...report.revision} : {kind:'drawing',scope};
  const restoreFocus = (token: WorkScope, opener: HTMLElement | null) => requestAnimationFrame(() => {
    if (!matches(token)) return;
    if (opener?.isConnected && opener.getClientRects().length && getComputedStyle(opener).visibility !== 'hidden') opener.focus();
    else document.querySelector<HTMLElement>('[data-output-focus-fallback]')?.focus();
  });
  const closeReport = () => { if (!matches(scope)) return; liveReport.current=null; setReportSelection(null); setReportRecord(null); restoreFocus(scope, reportTrigger.current); };
  const showWorkArea = () => {
    setWorkAreaOpen(true);
    if (!w.effectiveLayout.split && document.activeElement instanceof HTMLElement && document.activeElement.closest('#workspace-chat')) {
      const token = scope;
      requestAnimationFrame(() => {
        if (!matches(token) || document.getElementById('datumm-workspace')?.classList.contains('studio-drawing-focused')) return;
        const tab = document.querySelector<HTMLElement>('[data-mode-switch] [aria-checked="true"]');
        if (tab?.getClientRects().length && !tab.closest('[hidden],[inert]')) tab.focus();
      });
    }
  };
  const actions: WorkAreaActions = {
    selectSection(section) { if (!matches(scope)) return; showWorkArea(); w.selectWorkAreaSection(section); },
    openProperties() { if (!matches(scope)) return; showWorkArea(); dismissOutput(); setReportSelection(null); modes.setMode('design'); w.openProperties(); },
    closeProperties() { if (!matches(scope)) return; const focused=document.activeElement; if(focused instanceof HTMLElement&&focused.closest('[aria-label="Drawing properties"]')) document.querySelector<HTMLElement>('[data-output-focus-fallback]')?.focus(); w.closeProperties(); },
    openDrawing() { if (!matches(scope)) return; showWorkArea(); dismissOutput(); setReportSelection(null); modes.setMode('design'); w.selectWorkAreaSection('design'); },
    openReview() { if (!matches(scope)) return; showWorkArea(); dismissOutput(); setReportSelection(null); w.closeProperties(); w.setCanvasOpen(false); w.selectWorkAreaSection('design'); modes.setMode('review'); },
    openAnswerOutput(id, opener) { if (!matches(scope)) return; showWorkArea(); outputWorkspace.openOutput(id, opener); },
    openSavedReport(opener, revision) {
      if (!matches(scope) || !scope.taskId || !w.run || w.runtimeConfig?.supportedExports && !w.runtimeConfig.supportedExports.includes('report-json')) return;
      showWorkArea(); reportTrigger.current=opener??(document.activeElement instanceof HTMLElement?document.activeElement:null);
      dismissOutput(); w.closeProperties(); w.selectWorkAreaSection('design');
      w.setCanvasOpen(false); setReportRecord(null);
      setReportSelection({scope,openId:++nextReportOpenId.current,revision});
    },
    closePreview() { if (!matches(scope)) return; if(activeOutput)closeOutput(); else if(report)closeReport(); },
    returnToDrawing() { if (!matches(scope)) return; showWorkArea(); if(activeOutput)closeOutput(); else if(report)closeReport(); modes.setMode('design'); w.selectWorkAreaSection('design'); },
    focusReview(selector) { if(matches(scope))w.focusReview(selector); },
  };
  const activateAsset = (row: AssetRow, opener: HTMLElement | null) => {
    if (!matches(row.scope) || liveAssets.current.scope.key !== row.scope.key || liveAssets.current.scope.epoch !== row.scope.epoch) return;
    const current = liveAssets.current.rows.find(item => item.id === row.id);
    if (!current) return;
    setAssetNotice(null);
    const destination = current.destination;
    if (destination.kind === 'drawing') actions.openDrawing(opener);
    else if (destination.kind === 'saved-source') { w.setSelectedSourceId(destination.sourceId); actions.openDrawing(opener); }
    else if (destination.kind === 'answer-output') actions.openAnswerOutput(destination.outputId, opener);
    else if (destination.kind === 'saved-report') actions.openSavedReport(opener, destination.revisionId && destination.contentHash ? {revisionId: destination.revisionId, contentHash: destination.contentHash} : undefined);
    else if (destination.kind === 'specialist-download') {
      if (destination.taskId !== scope.taskId || !/^[a-f0-9]{64}$/.test(destination.sha256)) return;
      const anchor=document.createElement('a'); anchor.href=`/api/service/tasks/${encodeURIComponent(destination.taskId)}/specialist-artifacts/${destination.sha256}`; anchor.download='evidence-report.json'; anchor.click();
    } else setAssetNotice({scope, text: destination.reason});
  };
  reportOpener.current = (revision, opener) => actions.openSavedReport(opener, revision);
  const taskRetry = useRef<WorkScope | null>(null);
  const [taskRetryScope, setTaskRetryScope] = useState<WorkScope | null>(null);
  const retrySelectedTask = async () => {
    const taskId=scope.taskId;
    if (!taskId || scopedRun || taskRetry.current && matches(taskRetry.current)) return;
    const token=scope; taskRetry.current=token; setTaskRetryScope(token); w.setError('');
    try {
      const value=await api<Run>(`tasks/${encodeURIComponent(taskId)}`);
      if (!matches(token)) return;
      if (value.id !== taskId) throw Error('The saved task response did not match this workspace. Retry the task.');
      w.setRun(value); w.setMode(value.mode); w.setModel(value.model); w.setReasoningEffort(value.reasoningEffort ?? 'high');
    } catch (failure) { if (matches(token)) w.setError((failure as Error).message); }
    finally { if (taskRetry.current === token) taskRetry.current=null; if (matches(token)) setTaskRetryScope(null); }
  };
  const onSelectAlternative = async(selection: AlternativeSelection) => { if(matches(selection.scope)) await w.selectAlternative(selection); };
  const focusSnapshot = useRef<{scope: WorkScope; section: typeof w.workAreaSection; preview: WorkAreaPreview; properties: boolean; opener: HTMLElement | null; widths: typeof w.panelWidths; pane: typeof w.workspacePane} | null>(null);
  const enterFocus = (opener: HTMLElement) => {
    setWorkAreaOpen(true);
    focusSnapshot.current={scope,section:w.workAreaSection,preview,properties:w.propertiesOpen,opener,widths:w.panelWidths,pane:w.workspacePane};
    w.closeProperties(); w.selectWorkAreaSection('design'); w.setCanvasOpen(true);
    requestAnimationFrame(()=>{if(matches(scope))document.querySelector<HTMLElement>('button[aria-label="Exit focus drawing"]')?.focus();});
  };
  const exitFocus = () => {
    const saved=focusSnapshot.current; w.setCanvasOpen(false);
    if(saved&&matches(saved.scope)){
      w.selectWorkAreaSection(saved.section); if(saved.properties)w.openProperties(); w.setWorkspacePane(saved.pane);
      const previous=saved.preview;
      if(previous.kind==='answer-output'&&!outputWorkspace.outputs.some(item=>item.id===previous.outputId))actions.openDrawing();
      restoreFocus(scope,saved.opener);
    } else {actions.openDrawing();restoreFocus(scope,null);}
    focusSnapshot.current=null;
  };
  const {workspacePane, setWorkspacePane, resizePanel} = w;
  const {authConfigured, desktopPreview} = w;
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
    toggleLeft,
    currentProject,
    buildUnavailable,
    deviceId,
    selectRun,
    refresh,
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
    setDesignHighlights,
    setSelectedDesignElement,
    selectedSource,
    askFromCanvas,
    
    liveRuntime,
    previewLabel,
    previewSvg,
    executing,
    mode,
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
    offlineFixture,
    
    models,
    projectContextOpen,
    localConnections,
    setLocalConnections,
  } = w;
  const navigation = useRef<HTMLDivElement | null>(null);
  const [navigationNarrow, setNavigationNarrow] = useState(false);
  const [designSideTab, setDesignSideTab] = useState<DesignSideTab>('details');
  useEffect(() => {
    const media = window.matchMedia('(max-width:899px)');
    const update = () => setNavigationNarrow(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!navigationNarrow || !left || settingsOpen || canvasOpen) return;
    const shell = navigation.current;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => shell?.querySelector<HTMLButtonElement>('[aria-label="Collapse navigation"]')?.focus());
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || event.defaultPrevented || Array.from(document.querySelectorAll('[role="dialog"],[role="menu"]')).some(element => element !== shell && element.getClientRects().length > 0)) return;
      const controls = Array.from(shell?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),[tabindex="0"]') ?? [])
        .filter(element => element.getClientRects().length > 0 && !element.closest('[hidden],[inert]'));
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || !shell?.contains(document.activeElement))) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !shell?.contains(document.activeElement))) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      cancelAnimationFrame(frame); document.removeEventListener('keydown', trap);
      requestAnimationFrame(() => {
        const focused = document.activeElement;
        if ((focused === document.body || shell?.contains(focused)) && opener?.isConnected && opener.getClientRects().length) opener.focus();
      });
    };
  }, [navigationNarrow, left, settingsOpen, canvasOpen]);
  useEffect(() => {
    if (!canvasOpen) return;
    const token=scope;
    const escape = (event: KeyboardEvent) => {
      if (!matches(token)||event.key !== 'Escape' || event.defaultPrevented || event.target instanceof HTMLElement && event.target.closest('select,[role="combobox"]') || Array.from(document.querySelectorAll('[role="dialog"],[role="menu"]')).some(element => element.getClientRects().length > 0)) return;
      event.preventDefault(); exitFocus();
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [canvasOpen, scope.key, scope.epoch]);
  useLayoutEffect(() => {
    const focused=document.activeElement;
    if(focused instanceof HTMLElement&&focused.isConnected&&!focused.getClientRects().length)document.querySelector<HTMLElement>(`.studio-pane-switch button[data-pane="${workspacePane}"]`)?.focus();
  }, [workspacePane, w.effectiveLayout.split, canvasOpen, settingsOpen]);
  w.workAreaView.current = {open: workAreaOpen, preview: preview.kind};
  // Agent display actions reach the view only through the existing setters passed here.
  const displayActions = useDisplayActions({
    enabled: featureEnabled(w.capabilities, 'displayActions'),
    scopeNow: w.displayScope,
    liveScope: (...args) => liveScopeFor(w.liveSubmission.current, ...args),
    split: w.effectiveLayout.split,
    view: {section: w.workAreaSection, workAreaOpen: workAreaVisibility?.key === scope.key && workAreaVisibility.epoch === scope.epoch ? workAreaVisibility.open : null, workspacePane: w.workspacePane},
    composerEmpty: w.prompt === '',
    openSection: section => actions.selectSection(section),
    restoreView: fields => {
      if (!matches(scope)) return;
      if (fields.section !== undefined) w.selectWorkAreaSection(fields.section);
      if (fields.workAreaOpen !== undefined) setWorkAreaVisibility(fields.workAreaOpen === null ? null : {key: scope.key, epoch: scope.epoch, open: fields.workAreaOpen});
      if (fields.workspacePane !== undefined) w.setWorkspacePane(fields.workspacePane);
    },
  });
  // A sent prompt, queued prompt or question answer retires the suggestion it may have followed.
  const conversationPanel = <ConversationPanel {...w} openCanvas={trigger=>enterFocus(trigger)} workAreaActions={actions} displayActions={displayActions} reviewGate={{locked: modes.reviewLocked}}
    submit={(...args: Parameters<typeof w.submit>) => { displayActions.dismissPlaceholder(); return w.submit(...args); }}
    replyToQuestion={(...args: Parameters<typeof w.replyToQuestion>) => { displayActions.dismissPlaceholder(); return w.replyToQuestion(...args); }} />;
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
          <strong>Units</strong>
          <small>Measurements and dimensions use the current geometry units.</small>
        </span>
        <select aria-label="Measurement units" value="mm" disabled>
          <option value="mm">Millimetres</option>
        </select>
      </label>
      <div className="setting-row"><span><strong>Unsent drafts</strong><small>While signed in, text drafts are saved on this browser for up to 7 days. Uploads are not saved with drafts. Very long drafts and text containing credentials stay in memory for the current visit.</small></span></div>
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
  // Findings ride on the plan-version response, so use the fetched version when it is the drawing on screen.
  const sameDrawing = Boolean(activeDrawing && designVersion && activeDrawing.planId === designVersion.planId && activeDrawing.version === designVersion.version && activeDrawing.fingerprint === designVersion.fingerprint);
  const checksSource = activeDrawing?.findings ?? (sameDrawing ? designVersion?.findings : undefined);
  const planChecks = parseFindings(checksSource);
  const showCheckKeys = (keys: string[]) => { setDesignHighlights(keys); if (keys.length) actions.openDrawing(); };
  const checksNode = activeDrawing ? <ChecksReport findings={checksSource} loading={drawingLoading} roomNames={Object.fromEntries(activeDrawing.graph.rooms.map(room => [room.key, room.name]))} activeKeys={designHighlights} onShow={showCheckKeys} onRetry={() => setDrawingRetry(value => value + 1)}/> : <p>Open a plan to see its checks.</p>;
  return (
    <>
      {desktopAvailable && <DesktopTitlebar
        settingsOpen={settingsOpen}
        leftWidth={panelWidths.left}
        nativeAvailable={desktopAvailable}
        onSettings={() => changeSettingsOpen(true)}
        left={left}
        onToggleLeft={toggleLeft}
        title={run?.title ?? 'New chat'}
        project={currentProject?.title}
        options={
          <>
          <ShareButton key={JSON.stringify([scope.key,scope.epoch])} taskId={run?.id} />
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
                  actions.openProperties();
                  void refresh();
                }}
              />
              {chatOptions}
            </div>
          </details>
          </>
        }
      />}
      <div
        id="datumm-workspace"
        data-workspace-scene={w.scene}
        className={cn(
          'workspace',
          'desktop-workspace',
          'studio-stable-layout',
          canvasOpen && 'studio-drawing-focused',
          settingsOpen && 'studio-settings-open',
          !workAreaOpen && 'studio-workarea-closed',
          studioView !== 'workspace' && 'studio-secondary-view',
          !left && 'left-closed',
          `studio-scene-${w.scene}`,
          w.effectiveLayout.split ? 'studio-split' : 'studio-single',
          viewportReady && 'viewport-ready',
          `studio-pane-${workspacePane}`,
        )}
        style={
          {
            '--left-panel-width': `${panelWidths.left}px`,
            '--right-panel-width': `${panelWidths.right}px`,
            '--chat-panel-width': `${panelWidths.right}px`,
            height: desktopAvailable ? undefined : '100dvh',
            marginTop: desktopAvailable ? undefined : 0,
          } as React.CSSProperties
        }
      >
        {!desktopAvailable&&!left&&!settingsOpen&&!canvasOpen&&<button type="button" className="studio-web-menu-trigger" aria-label="Open workspace navigation" aria-controls="workspace-navigation" aria-expanded={false} onClick={toggleLeft}><PanelLeft size={16} strokeWidth={1.9} aria-hidden="true"/></button>}
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

        {navigationNarrow && left && !settingsOpen && !canvasOpen && <button type="button" className="sidebar-backdrop" aria-label="Close workspace navigation" onClick={() => { w.setLeft(false); requestAnimationFrame(() => { if (matches(scope)) document.querySelector<HTMLButtonElement>('[aria-label="Open workspace navigation"]')?.focus(); }); }} />}
        <div id="workspace-navigation" ref={navigation} className="studio-navigation-shell"
          role={navigationNarrow && left && !settingsOpen && !canvasOpen ? 'dialog' : undefined}
          aria-modal={navigationNarrow && left && !settingsOpen && !canvasOpen ? true : undefined}
          aria-label="Workspace navigation" inert={navigationNarrow && !left || canvasOpen}>
          <Sidebar {...w} scope={scope} externalBackdrop openStudioView={view => { setWorkAreaOpen(true); w.openStudioView(view); }} />
          {left && !navigationNarrow && !settingsOpen && !canvasOpen && <PanelResize side="left" label="navigation" width={panelWidths.left} onChange={value => resizePanel('left', value)} />}
        </div>
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
                  <small>{designVersion.svg.includes('data-renderer="dimensioned-v1"') ? 'Saved vector room areas include a wall allowance; they are not clear areas.' : 'Saved vector room area basis is not specified.'}</small>
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
                {!runId&&studioView!=='workspace'&&w.workAreaSection!=='activity'
                  ? ({design:'Design',assets:'Files',exports:'Exports',activity:'Activity'}[w.workAreaSection])
                  : studioView === 'activity'
                  ? 'Activity'
                  : studioView === 'schedules'
                    ? 'Scheduled tasks'
                    : (run?.title ?? 'New chat')}
              </h1>
              <p>
                {!runId&&studioView!=='workspace'&&w.workAreaSection!=='activity'
                  ? 'Files and exports from your chats'
                  : studioView === 'workspace'
                  ? (currentProject?.title ?? 'Architectural workspace') +
                    (activeDrawing ? ` · Proposed design · Version ${activeDrawing.version}` : ' · Your next idea starts here')
                  : studioView === 'activity'
                    ? 'Saved chats, the tools they used and their results'
                    : 'Scheduling capabilities'}
              </p>
            </div>
          </div>
          {!workAreaOpen && w.effectiveLayout.split && !canvasOpen && <button type="button" className="studio-workarea-toggle" aria-label="Open work area" title="Open work area" aria-controls="workspace-drawing" aria-expanded={false}
            onClick={() => { setWorkAreaOpen(true); requestAnimationFrame(() => { if (matches(scope)) document.querySelector<HTMLButtonElement>('[aria-label="Close work area"]')?.focus(); }); }}><WorkAreaOpenIcon size={17} aria-hidden="true" /></button>}
        </header>
        <div className="studio-pane-switch" role="group" aria-label="Workspace panes">
          <button type="button" data-pane="chat" aria-pressed={workspacePane === 'chat'} onClick={event => {event.currentTarget.focus();setCanvasOpen(false);setStudioView('workspace');setWorkspacePane('chat');}}><MessageSquare size={15}/>Chat</button>
          <button type="button" data-pane="drawing" aria-pressed={workspacePane === 'drawing' && modes.mode === 'design'} onClick={event => {event.currentTarget.focus();setWorkAreaOpen(true);setWorkspacePane('drawing');modes.setMode('design');}}><PencilRuler size={15}/>Design</button>
          <button type="button" data-pane="review" disabled={!scopedRun} aria-pressed={workspacePane === 'drawing' && modes.mode === 'review'} onClick={event => {event.currentTarget.focus();actions.openReview();}}><ClipboardCheck size={15}/>Review</button>
          <button type="button" data-details-button aria-label="Details" aria-haspopup="dialog" aria-expanded={modes.drawerOpen} onClick={() => actions.selectSection('activity')}><Info size={15}/></button>
        </div>
        <section id="workspace-chat" className="studio-chat-column studio-assistant-panel" aria-label="Chat" inert={settingsOpen||canvasOpen||!w.effectiveLayout.split&&workspacePane==='drawing'&&w.hasContent}>
          {w.scene==='task-loading'&&(w.error||taskRetryScope&&matches(taskRetryScope))&&<div className="error-banner" role={w.error?'alert':'status'}><p>{w.error||'Loading the saved task…'}</p><Button variant="secondary" disabled={Boolean(taskRetryScope&&matches(taskRetryScope))} onClick={()=>void retrySelectedTask()}>Retry saved task</Button><Button variant="ghost" onClick={()=>newTask()}>New chat</Button></div>}
          {conversationPanel}
          {workAreaOpen && <PanelResize side="right" label="chat and work area" direction="forward" width={panelWidths.right} maxWidth={w.effectiveLayout.chatMaxWidth} onChange={value => resizePanel('right', value)} />}
        </section>
        <section id="workspace-drawing" className="studio-stage" aria-label="Architectural workspace" inert={settingsOpen||!canvasOpen&&(!workAreaOpen&&w.effectiveLayout.split||!w.hasContent&&studioView==='workspace'||!w.effectiveLayout.split&&workspacePane==='chat')}>
          <Inspector scope={scope} section={w.workAreaSection} mode={canvasOpen ? 'design' : modes.mode} preview={canvasOpen?{kind:'drawing',scope}:preview} propertiesOpen={w.propertiesOpen} actions={actions}
            headerLead={w.effectiveLayout.split && studioView === 'workspace' ? <ModeSwitch mode={modes.mode} onMode={mode => mode === 'review' ? actions.openReview() : actions.openDrawing()} reviewDisabled={!scopedRun} detailsOpen={modes.drawerOpen} onDetails={() => actions.selectSection('activity')}/> : undefined}
            headerAction={w.effectiveLayout.split && !canvasOpen ? <button type="button" className="studio-workarea-toggle" aria-label="Close work area" title="Close work area" aria-controls="workspace-drawing" aria-expanded={true}
              onClick={() => { setWorkAreaOpen(false); requestAnimationFrame(() => { if (matches(scope)) document.querySelector<HTMLButtonElement>('[aria-label="Open work area"]')?.focus(); }); }}><WorkAreaCloseIcon size={17} aria-hidden="true" /></button> : undefined}
            slots={{
            design: <>
              <div className="studio-workarea-toolbar">
                <button type="button" data-output-focus-fallback aria-pressed={canvasOpen||preview.kind==='drawing'} title={activeDrawing ? activeDrawingTitle : undefined} onClick={() => actions.openDrawing()}><PencilRuler size={15}/>Drawing{activeDrawing ? ` · Version ${activeDrawing.version}` : ''}</button>
                <span className="studio-workarea-tools"/>
                <button type="button" aria-label="Open properties" onClick={()=>{setDesignSideTab('details');actions.openProperties();}}><PanelRight size={15}/><span>Properties</span></button>
                <button type="button" aria-label="Open plan checks" onClick={()=>{setDesignSideTab('checks');actions.openProperties();}}><ListChecks size={15}/><span>Checks</span></button>
                <button type="button" aria-label={canvasOpen ? 'Exit focus drawing' : 'Focus drawing'} aria-pressed={canvasOpen} disabled={!hasRenderablePlan && !canvasOpen} onClick={event=>canvasOpen?exitFocus():enterFocus(event.currentTarget)}>{canvasOpen ? <Minimize2 size={15}/> : <Maximize2 size={15}/>}<span>{canvasOpen ? 'Exit focus' : 'Focus drawing'}</span></button>
              </div>
              <div className="studio-drawing-content">
            {activeDrawing ? (
              <PlanCanvas
                key={`${activeDrawing.planId}:${activeDrawing.version}:${activeDrawing.fingerprint}`}
                drawing={activeDrawing}
                exportOwnerKey={JSON.stringify([scope.key,scope.epoch])}
                exportLabel={w.drawingCurrent ? exactConceptName(activeDrawing, scopedRun?.data.agent_design?.candidates) : undefined}
                viewStyle={w.drawingStyle}
                label={`${activeDrawingTitle}${w.drawingCurrent?'':' · Retained reference'}`}
                selectedElement={selectedDesignElement}
                onProperties={() => actions.openProperties()}
                onStyleChange={setDrawingStyle}
                highlights={designHighlights}
                onSelectElement={setSelectedDesignElement}
                source={selectedSource?.image ? {id:selectedSource.id,sha256:selectedSource.sha256,name:selectedSource.name,image:selectedSource.image,page:selectedSource.page} : undefined}
                reference={queueData?.design?.reference}
                onAsk={askFromCanvas}
              />
            ) : previewSvg ? (
              <div className="studio-static-preview"><div className="studio-preview-label"><PencilRuler size={16}/>{previewLabel}</div><img alt={previewLabel} src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(previewSvg)}/></div>
            ) : (
              <div className="studio-empty studio-drawing-empty">
                <PencilRuler size={28}/>
                <h2>{drawingLoading ? 'Loading your drawing…' : drawingError ? 'Drawing unavailable' : 'Room for your next idea'}</h2>
                <p>{drawingError || (drawingLoading ? 'Your conversation stays available while the saved design loads.' : 'Ask DATUMM to plan a space. Review its proposed drawing here, then add selections or comments to your message.')}</p>
                {drawingError && <Button variant="secondary" onClick={() => setDrawingRetry(value => value + 1)}>Retry drawing</Button>}
              </div>
            )}

              </div>
            </>,
            assetPreview: <>
              <div className="studio-preview-output" hidden={!activeOutput} inert={!activeOutput}><OutputPanel/></div>
              <div className="studio-preview-output" hidden={!report} inert={!report}>{report&&scope.taskId&&<ReviewReportPanel key={JSON.stringify([scope.key,scope.epoch,report.openId])} scope={scope} taskId={scope.taskId} openId={report.openId} cited={report.revision} taskVersion={run?.taskVersion} taskStatus={run?.status} currentPlan={run?.currentPlanRef} onReport={onReport} onClose={closeReport}/>}</div>
            </>,
            properties: <DesignSidePanel tab={designSideTab} onTab={setDesignSideTab} status={planChecks?.status} details={<><BriefChips run={run}/>{activeDrawing?<StudioProperties drawing={activeDrawing} selected={selectedDesignElement} onSelect={setSelectedDesignElement} onRequest={askFromCanvas} onReview={!hasRenderablePlan||(run?.mode??mode)==='ask'?undefined:()=>actions.focusReview('[aria-label="Validated design preview"]')}/>:<div className="inspector-body"><h3>{w.contextTitle}</h3><p>{w.contextView}</p>{!selectedDevice?.online&&<Button variant="secondary" onClick={()=>setDeviceDialog(true)}>Connect Revit</Button>}</div>}{activeDrawing&&activeDrawing===w.designVersion&&w.planEdit.visible&&<PlanEditPanel drawing={activeDrawing} selected={selectedDesignElement} edit={w.planEdit}/>}<PlanDetails {...w} scope={scope} surface="design" onSelectAlternative={onSelectAlternative}/></>} checks={checksNode}/>,
            review: <ReviewScreen w={w} scope={scope} version={modes.version} locked={modes.reviewLocked} checks={checksNode} actions={actions}/>,
            technical: <TechnicalDetails run={scopedRun}/>,
            page: studioView === 'workspace' ? null : <>{studioView === 'activity' ? (
            <div className="studio-page" tabIndex={-1}>
              <div className="studio-page-heading">
                <div>
                  <h2>Your workspace, in motion</h2>
                  <p>Open a run to inspect its conversation, tools and recorded result.</p>
                </div>
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
                <aside className={activityStyles.detail} aria-label="Selected activity details">
                  {activityRun && activityView ? (
                    <>
                      <ActivityPanel key={activityRun.id} run={activityRun} runId={activityRun.id} currentActivity={activityView} executing={activityView.active} mode={activityRun.mode} model={activityRun.model} eventDetail={event => event.detail} />
                      <Button
                        variant="secondary"
                        disabled={mediaBusy || actionBusy}
                        onClick={() => selectRun(activityRun)}
                      >
                        Open chat
                        <ArrowUpRight size={14} />
                      </Button>
                    </>
                  ) : (
                    <p className={activityStyles.empty}>Select a task to inspect its recorded work.</p>
                  )}
                </aside>
              </div>
            </div>
          ) : studioView === 'schedules' ? (
            <div className="studio-page" tabIndex={-1}>
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
          ) : null }</>,
            activity: <><ActivityPanel key={scope.key} run={run} runId={runId} currentActivity={w.currentActivity} executing={executing} mode={mode} model={w.model} eventDetail={w.eventDetail}/><details className="studio-diagnostics"><summary>Tool diagnostics</summary>{w.mcpToolsError?<p>{w.mcpToolsError}</p>:w.mcpTools.length?w.mcpTools.map(tool=><details key={tool.name}><summary>{tool.name}</summary><p>{tool.description??'No description was provided by the bridge.'}</p><pre>{JSON.stringify(tool.inputSchema,null,2)}</pre></details>):<p>No tool catalog is available.</p>}<Button variant="secondary" onClick={()=>void refresh()}>Refresh tools</Button></details></>,
            assets: <>{assetNotice&&matches(assetNotice.scope)&&<p role="status">{assetNotice.text}</p>}{w.selectionUncertain&&<p role="status">Confirm the saved selection in Design → Properties before choosing another concept.</p>}<AssetsPanel rows={assetRows} onActivate={activateAsset} onSelectAlternative={onSelectAlternative} selectionBusy={Boolean(w.busy||w.actionBusy||w.selectionUncertain)}/></>,
            exports: <ExportsPanel workspace={w} scope={scope} outputs={outputWorkspace.outputs} report={parsedReport} actions={actions}/>,
          }}/>

        </section>


        <Dialog open={deviceDialog} onOpenChange={setDeviceDialog}>
          <DialogContent className="device-dialog" onOpenAutoFocus={event=>{if(deviceDialogHeading.current){event.preventDefault();deviceDialogHeading.current.focus();}}} onCloseAutoFocus={restoreDialogFocus}>
            <DialogHeader>
              <DialogTitle ref={deviceDialogHeading} tabIndex={-1}>Connect your workspace</DialogTitle>
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
          sectionRequest={w.settingsTarget}
          onOpenChange={changeSettingsOpen}
          authConfigured={authConfigured}
          approvalModes={featureEnabled(w.capabilities, 'approvalModes')}
          models={models}
          taskTitle={run?.title}
          usageContent={run?.data.usage && run.data.usage.rootTaskId === run.id && (run.data.usage.scope === 'execution_ledger' ? run.data.usage.ownerTaskId === run.id && Boolean(run.data.usage.ledgerExecutionId) : !run.data.usage.ownerTaskId || run.data.usage.ownerTaskId === run.id) ? <ContextUsage usage={run?.data.usage}/> : undefined}
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
        <ProjectContext open={projectContextOpen} onOpenChange={setProjectContextOpen} run={scopedRun} selectedTaskId={scope.taskId} project={contextProject} accountKey={scope.accountKey} onUseBrief={useProjectBriefDraft} onAmendDraft={amendBriefDraft} />
      </div>
      <Dialog open={localConnections} onOpenChange={setLocalConnections}>
        <DialogContent onCloseAutoFocus={restoreDialogFocus}>
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
