'use client';

import type { ReactNode } from 'react';
import { Collapsible } from 'radix-ui';
import { Check, ChevronDown, CircleHelp, Loader2, Users, X } from 'lucide-react';
import { Reasoning } from '../ai-elements/reasoning';
import { MessageResponse } from '../ai-elements/message';
import { activityBatches, toolName, type RunManifest, type ToolEvidence } from '../agent-activity';
import type { SchedulerView } from '../agent-scheduler';
import type { SpecialistResult } from '../agent-specialists';
import type { TaskEvent } from '@/lib/task-projection';

type Status = 'running' | 'done' | 'failed';
type Row = { key: string; name: string; status: Status; team?: boolean };
const label = (value: string) => value.replaceAll('_', ' ');
const toStatus = (value: string): Status => (value === 'completed' ? 'done' : ['failed', 'error', 'cancelled', 'interrupted', 'stale'].includes(value) ? 'failed' : 'running');

function StatusIcon({ status, team }: { status: Status; team?: boolean }) {
  if (status === 'running') return <Loader2 size={13} className="spin" aria-hidden="true" />;
  if (status === 'failed') return <X size={13} aria-hidden="true" />;
  return team ? <Users size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />;
}

/** Names and statuses only: raw tool output stays in the Activity tab. */
function Rows({ rows }: { rows: Row[] }) {
  return (
    <ul className="turn-process-rows">
      {rows.map((row) => (
        <li key={row.key} data-status={row.status}>
          <StatusIcon status={row.status} team={row.team} />
          <span>{row.name}</span>
          <small>{row.status === 'running' ? 'running' : row.status === 'failed' ? 'failed' : 'done'}</small>
        </li>
      ))}
    </ul>
  );
}

function Node({ title, status, count, open = false, children }: { title: string; status: Status; count?: number; open?: boolean; children?: ReactNode }) {
  return (
    <Collapsible.Root defaultOpen={open} className="turn-process-node" data-status={status}>
      <Collapsible.Trigger className="turn-process-trigger group">
        <StatusIcon status={status} />
        <span>{title}</span>
        {count ? <small>{count}</small> : null}
        <ChevronDown size={13} className="turn-process-chevron" aria-hidden="true" />
      </Collapsible.Trigger>
      <Collapsible.Content className="turn-process-content">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

/** Tool and specialist rows for one batch of events; a running call is closed by its completion. */
function stepRows(batch: TaskEvent[]): Row[] {
  const rows: Row[] = [];
  for (const event of batch) {
    if (event.stage === 'tool_running') rows.push({ key: `${event.index}`, name: label(toolName(event)), status: 'running' });
    else if (event.stage === 'tool_completed' || event.stage === 'tool_failed') {
      const name = label(toolName(event)), status: Status = event.stage === 'tool_failed' ? 'failed' : 'done';
      const open = rows.find((row) => row.status === 'running' && row.name === name);
      if (open) open.status = status;
      else rows.push({ key: `${event.index}`, name, status });
    } else if (event.stage.startsWith('specialist_')) rows.push({ key: `${event.index}`, name: event.detail, status: event.stage === 'specialist_completed' ? 'done' : 'running', team: true });
  }
  return rows;
}

/** One collapsed accordion per agent turn: step, then agent or job, then tool calls. */
export function TurnProcess({ events, active, waiting, manifest, evidence = [], nativeMessages = [], scheduler, specialists, evidenceExtra }: {
  events: TaskEvent[];
  active: boolean;
  waiting: boolean;
  manifest?: RunManifest;
  evidence?: ToolEvidence[];
  nativeMessages?: { id: string; text: string; finish: string | null }[];
  scheduler?: SchedulerView | null;
  specialists?: SpecialistResult[];
  evidenceExtra?: ReactNode;
}) {
  const live = active && !waiting;
  const batches = activityBatches(events).map((batch) => ({ batch, rows: stepRows(batch) })).filter((step) => step.rows.length > 0);
  const children = manifest?.children ?? [];
  const jobs = scheduler?.steps ?? [];
  const team = specialists ?? [];
  const toolEvents = events.filter((event) => event.stage === 'tool_completed' || event.stage === 'tool_failed').length;
  const steps = Math.max(evidence.length, toolEvents) || batches.length;
  const public_ = nativeMessages.filter((row) => active || row.finish !== 'stop').map((row) => <div key={row.id} className="activity-update"><MessageResponse>{row.text}</MessageResponse></div>);
  if (!steps && !children.length && !jobs.length && !team.length && !live && !waiting) return <>{public_}</>;
  const times = events.map((event) => Date.parse(event.at)).filter(Number.isFinite);
  const elapsedMs = manifest?.elapsedMs ?? (times.length > 1 ? Math.max(...times) - Math.min(...times) : null);
  const seconds = elapsedMs != null && elapsedMs >= 1000 ? `${Math.round(elapsedMs / 1000)} s` : null;
  const stepText = `${steps} ${steps === 1 ? 'step' : 'steps'}`;
  const current = batches.at(-1)?.rows.findLast((row) => row.status === 'running')?.name;
  const failed = batches.some((step) => step.rows.some((row) => row.status === 'failed'));
  const summary = waiting ? (
    <><CircleHelp size={13} className="turn-process-lead" aria-hidden="true" />Waiting for your input</>
  ) : live ? (
    <><Loader2 size={13} className="spin turn-process-lead" aria-hidden="true" /><span>Working{current ? ` · ${current}` : ''}{steps ? ` · ${stepText}` : ''}</span></>
  ) : (
    <>{`Worked${seconds ? ` for ${seconds}` : ''}${steps ? ` · ${stepText}` : ''}${failed ? ' · some failed' : ''}`}</>
  );
  const agents: { key: string; title: string; status: Status; tools: Row[] }[] = [
    ...children.map((child) => ({ key: `c-${child.sessionId}`, title: `${label(child.role)}`, status: toStatus(child.state), tools: evidence.filter((call) => call.role === child.role).map((call) => ({ key: call.callId, name: label(call.tool.replace(/^datumm_revit_/, '')), status: toStatus(call.status) })) })),
    ...team.map((result, i) => ({ key: `s-${result.role}-${i}`, title: `${label(result.role)} review`, status: toStatus(result.status), tools: [] })),
  ];
  return (
    <>
      {public_}
      <Reasoning isStreaming={live} forceOpen={waiting} summary={summary} className="turn-process">
        <div className="turn-process-tree">
          {batches.map(({ batch, rows }, i) => {
            const status: Status = rows.some((row) => row.status === 'failed') ? 'failed' : rows.some((row) => row.status === 'running') ? 'running' : 'done';
            const title = [...new Set(rows.map((row) => row.name))].slice(0, 3).join(', ') || `Step ${i + 1}`;
            return <Node key={batch[0].eventId ?? batch[0].index} title={title} status={status} count={rows.length} open={live && i === batches.length - 1}><Rows rows={rows} /></Node>;
          })}
          {agents.map((agent) => <Node key={agent.key} title={agent.title} status={agent.status} count={agent.tools.length}>{agent.tools.length > 0 && <Rows rows={agent.tools} />}</Node>)}
          {jobs.length > 0 && <Node title="Background jobs" status={jobs.some((job) => job.status === 'running') ? 'running' : 'done'} count={jobs.length}><Rows rows={jobs.map((job) => ({ key: job.stepId, name: label(job.stepId), status: toStatus(job.status === 'blocked' ? 'running' : job.status) }))} /></Node>}
          {evidenceExtra && <Node title="Evidence sources" status="done">{evidenceExtra}</Node>}
        </div>
      </Reasoning>
    </>
  );
}
