'use client';

import type { ReactNode } from 'react';
import { Collapsible } from 'radix-ui';
import { Check, ChevronDown, CircleHelp, Circle, Loader2, Users, X } from 'lucide-react';
import { Reasoning } from '../ai-elements/reasoning';
import { MessageResponse } from '../ai-elements/message';
import { activityBatches, type RunManifest, type ToolEvidence } from '../agent-activity';
import type { SchedulerView } from '../agent-scheduler';
import type { SpecialistResult } from '../agent-specialists';
import type { TaskEvent } from '@/lib/task-projection';
import { latestNote, nestProcess, stageSpans } from '@/lib/turn-nesting.mjs';
import { activityStateLabel, aggregateStatus, processRows, processStatus, settledStatus, type ProcessStatus, type ProcessRow } from '@/lib/process-activity.mjs';

type Status = ProcessStatus;
type Row = ProcessRow;
const label = (value: string) => value.replaceAll('_', ' ');

function StatusIcon({ status, team }: { status: Status; team?: boolean }) {
  if (status === 'running') return <Loader2 size={13} className="spin" aria-hidden="true" />;
  if (status === 'failed') return <X size={13} aria-hidden="true" />;
  if (status === 'done') return team ? <Users size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />;
  return status === 'waiting' || status === 'blocked' ? <CircleHelp size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />;
}

/** Names and statuses only: raw tool output stays in the Activity tab. */
function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className="turn-process-rows">
      {rows.map((row) => (
        <li key={row.key} data-status={row.status}>
          <StatusIcon status={row.status} team={row.team} />
          <span>{row.name}</span>
          <small>{label(row.status)}</small>
        </li>
      ))}
    </ul>
  );
}

function Node({ title, status, count, open = false, summary, children }: { title: string; status: Status; count?: number; open?: boolean; summary?: string; children?: ReactNode }) {
  return (
    <Collapsible.Root defaultOpen={open} className="turn-process-node" data-status={status}>
      <Collapsible.Trigger className="turn-process-trigger group">
        <StatusIcon status={status} />
        <span>{title}</span>
        {count ? <small>{count}</small> : null}
        <ChevronDown size={13} className="turn-process-chevron" aria-hidden="true" />
      </Collapsible.Trigger>
      {summary && <p className="turn-process-summary">{summary}</p>}
      <Collapsible.Content className="turn-process-content">{children}</Collapsible.Content>
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

function summarize({ events, active, waiting, manifest, evidence = [], nativeMessages = [], scheduler, specialists }: Props) {
  const nested = nestProcess(events);
  const batches = activityBatches(nested.rest).map((batch) => ({ batch, rows: processRows(batch, active, waiting) })).filter((step) => step.rows.length > 0);
  const children = manifest?.children ?? [];
  // Scheduler checklist rows are not evidence that a worker ran.
  const jobs = (scheduler?.steps ?? []).filter(job => job.status !== 'pending' && job.status !== 'queued');
  const team = specialists ?? [];
  const toolEvents = events.filter((event) => event.stage === 'tool_completed' || event.stage === 'tool_failed').length;
  // Hosted lead turns carry only stage events: fall back to flat stage spans.
  const spans = batches.length || nested.steps.length ? [] : stageSpans(events);
  const steps = Math.max(evidence.length, toolEvents) || batches.length + nested.steps.length + spans.length;
  const updates = nativeMessages.filter((row) => active || row.finish !== 'stop');
  const live = active && !waiting;
  return { nested, batches, spans, children, jobs, team, steps, updates, live, visible: Boolean(steps || children.length || jobs.length || team.length || live || waiting || updates.length) };
}

/** True when the turn has anything to show, so the agent label is not left on its own. */
export const turnProcessVisible = (props: Props) => summarize(props).visible;

/** One collapsed accordion per agent turn: step, then agent, then tool calls (flat steps when the backend sends no agent data). */
export function TurnProcess(props: Props) {
  const { events, manifest, evidence = [], evidenceExtra, waiting, stepTitles = {} } = props;
  const { nested, batches, spans, children, jobs, team, steps, updates, live } = summarize(props);
  const public_ = updates.map((row) => <div key={row.id} className="activity-update"><MessageResponse isAnimating={live && !row.finish}>{row.text}</MessageResponse></div>);
  if (!steps && !children.length && !jobs.length && !team.length && !live && !waiting) return <>{public_}</>;
  const times = events.map((event) => Date.parse(event.at)).filter(Number.isFinite);
  const elapsedMs = manifest?.elapsedMs ?? (times.length > 1 ? Math.max(...times) - Math.min(...times) : null);
  const seconds = elapsedMs != null && elapsedMs >= 1000 ? `${Math.round(elapsedMs / 1000)} s` : null;
  const stepText = `${steps} ${steps === 1 ? 'step' : 'steps'}`;
  const failed = batches.some((step) => step.rows.some((row) => row.status === 'failed'));
  const note = live ? latestNote(events, spans) : '';
  const summary = live && !['blocked', 'paused_limit', 'paused_recovery', 'reconciling', 'awaiting_approval'].includes(props.status ?? '') ? (
    <span className="activity-shimmer turn-process-working" role="status">{note ? `Working… ${note}` : 'Working…'}</span>
  ) : (
    <>{`${activityStateLabel(props.status, live, waiting)}${seconds ? ` · ${seconds}` : ''}${steps ? ` · ${stepText}` : ''}${failed ? ' · some tools failed' : ''}`}</>
  );
  const agents: { key: string; title: string; status: Status; tools: Row[] }[] = [
    ...children.map((child) => ({ key: `c-${child.sessionId}`, title: `${label(child.role)}`, status: settledStatus(processStatus(child.state), props.active, waiting), tools: evidence.filter((call) => call.sessionId ? call.sessionId === child.sessionId : call.role === child.role).map((call) => ({ key: call.callId, name: label(call.tool.replace(/^datumm_revit_/, '')), status: settledStatus(processStatus(call.status), props.active, waiting) })) })),
    ...team.map((result, i) => ({ key: `s-${result.role}-${i}`, title: `${label(result.role)} review`, status: processStatus(result.status), tools: [] })),
  ];
  return (
    <>
      {public_}
      <Reasoning isStreaming={live} summary={summary} className="turn-process">
        <div className="turn-process-tree">
          {batches.map(({ batch, rows }, i) => {
            const status = aggregateStatus(rows.map(row => row.status));
            const title = [...new Set(rows.map((row) => row.name))].slice(0, 3).join(', ') || `Step ${i + 1}`;
            return <Node key={batch[0].eventId ?? batch[0].index} title={title} status={status} count={rows.length} open={live && i === batches.length - 1}><Rows rows={rows} /></Node>;
          })}
          {spans.map((span, i) => {
            const status: Status = span.done ? 'done' : settledStatus('running', props.active, waiting);
            const rows: Row[] = span.children.map((event) => ({ key: `${event.index}`, name: event.agent?.name ?? label(event.stage), status }));
            return <Node key={`s-${span.id}`} title={span.title} summary={status === 'done' ? span.summary : undefined} status={status} count={rows.length} open={live && !span.done && i === spans.length - 1}>{rows.length > 0 && <Rows rows={rows} />}</Node>;
          })}
          {nested.steps.map((step, i) => {
            const rows = step.agents.map((agent) => ({ agent, rows: processRows(agent.events, props.active, waiting) }));
            const status = aggregateStatus(rows.flatMap(row => row.rows.map(item => item.status)));
            const title = stepTitles[step.id] ?? (/^[\w.-]{1,24}$/.test(step.id) ? label(step.id) : `Step ${i + 1}`);
            return (
              <Node key={`n-${step.id}`} title={title} status={status} count={step.agents.length} open={live && status === 'running'}>
                {rows.map(({ agent, rows: tools }) => {
                  const agentStatus = aggregateStatus(tools.map(row => row.status));
                  return <Node key={agent.id} title={agent.name} status={agentStatus} count={tools.length} open={agentStatus === 'running'}><Rows rows={tools} /></Node>;
                })}
              </Node>
            );
          })}
          {agents.map((agent) => <Node key={agent.key} title={agent.title} status={agent.status} count={agent.tools.length}>{agent.tools.length > 0 && <Rows rows={agent.tools} />}</Node>)}
          {jobs.length > 0 && <Node title="Recorded background work" status={aggregateStatus(jobs.map(job => settledStatus(processStatus(job.status), props.active, waiting)))} count={jobs.length}><Rows rows={jobs.map((job) => ({ key: job.stepId, name: label(job.stepId), status: settledStatus(processStatus(job.status), props.active, waiting) }))} /></Node>}
          {evidenceExtra && <Node title="Evidence sources" status="done">{evidenceExtra}</Node>}
        </div>
      </Reasoning>
    </>
  );
}
