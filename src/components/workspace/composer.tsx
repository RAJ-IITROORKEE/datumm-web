import { workflowState } from '@/lib/workflow-state';
import {useRef, useState} from 'react';
import {
  ArrowUpRight,
  X,
  Box,
  ChevronDown,
  Check,
  Square,
  ArrowUp,
  ListPlus,
  PencilRuler,
  Workflow,
  MessageSquare,
  Hand,
  Folder,
  Plug,
} from 'lucide-react';
import { PromptContent, withViewportReferences, ViewportReferences, hasPromptContent } from '../prompt-content';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { needsPluginSetup } from '@/lib/plugin-setup.mjs';
import { PluginSetupGuide } from '../plugin-setup-guide';
import { ComposerMedia } from '../composer-media';
import { ModelPicker } from '../model-picker';
import { QueuePanel } from './queue-panel';
import { AttachmentChips } from './attachment-chips';
import { acceptSuggestion } from '@/lib/display-actions.mjs';
import { ContextMeter } from './context-meter';
import { useDailyUsage } from './use-daily-usage';
import { dailyStatus, isDailyLimitMessage } from '@/lib/daily-usage.mjs';
import { featureEnabled } from '@/lib/capabilities.mjs';
import { queueAllowed } from '@/lib/prompt-queue.mjs';
import { parseModelInfo } from '@/lib/model-display.mjs';
import { useOutputWorkspace } from './output-workspace';
import type { DisplayActionsApi } from './display-actions';
import { type WorkspaceState, api, type Run, type Mode } from './use-workspace-state';

const modes = [
  { id: 'ask' as Mode, label: 'Ask', icon: MessageSquare },
  { id: 'plan' as Mode, label: 'Plan', icon: Workflow },
  { id: 'build' as Mode, label: 'Build', icon: PencilRuler },
];

export type ComposerProps = Pick<
  WorkspaceState,
  | 'liveRuntime'
  | 'scene'
  | 'run'
  | 'executing'
  | 'cancelPending'
  | 'queueData'
  | 'buildStep'
  | 'dismissedWorkflow'
  | 'workflowNoticeKey'
  | 'actionBusy'
  | 'busy'
  | 'drawingLoading'
  | 'setBuildSetupOpen'
  | 'planAccepted'
  | 'reviewPlacement'
  | 'focusReview'
  | 'setDismissedWorkflow'
  | 'promptQueue'
  | 'hostedQueue'
  | 'prompt'
  | 'queueAction'
  | 'runtimeConfig'
  | 'changeSettingsOpen'
  | 'offlineFixture'
  | 'desktopPreview'
  | 'connected'
  | 'submit'
  | 'messageError'
  | 'draftSaveNotice'
  | 'serviceError'
  | 'blockedChat'
  | 'mediaBusy'
  | 'recoveryEpoch'
  | 'setActionBusy'
  | 'selectRun'
  | 'setError'
  | 'setBlockedChat'
  | 'connectionNotice'
  | 'setConnectionNotice'
  | 'mode'
  | 'useCurrentModel'
  | 'setUseCurrentModel'
  | 'dialogTrigger'
  | 'setDeviceDialog'
  | 'selectedDevice'
  | 'revitSessions'
  | 'devices'
  | 'refresh'
  | 'setMode'
  | 'draftReferences'
  | 'commandsOpen'
  | 'commandMatches'
  | 'commandIndex'
  | 'chooseCommand'
  | 'visiblePrompt'
  | 'setPrompt'
  | 'setCommandIndex'
  | 'setCommandsDismissed'
  | 'hasContent'
  | 'sendShortcut'
  | 'desktopAvailable'
  | 'sourceKey'
  | 'sources'
  | 'setSources'
  | 'setMediaBusy'
  | 'setProjectContextOpen'
  | 'workspaceReady'
  | 'buildUnavailable'
  | 'drawingCurrent'
  | 'switchDrawingToBuild'
  | 'chatModels'
  | 'model'
  | 'reasoningEffort'
  | 'modelPreferenceInitialized'
  | 'setModel'
  | 'setReasoningEffort'
  | 'queueMessage'
  | 'providerStatus'
  | 'act'
  | 'contextView'
  | 'capabilities'
  | 'openStudioView'
> & {displayActions?: DisplayActionsApi};

export function Composer(props: ComposerProps) {
  const [retryingConnection,setRetryingConnection]=useState(false);
  const [starterReplacement,setStarterReplacement]=useState<{token:number;id:number;choice:'plan'|'ask';draft:string}|null>(null);
  const [starterNotice,setStarterNotice]=useState<{scope:string;text:string}|null>(null);
  const promptInput = useRef<HTMLTextAreaElement>(null);
  const {scope}=useOutputWorkspace();
  const {
    liveRuntime,
    scene,
    run,
    executing,
    queueData,
    buildStep,
    dismissedWorkflow,
    workflowNoticeKey,
    actionBusy,
    busy,
    drawingLoading,
    setBuildSetupOpen,
    planAccepted,
    reviewPlacement,
    focusReview,
    setDismissedWorkflow,
    promptQueue,
    hostedQueue: hq,
    prompt,
    queueAction,
    cancelPending,
    runtimeConfig,
    changeSettingsOpen,
    offlineFixture,
    desktopPreview,
    connected,
    submit,
    messageError,
    draftSaveNotice,
    serviceError,
    blockedChat,
    mediaBusy,
    recoveryEpoch,
    setActionBusy,
    selectRun,
    setError,
    setBlockedChat,
    connectionNotice,
    setConnectionNotice,
    mode,
    useCurrentModel,
    setUseCurrentModel,
    dialogTrigger,
    setDeviceDialog,
    selectedDevice,
    revitSessions,
    devices,
    refresh,
    setMode,
    draftReferences,
    commandsOpen,
    commandMatches,
    commandIndex,
    chooseCommand,
    visiblePrompt,
    setPrompt,
    setCommandIndex,
    setCommandsDismissed,
    hasContent,
    sendShortcut,
    desktopAvailable,
    sourceKey,
    sources,
    setSources,
    setMediaBusy,
    setProjectContextOpen,
    workspaceReady,
    buildUnavailable,
    drawingCurrent,
    switchDrawingToBuild,
    chatModels,
    capabilities,
    openStudioView,
    model,
    reasoningEffort,
    modelPreferenceInitialized,
    setModel,
    setReasoningEffort,
    queueMessage,
    providerStatus,
    act,
    contextView,
  } = props;
  const dailyUsage = useDailyUsage(featureEnabled(capabilities, 'dailyLimits'), `${run?.id ?? ''}:${run?.status ?? ''}:${messageError ? 1 : 0}`);
  const dailyText = dailyStatus(dailyUsage, messageError);
  const dailyLimitReached = isDailyLimitMessage(dailyText);
  // Invalidate callbacks on every observed change, including A → B → A.
  const starterAvailable=Boolean(!hasContent && workspaceReady && connected && !busy && !actionBusy && !mediaBusy && !executing && !cancelPending && scene!=='task-loading' && scene!=='submitting');
  const starterSnapshot=JSON.stringify([scope.key,scope.epoch,prompt,mode,useCurrentModel,sourceKey,sources,draftReferences,visiblePrompt?.references,selectedDevice?.id,selectedDevice?.online,revitSessions,starterAvailable]);
  const starterLive=useRef({snapshot:starterSnapshot,token:1,locked:false,pending:0,sequence:0});
  if(starterLive.current.snapshot!==starterSnapshot) starterLive.current={snapshot:starterSnapshot,token:starterLive.current.token+1,locked:false,pending:0,sequence:starterLive.current.sequence};
  const starterToken=starterLive.current.token;
  const starterText={plan:'Help me plan a web-only building concept. Ask for the building footprint dimensions, entrance direction and room requirements together. Keep parcel dimensions separate; do not inspect or change Revit.',ask:'Explain the difference between Revit levels and grids. Keep it to general software guidance.'};
  const starterCurrent=()=>starterLive.current.token===starterToken && starterAvailable;
  function applyStarter(choice:'plan'|'ask') {
    if(!starterCurrent() || starterLive.current.locked)return;
    starterLive.current.locked=true;starterLive.current.pending=0;
    const text=[starterText[choice],...draftReferences.map(row=>'Design feedback (reference only): '+JSON.stringify(row))].join('\n\n');
    setPrompt(withViewportReferences(text,visiblePrompt.references));setMode(choice==='plan'?'plan':'ask');
    setUseCurrentModel(false);
    setStarterReplacement(null);setStarterNotice({scope:JSON.stringify([scope.key,scope.epoch]),text:'Draft ready. Review it, then send.'});promptInput.current?.focus();
  }
  function chooseStarter(choice:'plan'|'ask') {
    if(!starterCurrent() || starterLive.current.locked)return;
    if(prompt.length && prompt!==starterText[choice]) {
      const pending=++starterLive.current.sequence;starterLive.current.pending=pending;
      setStarterReplacement({token:starterToken,id:pending,choice,draft:prompt});setStarterNotice(null);
      // Pending changes immediately, so callbacks from a replaced confirmation cannot run.
      return;
    }
    applyStarter(choice);
  }
  const pendingStarter=starterReplacement?.token===starterToken && starterCurrent()?starterReplacement:null;
  // Hosted Ask/Plan keeps accepting prompts while a turn runs: they join the browser queue.
  // The running task decides, not the picker: Build and Revit work is never queued or stopped.
  const queueing = Boolean(hq?.active && executing && !liveRuntime && queueAllowed(run) &&
    mode !== 'build');
  const focusPrompt = () => promptInput.current?.focus();
  const suggestion = (!prompt && props.displayActions?.placeholder) || '';
  const canSubmit =
    scene !== 'task-loading' && scene !== 'submitting' &&
    hasPromptContent(prompt) &&
    workspaceReady &&
    connected &&
    !actionBusy &&
    !mediaBusy &&
    !cancelPending &&
    !(queueing && hq!.full) &&
    (!executing || (liveRuntime && Boolean(run)) || queueing);
  return (
    <div className="composer-area">
      <div className="composer-workflow">
        {serviceError && <div className="runtime-notice" role="alert"><div><strong>Connection unavailable</strong><span>{serviceError}</span></div><Button type="button" variant="secondary" disabled={retryingConnection} onClick={()=>{setRetryingConnection(true);void props.refresh().catch(()=>{}).finally(()=>setRetryingConnection(false));}}>{retryingConnection?'Retrying…':'Retry connection'}</Button></div>}
        {liveRuntime &&
          run &&
          !executing &&
          (queueData?.design || queueData?.native_build || buildStep) &&
          dismissedWorkflow !== workflowNoticeKey && (
            <div className="studio-review-notice" role="status">
              <span title={workflowState(run).next}>{workflowState(run).label}</span>
              <button
                type="button"
                disabled={actionBusy || busy || drawingLoading}
                onClick={() => {
                  if (buildStep) {
                    setBuildSetupOpen(true);
                    if (planAccepted) void reviewPlacement();
                  } else
                    focusReview(
                      queueData?.native_build
                        ? '[aria-label="Native build review"]'
                        : '[aria-label="Validated design preview"]',
                    );
                }}
              >
                Review
                <ArrowUpRight size={12} />
              </button>
              <button
                type="button"
                className="studio-notice-close"
                aria-label="Dismiss workflow notice"
                onClick={() => setDismissedWorkflow(workflowNoticeKey)}
              >
                <X size={13} />
              </button>
            </div>
          )}

        {liveRuntime && (
          <QueuePanel rows={promptQueue} max={10} busy={actionBusy || cancelPending}
            pausedText={queueData?.queue_paused ? 'Paused · prompts saved' : null}
            editDisabled={Boolean(prompt.trim())}
            onEdit={(item) => { void queueAction('edit', item); focusPrompt(); }}
            onRemove={(item) => void queueAction('remove', item)} focusComposer={focusPrompt}
            onResume={!executing && !cancelPending ? () => void queueAction('resume') : undefined} />
        )}
        {hq?.active && (
          <QueuePanel rows={hq.items} max={hq.max} busy={actionBusy} stopping={hq.stopping}
            notice={hq.notice} editDisabled={Boolean(prompt.trim())}
            pausedText={hq.paused ? 'Paused · prompts kept' + (hq.paused === 'model' ? ' (model unavailable)' : '') : null}
            onSendNow={hq.canSendNow ? (row) => void hq.sendNow({ id: row.id }) : undefined}
            onEdit={(row) => {
              const kept = hq.take(row.id);
              if (kept) { setPrompt(kept.prompt); setMode(kept.mode); focusPrompt(); }
            }}
            onRemove={(row) => hq.remove(row.id)} focusComposer={focusPrompt} />
        )}
        {runtimeConfig?.authenticationRequired ? (
          <div className="runtime-notice" role="status">
            <div>
              <strong>Sign in to DATUMM</strong>
              <span>
                Open Account in Settings. Hosted login must be configured before this release can run agent commands.
              </span>
            </div>
            <Button variant="secondary" onClick={() => changeSettingsOpen(true)}>
              Open Settings
            </Button>
          </div>
        ) : (
          offlineFixture &&
          !desktopPreview && (
            <div className="runtime-notice" role="status">
              <div>
                <strong>Connect a model to start AI chat</strong>
                <span>
                  Settings uses the default .env key when no saved key exists. You can also run{' '}
                  {runtimeConfig?.fixturePrompt} to check offline storage.
                </span>
              </div>
              <Button variant="secondary" onClick={() => changeSettingsOpen(true)}>
                Open Settings
              </Button>
              <Button
                variant="secondary"
                disabled={busy || !connected || !runtimeConfig?.fixturePrompt}
                onClick={() => void submit(runtimeConfig!.fixturePrompt!, false)}
              >
                Run offline check
              </Button>
            </div>
          )
        )}

        {dailyLimitReached && <p className="connection-notice" role="status">{dailyText}</p>}
        {messageError && !isDailyLimitMessage(messageError) && (
          <p className="error-banner" role="alert">
            {messageError}
            {blockedChat && messageError === blockedChat.message + ' Your prompt is preserved.' && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={actionBusy || mediaBusy}
                onClick={async () => {
                  const epoch = recoveryEpoch.current;
                  setActionBusy(true);
                  try {
                    const saved = await api<Run>('tasks/' + encodeURIComponent(blockedChat.id));
                    if (epoch === recoveryEpoch.current) {
                      selectRun(saved);
                      setError('');
                      setBlockedChat(null);
                    }
                  } catch (failure) {
                    if (epoch === recoveryEpoch.current) setError((failure as Error).message);
                  } finally {
                    setActionBusy(false);
                  }
                }}
              >
                Open the blocking chat
              </Button>
            )}
            <button aria-label="Dismiss error" onClick={() => setError('')}>
              <X size={14} />
            </button>
          </p>
        )}
        <div role="status" aria-live="polite">{draftSaveNotice && <p className="connection-notice">{draftSaveNotice}</p>}</div>
        {connectionNotice && (
          <p className="connection-notice" role="status">
            {connectionNotice}
            <button
              type="button"
              className="icon-button"
              aria-label="Dismiss connection notice"
              onClick={() => setConnectionNotice('')}
            >
              <X size={14} />
            </button>
          </p>
        )}
      </div>
      {needsPluginSetup(mode, devices) && <PluginSetupGuide onCheck={refresh} onUsePlan={() => setMode('plan')} />}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          if (!canSubmit) return;
          if (queueing) { if (hq!.add(prompt)) setPrompt(''); return; }
          void submit(prompt, mode === 'build' && prompt.toLowerCase().includes('verified 3bhk'));
        }}
      >
        <div className="composer-input">
        {/* No send path carries attachments until the backend attachments phase. */}
        <AttachmentChips enabled={featureEnabled(capabilities, 'attachments')} canSend={false} />
        {draftReferences.length > 0 && (
          <div className="saved-source-strip" aria-label="Draft design references">
            {draftReferences.map((row, i) => (
              <span className="draft-reference-chip" key={i}>
                {row.target.kind === 'source' ? 'Source region' : row.target.key} · {row.intent}
                {queueData?.design?.candidates.some((candidate) => candidate.fingerprint === row.fingerprint)
                  ? ''
                  : ' · from an earlier version, check it against the current plan'}
              </span>
            ))}
          </div>
        )}
        {commandsOpen && (
          <div
            className="slash-commands"
            id="workflow-commands"
            role="listbox"
            aria-label="Workflow commands"
            onKeyDown={(event) => {
              if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
                event.preventDefault();
                setCommandsDismissed(true);
                promptInput.current?.focus();
              }
            }}
          >
            {commandMatches.map((command, index) => (
              <button
                type="button"
                role="option"
                aria-selected={index === commandIndex}
                id={`workflow-${index}`}
                key={command}
                onClick={() => chooseCommand(command)}
              >
                /{command}
                <small>
                  {command === 'inspect'
                    ? 'Read current Revit evidence'
                    : command === 'plan'
                      ? 'Prepare a proposed design'
                      : command === 'compare'
                        ? 'Compare saved versions'
                        : command === 'verify'
                          ? 'Read recorded native outcome'
                          : 'Save context for the next turn'}
                </small>
              </button>
            ))}
          </div>
        )}
        <textarea
          ref={promptInput}
          aria-label="Message DATUMM"
          value={visiblePrompt.references.length ? visiblePrompt.text : prompt}
          onChange={(e) => {
            setPrompt(
              visiblePrompt.references.length
                ? withViewportReferences(e.target.value, visiblePrompt.references)
                : e.target.value,
            );
            setCommandIndex(0);
            setCommandsDismissed(false);
            props.displayActions?.dismissPlaceholder();
          }}
          data-suggestion={suggestion ? '' : undefined}
          aria-describedby={suggestion ? 'composer-suggestion-hint' : undefined}
          aria-controls={commandsOpen ? 'workflow-commands' : undefined}
          aria-activedescendant={commandsOpen ? `workflow-${commandIndex}` : undefined}
          placeholder={
            suggestion ? suggestion : hasContent ? drawingCurrent ? 'Ask about this plan or describe a change…' : 'Ask a follow-up or describe your task…' : 'Describe your project or ask anything…'
          }
          rows={2}
          onKeyDown={(e) => {
            if (commandsOpen && !e.nativeEvent.isComposing) {
              if (e.key === 'Escape') {
                e.preventDefault();
                setCommandsDismissed(true);
                return;
              }
              if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                setCommandIndex(
                  (index) => (index + (e.key === 'ArrowDown' ? 1 : commandMatches.length - 1)) % commandMatches.length,
                );
                return;
              }
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                chooseCommand(commandMatches[commandIndex] ?? commandMatches[0]);
                return;
              }
            }
            // Tab accepts a suggestion only into an empty box; otherwise focus moves on as usual.
            const accepted = e.key === 'Tab' && !e.shiftKey && !e.nativeEvent.isComposing ? acceptSuggestion(prompt, suggestion) : null;
            if (accepted) {
              e.preventDefault();
              setPrompt(accepted);
              props.displayActions?.dismissPlaceholder();
              return;
            }
            if (e.key === 'Enter' && e.altKey && !e.nativeEvent.isComposing && queueing) {
              e.preventDefault();
              const next = prompt.trim() ? { text: prompt } : hq!.items[0] && { id: hq!.items[0].id };
              if (next && hq!.canSendNow) void hq!.sendNow(next, () => setPrompt(''));
              return;
            }
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              (sendShortcut === 'enter' || e.ctrlKey || e.metaKey)
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />

        {suggestion && <p className="composer-suggestion-hint" id="composer-suggestion-hint">Suggested follow-up · press Tab to use it</p>}
        {visiblePrompt.references.length > 0 && (
          <ViewportReferences
            references={visiblePrompt.references}
            onChange={(references) => setPrompt(withViewportReferences(visiblePrompt.text, references))}
          />
        )}
        <div className="composer-toolbar">
          <div className="studio-attachment-control">
            {' '}
            <ComposerMedia
              attachmentOnly
              locked={mediaBusy}
              nativeAvailable={desktopAvailable}
              key={sourceKey}
              sources={sources}
              onChange={setSources}
              onBusy={setMediaBusy}
              onTranscript={(text) => setPrompt((previous) => previous + (previous ? '\n' : '') + text)}
              disabled={actionBusy || (!liveRuntime && !desktopPreview)}
              onContext={() => setProjectContextOpen(true)}
              onTools={() => {
                changeSettingsOpen(true);
              }}
              onSettings={() => changeSettingsOpen(true, 'capabilities')}
              onSkill={(id) => setPrompt((previous) => previous + '\nUse the reviewed native skill ' + id + '.')}
              onCommand={(command) => {
                if (command === 'plan') setMode('plan');
                setPrompt('/' + command + ' ' + prompt.replace(/^\/(inspect|plan|compare|verify|handoff)\s*/, ''));
                document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();
              }}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="studio-mode-trigger" aria-label={`Task mode: ${modes.find(item => item.id === mode)?.label ?? mode}`}
                disabled={busy || mediaBusy || !workspaceReady}>
                <Hand size={16} strokeWidth={1.9} aria-hidden="true"/>
                <span>{modes.find(item => item.id === mode)?.label ?? mode}</span>
                <ChevronDown size={16} strokeWidth={1.9} aria-hidden="true"/>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" aria-label="Task mode" className="composer-mode-menu">
              <DropdownMenuLabel>Task mode</DropdownMenuLabel>
              <DropdownMenuRadioGroup value={mode} onValueChange={value => {
                const item = modes.find(option => option.id === value);
                if (!item || busy || mediaBusy || !workspaceReady || (buildUnavailable && item.id === 'build')) return;
                if (item.id === 'build' && run?.data.agent_design && drawingCurrent && !run.data.compiled && !run.data.operation_id)
                  void switchDrawingToBuild();
                else setMode(item.id);
              }}>
                {modes.map(item => <DropdownMenuRadioItem key={item.id} value={item.id}
                  title={item.id === 'ask' ? 'Ask questions about your project' : item.id === 'plan' ? 'Explore and review a design' : 'Prepare changes for explicit Revit approval'}
                  disabled={busy || mediaBusy || !workspaceReady || (buildUnavailable && item.id === 'build')}>
                  <item.icon size={16} strokeWidth={1.9} aria-hidden="true"/>{item.label}
                </DropdownMenuRadioItem>)}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="composer-right">
            {dailyText && !dailyLimitReached && <span className="composer-daily-left" role="status">{dailyText}</span>}
            <ContextMeter usage={run?.data?.usage} taskId={run?.id}
              running={['queued', 'running'].includes(run?.status ?? '')}
              onOpenActivity={() => openStudioView('activity')} />
            <div className="studio-model-control">
              {desktopAvailable && !chatModels.length ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => changeSettingsOpen(true)}>
                  Connect models
                </Button>
              ) : (
                <ModelPicker
                  model={model}
                  models={chatModels}
                  defaultModel={runtimeConfig?.defaultModel}
                  modelInfo={featureEnabled(capabilities, 'modelInfo') ? parseModelInfo(runtimeConfig?.modelInfo, chatModels) : undefined}
                  reasoningEffort={reasoningEffort}
                  onModelChange={(value) => {
                    modelPreferenceInitialized.current = true;
                    setModel(value);
                  }}
                  onReasoningEffortChange={(value) => {
                    modelPreferenceInitialized.current = true;
                    setReasoningEffort(value);
                  }}
                  disabled={actionBusy || mediaBusy || (busy && !queueMessage) || (offlineFixture && !desktopAvailable)}
                />
              )}
            </div>
            <div className="studio-voice-control">
              {' '}
              <ComposerMedia
                voiceOnly
                voiceStatus={providerStatus?.voice}
                locked={mediaBusy}
                nativeAvailable={desktopAvailable}
                key={sourceKey}
                sources={sources}
                onChange={setSources}
                onBusy={setMediaBusy}
                onTranscript={(text) => setPrompt((previous) => previous + (previous ? '\n' : '') + text)}
                disabled={actionBusy || (!liveRuntime && !desktopPreview)}
                onContext={() => setProjectContextOpen(true)}
                onTools={() => {
                  changeSettingsOpen(true);
                }}
                onSettings={() => changeSettingsOpen(true, 'capabilities')}
                onSkill={(id) => setPrompt((previous) => previous + '\nUse the reviewed native skill ' + id + '.')}
                onCommand={(command) => {
                  if (command === 'plan') setMode('plan');
                  setPrompt('/' + command + ' ' + prompt.replace(/^\/(inspect|plan|compare|verify|handoff)\s*/, ''));
                  document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();
                }}
              />
            </div>
            {executing && !cancelPending && <span className="sr-only" role="status">Working…</span>}
            {executing && !cancelPending && (
              <button
                type="button"
                className="send-button"
                aria-label={liveRuntime ? 'Stop execution' : 'Pause task'}
                onClick={() => (liveRuntime ? void queueAction('stop') : void act('pause'))}
                disabled={!run || actionBusy}
              >
                <Square size={13} fill="currentColor" />
              </button>
            )}
            {(!executing || liveRuntime || queueing) && (
              <button
                className="send-button"
                type="submit"
                disabled={!canSubmit}
                aria-label={queueing ? 'Add to queue' : queueMessage ? 'Queue message' : 'Send message'}
                title={queueing ? (hq!.full ? `Queue is full (${hq!.max})` : 'Add to queue: runs after the current turn. Alt+Enter sends it now') : queueMessage ? 'Save this prompt to run after the current turn' : 'Send message'}
              >
                {queueing ? <ListPlus size={16} strokeWidth={1.9} aria-hidden="true"/> : <ArrowUp size={16} strokeWidth={1.9} aria-hidden="true"/>}
              </button>
            )}
          </div>
        </div>
        </div>
        <div className="composer-tray">
          <button type="button" className="composer-tray-link" onClick={() => setProjectContextOpen(true)} title="Open project context">
            <Folder size={16} strokeWidth={1.9} aria-hidden="true"/><span>Project context</span>
          </button>
          <div className="composer-context-actions">
            {mode !== 'build' && !offlineFixture && <button type="button"
              className={cn('composer-tray-link context-toggle', useCurrentModel && 'active')}
              aria-label={useCurrentModel ? 'Revit context on' : 'Revit context'} aria-pressed={useCurrentModel}
              disabled={busy} onClick={() => setUseCurrentModel(value => !value)}
              title="Include measured Revit context in this request">
              <Box size={16} strokeWidth={1.9} aria-hidden="true"/><span className="composer-context-label">{useCurrentModel ? 'Revit context on' : 'Revit context'}</span>
            </button>}
            <button type="button" className="composer-tray-link device-status" disabled={offlineFixture}
              title={selectedDevice?.online && revitSessions === 1 ? contextView : 'Connect DATUMM to the intended Revit document'}
              onClick={event => { dialogTrigger.current = event.currentTarget; setDeviceDialog(true); }}>
              <Plug size={16} strokeWidth={1.9} aria-hidden="true"/>
              {!offlineFixture && !liveRuntime && selectedDevice?.online && revitSessions === 1 && <span className="composer-ready-dot" aria-hidden="true"/>}
              <span>{offlineFixture ? 'Revit unavailable' : !selectedDevice?.online ? 'Connect Revit' : revitSessions === 1 ? 'Revit ready' : revitSessions === 0 ? 'Enable Revit bridge' : 'Checking Revit'}</span>
              <ChevronDown size={16} strokeWidth={1.9} aria-hidden="true"/>
            </button>
          </div>
        </div>
      </form>
      {desktopAvailable && chatModels.length > 0 && !chatModels.includes(model) && <small className="composer-model-notice" role="status">Selected model unavailable · choose a model</small>}
      {!hasContent && (
        <>
          <div className="studio-new-chat-suggestions">
            <button
              type="button"
              disabled={!starterAvailable}
              onClick={() => chooseStarter('plan')}
            >
              <PencilRuler size={14} strokeWidth={1.9} aria-hidden="true" />
              Plan a concept
            </button>
            <button
              type="button"
              disabled={!starterAvailable}
              onClick={event => {if(!starterCurrent()||starterLive.current.locked)return;starterLive.current.pending=0;setStarterReplacement(null);dialogTrigger.current=event.currentTarget;setDeviceDialog(true);}}
            >
              <Plug size={14} strokeWidth={1.9} aria-hidden="true" />
              Revit connections
            </button>
            <button
              type="button"
              disabled={!starterAvailable}
              onClick={() => chooseStarter('ask')}
            >
              <MessageSquare size={14} strokeWidth={1.9} aria-hidden="true" />
              Ask a Revit question
            </button>
          </div>
          {pendingStarter&&<div className="studio-starter-replace" role="group" aria-label="Replace current draft">
            <span>Replace your current draft?</span>
            <button type="button" onClick={()=>{if(!starterCurrent()||starterLive.current.locked||starterLive.current.pending!==pendingStarter.id||prompt!==pendingStarter.draft)return;applyStarter(pendingStarter.choice);}}>Replace draft</button>
            <button type="button" onClick={()=>{if(!starterCurrent()||starterLive.current.locked||starterLive.current.pending!==pendingStarter.id)return;starterLive.current.pending=0;setStarterReplacement(null);promptInput.current?.focus();}}>Keep draft</button>
          </div>}
          <p className="studio-starter-notice" role="status">{starterNotice?.scope===JSON.stringify([scope.key,scope.epoch])?starterNotice.text:''}</p>
          <p className="studio-new-chat-assurance">Ask and plan on the web. Connect Revit for model context. You approve Revit changes.</p>
        </>
      )}
    </div>
  );
}
