'use client';

import { useState, type ReactNode } from 'react';
import { Collapsible } from 'radix-ui';
import { Check, ChevronDown, CircleHelp, Circle, Loader2, Users, X } from 'lucide-react';
import { MessageResponse } from '../ai-elements/message';
import { activityBatches, type RunManifest, type ToolEvidence } from '../agent-activity';
import type { SchedulerView } from '../agent-scheduler';
import type { SpecialistResult } from '../agent-specialists';
import type { TaskEvent } from '@/lib/task-projection';
import { latestNote, nestProcess, stageSpans } from '@/lib/turn-nesting.mjs';
import { activityStateLabel, aggregateStatus, processRows, processStatus, settledStatus, type ProcessStatus, type ProcessRow } from '@/lib/process-activity.mjs';
import styles from './turn-process.module.css';

type Status = ProcessStatus;
type Row = ProcessRow;
const label = (value: string) => value.replaceAll('_', ' ');
const rowLabel = (status: Status) => status === 'done' ? 'Completed' : status === 'unconfirmed' ? 'Not confirmed' : label(status);
const settledLifecycles = new Set(['completed', 'failed', 'error', 'cancelled', 'interrupted', 'paused_limit', 'paused_recovery', 'partial', 'stale', 'blocked']);

function StatusIcon({ status, team }: { status: Status; team?: boolean }) {
  if (status === 'running') return <Loader2 size={13} className={styles.spinner} aria-hidden="true" />;
  if (status === 'failed') return <X size={13} aria-hidden="true" />;
  if (status === 'done') return team ? <Users size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />;
  return status === 'waiting' || status === 'blocked' ? <CircleHelp size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />;
}

/** Names and statuses only: raw tool output stays in the Activity tab. */
function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className={styles.rows}>
      {rows.map((row) => (
        <li key={row.key} data-status={row.status}>
          <StatusIcon status={row.status} team={row.team} />
          <span className={styles.rowName}>{row.name}</span>
          <small className={styles.rowState}>{rowLabel(row.status)}</small>
        </li>
      ))}
    </ul>
  );
}

function Node({ title, status, count, summary, children }: { title: string; status: Status; count?: number; summary?: string; children?: ReactNode }) {
  if (!children) return <><div className={styles.leaf} data-status={status}><StatusIcon status={status} /><span className={styles.rowName}>{title}</span><small className={styles.rowState}>{rowLabel(status)}</small></div>{summary && <p className={styles.note}>{summary}</p>}</>;
  return (
    <Collapsible.Root className={styles.node} data-status={status}>
      <Collapsible.Trigger className={styles.nodeTrigger}>
        <StatusIcon status={status} />
        <span className={styles.rowName}>{title}</span>
        <small className={styles.rowState}>{rowLabel(status)}{count ? ` · ${count}` : ''}</small>
        <ChevronDown size={13} className={styles.chevron} aria-hidden="true" />
      </Collapsible.Trigger>
      <Collapsible.Content className={styles.nodeContent}>{summary && <p className={styles.note}>{summary}</p>}{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

type Props = {
  events: TaskEvent[];
  active: boolean;
  waiting: boolean;
  status?: string;
  manifest?: RunManifest;
  evidence?: ToolEvidence[];
  nativeMessages?: { id: string; text: string; finish: string | null }[];
  scheduler?: SchedulerView | null;
  specialists?: SpecialistResult[];
  evidenceExtra?: ReactNode;
  /** Plan step key to title, for nested steps. */
  stepTitles?: Record<string, string>;
};

function activityFlags({ active, waiting, status }: Props) {
  return {
    active: active && (!status || ['queued', 'running', 'in_progress'].includes(status)),
    waiting: !settledLifecycles.has(status ?? '') && (waiting || ['needs_input', 'waiting', 'waiting_for_input', 'awaiting_approval'].includes(status ?? '')),
  };
}

function summarize(props: Props) {
  let { events, evidence } = props;
  const { status, manifest, nativeMessages = [], scheduler, specialists, evidenceExtra } = props;
  const { active, waiting } = activityFlags(props);
  const seen = new Set<string | number>();
  events = events.filter(event => {
    const key = event.eventId ?? event.index;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.index - b.index);
  evidence = [...new Map((evidence ?? manifest?.tools ?? []).map(call => [call.callId, call])).values()];
  const nested = nestProcess(events);
  const batches = activityBatches(nested.rest).map((batch) => ({ batch, rows: processRows(batch, active, waiting) })).filter((step) => step.rows.length > 0);
  const children = manifest?.children ?? [];
  // Scheduler checklist rows are not evidence that a worker ran.
  const jobs = (scheduler?.steps ?? []).filter(job => job.status !== 'pending' && job.status !== 'queued');
  const team = specialists ?? [];
  // Hosted lead turns carry only stage events: fall back to flat stage spans.
  const spans = batches.length || nested.steps.length ? [] : stageSpans(events);
  const updates = nativeMessages.filter((row) => active || row.finish !== 'stop');
  const live = active && !waiting && (!status || ['running', 'in_progress'].includes(status));
  const hasDetails = Boolean(batches.length || nested.steps.length || spans.length || evidence.length || children.length || jobs.length || team.length || evidenceExtra);
  return { events, evidence, nested, batches, spans, children, jobs, team, updates, live, hasDetails, visible: Boolean(hasDetails || active || waiting || status || updates.length) };
}

/** True when the turn has anything to show, so the agent label is not left on its own. */
export const turnProcessVisible = (props: Props) => summarize(props).visible;

function lifecycle(props: Props) {
  const status = props.status;
  const { active, waiting } = activityFlags(props);
  const labels: Record<string, string> = {
    queued: 'Queued', cancel_requested: 'Stop requested', cancelling: 'Stop requested',
    awaiting_approval: 'Waiting for approval', error: 'Failed',
    disconnected: 'Updates unavailable', reconnecting: 'Refreshing activity',
    unavailable: 'Activity unavailable', unknown: 'Status unavailable', permission_denied: 'Activity unavailable',
  };
  const recognized = ['running', 'in_progress', 'needs_input', 'waiting', 'waiting_for_input', 'failed', 'cancelled', 'interrupted', 'paused_limit', 'paused_recovery', 'reconciling', 'awaiting_approval', 'blocked', 'partial', 'stale', 'completed'];
  if (status && labels[status]) return labels[status];
  if (status && !recognized.includes(status)) return 'Status unavailable';
  if (['waiting', 'waiting_for_input'].includes(status ?? '')) return 'Waiting for your input';
  return activityStateLabel(status, active && !waiting, waiting);
}

function recordedDuration(manifest: RunManifest | undefined, events: TaskEvent[]) {
  if (typeof manifest?.elapsedMs === 'number' && Number.isFinite(manifest.elapsedMs) && manifest.elapsedMs >= 0) {
    return { text: `${(manifest.elapsedMs / 1000).toFixed(manifest.elapsedMs < 1000 ? 1 : 0)} s`, approximate: false };
  }
  const times = events.map(event => Date.parse(event.at)).filter(Number.isFinite);
  if (times.length < 2) return null;
  const elapsed = Math.max(...times) - Math.min(...times);
  return elapsed > 0 ? { text: `≈ ${Math.max(1, Math.round(elapsed / 1000))} s`, approximate: true } : null;
}

/** One collapsed accordion per agent turn: step, then agent, then tool calls (flat steps when the backend sends no agent data). */
export function TurnProcess(props: Props) {
  // No streaming effect: the user's choice survives updates and completion.
  const [open, setOpen] = useState(false);
  const { manifest, evidenceExtra, stepTitles = {} } = props;
  const { active, waiting } = activityFlags(props);
  const { events, evidence, nested, batches, spans, children, jobs, team, updates, live, hasDetails, visible } = summarize(props);
  const public_ = updates.map((row) => <div key={row.id} className="activity-update"><MessageResponse isAnimating={live && !row.finish}>{row.text}</MessageResponse></div>);
  if (!visible) return null;
  if (!hasDetails && !active && !waiting && !props.status) return <>{public_}</>;
  const elapsed = recordedDuration(manifest, events);
  const eventRows = processRows(events, active, waiting);
  const failed = eventRows.some(row => row.status === 'failed') || evidence.some(call => processStatus(call.status) === 'failed') || children.some(child => processStatus(child.state) === 'failed') || team.some(result => result.status === 'failed');
  const unconfirmed = eventRows.some(row => row.status === 'unconfirmed') || evidence.some(call => settledStatus(processStatus(call.status), active, waiting) === 'unconfirmed') || children.some(child => settledStatus(processStatus(child.state), active, waiting) === 'unconfirmed');
  const stateLabel = lifecycle(props);
  const summaryStatus = live ? 'running' : waiting ? 'waiting' : settledStatus(processStatus(props.status ?? 'recorded'), active, waiting);
  const note = live ? latestNote(events, spans) : '';
  const eventCallIds = new Set(eventRows.map(row => row.callId).filter(Boolean));
  const agents: { key: string; title: string; status: Status; tools: Row[] }[] = [
    ...children.map((child) => ({ key: `c-${child.sessionId}`, title: `${label(child.role)}`, status: settledStatus(processStatus(child.state), active, waiting), tools: evidence.filter((call) => call.sessionId === child.sessionId && !eventCallIds.has(call.callId)).map((call) => ({ key: call.callId, name: label(call.tool.replace(/^datumm_revit_/, '')), status: settledStatus(processStatus(call.status), active, waiting) })) })),
    ...team.map((result, i) => ({ key: `s-${result.role}-${i}`, title: `${label(result.role)} review`, status: processStatus(result.status), tools: [] })),
  ];
  const extraTools: Row[] = evidence.filter(call => !eventCallIds.has(call.callId) && !children.some(child => call.sessionId === child.sessionId)).map(call => ({ key: call.callId, name: label(call.tool.replace(/^datumm_revit_/, '')), status: settledStatus(processStatus(call.status), active, waiting) }));
  return (
    <>
      {public_}
      <Collapsible.Root open={open} onOpenChange={setOpen} className={styles.process} data-status={summaryStatus}>
        <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{stateLabel}</span>
        <Collapsible.Trigger className={styles.trigger}>
          <StatusIcon status={summaryStatus} />
          <span className={styles.summary}><span className={styles.lifecycle}>{stateLabel}</span>{elapsed && <span className={styles.metadata} title={elapsed.approximate ? 'Approximate duration between recorded events' : 'Recorded run duration'}> · {elapsed.text}</span>}{failed && <span className={styles.failure}> · Recorded work failed</span>}{unconfirmed && <span className={styles.metadata}> · Some work unconfirmed</span>}</span>
          <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
        </Collapsible.Trigger>
        <Collapsible.Content className={styles.content}>
        {note && <p className={styles.note}>{note}</p>}
        {(waiting || ['needs_input', 'awaiting_approval', 'waiting', 'waiting_for_input'].includes(props.status ?? '')) && <p className={styles.note}>Review the question or approval in this conversation.</p>}
        {!hasDetails && <p className={styles.note}>{live ? 'Waiting for recorded activity.' : 'Activity details are unavailable for this turn.'}</p>}
        <div className={styles.tree}>
          {batches.map(({ batch, rows }) => <Rows key={batch[0].eventId ?? batch[0].index} rows={rows} />)}
          {spans.map((span) => {
            const status: Status = span.done ? 'done' : settledStatus('running', active, waiting);
            const rows: Row[] = span.children.map((event) => ({ key: `${event.index}`, name: event.agent?.name ?? label(event.stage), status }));
            return <Node key={`s-${span.id}`} title={span.title} summary={status === 'done' ? span.summary : undefined} status={status} count={rows.length}>{rows.length > 0 ? <Rows rows={rows} /> : undefined}</Node>;
          })}
          {nested.steps.map((step, i) => {
            const rows = step.agents.map((agent) => ({ agent, rows: processRows(agent.events, active, waiting) }));
            const status = aggregateStatus(rows.flatMap(row => row.rows.map(item => item.status)));
            const title = stepTitles[step.id] ?? (/^[\w.-]{1,24}$/.test(step.id) ? label(step.id) : `Step ${i + 1}`);
            return (
              <Node key={`n-${step.id}`} title={title} status={status}>
                {rows.map(({ agent, rows: tools }) => {
                  const participant = agent.events.find(event => event.agent?.id)?.agent;
                  if (!participant) return tools.length ? <Rows key={agent.id} rows={tools} /> : null;
                  const agentStatus = aggregateStatus(tools.map(row => row.status));
                  const name = participant.name ?? (participant.role ? label(participant.role) : 'Recorded participant');
                  return <Node key={agent.id} title={name} status={agentStatus} count={tools.length}>{tools.length ? <Rows rows={tools} /> : undefined}</Node>;
                })}
              </Node>
            );
          })}
          {agents.map((agent) => <Node key={agent.key} title={agent.title} status={agent.status} count={agent.tools.length}>{agent.tools.length > 0 ? <Rows rows={agent.tools} /> : undefined}</Node>)}
          {extraTools.length > 0 && <Node title="Recorded tools" status={aggregateStatus(extraTools.map(row => row.status))} count={extraTools.length}><Rows rows={extraTools} /></Node>}
          {jobs.length > 0 && <Node title="Scheduler checklist" status={aggregateStatus(jobs.map(job => settledStatus(processStatus(job.status), active, waiting)))} count={jobs.length}><p className={styles.note}>Checklist states do not confirm that a worker ran.</p><Rows rows={jobs.map((job) => ({ key: job.stepId, name: label(job.stepId), status: settledStatus(processStatus(job.status), active, waiting) }))} /></Node>}
          {evidenceExtra && <Node title="Evidence sources" status="recorded">{evidenceExtra}</Node>}
        </div>
        {(evidence.length > 0 || eventRows.length > 0) && <p className={styles.footnote}>Tool completion records a result. Native verification is shown separately in the review.</p>}
        </Collapsible.Content>
      </Collapsible.Root>
    </>
  );
}
