import { workflowState } from '@/lib/workflow-state';
import {
  ArrowUpRight,
  X,
  Box,
  ChevronDown,
  Check,
  Square,
  ArrowUp,
  PencilRuler,
  Workflow,
  Pencil,
  MessageSquare,
} from 'lucide-react';
import { PromptContent, withViewportReferences, ViewportReferences, hasPromptContent } from '../prompt-content';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { needsPluginSetup } from '@/lib/plugin-setup.mjs';
import { PluginSetupGuide } from '../plugin-setup-guide';
import { ComposerMedia } from '../composer-media';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { ModelPicker } from '../model-picker';
import { type WorkspaceState, api, type Run, type Mode } from './use-workspace-state';

const modes = [
  { id: 'plan' as Mode, label: 'Plan', icon: Workflow },
  { id: 'build' as Mode, label: 'Build', icon: PencilRuler },
  { id: 'ask' as Mode, label: 'Ask', icon: MessageSquare },
];

export type ComposerProps = Pick<
  WorkspaceState,
  | 'liveRuntime'
  | 'run'
  | 'executing'
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
  | 'prompt'
  | 'queueAction'
  | 'runtimeConfig'
  | 'changeSettingsOpen'
  | 'offlineFixture'
  | 'desktopPreview'
  | 'connected'
  | 'submit'
  | 'messageError'
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
>;

export function Composer(props: ComposerProps) {
  const {
    liveRuntime,
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
    prompt,
    queueAction,
    runtimeConfig,
    changeSettingsOpen,
    offlineFixture,
    desktopPreview,
    connected,
    submit,
    messageError,
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
  return (
    <div className="composer-area">
      <div className="composer-workflow">
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

        {liveRuntime && promptQueue.length > 0 && (
          <div className="prompt-queue" aria-label="Queued prompts">
            <div className="section-caption">
              QUEUED · {promptQueue.length}/10{' '}
              <span>{queueData?.queue_paused ? 'Paused · prompts saved' : 'Runs in order after the current turn'}</span>
            </div>
            <ol>
              {promptQueue.map((item) => (
                <li key={item.id}>
                  <span>
                    <strong>{item.mode === 'plan' ? 'Plan' : 'Ask'}</strong> <PromptContent text={item.prompt} />
                  </span>
                  <button
                    type="button"
                    disabled={actionBusy || Boolean(prompt.trim())}
                    aria-label={`Edit queued prompt: ${item.prompt}`}
                    onClick={() => void queueAction('edit', item)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={actionBusy}
                    aria-label={`Remove queued prompt: ${item.prompt}`}
                    onClick={() => void queueAction('remove', item)}
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ol>
            {!executing && (
              <Button variant="secondary" disabled={actionBusy} onClick={() => void queueAction('resume')}>
                Resume queue
              </Button>
            )}
          </div>
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

        {messageError && (
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
      <div className="workspace-controls">
        <div className="header-actions">
          {mode !== 'build' && !offlineFixture && (
            <button
              type="button"
              className={cn('context-toggle', useCurrentModel && 'active')}
              aria-label={useCurrentModel ? 'Revit context on' : 'Revit context'}
              aria-pressed={useCurrentModel}
              disabled={busy}
              onClick={() => setUseCurrentModel((value) => !value)}
              title="Include measured Revit context in this request"
            >
              <Box size={13} />
              {useCurrentModel ? 'Revit context on' : 'Revit context'}
            </button>
          )}
          <button
            className="device-status"
            disabled={offlineFixture}
            onClick={(event) => {
              dialogTrigger.current = event.currentTarget;
              setDeviceDialog(true);
            }}
          >
            <span className={cn('connection-dot', selectedDevice?.online && revitSessions === 1 && 'online')} />
            <span>
              {offlineFixture
                ? 'Revit unavailable'
                : !selectedDevice?.online
                  ? 'Connect Revit'
                  : revitSessions === 1
                    ? 'Revit ready'
                    : revitSessions === 0
                      ? 'Enable Revit bridge'
                      : 'Checking Revit'}
            </span>
            <ChevronDown size={12} />
          </button>
        </div>
      </div>
      {needsPluginSetup(mode, devices) && <PluginSetupGuide onCheck={refresh} onUsePlan={() => setMode('plan')} />}
      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(prompt, mode === 'build' && prompt.toLowerCase().includes('verified 3bhk'));
        }}
      >
        {draftReferences.length > 0 && (
          <div className="saved-source-strip" aria-label="Draft design references">
            {draftReferences.map((row, i) => (
              <span className="draft-reference-chip" key={i}>
                {row.target.kind === 'source' ? 'Source region' : row.target.key} / {row.intent} /{' '}
                {row.fingerprint.slice(0, 10)}
                {queueData?.design?.candidates.some((candidate) => candidate.fingerprint === row.fingerprint)
                  ? ''
                  : ' / saved version, review against current geometry'}
              </span>
            ))}
          </div>
        )}
        {commandsOpen && (
          <div className="slash-commands" id="workflow-commands" role="listbox" aria-label="Workflow commands">
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
          }}
          aria-controls={commandsOpen ? 'workflow-commands' : undefined}
          aria-activedescendant={commandsOpen ? `workflow-${commandIndex}` : undefined}
          placeholder={
            hasContent ? 'Ask about this plan, or describe a change…' : 'Describe your project, or ask anything…'
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
              onSettings={() => changeSettingsOpen(true)}
              onSkill={(id) => setPrompt((previous) => previous + '\nUse the reviewed native skill ' + id + '.')}
              onCommand={(command) => {
                if (command === 'plan') setMode('plan');
                setPrompt('/' + command + ' ' + prompt.replace(/^\/(inspect|plan|compare|verify|handoff)\s*/, ''));
                document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();
              }}
            />
          </div>
          <DropdownMenuPrimitive.Root>
            <DropdownMenuPrimitive.Trigger asChild>
              <button
                type="button"
                className="studio-mode-trigger"
                aria-label="Task mode"
                disabled={busy || mediaBusy || !workspaceReady}
              >
                {modes.find((item) => item.id === mode)?.label ?? mode}
                <ChevronDown size={12} />
              </button>
            </DropdownMenuPrimitive.Trigger>
            <DropdownMenuPrimitive.Portal>
              <DropdownMenuPrimitive.Content className="action-menu" side="top" align="start">
                {modes.map((item) => (
                  <DropdownMenuPrimitive.Item
                    key={item.id}
                    disabled={busy || mediaBusy || !workspaceReady || (buildUnavailable && item.id === 'build')}
                    onSelect={() => {
                      if (
                        item.id === 'build' &&
                        run?.data.agent_design &&
                        drawingCurrent &&
                        !run.data.compiled &&
                        !run.data.operation_id
                      )
                        void switchDrawingToBuild();
                      else setMode(item.id);
                    }}
                  >
                    <item.icon size={14} />
                    {item.label}
                    {item.id === mode && <Check size={13} />}
                  </DropdownMenuPrimitive.Item>
                ))}
              </DropdownMenuPrimitive.Content>
            </DropdownMenuPrimitive.Portal>
          </DropdownMenuPrimitive.Root>

          <div className="composer-right">
            <div className="studio-model-control">
              {desktopAvailable && !chatModels.length ? (
                <Button type="button" variant="ghost" size="sm" onClick={() => changeSettingsOpen(true)}>
                  Connect models
                </Button>
              ) : (
                <ModelPicker
                  model={model}
                  models={chatModels}
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
            {desktopAvailable && chatModels.length > 0 && !chatModels.includes(model) && (
              <small role="status">Selected model unavailable · choose a model</small>
            )}
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
                onSettings={() => changeSettingsOpen(true)}
                onSkill={(id) => setPrompt((previous) => previous + '\nUse the reviewed native skill ' + id + '.')}
                onCommand={(command) => {
                  if (command === 'plan') setMode('plan');
                  setPrompt('/' + command + ' ' + prompt.replace(/^\/(inspect|plan|compare|verify|handoff)\s*/, ''));
                  document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message DATUMM"]')?.focus();
                }}
              />
            </div>
            {executing && (
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
            {(!executing || liveRuntime) && (
              <button
                className="send-button"
                type="submit"
                disabled={
                  !hasPromptContent(prompt) ||
                  !workspaceReady ||
                  !connected ||
                  actionBusy ||
                  mediaBusy ||
                  (executing && !run)
                }
                aria-label={queueMessage ? 'Queue message' : 'Send message'}
                title={queueMessage ? 'Save this prompt to run after the current turn' : 'Send message'}
              >
                <ArrowUp size={18} />
              </button>
            )}
          </div>
        </div>
      </form>
      {!hasContent && (
        <div className="studio-new-chat-context">
          <span>Hosted workspace</span>
          <span>{selectedDevice?.online && revitSessions === 1 ? contextView : 'Revit not connected'}</span>
        </div>
      )}
      <div className="studio-composer-meta">
        <span title={model}>
          {model.split('/').at(-1)} · {reasoningEffort} · next message
        </span>
        <span>Hosted conversation context</span>
      </div>
      {!hasContent && (
        <>
          <div className="studio-new-chat-suggestions">
            <button
              type="button"
              disabled={!workspaceReady}
              onClick={() => {
                setMode('plan');
                setPrompt('Help me design a floor plan. Ask for the site dimensions and room requirements first.');
              }}
            >
              <PencilRuler size={14} />
              Generate a plan
            </button>
            <button
              type="button"
              disabled={!workspaceReady}
              onClick={() => {
                setMode('ask');
                setUseCurrentModel(true);
                setPrompt('Inspect the active Revit model and summarize the measured evidence.');
              }}
            >
              <Workflow size={14} />
              Review my model
            </button>
            <button
              type="button"
              disabled={!workspaceReady}
              onClick={() => {
                setMode('ask');
                setPrompt('Help me annotate a drawing. Ask which drawing and annotations I need.');
              }}
            >
              <Pencil size={14} />
              Annotate a drawing
            </button>
          </div>
          <p className="studio-new-chat-assurance">Think, plan, review. You approve changes before they reach Revit.</p>
        </>
      )}
    </div>
  );
}
