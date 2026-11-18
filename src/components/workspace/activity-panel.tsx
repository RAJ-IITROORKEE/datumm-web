'use client';

import { useId, useState } from 'react';
import { ChevronDown, Search, Workflow } from 'lucide-react';
import { useHost } from '../host-provider';
import type { TaskEvent } from '@/lib/task-projection';
import { activityStateLabel } from '@/lib/process-activity.mjs';
import { deriveTodos } from '@/lib/agent-todos.mjs';
import { stopRequested } from '@/lib/stop-requested.mjs';
import { ActivitySummary, AgentActivity, type latestTaskActivity } from '../agent-activity';
import { ContextUsage, AgentMemory, type NativeUsageData } from '../agent-memory';
import { AgentScheduler } from '../agent-scheduler';
import { AgentSpecialists } from '../agent-specialists';
import { PipelineTrace } from '../pipeline-trace';
import type { Mode, Run } from './use-workspace-state';
import { EmptyState } from '../vendor/affectui/empty-state-clean';
import { PlanDock } from './plan-dock';
import { RunStepsView, useRunSteps } from './run-steps';
import styles from './activity-panel.module.css';

export type ActivityPanelProps = {
  run: Run | null;
  runId: string | null;
  currentActivity: ReturnType<typeof latestTaskActivity> | null;
  executing: boolean;
  mode: Mode;
  model: string;
  eventDetail: (event: TaskEvent) => string;
  /** Backend capability `runSteps`: shows the Run steps tree. */
  runSteps?: boolean;
};

const label = (stage: string) => stage === 'paused_limit' ? 'Analysis checkpoint' : stage.replaceAll('_', ' ');
const modeName = (mode: string) => ({ ask: 'Ask', plan: 'Plan', build: 'Build' }[mode] ?? mode);
// Format only the reported identifier; never infer a provider or substitute a model.
const modelName = (model: string) => {
  if (!model) return 'Unavailable';
  const [provider, ...parts] = model.split('/');
  if (parts.length && !['openai', 'anthropic', 'google', 'qwen'].includes(provider.toLowerCase())) return model;
  return (parts.at(-1) ?? provider).replace(/^gpt-/i, 'GPT-')
    .replace(/(^|[-_])([a-z])/g, (_, separator: string, letter: string) => `${separator ? ' ' : ''}${letter.toUpperCase()}`);
};
// Model step records are bookkeeping, not public reasoning text.
const publicDetail = (event: TaskEvent, detail: ActivityPanelProps['eventDetail']) => event.stage === 'model_turn'
  ? event.detail.match(/step \d+/i)?.[0] ?? 'Model step'
  : detail(event);

export function ActivityPanel({ run, runId, currentActivity, executing, mode, model, eventDetail, runSteps = false }: ActivityPanelProps) {
  const selectedRun = run && (!runId || run.id === runId) ? run : null;
  const identity = `${runId || selectedRun?.id || 'no-task'}:${currentActivity?.index ?? 0}`;
  const emptyView = { identity, query: '', stage: '', reviews: false, diagnostics: false, runtime: false, trace: false, memory: false, steps: false };
  const [storedView, setView] = useState(emptyView);
  // Derive defaults synchronously so a task/turn switch cannot flash old filters or disclosures.
  const view = storedView.identity === identity ? storedView : emptyView;
  if (storedView.identity !== identity) setView(emptyView);
  const update = (patch: Partial<typeof emptyView>) => setView({ ...view, ...patch });
  const id = useId();
  // The trace is a host feature; the web host reports it off until hosted run traces exist (TR1).
  const showTrace = useHost().capabilities.has('runTrace');
  const steps = useRunSteps(runSteps && view.steps && Boolean(run), run?.id ?? '', `${run?.status ?? ''}:${currentActivity?.index ?? 0}`);

  if (!selectedRun) return <section className={styles.panel} aria-label="Task activity">
    <h2 className={styles.title}>Task activity</h2>
    <EmptyState bare className={styles.empty} icon={<Workflow size={21} aria-hidden="true"/>}
      title={runId ? 'Selected task activity is unavailable.' : 'Start a task to see its activity.'}
      text={runId ? 'The selected task record has not loaded. Its activity will appear when available.' : 'Recorded steps, tool results and task details will appear here.'}
    />
  </section>;

  const taskLevelEvents = Boolean(currentActivity && !currentActivity.events.length && currentActivity.taskEvents?.length);
  const events = (taskLevelEvents ? currentActivity?.taskEvents ?? [] : currentActivity?.events ?? [])
    .filter(event => !event.taskId || event.taskId === selectedRun.id)
    .slice().sort((a, b) => a.index - b.index);
  const terms = view.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = events.filter(event => (!view.stage || event.stage === view.stage) && terms.every(term =>
    `${label(event.stage)} ${publicDetail(event, eventDetail)} ${event.agent?.name ?? ''} ${event.agent?.role ?? ''}`.toLocaleLowerCase().includes(term)));
  const stages = Array.from(new Set(events.map(event => event.stage)));
  const foreignRuntime = Boolean(currentActivity?.manifest && currentActivity.manifest.taskId !== selectedRun.id);
  const manifest = currentActivity?.manifest?.taskId === selectedRun.id ? currentActivity.manifest : undefined;
  const suppliedUsage = selectedRun.data.usage;
  const usage = currentActivity?.usage?.rootTaskId === selectedRun.id && (currentActivity.usage.scope === 'execution_ledger' ? currentActivity.usage.ownerTaskId === selectedRun.id && Boolean(currentActivity.usage.ledgerExecutionId) : !currentActivity.usage.ownerTaskId || currentActivity.usage.ownerTaskId === selectedRun.id) ? currentActivity.usage
    : suppliedUsage && suppliedUsage.scope !== 'execution_ledger' && selectedRun.executionId && suppliedUsage.rootTaskId === selectedRun.executionId && !suppliedUsage.ownerTaskId
      ? {...suppliedUsage,scope:'execution_ledger' as const,ownerTaskId:selectedRun.id,ledgerExecutionId:selectedRun.executionId} : undefined;
  const nativeRecord = (selectedRun.data as typeof selectedRun.data & {native_usage?: NativeUsageData}).native_usage;
  const nativeUsage = nativeRecord?.taskId === selectedRun.id && nativeRecord.scope === 'root_session' && (!manifest?.sessionId || nativeRecord.sessionId === manifest.sessionId) ? nativeRecord : undefined;
  const evidence = foreignRuntime ? [] : currentActivity?.evidence ?? [];
  const todos = foreignRuntime ? [] : currentActivity?.todos ?? [];
  const plan = selectedRun.data.agent_task_plan;
  const runPlan = !todos.length && (!plan?.turnId || plan.turnId === currentActivity?.turnId) ? plan : undefined;
  const checklist = deriveTodos({plan:runPlan,todos,active:executing,settled:['completed','failed','cancelled','interrupted','partial','stale'].includes(selectedRun.status)});
  const waiting = !foreignRuntime && Boolean(currentActivity?.waiting) && !['completed', 'failed', 'cancelled', 'interrupted', 'paused_limit', 'paused_recovery', 'partial', 'stale'].includes(selectedRun.status);
  const cancelPending = stopRequested(selectedRun, [...(selectedRun.events ?? []), ...events]);
  const filteredView = Boolean(view.query || view.stage);
  const state = cancelPending ? 'Stop requested' : selectedRun.status === 'queued' ? 'Queued'
    : selectedRun.status === 'running' && !executing && !waiting ? 'Running'
    : activityStateLabel(selectedRun.status, executing, waiting);

  return <section className={styles.panel} aria-label="Task activity">
    <header className={styles.header}>
      <h2 className={styles.title}>{taskLevelEvents ? 'Task activity' : 'Latest turn'}</h2>
      <span className={styles.status} data-state={cancelPending?'cancel_requested':selectedRun.status} role="status">{state}</span>
    </header>
    {checklist.length > 0 ? <PlanDock title={runPlan && !(runPlan.turnId && runPlan.turnId === currentActivity?.turnId) ? 'Task plan · turn not recorded' : 'Latest turn checklist'} items={checklist} /> : <p className={styles.recordNote}>No checklist recorded for this turn.</p>}

    <div className={styles.context}><ContextUsage usage={usage} nativeUsage={nativeUsage} busy={executing} compact /></div>

    <section className={styles.record} aria-labelledby={`${id}-events`}>
      <div className={styles.sectionHeading}>
        <h3 id={`${id}-events`}>{taskLevelEvents ? "Task activity · turn not recorded" : "Latest turn activity"}</h3>
        <span>{events.length} loaded {events.length === 1 ? 'event' : 'events'}</span>
      </div>
      {events.length > 0 && <details className={styles.filterDisclosure}><summary>Filter events</summary><div className={styles.filters}>
        <label className={styles.search}>
          <Search size={15} aria-hidden="true" />
          <input type="search" aria-label="Search loaded events" placeholder="Search loaded events" value={view.query} onChange={event => update({ query: event.currentTarget.value })} />
        </label>
        <label className={styles.eventType}>Event type
          <select value={view.stage} onChange={event => update({ stage: event.currentTarget.value })}>
            <option value="">All types</option>
            {stages.map(stage => <option key={stage} value={stage}>{label(stage)}</option>)}
          </select>
        </label>
        {filteredView && <button type="button" className={styles.clear} onClick={() => update({ query: '', stage: '' })}>Clear filters</button>}
      </div></details>}
      {events.length === 0 ? <div className={styles.empty}>
        <p>No runtime events were recorded for this turn.</p>
        <small>{executing ? 'The task status is shown above. Recorded events will appear as they arrive.' : 'Task status and available diagnostics are shown separately.'}</small>
      </div> : filtered.length === 0 ? <p className={styles.noMatch} role="status">No loaded events match these filters.</p> : <>
        {filteredView && <p className={styles.resultCount} role="status">{filtered.length} of {events.length} loaded events match.</p>}
        <ActivitySummary compact events={filtered} eventDetail={eventDetail} />
        <p className={styles.recordNote}>Recorded steps for this turn. Open Task diagnostics for tool evidence and the full event record.</p>
      </>}
    </section>

    <dl className={styles.facts}>
      <div><dt>Mode</dt><dd>{modeName(selectedRun.mode ?? mode)}</dd></div>
      <div><dt>Model</dt><dd>{modelName(selectedRun.model || model)}</dd></div>
    </dl>

    {selectedRun.data.agent_specialists?.length ? <details key={`reviews-${identity}`} className={styles.reviews} open={view.reviews} onToggle={event => {
      if (event.currentTarget.open !== view.reviews) update({ reviews: event.currentTarget.open });
    }}>
      <summary><span>Recorded specialist reviews</span><ChevronDown size={14} aria-hidden="true" /></summary>
      {view.reviews && <><p className={styles.recordNote}>Recorded for this task; timing within the task is not specified.</p><AgentSpecialists results={selectedRun.data.agent_specialists} taskId={selectedRun.id} /></>}
    </details> : null}

    {runSteps && <details key={`steps-${identity}`} className={styles.disclosure} open={view.steps} onToggle={event => {
      if (event.currentTarget.open !== view.steps) update({ steps: event.currentTarget.open });
    }}>
      <summary>Run steps<ChevronDown size={14} aria-hidden="true" /></summary>
      {view.steps && <RunStepsView state={steps} />}
    </details>}

    <details key={identity} className={styles.diagnostics} open={view.diagnostics} onToggle={event => {
      if (event.currentTarget.open !== view.diagnostics) update({ diagnostics: event.currentTarget.open });
    }}>
      <summary><Workflow size={15} aria-hidden="true" /><span>Task diagnostics</span><ChevronDown size={14} aria-hidden="true" /></summary>
      {view.diagnostics && <div className={styles.diagnosticBody}>
        <p className={styles.recordNote}>Recorded evidence is read-only. Model changes require their own approval.</p>
        <dl className={styles.facts}>
          <div><dt>Task</dt><dd>{selectedRun.title || 'Untitled task'}</dd></div>
          <div><dt>Task ID</dt><dd><code>{selectedRun.id}</code></dd></div>
          {typeof selectedRun.taskVersion === 'number' && <div><dt>Task version</dt><dd>{selectedRun.taskVersion}</dd></div>}
          <div><dt>Model ID</dt><dd><code>{selectedRun.model || model || 'Unavailable'}</code></dd></div>
        </dl>
        {foreignRuntime && <p className={styles.recordNote}>Runtime evidence belongs to a different task and is unavailable here.</p>}
        {selectedRun.data.agent_scheduler && <AgentScheduler value={selectedRun.data.agent_scheduler} />}

        <details className={styles.disclosure} open={view.runtime} onToggle={event => {
          if (event.currentTarget.open !== view.runtime) update({ runtime: event.currentTarget.open });
        }}>
          <summary>Runtime and tool evidence<ChevronDown size={14} aria-hidden="true" /></summary>
          {view.runtime && <AgentActivity
            nativeMessages={executing && !foreignRuntime ? currentActivity?.nativeMessages : undefined}
            events={events} active={executing} waiting={waiting} status={selectedRun.status}
            mode={selectedRun.mode ?? mode} model={selectedRun.model ?? model}
            todos={todos} manifest={manifest}
            evidence={evidence} showFeed={false}
          />}
          {view.runtime && !events.length && !manifest && !evidence.length && !todos.length && <p className={styles.recordNote}>No runtime or tool evidence was recorded for this turn.</p>}
        </details>

        {selectedRun.data.agent_memory && <details className={styles.disclosure} open={view.memory} onToggle={event => {
          if (event.currentTarget.open !== view.memory) update({ memory: event.currentTarget.open });
        }}>
          <summary>Saved task memory<ChevronDown size={14} aria-hidden="true" /></summary>
          {view.memory && <AgentMemory memory={selectedRun.data.agent_memory} metrics={selectedRun.data.agent_context} runId={selectedRun.id} />}
        </details>}

        {showTrace && <details className={styles.disclosure} open={view.trace} onToggle={event => {
          if (event.currentTarget.open !== view.trace) update({ trace: event.currentTarget.open });
        }}>
          <summary>Local pipeline trace<ChevronDown size={14} aria-hidden="true" /></summary>
          {view.trace && <PipelineTrace key={selectedRun.id} taskId={selectedRun.id} />}
        </details>}

        <div className={styles.sectionHeading}><h3>Event record</h3><span>{filtered.length} {filtered.length === 1 ? 'event' : 'events'}</span></div>
        {filtered.length ? <ol className={styles.timeline} aria-label="Loaded event record">
          {filtered.map(event => <li key={event.eventId ?? event.index}>
            <div><strong>{label(event.stage)}</strong>
              {event.at && Number.isFinite(Date.parse(event.at)) && <time dateTime={event.at}>{new Date(event.at).toLocaleTimeString()}</time>}
            </div>
            <p>{publicDetail(event, eventDetail)}</p>
            {event.agent && <small>{event.agent.name ?? event.agent.role ?? event.agent.id}</small>}
          </li>)}
        </ol> : <p className={styles.recordNote}>{events.length ? 'No loaded events match these filters.' : 'No additional timeline details were recorded.'}</p>}
      </div>}
    </details>
  </section>;
}
