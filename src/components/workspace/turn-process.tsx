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
type StageRow = Row & {attempt?:{taskId:string;turnId:string;executionId:string;activityId:string}};
const label = (value: string) => value.replaceAll('_', ' ');
const rowLabel = (status: Status) => status === 'done' ? 'Completed' : status === 'unconfirmed' ? 'Not confirmed' : label(status);
const settledLifecycles = new Set(['completed', 'failed', 'error', 'cancelled', 'interrupted', 'paused_limit', 'paused_recovery', 'partial', 'stale', 'blocked', 'needs_connection']);

function StatusIcon({ status, team }: { status: Status; team?: boolean }) {
  if (status === 'running') return <Loader2 size={13} className={styles.spinner} aria-hidden="true" />;
  if (status === 'failed') return <X size={13} aria-hidden="true" />;
  if (status === 'done') return team ? <Users size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />;
  return status === 'waiting' || status === 'blocked' ? <CircleHelp size={13} aria-hidden="true" /> : <Circle size={13} aria-hidden="true" />;
}

/** Names and statuses only: raw tool output stays in the Activity tab. */
function Rows({ rows, evidence = [] }: { rows: Row[]; evidence?: ToolEvidence[] }) {
  return (
    <ul className={styles.rows}>
      {rows.map((row) => {
        const elapsed = row.callId ? recordedDuration(evidence.find(call => call.callId === row.callId)) : null;
        return (
        <li key={row.key} data-status={row.status}>
          <StatusIcon status={row.status} team={row.team} />
          <span className={styles.rowName}>{row.name}</span>
          {elapsed && <small className={styles.metadata} title="Recorded tool duration">{elapsed.text}</small>}
          <small className={row.status === 'done' ? styles.srOnly : styles.rowState}>{rowLabel(row.status)}</small>
        </li>
      );})}
    </ul>
  );
}

function Node({ title, status, count, summary, children }: { title: string; status: Status; count?: number; summary?: string; children?: ReactNode }) {
  if (!children) return <><div className={styles.leaf} data-status={status}><StatusIcon status={status} /><span className={styles.rowName}>{title}</span><small className={status === 'done' ? styles.srOnly : styles.rowState}>{rowLabel(status)}</small></div>{summary && <p className={styles.note}>{summary}</p>}</>;
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
  /** Caller-owned copy for an authoritatively completed response. */
  settledLabel?: string;
  /** Public checklist summary, scoped by the caller to this turn. */
  publicSummary?: string;
  manifest?: RunManifest;
  evidence?: ToolEvidence[];
  nativeMessages?: { id: string; text: string; finish: string | null }[];
  scheduler?: SchedulerView | null;
  specialists?: SpecialistResult[];
  evidenceExtra?: ReactNode;
  /** Plan step key to title, for nested steps. */
  stepTitles?: Record<string, string>;
  children?: ReactNode;
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
  // Stage events can coexist with tool records; retain both scopes.
  const spans = stageSpans(nested.rest);
  const updates = nativeMessages.filter((row) => active || row.finish !== 'stop');
  const live = active && !waiting && (!status || ['running', 'in_progress'].includes(status));
  const hasDetails = Boolean(batches.length || nested.steps.length || spans.length || evidence.length || children.length || jobs.length || team.length || evidenceExtra || props.children || props.publicSummary?.trim());
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
    needs_connection: 'Revit connection required', unavailable: 'Activity unavailable', unknown: 'Status unavailable', permission_denied: 'Activity unavailable',
  };
  const recognized = ['running', 'in_progress', 'needs_input', 'waiting', 'waiting_for_input', 'failed', 'cancelled', 'interrupted', 'paused_limit', 'paused_recovery', 'reconciling', 'awaiting_approval', 'blocked', 'partial', 'stale', 'completed'];
  if (status === 'completed' && props.settledLabel?.trim()) return props.settledLabel.trim();
  if (status && labels[status]) return labels[status];
  if (status && !recognized.includes(status)) return 'Status unavailable';
  if (['waiting', 'waiting_for_input'].includes(status ?? '')) return 'Waiting for your input';
  return activityStateLabel(status, active && !waiting, waiting);
}

function recordedDuration(record: {elapsedMs?: number | null} | undefined) {
  if (typeof record?.elapsedMs === 'number' && Number.isFinite(record.elapsedMs) && record.elapsedMs >= 0) {
    return { text: `${(record.elapsedMs / 1000).toFixed(record.elapsedMs < 1000 ? 1 : 0)} s` };
  }
  return null;
}

const genericStage = /^(planning the next step|step \d+)$/i;
const publicAction = (event: TaskEvent) => {
  const detail = event.detail?.trim();
  if (!detail) return '';
  const names: Record<string, string> = { capture_intent: 'Capture request', create_design: 'Create design', plan_task: 'Record checklist', revise_task_plan: 'Update checklist', finish_answer: 'Prepare answer', lookup_evidence: 'Look up evidence' };
  return names[detail] ?? label(detail).replace(/\s+/g, ' ');
};

/** One collapsed accordion per agent turn, with recorded action names and tool details. */
export function TurnProcess(props: Props) {
  // No streaming effect: the user's choice survives updates and completion.
  const [open, setOpen] = useState(false);
  const { manifest, evidenceExtra, stepTitles = {} } = props;
  const { active, waiting } = activityFlags(props);
  const { events, evidence, nested, batches, spans, children, jobs, team, updates, live, hasDetails, visible } = summarize(props);
  const public_ = updates.map((row) => <div key={row.id} className="activity-update"><MessageResponse isAnimating={live && !row.finish}>{row.text}</MessageResponse></div>);
  if (!visible) return null;
  if (!hasDetails && !active && !waiting && !props.status) return <>{public_}</>;
  const elapsed = recordedDuration(manifest);
  const eventRows = processRows(events, active, waiting);
  const failed = eventRows.some(row => row.status === 'failed') || evidence.some(call => processStatus(call.status) === 'failed') || children.some(child => processStatus(child.state) === 'failed') || team.some(result => result.status === 'failed');
  const unconfirmedTools = eventRows.some(row => row.status === 'unconfirmed') || evidence.some(call => settledStatus(processStatus(call.status), active, waiting) === 'unconfirmed') || children.some(child => settledStatus(processStatus(child.state), active, waiting) === 'unconfirmed');
  const stateLabel = props.status === 'unknown' && hasDetails ? 'Recorded activity' : lifecycle(props);
  const summaryStatus = live ? 'running' : waiting ? 'waiting' : settledStatus(processStatus(props.status ?? 'recorded'), active, waiting);
  const spanRows: StageRow[] = [];
  for (const span of spans) {
    const status: Status = span.done ? 'done' : span.outcome==='needs_input' ? 'waiting' : span.outcome==='failed' ? 'failed' : span.outcome==='cancelled' ? 'cancelled' : span.outcome==='partial' ? 'partial' : settledStatus('running', active, waiting);
    const actions = span.children.map(publicAction).filter(Boolean);
    const names = actions.length ? [...(!genericStage.test(span.title) && !actions.includes(span.title) ? [span.title] : []), ...actions] : [span.title];
    if (span.summary && !names.includes(span.summary)) names.push(span.summary);
    for (const [index, name] of names.entries()) {
      const previous = spanRows.at(-1);
      // Only repeated generic placeholders with the same state are redundant.
      if (genericStage.test(name) && previous?.name === name && previous.status === status) continue;
      const matching=span.children.filter(event=>event.stage==='agent_action'&&publicAction(event)===name);
      const action=matching.length===1?matching[0]:undefined;
      const attempt=action?.eventId&&action.taskId&&action.turnId&&action.executionId&&action.activityId
        ? {taskId:action.taskId,turnId:action.turnId,executionId:action.executionId,activityId:action.activityId} : undefined;
      spanRows.push({ key: `s-${span.id}-${index}`, name, status, attempt });
    }
  }
  const stageGroups:StageRow[][]=[];
  for(const row of spanRows){
    const group=stageGroups.at(-1), first=group?.[0], attempt=row.attempt;
    if(attempt&&group&&first?.attempt&&row.name===first.name&&attempt.taskId===first.attempt.taskId&&attempt.turnId===first.attempt.turnId&&
      !group.some(previous=>previous.attempt?.executionId===attempt.executionId&&previous.attempt.activityId===attempt.activityId))group.push(row);
    else stageGroups.push([row]);
  }
  const unconfirmed=unconfirmedTools || spanRows.some(row=>row.status==='unconfirmed');
  const latest = live ? latestNote(events, spans) : '';
  const publicUpdate = live ? updates.at(-1)?.text.trim().replace(/\s+/g, ' ').slice(0, 160) : '';
  const actionNames = [...new Set(events.filter(event => event.stage === 'agent_action').map(publicAction).filter(Boolean))];
  const toolRows = processRows(events.filter(event => event.stage.startsWith('tool_')), active, waiting);
  const recordedAction = actionNames.slice(-2).join(' · ')
    || toolRows.at(-1)?.name
    || [...spanRows].reverse().find(row => !genericStage.test(row.name))?.name
    || evidence.at(-1)?.tool.replace(/^datumm_revit_/, '').replaceAll('_', ' ')
    || [...eventRows].reverse().find(row => !genericStage.test(row.name))?.name
    || '';
  const current = publicUpdate || (live ? (genericStage.test(latest) ? spanRows.at(-1)?.name : latest) : recordedAction);
  const checklist = props.publicSummary?.trim() || (jobs.length ? `Scheduler checklist · ${jobs.length} recorded` : '');
  const eventCallIds = new Set(eventRows.map(row => row.callId).filter(Boolean));
  const agents: { key: string; title: string; status: Status; tools: Row[] }[] = [
    ...children.map((child) => ({ key: `c-${child.sessionId}`, title: `${label(child.role)}`, status: settledStatus(processStatus(child.state), active, waiting), tools: evidence.filter((call) => call.sessionId === child.sessionId && !eventCallIds.has(call.callId)).map((call) => ({ key: call.callId, callId: call.callId, name: label(call.tool.replace(/^datumm_revit_/, '')), status: settledStatus(processStatus(call.status), active, waiting) })) })),
    ...team.map((result, i) => ({ key: `s-${result.role}-${i}`, title: `${label(result.role)} review`, status: processStatus(result.status), tools: [] })),
  ];
  const extraTools: Row[] = evidence.filter(call => !eventCallIds.has(call.callId) && !children.some(child => call.sessionId === child.sessionId)).map(call => ({ key: call.callId, callId: call.callId, name: label(call.tool.replace(/^datumm_revit_/, '')), status: settledStatus(processStatus(call.status), active, waiting) }));
  return (
    <>
      <Collapsible.Root open={open} onOpenChange={setOpen} className={styles.process} data-status={summaryStatus}>
        <span className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">{stateLabel}</span>
        <Collapsible.Trigger className={styles.trigger}>
          <StatusIcon status={summaryStatus} />
          <span className={styles.summary}>
            <span><span className={styles.lifecycle}>{stateLabel}</span>{evidence.length > 0 && <span className={styles.metadata}> · {evidence.length} recorded {evidence.length === 1 ? 'tool' : 'tools'}</span>}{elapsed && <span className={styles.metadata} title="Recorded run duration"> · {elapsed.text}</span>}{failed && <span className={styles.failure}> · Recorded work failed</span>}{unconfirmed && props.status !== 'unknown' && <span className={styles.metadata}> · Some work unconfirmed</span>}</span>
            {(current || checklist) && <span className={styles.detail}>{current}{current && checklist ? ' · ' : ''}{checklist}</span>}
          </span>
          <ChevronDown size={14} className={styles.chevron} aria-hidden="true" />
        </Collapsible.Trigger>
        <Collapsible.Content className={styles.content}>
        {props.children}
        {public_}
        {(waiting || ['needs_input', 'awaiting_approval', 'waiting', 'waiting_for_input'].includes(props.status ?? '')) && <p className={styles.note}>Review the question or approval in this conversation.</p>}
        {!hasDetails && <p className={styles.note}>{live ? 'Waiting for recorded activity.' : 'Activity details are unavailable for this turn.'}</p>}
        <div className={styles.tree}>
          {batches.map(({ batch, rows }) => <Rows key={batch[0].eventId ?? batch[0].index} rows={rows} evidence={evidence} />)}
          {stageGroups.map(group=>group.length===1?<Rows key={group[0].key} rows={group}/>:<Node key={group[0].key} title={group[0].name} status={aggregateStatus(group.map(row=>row.status))} count={group.length}>
            <Rows rows={group.map((row,index)=>({...row,name:`Attempt ${index+1} · execution ${row.attempt!.executionId} · activity ${row.attempt!.activityId}`}))}/>
          </Node>)}
          {nested.steps.map((step, i) => {
            const rows = step.agents.map((agent) => ({ agent, rows: processRows(agent.events, active, waiting) }));
            const status = aggregateStatus(rows.flatMap(row => row.rows.map(item => item.status)));
            const title = stepTitles[step.id] ?? (/^[\w.-]{1,24}$/.test(step.id) ? label(step.id) : `Step ${i + 1}`);
            return (
              <Node key={`n-${step.id}`} title={title} status={status}>
                {rows.map(({ agent, rows: tools }) => {
                  const participant = agent.events.find(event => event.agent?.id)?.agent;
                  if (!participant) return tools.length ? <Rows key={agent.id} rows={tools} evidence={evidence} /> : null;
                  const agentStatus = aggregateStatus(tools.map(row => row.status));
                  const name = participant.name ?? (participant.role ? label(participant.role) : 'Recorded participant');
                  return <Node key={agent.id} title={name} status={agentStatus} count={tools.length}>{tools.length ? <Rows rows={tools} evidence={evidence} /> : undefined}</Node>;
                })}
              </Node>
            );
          })}
          {agents.map((agent) => <Node key={agent.key} title={agent.title} status={agent.status} count={agent.tools.length}>{agent.tools.length > 0 ? <Rows rows={agent.tools} evidence={evidence} /> : undefined}</Node>)}
          {extraTools.length > 0 && <Node title="Recorded tools" status={aggregateStatus(extraTools.map(row => row.status))} count={extraTools.length}><Rows rows={extraTools} evidence={evidence} /></Node>}
          {jobs.length > 0 && <Node title="Scheduler checklist" status={aggregateStatus(jobs.map(job => settledStatus(processStatus(job.status), active, waiting)))} count={jobs.length}><p className={styles.note}>Checklist states do not confirm that a worker ran.</p><Rows rows={jobs.map((job) => ({ key: job.stepId, name: label(job.stepId), status: settledStatus(processStatus(job.status), active, waiting) }))} /></Node>}
          {evidenceExtra && <Node title="Evidence sources" status="recorded">{evidenceExtra}</Node>}
        </div>
        {(evidence.length > 0 || eventRows.length > 0) && <p className={styles.footnote}>Tool completion records a result. Native verification is shown separately in the review.</p>}
        </Collapsible.Content>
      </Collapsible.Root>
    </>
  );
}
