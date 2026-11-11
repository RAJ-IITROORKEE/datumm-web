import { DesignReview, type DesignRecord } from '../design-review';
import { NativeBuildReview } from '../native-build-review';
import { cn } from '@/lib/utils';
import { Conversation, ConversationContent, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { PromptContent } from '../prompt-content';
import { AgentActivity } from '../agent-activity';
import { SavedTurnResult } from '../saved-turn-result';
import { PlanningGoalPanel } from '../planning-goal';
import { OpenCodeQuestions } from '../opencode-questions';
import { Button } from '@/components/ui/button';
import { BuildComparisonCard } from '../build-comparison';
import { ShieldCheck, Loader2, ArrowUpRight, Expand, Check } from 'lucide-react';
import { AgentQuestions } from '../agent-questions';
import { PlanCanvas } from '../plan-canvas';
import { AgentScheduler } from '../agent-scheduler';
import { EvidenceResults } from '../evidence-results';
import { AgentSpecialists } from '../agent-specialists';
import { DraftAssessmentDetails } from '../draft-assessment';
import { AgentLimit } from '../agent-memory';
import { TaskOutcome } from '../task-outcome';
import { Composer } from './composer';
import {
  type WorkspaceState,
  api,
  type Run,
  terminal,
  completedDraftTitle,
  reviewCriteria,
  taskStepCompleted,
} from './use-workspace-state';

function recoveryGuidance(action?: string) {
  const guidance: Record<string, string> = {
    review_progress: 'Review the saved task progress before retrying.',
    narrow_scope: 'Narrow the request, then start a focused task.',
    clarify_request: 'Clarify the missing or repeated input before retrying.',
    retry_read: 'Refresh the model read and review its coverage.',
    refresh_evidence: 'Refresh current model evidence before continuing.',
    start_fresh_task: 'Start a new task against the intended Revit document.',
    review_plan: 'Review the current concept version before building.',
    prepare_new_proposal: 'Prepare and review a new exact proposal.',
    check_operation: 'Check the original Revit operation status before any further build.',
    retry_after_connection: 'Check the Revit device and active session, then retry.',
    revise_scope: 'Revise the request to fit the supported scope.',
    check_connection: 'Check the Revit device and active session.',
    contact_support: 'Contact the administrator to check task allowance configuration.',
    none: 'No further action is required.',
  };
  return action ? guidance[action] : undefined;
}

function Mark({ large = false }: { large?: boolean }) {
  return <img className={cn('brand-mark', large && 'large')} src="/datumm-mark.png" alt="" aria-hidden="true" />;
}

function BriefCard(props: Pick<WorkspaceState, 'run'>) {
  const { run } = props;
  return (
    run?.data.agent_interpreted_brief && (
      <div className="saved-plan-card" aria-label="Interpreted brief">
        <div className="section-caption">
          YOUR BRIEF
          <span>{run.data.agent_interpreted_brief.status === 'fallback' ? 'Literal fallback' : 'Source checked'}</span>
        </div>
        <div className="plan-facts">
          {run.data.agent_interpreted_brief.dimensions.map((d, i) => (
            <span key={i}>
              {d.role === 'unknown' ? 'Scope unconfirmed' : d.role} · {d.sourceText}
              {d.widthMm && d.depthMm ? ` = ${d.widthMm} × ${d.depthMm} mm` : ' · units unconfirmed'}
            </span>
          ))}
        </div>
        {Object.entries(run.data.agent_interpreted_brief.values)
          .filter(([key]) => ['bedrooms', 'guestRooms', 'bathrooms', 'entry', 'jurisdiction'].includes(key))
          .map(([key, fact]) => (
            <p key={key}>
              {key.replace('guestRooms', 'Guest rooms')}: {String(fact.value)} · {fact.provenance}
            </p>
          ))}
        {run.data.agent_interpreted_brief.program.livingHall && <p>BHK program includes living/hall and kitchen.</p>}
        {run.data.agent_interpreted_brief.unresolved.length > 0 && (
          <p>
            Still to confirm:{' '}
            {run.data.agent_interpreted_brief.unresolved.map((k) => k.replaceAll('_', ' ')).join(', ')}.
          </p>
        )}
        {run.data.agent_interpreted_brief.assumptions.map((a) => (
          <p key={a}>{a}</p>
        ))}
        <small>
          Brief interpretation grants no model write authority.{' '}
          {run.data.agent_interpreted_brief.policy
            ? `Interpreter: ${run.data.agent_interpreted_brief.policy.modelId}.`
            : ''}
        </small>
      </div>
    )
  );
}

function TaskPlanCard(props: Pick<WorkspaceState, 'run'>) {
  const { run } = props;
  return (
    run?.data.agent_task_plan && (
      <div className="agent-evidence-card" aria-label="Agent task plan">
        <div className="section-caption">TASK PLAN · VERSION {run.data.agent_task_plan.version}</div>
        <strong>{run.data.agent_task_plan.goal}</strong>
        <ol>
          {run.data.agent_task_plan.steps.map((step) => (
            <li key={step.key}>
              <span>
                {taskStepCompleted(run, step) ? '✓ ' : ''}
                {step.title}
              </span>
              <details>
                <summary>Expected result</summary>
                {step.expectedResult}
              </details>
            </li>
          ))}
        </ol>
        <small>Planning does not authorize model changes.</small>
      </div>
    )
  );
}

function NoPlanGeometryCard(props: Pick<WorkspaceState, 'run'>) {
  const { run } = props;
  return (
    run &&
    !run.data.agent_design &&
    run.mode === 'plan' &&
    run.data.agent_interpreted_brief &&
    terminal.has(run.status) && (
      <div className="saved-plan-card" role="status">
        <strong>No saved plan geometry</strong>
        <p>
          {run.data.error ??
            run.data.answer ??
            'This task has not produced a valid layout. Complete the pending clarification or describe the constraint you want to change.'}
        </p>
        <Button
          variant="secondary"
          onClick={() => document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus()}
        >
          Continue this task
        </Button>
      </div>
    )
  );
}

function PartialOutcomeCard(props: Pick<WorkspaceState, 'partialGoal' | 'completedGoal' | 'run' | 'outcome'>) {
  const { partialGoal, completedGoal, run, outcome } = props;
  return (
    partialGoal &&
    run && (
      <div className="saved-plan-card" role="status" aria-label="Task goal is partially complete">
        <div className="section-caption">TASK OUTCOME · PARTIAL</div>
        <strong>{completedGoal ?? 'The requested outcome remains partially complete.'}</strong>
        <p>{run.data.agent_result?.answer ?? run.data.answer ?? 'Some requested results remain incomplete.'}</p>
        {run.data.agent_result?.assessment && (
          <DraftAssessmentDetails
            assessment={run.data.agent_result.assessment}
            batchHistory={run.data.agent_result.batchHistory}
          />
        )}
        <small>
          {outcome?.verified
            ? 'The recorded native operation is verified; the overall goal still has unmet, unsupported or unverified criteria.'
            : 'Task processing ended with an incomplete goal; review the evidence and verification limits before continuing.'}
        </small>
        {run.data.agent_result?.documentId && run.data.agent_result?.operationId && (
          <small>
            Document {run.data.agent_result.documentId.slice(0, 8)} · Operation{' '}
            {run.data.agent_result.operationId.slice(0, 8)}
          </small>
        )}
      </div>
    )
  );
}

export type ConversationPanelProps = Pick<
  WorkspaceState,
  | 'liveRuntime'
  | 'desktopPreview'
  | 'queueData'
  | 'run'
  | 'designDraftKey'
  | 'placementDrafts'
  | 'selectedSource'
  | 'desktopAvailable'
  | 'actionBusy'
  | 'executing'
  | 'setDesignHighlights'
  | 'selectedDesignElement'
  | 'setInspectedDesignFingerprint'
  | 'setRight'
  | 'setTab'
  | 'model'
  | 'askFromCanvas'
  | 'setActionBusy'
  | 'setRun'
  | 'setPrompt'
  | 'refresh'
  | 'mode'
  | 'continueDesignBuild'
  | 'devices'
  | 'setMode'
  | 'focusReview'
  | 'nativeAction'
  | 'hasContent'
  | 'reviewScroll'
  | 'messages'
  | 'traceTurns'
  | 'nativeQuestions'
  | 'savedTurns'
  | 'nativeTodos'
  | 'designTurn'
  | 'nativeTurn'
  | 'responseSummary'
  | 'planningGoalOpen'
  | 'recoveryEpoch'
  | 'busy'
  | 'savedSources'
  | 'setSelectedSourceId'
  | 'nativeContext'
  | 'nativeContextError'
  | 'commandExpected'
  | 'taskCommand'
  | 'proposalExpired'
  | 'committedBuild'
  | 'act'
  | 'dialogTrigger'
  | 'setAccessBatches'
  | 'plannedAccessBatches'
  | 'setAccessMargin'
  | 'setAccessReview'
  | 'setAccessDialog'
  | 'setError'
  | 'replyToQuestion'
  | 'outcome'
  | 'openCanvas'
  | 'selectedDevice'
  | 'buildLegacy'
  | 'reviewAlternative'
  | 'drawingLoading'
  | 'drawingError'
  | 'drawingMissing'
  | 'setDrawingRetry'
  | 'designVersion'
  | 'drawingCurrent'
  | 'compareVersion'
  | 'canvasInputEnabled'
  | 'persistentProperties'
  | 'setDrawingStyle'
  | 'compareDrawing'
  | 'setCompareVersion'
  | 'drawingStyle'
  | 'designDiff'
  | 'reviewAssumptions'
  | 'planAccepted'
  | 'acceptDrawing'
  | 'switchDrawingToBuild'
  | 'buildStep'
  | 'revitSessions'
  | 'placementTask'
  | 'confirmedPlacement'
  | 'buildVariable'
  | 'setBuildSetupOpen'
  | 'reviewPlacement'
  | 'revokeVariableGrant'
  | 'grantVariable'
  | 'previewSvg'
  | 'previewRooms'
  | 'batchInProgress'
  | 'partialGoal'
  | 'verifiedBatchCount'
  | 'verifiedCount'
  | 'verifiedBreakdown'
  | 'completedGoal'
  | 'completedCriteria'
  | 'checkpointFindings'
  | 'submit'
  | 'verifiedNativeBatches'
  | 'confirmedAnnotationFailure'
  | 'canRefreshFailedPreparation'
  | 'canEndFailedPreparation'
  | 'connected'
  | 'workspaceReady'
  | 'offlineFixture'
  | 'dismissedWorkflow'
  | 'workflowNoticeKey'
  | 'setDismissedWorkflow'
  | 'promptQueue'
  | 'prompt'
  | 'queueAction'
  | 'runtimeConfig'
  | 'changeSettingsOpen'
  | 'messageError'
  | 'blockedChat'
  | 'mediaBusy'
  | 'selectRun'
  | 'setBlockedChat'
  | 'connectionNotice'
  | 'setConnectionNotice'
  | 'useCurrentModel'
  | 'setUseCurrentModel'
  | 'setDeviceDialog'
  | 'draftReferences'
  | 'commandsOpen'
  | 'commandMatches'
  | 'commandIndex'
  | 'chooseCommand'
  | 'visiblePrompt'
  | 'setCommandIndex'
  | 'setCommandsDismissed'
  | 'sendShortcut'
  | 'sourceKey'
  | 'sources'
  | 'setSources'
  | 'setMediaBusy'
  | 'setProjectContextOpen'
  | 'buildUnavailable'
  | 'chatModels'
  | 'reasoningEffort'
  | 'modelPreferenceInitialized'
  | 'setModel'
  | 'setReasoningEffort'
  | 'queueMessage'
  | 'providerStatus'
  | 'contextView'
>;

export function ConversationPanel(props: ConversationPanelProps) {
  const {
    liveRuntime,
    desktopPreview,
    queueData,
    run,
    designDraftKey,
    placementDrafts,
    selectedSource,
    desktopAvailable,
    actionBusy,
    executing,
    setDesignHighlights,
    selectedDesignElement,
    setInspectedDesignFingerprint,
    setRight,
    setTab,
    model,
    askFromCanvas,
    setActionBusy,
    setRun,
    setPrompt,
    refresh,
    mode,
    continueDesignBuild,
    devices,
    setMode,
    focusReview,
    nativeAction,
    hasContent,
    reviewScroll,
    messages,
    traceTurns,
    nativeQuestions,
    savedTurns,
    nativeTodos,
    designTurn,
    nativeTurn,
    responseSummary,
    planningGoalOpen,
    recoveryEpoch,
    busy,
    savedSources,
    setSelectedSourceId,
    nativeContext,
    nativeContextError,
    commandExpected,
    taskCommand,
    proposalExpired,
    committedBuild,
    act,
    dialogTrigger,
    setAccessBatches,
    plannedAccessBatches,
    setAccessMargin,
    setAccessReview,
    setAccessDialog,
    setError,
    replyToQuestion,
    outcome,
    openCanvas,
    selectedDevice,
    buildLegacy,
    reviewAlternative,
    drawingLoading,
    drawingError,
    drawingMissing,
    setDrawingRetry,
    designVersion,
    drawingCurrent,
    compareVersion,
    canvasInputEnabled,
    persistentProperties,
    setDrawingStyle,
    compareDrawing,
    setCompareVersion,
    drawingStyle,
    designDiff,
    reviewAssumptions,
    planAccepted,
    acceptDrawing,
    switchDrawingToBuild,
    buildStep,
    revitSessions,
    placementTask,
    confirmedPlacement,
    buildVariable,
    setBuildSetupOpen,
    reviewPlacement,
    revokeVariableGrant,
    grantVariable,
    previewSvg,
    previewRooms,
    batchInProgress,
    partialGoal,
    verifiedBatchCount,
    verifiedCount,
    verifiedBreakdown,
    completedGoal,
    completedCriteria,
    checkpointFindings,
    submit,
    verifiedNativeBatches,
    confirmedAnnotationFailure,
    canRefreshFailedPreparation,
    canEndFailedPreparation,
    connected,
    workspaceReady,
    offlineFixture,
  } = props;
  const designReview = (liveRuntime || desktopPreview) && queueData?.design && run && (
    <DesignReview
      taskId={run.id}
      key={designDraftKey}
      draft={placementDrafts.current.get(designDraftKey)}
      onDraft={(draft) => placementDrafts.current.set(designDraftKey, draft)}
      value={queueData.design}
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
      nativeControlsAvailable={desktopAvailable}
      pending={actionBusy || executing || (desktopPreview && !liveRuntime)}
      onHighlights={setDesignHighlights}
      selectedElement={selectedDesignElement}
      onInspect={(fingerprint) => {
        setInspectedDesignFingerprint(fingerprint);
        setRight(true);
        setTab('preview');
      }}
      model={model}
      onAsk={(text) => askFromCanvas(text)}
      goalReview={
        run.data.planning_goal?.status === 'needs_review' &&
        run.data.planning_goal.acceptedInputRevision !== run.data.planning_goal.inputRevision
      }
      onReview={async (input) => {
        setActionBusy(true);
        try {
          const saved = await api<Run>('tasks/' + run.id);
          const result = await api<{ task: Run; annotation?: unknown }>(`tasks/${run.id}/design-review`, 'POST', {
            expectedTaskVersion: saved.taskVersion,
            design: input,
          });
          setRun(result.task);
          if (result.annotation) {
            const current = await api<Run>('tasks/' + run.id);
            setRun(current);
            const annotation = (current.data as { design?: DesignRecord }).design?.feedback?.at(-1);
            setPrompt(
              (previous) =>
                previous +
                (previous ? '\n' : '') +
                'Design feedback (reference only): ' +
                JSON.stringify(annotation ?? result.annotation),
            );
          }
          await refresh();
        } finally {
          setActionBusy(false);
        }
      }}
      mode={mode}
      nativeBuild={queueData.native_build}
      onBuild={continueDesignBuild}
      sessions={devices.filter((d) => d.online).map((d) => ({ id: d.id, name: d.name ?? d.id }))}
      onAction={async (action, design) => {
        if (action === 'design_build') setMode('build');
        setActionBusy(true);
        try {
          if (!window.desktop) throw new Error('Use the desktop for exact design acceptance.');
          const saved = await api<Run>(`tasks/${run.id}`);
          setRun(saved);
          const result = await window.desktop.nativeBuildAction(run.id, action, {
            expectedTaskVersion: saved.taskVersion,
            design,
          });
          if (action !== 'design_context') {
            setRun(result as Run);
            focusReview(
              action === 'design_prepare' || action === 'design_build'
                ? '[aria-label="Native build review"]'
                : action === 'design_select' && mode === 'build'
                  ? '[aria-label="Accepted design placement"]'
                  : '[aria-label="Validated design preview"]',
            );
          }
          return result;
        } catch (error) {
          try {
            setRun(await api<Run>(`tasks/${run.id}`));
          } catch {}
          throw error;
        } finally {
          setActionBusy(false);
        }
      }}
    />
  );
  const nativeReview = liveRuntime && queueData?.native_build && (
    <NativeBuildReview
      value={queueData.native_build}
      pending={actionBusy || executing}
      nativeAvailable={desktopAvailable}
      onRefresh={async () => {
        if (!run || !window.desktop) throw Error('Open DATUMM Desktop to refresh the exact proposal.');
        const row = queueData.native_build,
          old = row.design?.binding?.placement;
        setActionBusy(true);
        try {
          const saved = await api<Run>('tasks/' + run.id);
          setRun(saved);
          const current = (saved.data as any).native_build;
          if (
            !current ||
            current.state !== 'preview' ||
            current.operationId ||
            current.proposal?.proposalId !== row.proposal.proposalId ||
            current.proposal?.approvalHash !== row.proposal.approvalHash ||
            current.changes?.documentId !== row.changes.documentId ||
            current.changes?.expectedRevision !== row.changes.expectedRevision
          )
            throw Error('The saved proposal changed. Review the current native proposal before refreshing it.');
          if (row.design) {
            if (!old) throw Error('Open the accepted design placement controls to prepare a fresh measured proposal.');
            if ((saved.data as any).design?.selected !== current.design?.fingerprint)
              throw Error('The accepted design changed. Review its current version before preparing another proposal.');
            const context = (await window.desktop.nativeBuildAction(run.id, 'design_context', {
              expectedTaskVersion: saved.taskVersion,
              design: { sessionId: old.sessionId },
            })) as any;
            if (context.catalog.documentId !== old.documentId)
              throw Error('The Revit document changed. Inspect placement and review the current loaded types.');
            const { typeIds: _, ...placement } = old;
            const result = await window.desktop.nativeBuildAction(run.id, 'design_prepare', {
              expectedTaskVersion: saved.taskVersion,
              design: {
                fingerprint: current.design.fingerprint,
                placement: { ...placement, revision: context.catalog.revision },
              },
            });
            setRun(result as Run);
          } else {
            const result = await window.desktop.nativeBuildAction(run.id, 'refresh', {
              expectedTaskVersion: saved.taskVersion,
              proposal: {
                proposalId: current.proposal.proposalId,
                approvalHash: current.proposal.approvalHash,
                documentId: current.changes.documentId,
                expectedRevision: current.changes.expectedRevision,
              },
            });
            setRun(result as Run);
          }
        } catch (error) {
          try {
            setRun(await api<Run>('tasks/' + run.id));
          } catch {}
          throw error;
        } finally {
          setActionBusy(false);
        }
      }}
      onCorrection={() =>
        setPrompt(
          (previous) =>
            previous +
            (previous ? '\n' : '') +
            'Inspect the current result of native operation ' +
            queueData.native_build.operationId +
            ' and compare it with the saved exact proposal. Explain measured differences and prepare a correction for review if needed. Do not repeat the original operation or apply any correction automatically.',
        )
      }
      onAction={nativeAction}
    />
  );
  return (
    <main className="main-panel">
      <div className={cn('main-content', hasContent && 'with-messages')}>
        {!hasContent ? (
          <div className="welcome studio-welcome">
            <div className="studio-welcome-brand">
              <img src="/datumm-mark.png" alt="" />
              <span>Your architectural workspace</span>
            </div>
            <h1>What are we designing today?</h1>
            <p>Start with an idea, a drawing, or a question about your model.</p>
          </div>
        ) : (
          <Conversation className="conversation" contextRef={reviewScroll}>
            <ConversationContent className="conversation-inner">
              {run &&
                (run.conversation?.length || messages.length === 0) &&
                (run.conversation?.length ? run.conversation : [{ prompt: run.title, answer: run.data.answer }]).map(
                  (turn, index) => (
                    <div key={index} className="conversation-turn" data-conversation-index={index}>
                      {turn.prompt && (
                        <Message from="user">
                          <MessageContent>
                            <PromptContent text={turn.prompt} />
                          </MessageContent>
                        </Message>
                      )}
                      <AgentActivity
                        compact={true}
                        nativeMessages={
                          executing && index === (run.conversation?.length ?? 1) - 1
                            ? run.data.native_messages
                            : turn.nativeMessages
                        }
                        events={traceTurns[index] ?? []}
                        active={executing && index === (run.conversation?.length ?? 1) - 1}
                        waiting={nativeQuestions.length > 0}
                        mode={index === (run.conversation?.length ?? 1) - 1 ? run.mode : 'Agent'}
                        model={index === (run.conversation?.length ?? 1) - 1 ? run.model : 'Saved turn'}
                        manifest={
                          savedTurns.find((saved) => saved.conversationIndex === index)?.result?.manifest ??
                          (index === (run.conversation?.length ?? 1) - 1 ? run.data.run_manifest : undefined)
                        }
                        evidence={
                          savedTurns.find((saved) => saved.conversationIndex === index)?.result?.evidence ??
                          (index === (run.conversation?.length ?? 1) - 1 ? run.data.run_manifest?.tools : [])
                        }
                        todos={index === (run.conversation?.length ?? 1) - 1 ? nativeTodos : []}
                      />
                      {turn.answer && (
                        <Message from="assistant">
                          <div className="assistant-label">
                            <Mark /> DATUMM
                          </div>
                          <MessageContent>
                            <MessageResponse>{turn.answer}</MessageResponse>
                          </MessageContent>
                        </Message>
                      )}
                      {index === designTurn && designReview}
                      {index === nativeTurn && nativeReview}
                      {index < (run.conversation?.length ?? 1) - 1 && index !== designTurn && (
                        <SavedTurnResult
                          turn={savedTurns.find((saved) => saved.conversationIndex === index)}
                          taskId={run.id}
                          onArtifacts={() => {
                            setRight(true);
                            setTab('exports');
                          }}
                        />
                      )}
                    </div>
                  ),
                )}
              {(run?.conversation?.length ? [] : messages)
                .filter(
                  (message) =>
                    message.role !== 'assistant' ||
                    message.parts.some((part) => part.type === 'text' && part.text.trim()),
                )
                .map((message) => (
                  <Message key={message.id} from={message.role}>
                    {message.role === 'assistant' && (
                      <div className="assistant-label">
                        <Mark /> DATUMM
                      </div>
                    )}
                    <MessageContent>
                      {message.parts
                        .filter((p) => p.type === 'text')
                        .map((part, i) =>
                          message.role === 'user' ? (
                            <PromptContent key={i} text={part.text} />
                          ) : (
                            <MessageResponse key={i}>
                              {message.id === messages.at(-1)?.id && responseSummary ? responseSummary : part.text}
                            </MessageResponse>
                          ),
                        )}
                    </MessageContent>
                  </Message>
                ))}
              {run &&
                terminal.has(run.status) &&
                run.status !== 'needs_input' &&
                run.data.answer &&
                !run.conversation?.length &&
                messages.length > 0 &&
                !messages.some(
                  (message) =>
                    message.role === 'assistant' &&
                    message.parts.some((part) => part.type === 'text' && part.text.trim()),
                ) && (
                  <Message from="assistant">
                    <div className="assistant-label">
                      <Mark /> DATUMM
                    </div>
                    <MessageContent>
                      <MessageResponse>{responseSummary ?? run.data.answer}</MessageResponse>
                    </MessageContent>
                  </Message>
                )}

              {executing && (!run || (!run.conversation?.length && messages.length > 0)) && (
                <AgentActivity
                  compact={true}
                  nativeMessages={executing ? run?.data.native_messages : undefined}
                  events={traceTurns.at(-1) ?? []}
                  active
                  waiting={nativeQuestions.length > 0}
                  mode={mode}
                  model={model}
                  todos={nativeTodos}
                />
              )}
              {(liveRuntime || desktopPreview) && run && (run.data.planning_goal || planningGoalOpen) && (
                <PlanningGoalPanel
                  key={run.id}
                  goal={run.data.planning_goal}
                  pending={actionBusy || (desktopPreview && !liveRuntime)}
                  onControl={async (body) => {
                    setActionBusy(true);
                    try {
                      const saved = await api<Run>('tasks/' + run.id);
                      setRun(
                        await api<Run>(`tasks/${run.id}/goal`, 'POST', {
                          ...body,
                          expectedTaskVersion: saved.taskVersion,
                        }),
                      );
                      await refresh();
                    } finally {
                      setActionBusy(false);
                    }
                  }}
                />
              )}
              {nativeQuestions.map((question) => (
                <OpenCodeQuestions
                  key={question.id}
                  question={question}
                  onAnswer={async (answers, annotationIntent) => {
                    const task = run!.id,
                      epoch = recoveryEpoch.current;
                    await api(`tasks/${task}/questions/answer`, 'POST', {
                      questionId: question.id,
                      answers,
                      ...(annotationIntent ? { annotationIntent } : {}),
                    });
                    const current = await api<Run>(`tasks/${task}`);
                    if (epoch === recoveryEpoch.current) setRun(current);
                  }}
                />
              ))}
              {liveRuntime && queueData?.failure && (
                <section className="error-card" role="alert">
                  <strong>{queueData.failure.code === 'CANCELLED' ? 'Stopped' : 'Turn interrupted'}</strong>
                  <p>Your chat and completed work are saved.</p>
                  <Button
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      setPrompt(
                        'Continue from the saved context. Resolve the last blocker and reuse completed work; do not repeat any native operation.',
                      );
                      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();
                    }}
                  >
                    Continue this chat
                  </Button>
                </section>
              )}
              {savedSources.length > 0 && (
                <div className="saved-source-strip">
                  <label>
                    Reference source
                    <select
                      aria-label="Select reference source"
                      value={selectedSource?.id ?? ''}
                      onChange={(event) => setSelectedSourceId(event.target.value)}
                    >
                      {savedSources.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                          {row.page ? ` · page ${row.page}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <small>Local source provenance retained with this chat.</small>
                </div>
              )}

              {liveRuntime && nativeContext && (
                <details className="agent-evidence-card">
                  <summary>Measured Revit context · {new Date(nativeContext.observedAt).toLocaleTimeString()}</summary>
                  <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                    {JSON.stringify(nativeContext.context, null, 2)}
                  </pre>
                  <small>
                    Connected session {nativeContext.sessionId}. A level must be selected by its measured ID; similar
                    names are not confirmation.
                  </small>
                </details>
              )}
              {liveRuntime && nativeContextError && (
                <p role="status">
                  Revit discovered, but current document/level context could not be read: {nativeContextError}
                </p>
              )}

              {run &&
              (run.data.native_batches?.length || run.data.m09_revision || run.data.receipt?.state === 'committed') ? (
                <BuildComparisonCard
                  key={run.id}
                  comparison={run.data.build_comparison}
                  feedback={run.data.build_feedback ?? []}
                  revisions={run.data.build_revision_count ?? 0}
                  active={['queued', 'running', 'awaiting_approval', 'reconciling'].includes(run.status)}
                  onCommand={async (command) => {
                    const latest = await api<Run>('tasks/' + run.id);
                    commandExpected.current = {
                      taskId: latest.id,
                      taskVersion: latest.taskVersion ?? 0,
                      planVersion: latest.currentPlanRef?.version ?? 0,
                    };
                    await taskCommand(command);
                    setRun(await api<Run>('tasks/' + run.id));
                  }}
                />
              ) : null}
              {run?.data.build_comparison_error && (
                <p role="status">Measured comparison needs a refresh: {run.data.build_comparison_error}</p>
              )}

              {run?.data.proposal?.deletions?.map((closure) => (
                <div
                  className="agent-evidence-card"
                  key={closure.key}
                  role="group"
                  aria-label="Exact Revit deletion closure"
                >
                  <div className="section-caption">
                    NATIVE DELETE REVIEW · {closure.elements.length}{' '}
                    {closure.elements.length === 1 ? 'ELEMENT' : 'ELEMENTS'}
                  </div>
                  <strong>Target {closure.targetId}</strong>
                  <p>
                    Revit evaluated this complete dependent set in a rollback-only transaction. Approving the proposal
                    removes exactly these IDs. Any change to the set cancels the write; this task requires Review
                    approval.
                  </p>
                  <ol>
                    {closure.elements.map((element) => (
                      <li key={element.id}>
                        {element.kind.replaceAll('_', ' ')} · {element.name} · <code>{element.id}</code>
                        {element.id === closure.targetId ? ' (target)' : ' (dependent)'}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}

              {(run?.status === 'awaiting_approval' || run?.data.error === 'APPROVAL_REQUIRED') && (
                <div className="approval-card">
                  <div>
                    <ShieldCheck size={20} />
                    <strong>Approve these exact changes</strong>
                  </div>
                  <p>
                    The Revit dry run passed. Review the proposed changes below and their counts in Context. Approving
                    here authorizes this exact proposal for the connected project; DATUMM will then commit and verify it
                    in Revit.
                  </p>
                  <div className="approval-details">
                    {run.data.annotation_view_review && (
                      <span>
                        Annotation view <b>{run.data.annotation_view_review.name}</b>
                      </span>
                    )}
                    <span>
                      Project <b>{run.data.context?.title ?? 'Connected project'}</b>
                    </span>
                    <span>
                      Revision <b>{run.data.proposal?.revision ?? '—'}</b>
                    </span>
                    <span>
                      Proposal <b>{run.data.proposal?.approvalHash?.slice(0, 12) ?? '—'}…</b>
                    </span>
                  </div>
                  <small>
                    Expires{' '}
                    {run.data.proposal?.expiresAt ? new Date(run.data.proposal.expiresAt).toLocaleTimeString() : 'soon'}
                    . DATUMM does not save the project file.
                  </small>
                  <div className="approval-actions">
                    {proposalExpired && (run.data.variable_selection || run.data.m09_revision) && !committedBuild && (
                      <Button variant="secondary" disabled={actionBusy} onClick={() => act('refresh-proposal')}>
                        Refresh expired review
                      </Button>
                    )}
                    <Button onClick={() => act('resume')} disabled={actionBusy || proposalExpired}>
                      {actionBusy ? <Loader2 size={15} className="spin" /> : null} Approve and build{' '}
                      <ArrowUpRight size={15} />
                    </Button>
                    <Button variant="ghost" onClick={() => act('cancel')} disabled={actionBusy}>
                      Cancel
                    </Button>
                    {run.data.agent_execution && !run.data.proposal?.deletions?.length && (
                      <Button
                        variant="secondary"
                        disabled={actionBusy}
                        onClick={(event) => {
                          dialogTrigger.current = event.currentTarget;
                          setAccessBatches(plannedAccessBatches);
                          setAccessMargin(0);
                          setAccessReview(null);
                          setAccessDialog(true);
                        }}
                      >
                        Configure task Full Access
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {run?.data.build_type_review && (
                <div className="agent-evidence-card" aria-label="Native type size review">
                  <div className="section-caption">
                    NATIVE SIZE REVIEW · REVISION {run.data.build_type_review.revision}
                  </div>
                  <p>{run.data.build_type_review.resolution}</p>
                  <details open>
                    <summary>Accepted geometry requires (mm)</summary>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>
                      {JSON.stringify(run.data.build_type_review.requiredSizes, null, 2)}
                    </pre>
                  </details>
                  <details>
                    <summary>
                      Discovered loaded type choices · {run.data.build_type_review.loadedChoices.length}
                    </summary>
                    <ol>
                      {run.data.build_type_review.loadedChoices.map((row, index) => (
                        <li key={index}>
                          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {JSON.stringify(row, null, 2)}
                          </pre>
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              )}
              {(run?.data.variable_selection || run?.data.m09_revision) && run.data.compiled?.changes && (
                <div className="agent-evidence-card" aria-label="Native-bound changes">
                  <div className="section-caption">
                    NATIVE PROPOSAL · {run.data.compiled.changes.operations.length} OPERATIONS
                  </div>
                  <p>
                    Positions use Revit internal XY millimetres in the reviewed project and level. Hosted openings refer
                    to wall keys in this batch; annotations use committed native IDs and inspected references.
                  </p>
                  {run.data.compiled.svg && (
                    <img
                      style={{ width: '100%', borderRadius: 8 }}
                      src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(run.data.compiled.svg)}
                      alt="Native-bound wall positions at the confirmed origin and rotation"
                    />
                  )}
                  <details open={run.status === 'awaiting_approval'}>
                    <summary>Review exact native changes</summary>
                    <ol>
                      {run.data.compiled.changes.operations.map((op) => (
                        <li key={op.key}>
                          <strong>
                            {op.key} · {op.kind.replaceAll('_', ' ')}
                          </strong>
                          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {JSON.stringify(op, null, 2)}
                          </pre>
                        </li>
                      ))}
                    </ol>
                  </details>
                </div>
              )}
              {run?.data.concept && !run.data.agent_design?.conceptImage && (
                <div className="saved-plan-card">
                  <div className="section-caption">AI CONCEPT · {run.data.concept.model.split('/')[1]}</div>
                  <img
                    style={{ width: '100%', borderRadius: 8 }}
                    src={`/api/service/runs/${run.id}/export/concept`}
                    alt="AI generated architectural concept; not measured geometry"
                  />
                  <p>{run.data.concept.provenance}</p>
                  <a href={`/api/service/runs/${run.id}/export/concept`} download>
                    Download concept image
                  </a>
                </div>
              )}
              {run?.data.concept_error && !run.data.agent_design && (
                <div className="error-card" role="status">
                  {run.data.concept_error}
                </div>
              )}
              {run?.data.task_access && !run.data.task_access.revoked && (
                <div className="agent-evidence-card" role="status">
                  <strong>Task Full Access enabled</strong>
                  <p>
                    Expires {new Date(run.data.task_access.expiresAt).toLocaleTimeString()} ·{' '}
                    {run.data.task_access.remaining} {run.data.task_access.remaining === 1 ? 'batch' : 'batches'} remain
                    within the reviewed scope.
                  </p>
                  <Button
                    variant="secondary"
                    disabled={actionBusy}
                    onClick={() => {
                      void api(`runs/${run.id}/access`, 'DELETE')
                        .then(() =>
                          setRun({
                            ...run,
                            data: { ...run.data, task_access: { ...run.data.task_access!, revoked: true } },
                          }),
                        )
                        .catch((e) => setError((e as Error).message));
                    }}
                  >
                    Revoke access
                  </Button>
                </div>
              )}
              <TaskPlanCard run={run} />
              {run?.status === 'needs_input' && run.data.agent_question && (
                <AgentQuestions
                  key={`${run.id}:${run.data.agent_question.id}`}
                  runId={run.id}
                  question={run.data.agent_question}
                  onReply={replyToQuestion}
                />
              )}
              {run?.data.agent_draft && (
                <div
                  className="agent-evidence-card"
                  aria-label={outcome?.verified ? 'Executed drafting changes' : 'Proposed drafting changes'}
                >
                  <div className="section-caption">
                    {outcome?.verified ? 'EXECUTED DRAFTING PLAN' : 'DRAFTING PLAN'} ·{' '}
                    {run.data.agent_draft.changes.operations.length}{' '}
                    {run.data.agent_draft.changes.operations.length === 1 ? 'OPERATION' : 'OPERATIONS'}
                  </div>
                  <strong>
                    {outcome?.verified
                      ? completedDraftTitle(run.data.agent_draft.changes.title)
                      : run.data.agent_draft.changes.title}
                  </strong>
                  {run.data.agent_draft.previewSvg && (
                    <>
                      <button className="plan-preview-button" onClick={(event) => openCanvas(event.currentTarget)}>
                        <img
                          alt="Proposed drafting paths and positions; schematic symbols"
                          src={
                            'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(run.data.agent_draft.previewSvg)
                          }
                        />
                        <span>
                          <Expand size={15} /> Expand drafting preview
                        </span>
                      </button>
                      <small>
                        {outcome?.verified ? 'Verified edit comparison' : 'Proposed paths and positions'} · Wall widths
                        and opening symbols are schematic.
                      </small>
                    </>
                  )}
                  <p>
                    Positions use Revit internal XY millimetres. For a move, the native point is a displacement vector;
                    the preview shows the current and intended positions.
                  </p>
                  <details open={run.status === 'awaiting_approval'}>
                    <summary>Review exact changes</summary>
                    <ol>
                      {run.data.agent_draft.changes.operations.map((op) => (
                        <li key={op.key}>
                          <strong>
                            {op.key} · {op.kind.replaceAll('_', ' ')}
                          </strong>
                          {op.kind === 'move' &&
                            run.data.agent_draft?.moveSemantics === 'anchored-goal-delta-mm-v2' && (
                              <small>
                                {' '}
                                Current anchor ({run.data.agent_draft.moveAnchors?.[op.key]?.fromPoint.x},{' '}
                                {run.data.agent_draft.moveAnchors?.[op.key]?.fromPoint.y}) mm → intended (
                                {run.data.agent_draft.moveAnchors?.[op.key]?.toPoint.x},{' '}
                                {run.data.agent_draft.moveAnchors?.[op.key]?.toPoint.y}) mm. Native displacement (
                                {(op.point as { x: number; y: number }).x}, {(op.point as { x: number; y: number }).y})
                                mm.
                              </small>
                            )}
                          <pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                            {JSON.stringify(op, null, 2)}
                          </pre>
                        </li>
                      ))}
                    </ol>
                  </details>
                  <details>
                    <summary>Goal criteria</summary>
                    <ul>
                      {(outcome?.verified
                        ? reviewCriteria(run.data.agent_draft.successCriteria)
                        : run.data.agent_draft.successCriteria
                      ).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </details>
                  {run.mode !== 'build' && (
                    <div className="plan-actions">
                      <small>
                        {run.data.agent_draft.changes.operations.some((op) => op.kind === 'move') &&
                        run.data.agent_draft.moveSemantics !== 'anchored-goal-delta-mm-v2'
                          ? 'This older move plan needs a fresh native inspection and replan.'
                          : 'Prepared for review · No model changes.'}
                      </small>
                      <Button
                        disabled={
                          busy ||
                          run.status !== 'completed' ||
                          !selectedDevice?.online ||
                          (run.data.agent_draft.changes.operations.some((op) => op.kind === 'move') &&
                            run.data.agent_draft.moveSemantics !== 'anchored-goal-delta-mm-v2')
                        }
                        onClick={() => void buildLegacy()}
                      >
                        Prepare build
                      </Button>
                    </div>
                  )}
                </div>
              )}
              <NoPlanGeometryCard run={run} />
              {run?.data.agent_design && (
                <div className="saved-plan-card agent-plan-card" aria-label="Plan review">
                  <div className="section-caption">
                    DIMENSIONED PLAN · {run.data.agent_design.candidates.length} ALTERNATIVES{' '}
                    <span>Concept geometry</span>
                  </div>
                  <div className="plan-actions" role="group" aria-label="Concept alternatives">
                    {run.data.agent_design.candidates.map((candidate, index) => (
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
                      <Button
                        variant="secondary"
                        disabled={drawingLoading}
                        onClick={() => setDrawingRetry((n) => n + 1)}
                      >
                        Retry exact drawing
                      </Button>
                    </div>
                  )}
                  {designVersion && (
                    <>
                      {drawingError && <p role="status">Last valid drawing retained for reference.</p>}
                      {!drawingCurrent && (
                        <p role="status">
                          Older drawing v{designVersion.version} retained while the current version loads.
                        </p>
                      )}
                      <div className={compareVersion ? 'plan-comparison' : ''}>
                        {compareVersion && (
                          <PlanCanvas
                            canvasInputEnabled={canvasInputEnabled}
                            persistentProperties={persistentProperties}
                            key={'compare' + compareVersion.planId + compareVersion.version}
                            drawing={compareVersion}
                            label="Previous / comparison plan"
                            readOnly
                          />
                        )}
                        <PlanCanvas
                          canvasInputEnabled={canvasInputEnabled}
                          persistentProperties={persistentProperties}
                          key={designVersion.planId + designVersion.version}
                          drawing={designVersion}
                          onStyleChange={setDrawingStyle}
                          onAsk={askFromCanvas}
                        />
                      </div>
                      <div className="plan-actions">
                        <Button
                          variant="secondary"
                          disabled={busy || !drawingCurrent}
                          onClick={() => void compareDrawing()}
                        >
                          Compare saved versions
                        </Button>
                        {compareVersion && (
                          <Button variant="secondary" onClick={() => setCompareVersion(null)}>
                            Close comparison
                          </Button>
                        )}
                        <a
                          href={`/api/service/runs/${run.id}/export/svg?planId=${designVersion.planId}&version=${designVersion.version}&style=${drawingStyle}`}
                          download
                        >
                          SVG
                        </a>
                        <a
                          href={`/api/service/runs/${run.id}/export/preview-png?planId=${designVersion.planId}&version=${designVersion.version}&style=${drawingStyle}`}
                          download
                        >
                          PNG
                        </a>
                        <a
                          href={`/api/service/runs/${run.id}/export/plan-pdf?planId=${designVersion.planId}&version=${designVersion.version}&style=${drawingStyle}`}
                          download
                        >
                          Plan PDF
                        </a>
                      </div>
                    </>
                  )}
                  {!designVersion && !drawingLoading && !drawingError && (
                    <p role="status">
                      No drawing is available for this saved geometry. Retry the exact version or request changes in
                      this task.
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
                      {run.data.agent_design.diagnostics.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </details>
                  <p>
                    Review this exact version and its assumptions. Acceptance saves your design choice; native changes
                    still require exact proposal approval.
                  </p>
                  <div className="plan-actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus()
                      }
                    >
                      Request changes
                    </Button>
                    {!planAccepted ? (
                      <Button
                        disabled={busy || drawingLoading || !!drawingError || !drawingCurrent}
                        onClick={() => void acceptDrawing()}
                      >
                        Accept this plan
                      </Button>
                    ) : run.mode !== 'build' ? (
                      <>
                        <span role="status">Plan accepted — switch to Build</span>
                        <Button
                          disabled={busy || drawingLoading || !!drawingError || !drawingCurrent}
                          onClick={() => void switchDrawingToBuild()}
                        >
                          Switch to Build
                        </Button>
                      </>
                    ) : (
                      <>
                        <span role="status">Plan accepted · Build mode</span>
                        <Button
                          disabled={
                            buildStep !== 'prepare' ||
                            busy ||
                            !selectedDevice?.online ||
                            revitSessions !== 1 ||
                            !!drawingError ||
                            placementTask !== run.id ||
                            !confirmedPlacement
                          }
                          onClick={() => void buildVariable()}
                        >
                          Prepare accepted plan
                        </Button>
                      </>
                    )}
                  </div>
                  {planAccepted && run.mode === 'build' && !run.data.compiled && (
                    <Button
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setBuildSetupOpen(true);
                        void reviewPlacement();
                      }}
                    >
                      Choose Revit placement
                    </Button>
                  )}
                </div>
              )}

              {run?.data.agent_design && selectedDevice?.online && (
                <div className="agent-evidence-card">
                  <div className="section-caption">FULL ACCESS FOR THIS CONCEPT</div>
                  <p>
                    Optional: allow one automatic exact-proposal approval for the selected version in this Revit
                    project. The grant expires in 30 minutes, is capped at 120 elements, and can be revoked here. DATUMM
                    will still dry-run and verify the build.
                  </p>
                  {selectedDevice.agentControl?.binding.briefId === run.data.agent_design.briefId ? (
                    <div className="plan-actions">
                      <span role="status">
                        Scoped access enabled · {selectedDevice.agentControl.remaining} build remaining
                      </span>
                      <Button variant="secondary" disabled={actionBusy} onClick={() => void revokeVariableGrant()}>
                        Revoke access
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="secondary"
                      disabled={busy || revitSessions !== 1}
                      onClick={() => void grantVariable()}
                    >
                      Enable for selected concept
                    </Button>
                  )}
                </div>
              )}
              {run?.data.agent_element_pages && (
                <div className="agent-evidence-card">
                  <div className="section-caption">NATIVE ELEMENT EVIDENCE</div>
                  {run.data.agent_element_pages
                    .filter(
                      (page, index, pages) =>
                        !pages
                          .slice(index + 1)
                          .some((next) => JSON.stringify(next.scope) === JSON.stringify(page.scope)),
                    )
                    .map((page, index) => (
                      <details key={index}>
                        <summary>
                          {page.scope.categories.join(', ')} · {page.coverage.returnedCount}/{page.coverage.totalCount}{' '}
                          · {page.coverage.status}
                        </summary>
                        <p>
                          Inspected straight wall length (XY projection):{' '}
                          {page.aggregates.inspectedStraightWallProjectedLengthM.toFixed(2)} m
                        </p>
                        <ul>
                          {page.limitations.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </details>
                    ))}
                </div>
              )}
              {run?.data.agent_inspection && (
                <div className="agent-evidence-card">
                  <div className="section-caption">
                    {outcome?.verified ? 'PRE-BUILD MODEL ANALYSIS' : 'MODEL ANALYSIS'} · REVISION{' '}
                    {run.data.agent_inspection.revision}
                  </div>
                  <div className="plan-facts">
                    {Object.entries(run.data.agent_inspection.counts).map(([name, count]) => (
                      <span key={name}>
                        {count} {name}
                      </span>
                    ))}
                  </div>
                  <p>
                    {run.data.agent_inspection.coverage
                      .map(
                        (item) =>
                          `${item.category}: ${item.status} (${item.returnedCount}${item.totalCount === null ? '' : `/${item.totalCount}`})`,
                      )
                      .join(' · ')}
                  </p>
                  <details>
                    <summary>Coverage limits</summary>
                    <ul>
                      {run.data.agent_inspection.limitations.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </details>
                </div>
              )}
              {outcome?.verified && run?.data.agent_postbuild_inventory && (
                <div className="agent-evidence-card" aria-label="Model after build">
                  <div className="section-caption">
                    MODEL AFTER BUILD · REVISION {run.data.agent_postbuild_inventory.revision}
                  </div>
                  <div className="plan-facts">
                    {Object.entries(run.data.agent_postbuild_inventory.counts).map(([name, count]) => (
                      <span key={name}>
                        {count} {name}
                      </span>
                    ))}
                  </div>
                  <small>Native inventory at this revision. Per-element checks and batch history appear below.</small>
                </div>
              )}
              <AgentScheduler value={run?.data.agent_scheduler} />
              {run && (
                <EvidenceResults
                  coverage={run.data.agent_coverage}
                  findings={run.data.agent_advice}
                  research={run.data.agent_research}
                />
              )}
              {run && <AgentSpecialists results={run.data.agent_specialists} taskId={run.id} />}
              <BriefCard run={run} />
              {run?.data.plan && previewSvg && (
                <div className="saved-plan-card">
                  <div className="section-caption">
                    PLAN REVISION {run.data.plan.version}
                    <span>No model changes</span>
                  </div>
                  <div className="plan-facts">
                    <span>{run.data.plan.brief.bedrooms} bedrooms</span>
                    <span>
                      {run.data.plan.brief.bathrooms} bathroom{run.data.plan.brief.bathrooms > 1 ? 's' : ''}
                    </span>
                    <span>{run.data.plan.brief.entrance} entry</span>
                    <span>14 × 12 m site</span>
                  </div>
                  <button className="plan-preview-button" onClick={(event) => openCanvas(event.currentTarget)}>
                    <img
                      alt="Saved conceptual floor plan"
                      src={'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(previewSvg)}
                    />
                    <span>
                      <Expand size={15} /> Expand preview
                    </span>
                  </button>
                  <details className="plan-schedule">
                    <summary>Room areas · {previewRooms.length} spaces</summary>
                    <div className="room-list">
                      {previewRooms.map((r) => (
                        <div key={r.name}>
                          <span>{r.name}</span>
                          <span>{r.expectedAreaM2.toFixed(1)} m²</span>
                        </div>
                      ))}
                    </div>
                  </details>
                  <p>Describe a change below, or build this version in your connected Revit project.</p>
                  <div className="plan-actions">
                    <small>Concept plan · Exact proposal approval required before building.</small>
                    <Button disabled={busy || run.status !== 'completed'} onClick={() => void buildLegacy()}>
                      Build this plan
                    </Button>
                  </div>
                </div>
              )}
              {batchInProgress && (
                <div className="agent-evidence-card" role="status">
                  <div className="section-caption">BUILD IN PROGRESS</div>
                  <strong>{run?.data.agent_result?.batchHistory?.length ?? 1} verified native batch</strong>
                  <p>
                    The next step uses a fresh Revit read and a new exact proposal. Earlier approval cannot authorize
                    another batch.
                  </p>
                </div>
              )}
              {outcome?.verified && !queueData?.native_build && !batchInProgress && !partialGoal && (
                <div className="success-card" role="status">
                  <Check size={18} />
                  <div>
                    <strong>
                      {verifiedBatchCount > 1
                        ? `${verifiedBatchCount} native batches verified in ${run?.data.context?.title ?? 'Revit'}.`
                        : `${outcome?.deleted ? `${outcome.deleted} deleted, ` : ''}${verifiedCount} ${verifiedCount === 1 ? 'element' : 'elements'} verified in ${run?.data.context?.title ?? 'Revit'}.`}
                    </strong>
                    <small>
                      {run?.data.draft_task
                        ? 'Goal-directed drafting · '
                        : run?.data.variable_selection
                          ? `Selected concept version ${run.data.variable_selection.version} · `
                          : run?.data.selected_plan
                            ? `Saved plan revision ${run.data.selected_plan.version} · `
                            : 'Verified demonstration · '}
                      {run?.data.recovery ? 'Verified by operation-status recovery' : 'Verified after build'} · No Revit
                      warnings
                    </small>
                    {verifiedBreakdown && <small>{verifiedBreakdown}</small>}
                    <button
                      onClick={() => {
                        setRight(true);
                        setTab('exports');
                      }}
                    >
                      View exports <ArrowUpRight size={13} />
                    </button>
                  </div>
                </div>
              )}
              {outcome?.verified && !batchInProgress && !partialGoal && run?.data.agent_result?.goal && (
                <div className="saved-plan-card" aria-label="Verified drafting result">
                  <div className="section-caption">DRAFTING RESULT · NATIVE CHANGES VERIFIED</div>
                  <strong>
                    {verifiedBatchCount > 1
                      ? `${verifiedBatchCount} verified drafting batches`
                      : run.data.agent_draft?.changes.title
                        ? completedDraftTitle(run.data.agent_draft.changes.title)
                        : completedGoal}
                  </strong>
                  <div className="plan-facts">
                    {Object.entries(run.data.agent_result.changes ?? {})
                      .filter(([, count]) => count > 0)
                      .map(([kind, count]) => (
                        <span key={kind}>
                          {count}{' '}
                          {count === 1 ? kind.replace(/s$/, '').replaceAll('_', ' ') : kind.replaceAll('_', ' ')}
                        </span>
                      ))}
                  </div>
                  <p>{run.data.agent_result.verification ?? 'The recorded native changes were verified in Revit.'}</p>
                  {run.data.agent_result.assessment?.nativeStatus === 'verified' && (
                    <DraftAssessmentDetails
                      assessment={run.data.agent_result.assessment}
                      batchHistory={run.data.agent_result.batchHistory}
                    />
                  )}
                  <details>
                    <summary>
                      {run.data.agent_result.goal === 'Build this exact drafting task' &&
                      !run.data.agent_draft?.requestedGoal
                        ? 'Task goal'
                        : 'Original request'}
                    </summary>
                    <p>{completedGoal}</p>
                  </details>
                  {completedCriteria.length ? (
                    <details>
                      <summary>Requested criteria for your review</summary>
                      <ul>
                        {completedCriteria.map((criterion, index) => (
                          <li key={index}>{criterion}</li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  <small>
                    Document {run.data.agent_result.documentId?.slice(0, 8) ?? 'unknown'} · Operation{' '}
                    {run.data.agent_result.operationId?.slice(0, 8) ?? 'unknown'} · Project file not saved by DATUMM
                  </small>
                  <div className="plan-actions">
                    <Button
                      variant="secondary"
                      onClick={(event) => {
                        if (previewSvg) openCanvas(event.currentTarget);
                        else {
                          setRight(true);
                          setTab('preview');
                        }
                      }}
                    >
                      Quick look <ArrowUpRight size={14} />
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        document
                          .querySelector<HTMLTextAreaElement>('textarea[aria-label="Post-build feedback"]')
                          ?.focus()
                      }
                    >
                      Request changes
                    </Button>
                  </div>
                </div>
              )}

              <PartialOutcomeCard partialGoal={partialGoal} completedGoal={completedGoal} run={run} outcome={outcome} />
              {run?.status === 'paused_limit' && (
                <AgentLimit
                  runId={run.id}
                  canContinue={Boolean(run.data.agent_limit?.continuationAvailable)}
                  hasOperation={Boolean(run.data.operation_id)}
                  findings={checkpointFindings}
                  pending={busy || actionBusy}
                  onContinue={() =>
                    void submit(
                      run.data.agent_memory?.originalGoal ??
                        (run.data as Run['data'] & { prompt?: string }).prompt ??
                        run.title,
                      false,
                      run.mode,
                    )
                  }
                  onRecover={() => void act('recover')}
                />
              )}
              {run?.status === 'paused_recovery' && (
                <div className="saved-plan-card" role="status">
                  <div className="section-caption">TASK PAUSED</div>
                  <strong>Your progress is saved</strong>
                  <p>
                    Continue this task from its checkpoint. Any Revit change will need its original exact review or a
                    fresh task scope.
                  </p>
                  <div className="plan-actions">
                    <Button disabled={actionBusy} onClick={() => void act('continue')}>
                      Continue task <ArrowUpRight size={14} />
                    </Button>
                    <Button variant="secondary" disabled={actionBusy} onClick={() => void act('cancel')}>
                      End task
                    </Button>
                  </div>
                </div>
              )}
              {run?.status === 'reconciling' && (
                <div className="saved-plan-card" role="status">
                  <div className="section-caption">
                    {verifiedNativeBatches.length === 1
                      ? 'BASE VERIFIED · CHECK ANNOTATIONS'
                      : 'MODEL STATUS NEEDS CHECKING'}
                  </div>
                  <strong>
                    {verifiedNativeBatches.length === 1
                      ? `${verifiedNativeBatches[0].receipt.elementIds.length} base elements passed read-back`
                      : 'The task paused after a Revit operation'}
                  </strong>
                  <p>
                    {verifiedNativeBatches.length === 1
                      ? 'The base build is verified. Check the separate annotation rehearsal before preparing its fresh exact review.'
                      : 'Check the original operation outcome before starting another model change.'}{' '}
                    DATUMM will not repeat an uncertain write.
                  </p>
                  <div className="plan-actions">
                    <Button
                      variant="secondary"
                      disabled={actionBusy || !run.data.operation_id}
                      onClick={() => void act('recover')}
                    >
                      Check operation status
                    </Button>
                  </div>
                </div>
              )}
              {run &&
                ['failed', 'interrupted'].includes(run.status) &&
                run.data.native_batches?.length === 1 &&
                run.data.native_batches[0].verified && (
                  <div className="saved-plan-card" role="status">
                    <div className="section-caption">BASE VERIFIED · ANNOTATIONS INCOMPLETE</div>
                    <strong>
                      {run.data.native_batches[0].receipt.elementIds.length} base elements passed read-back
                    </strong>
                    <p>
                      The base remains recorded as verified. Tags and dimensions have not completed. Inspect the
                      annotation operation before preparing a fresh exact review.
                    </p>
                    {run.data.annotation_view_review && (
                      <small>Proposed annotation view: {run.data.annotation_view_review.name}</small>
                    )}
                  </div>
                )}
              {run?.data.error &&
                !queueData?.failure &&
                run.status !== 'reconciling' &&
                run.data.error !== 'APPROVAL_REQUIRED' && (
                  <div
                    className={cn('error-card', outcome?.verified && 'historical-card')}
                    role={outcome?.verified ? 'note' : 'alert'}
                  >
                    {run.data.failure?.code === 'annotation_view_inactive'
                      ? 'Open ' +
                        (run.data.annotation_view_review?.name ?? 'the reviewed annotation view') +
                        ' in Revit, then refresh annotations. The verified base will not be rebuilt.'
                      : confirmedAnnotationFailure
                        ? 'The annotation rehearsal failed and rolled back. No annotation changes were retained. The full build remains incomplete.'
                        : committedBuild
                          ? outcome?.verified
                            ? outcome.completedBuild
                              ? 'The original task reported an error. A later operation-status check verified every created element in the original project.'
                              : `The base geometry is verified; the full build remains incomplete. ${run.data.error}`
                            : `Build committed; full verification is unavailable (${run.data.error}). Check the original operation before further model changes.`
                          : run.data.error}
                    {!confirmedAnnotationFailure && run.data.failure?.recoveryAction && (
                      <small>{recoveryGuidance(run.data.failure.recoveryAction)}</small>
                    )}
                    {run.data.operation_id && (
                      <button disabled={actionBusy} onClick={() => act('recover')}>
                        {outcome?.verifiedBatches === 1 && !outcome.completedBuild && run.status === 'failed'
                          ? 'Refresh annotations'
                          : 'Check operation status'}
                      </button>
                    )}
                  </div>
                )}

              {canRefreshFailedPreparation && (
                <div className="saved-plan-card" role="status">
                  <strong>Retry preparation</strong>
                  <p>
                    A fresh review is required. Preparation can restart only when all earlier rehearsals have confirmed
                    rollback.
                  </p>
                  <Button variant="secondary" disabled={actionBusy} onClick={() => act('refresh-proposal')}>
                    Refresh preparation
                  </Button>
                </div>
              )}
              {canEndFailedPreparation && !canRefreshFailedPreparation && (
                <div className="saved-plan-card" role="status">
                  <strong>Rollback confirmed</strong>
                  <p>
                    End this failed preparation before reviewing placement and preparing the same accepted plan again. A
                    fresh exact review will be required.
                  </p>
                  <Button variant="secondary" disabled={actionBusy} onClick={() => act('cancel')}>
                    End failed preparation
                  </Button>
                </div>
              )}
              {run?.status === 'interrupted' && !run.data.error && !outcome?.verified && (
                <div className="error-card" role="alert">
                  This task was interrupted. Its outcome needs checking.
                  {run.data.operation_id && (
                    <button disabled={actionBusy} onClick={() => act('recover')}>
                      Check operation status
                    </button>
                  )}
                </div>
              )}
              {run?.data.recovery?.data && (
                <div className="saved-plan-card" role={outcome?.verified ? 'note' : 'status'}>
                  <strong>Operation status: {run.data.recovery.data.state ?? 'unconfirmed'}</strong>
                  <p>
                    {run.data.recovery.data.sameDocument
                      ? 'The original project is active.'
                      : 'The original project is not confirmed active; element verification is unavailable.'}
                  </p>
                  {run.data.recovery.data.elements && (
                    <p>
                      {run.data.recovery.data.elements.filter((element) => !element.missing).length} elements present ·{' '}
                      {run.data.recovery.data.elements.filter((element) => element.missing).length} missing.
                    </p>
                  )}
                  <small>This check made no model changes. Review the result before starting another build.</small>
                </div>
              )}
              {run && !executing && (
                <TaskOutcome
                  task={run}
                  onArtifacts={() => {
                    setRight(true);
                    setTab('exports');
                  }}
                />
              )}
            </ConversationContent>
            <ConversationScrollButton aria-label="Jump to latest message" />
          </Conversation>
        )}

        <Composer {...props} />
      </div>

      <footer className="main-footer">
        <span>
          <span
            className={cn('connection-dot', connected && selectedDevice?.online && revitSessions === 1 && 'online')}
          />
          {!workspaceReady
            ? 'Connecting to DATUMM'
            : !connected
              ? 'DATUMM unavailable'
              : offlineFixture
                ? 'Offline check ready · AI and Revit unavailable'
                : selectedDevice?.online && revitSessions === 1
                  ? 'Revit connected'
                  : 'Models connected · Revit not connected'}
        </span>
        <span>{mode === 'build' ? 'Revit changes require approval' : 'Hosted conversation context'}</span>
      </footer>
    </main>
  );
}
