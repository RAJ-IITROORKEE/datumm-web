'use client';

import { useId, useState } from 'react';
import { ChevronDown, Search, Workflow } from 'lucide-react';
import type { TaskEvent } from '@/lib/task-projection';
import { activityStateLabel } from '@/lib/process-activity.mjs';
import { ActivitySummary, AgentActivity, type latestTaskActivity } from '../agent-activity';
import { ContextUsage, AgentMemory } from '../agent-memory';
import { AgentScheduler } from '../agent-scheduler';
import { AgentSpecialists } from '../agent-specialists';
import { PipelineTrace } from '../pipeline-trace';
import type { Mode, Run } from './use-workspace-state';
import styles from './activity-panel.module.css';

export type ActivityPanelProps = {
  run: Run | null;
  runId: string | null;
  currentActivity: ReturnType<typeof latestTaskActivity> | null;
  executing: boolean;
  desktopAvailable: boolean;
  mode: Mode;
  model: string;
  eventDetail: (event: TaskEvent) => string;
};

const label = (stage: string) => stage === 'paused_limit' ? 'Analysis checkpoint' : stage.replaceAll('_', ' ');
// Model step records are bookkeeping, not public reasoning text.
const publicDetail = (event: TaskEvent, detail: ActivityPanelProps['eventDetail']) => event.stage === 'model_turn'
  ? event.detail.match(/step \d+/i)?.[0] ?? 'Model step'
  : detail(event);

export function ActivityPanel({ run, runId, currentActivity, executing, desktopAvailable, mode, model, eventDetail }: ActivityPanelProps) {
  const selectedRun = run && (!runId || run.id === runId) ? run : null;
  const identity = `${runId || selectedRun?.id || 'no-task'}:${currentActivity?.index ?? 0}`;
  const emptyView = { identity, query: '', stage: '', diagnostics: false, runtime: false, trace: false, memory: false };
  const [storedView, setView] = useState(emptyView);
  // Derive defaults synchronously so a task/turn switch cannot flash old filters or disclosures.
  const view = storedView.identity === identity ? storedView : emptyView;
  if (storedView.identity !== identity) setView(emptyView);
  const update = (patch: Partial<typeof emptyView>) => setView({ ...view, ...patch });
  const id = useId();

  if (!selectedRun) return <section className={styles.panel} aria-label="Task activity">
    <h2 className={styles.title}>Task activity</h2>
    <div className={styles.empty}>
      <Workflow size={21} aria-hidden="true" />
      <p>{runId ? 'Selected task activity is unavailable.' : 'Start a task to see its activity.'}</p>
      <small>{runId ? 'The selected task record has not loaded. Its activity will appear when available.' : 'Recorded steps, tool results and task details will appear here.'}</small>
    </div>
  </section>;

  const events = (currentActivity?.events ?? [])
    .filter(event => !event.taskId || event.taskId === selectedRun.id)
    .slice().sort((a, b) => a.index - b.index);
  const terms = view.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  const filtered = events.filter(event => (!view.stage || event.stage === view.stage) && terms.every(term =>
    `${label(event.stage)} ${publicDetail(event, eventDetail)} ${event.agent?.name ?? ''} ${event.agent?.role ?? ''}`.toLocaleLowerCase().includes(term)));
  const stages = Array.from(new Set(events.map(event => event.stage)));
  const foreignRuntime = Boolean(currentActivity?.manifest && currentActivity.manifest.taskId !== selectedRun.id);
  const manifest = currentActivity?.manifest?.taskId === selectedRun.id ? currentActivity.manifest : undefined;
  const usage = currentActivity?.usage?.rootTaskId === selectedRun.id ? currentActivity.usage : undefined;
  const evidence = foreignRuntime ? [] : currentActivity?.evidence ?? [];
  const todos = foreignRuntime ? [] : currentActivity?.todos ?? [];
  const waiting = !foreignRuntime && Boolean(currentActivity?.waiting) && !['completed', 'failed', 'cancelled', 'interrupted', 'paused_limit', 'paused_recovery', 'partial', 'stale'].includes(selectedRun.status);
  const filteredView = Boolean(view.query || view.stage);
  const state = selectedRun.status === 'queued' ? 'Queued'
    : selectedRun.status === 'running' && !executing && !waiting ? 'Running'
    : activityStateLabel(selectedRun.status, executing, waiting);

  return <section className={styles.panel} aria-label="Task activity">
    <header className={styles.header}>
      <h2 className={styles.title}>{selectedRun.title || 'Task activity'}</h2>
      <span className={styles.status} data-state={selectedRun.status} role="status">{state}</span>
    </header>
    <dl className={styles.facts}>
      <div><dt>Task</dt><dd><code>{selectedRun.id}</code></dd></div>
      <div><dt>Mode</dt><dd>{selectedRun.mode ?? mode}</dd></div>
      <div><dt>Model</dt><dd>{selectedRun.model || model || 'Unavailable'}</dd></div>
      {typeof selectedRun.taskVersion === 'number' && <div><dt>Task version</dt><dd>{selectedRun.taskVersion}</dd></div>}
    </dl>

    <section className={styles.record} aria-labelledby={`${id}-events`}>
      <div className={styles.sectionHeading}>
        <h3 id={`${id}-events`}>Latest turn activity</h3>
        <span>{events.length} loaded {events.length === 1 ? 'event' : 'events'}</span>
      </div>
      {events.length > 0 && <div className={styles.filters}>
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
      </div>}
      {events.length === 0 ? <div className={styles.empty}>
        <p>No runtime events were recorded for this turn.</p>
        <small>{executing ? 'The task status is shown above. Recorded events will appear as they arrive.' : 'Task status and available diagnostics are shown separately.'}</small>
      </div> : filtered.length === 0 ? <p className={styles.noMatch} role="status">No loaded events match these filters.</p> : <>
        {filteredView && <p className={styles.resultCount} role="status">{filtered.length} of {events.length} loaded events match.</p>}
        <ActivitySummary events={filtered} eventDetail={eventDetail} />
        <p className={styles.recordNote}>Chronological public steps. Open Task diagnostics for the full event record, including additional event types.</p>
      </>}
    </section>

    <details key={identity} className={styles.diagnostics} open={view.diagnostics} onToggle={event => {
      if (event.currentTarget.open !== view.diagnostics) update({ diagnostics: event.currentTarget.open });
    }}>
      <summary><Workflow size={15} aria-hidden="true" /><span>Task diagnostics</span><ChevronDown size={14} aria-hidden="true" /></summary>
      {view.diagnostics && <div className={styles.diagnosticBody}>
        <p className={styles.recordNote}>Recorded evidence is read-only. Model changes require their own approval.</p>
        {foreignRuntime && <p className={styles.recordNote}>Runtime evidence belongs to a different task and is unavailable here.</p>}
        <ContextUsage usage={usage} busy={executing} />
        {selectedRun.data.agent_scheduler && <AgentScheduler value={selectedRun.data.agent_scheduler} />}
        {selectedRun.data.agent_specialists?.length ? <AgentSpecialists results={selectedRun.data.agent_specialists} taskId={selectedRun.id} /> : null}

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

        {desktopAvailable && <details className={styles.disclosure} open={view.trace} onToggle={event => {
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
