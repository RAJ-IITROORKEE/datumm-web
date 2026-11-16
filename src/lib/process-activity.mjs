export function processStatus(value) {
  if (['completed', 'complete', 'done', 'succeeded'].includes(value)) return 'done';
  if (['failed', 'error'].includes(value)) return 'failed';
  if (['needs_input', 'waiting', 'waiting_for_input', 'awaiting_approval'].includes(value)) return 'waiting';
  if (['running', 'in_progress'].includes(value)) return 'running';
  if (['cancelled', 'interrupted', 'stale', 'partial', 'blocked', 'queued', 'skipped'].includes(value)) return value;
  return 'recorded';
}
export function settledStatus(status, active, waiting) {
  return status === 'running' || status === 'queued' ? waiting ? 'waiting' : active ? status : 'unconfirmed' : status;
}
export function aggregateStatus(statuses) {
  return ['failed', 'interrupted', 'cancelled', 'blocked', 'waiting', 'partial', 'stale', 'unconfirmed', 'running', 'queued', 'recorded', 'done', 'skipped'].find(status => statuses.includes(status)) ?? 'recorded';
}
const toolName = event => event.detail.replace(/^(Reading|Calling|Executing)\s+/, '').split(/[\s:{]/)[0].replace(/^datumm_revit_/, '').replaceAll('_', ' ');
// Hosted native-call stages reuse the desktop tool-row pairing; pre-N3 relay events (no callId) keep the old path.
export const HOSTED_TOOL_STAGES = { tool_start: 'tool_running', tool_returned: 'tool_completed', tool_stopped: 'tool_failed' };
const OUTCOME = { succeeded: 'done', failed: 'failed', partial: 'partial', stale: 'stale', skipped: 'skipped', stopped: 'cancelled' };
/** Row status for a hosted `outcome`, or undefined when absent or unknown (old events). */
export const outcomeStatus = outcome => OUTCOME[outcome];
// Hosted native calls name the tool in `tool`; desktop events only in `detail`.
const rowName = event => typeof event.tool === 'string' && event.tool ? event.tool.replace(/^datumm_revit_/, '').replaceAll('_', ' ') : toolName(event);
const duration = value => Number.isFinite(value) && value >= 0 ? value : undefined;
/** Only explicitly identified calls in the same scope can close one another. */
export function processRows(events, active, waiting) {
  const rows = [], seen = new Set();
  const uniqueEvents = [...events].sort((a, b) => a.index - b.index).filter(event => { const key = event.eventId ?? event.index; if (seen.has(key)) return false; seen.add(key); return true; })
    .map(event => event.callId && HOSTED_TOOL_STAGES[event.stage] ? { ...event, stage: HOSTED_TOOL_STAGES[event.stage] } : event);
  const sameCall = (a, b) => Boolean(a.callId ?? a.toolCallId) && Boolean(a.turnId || a.executionId || a.sessionId) && (a.callId ?? a.toolCallId) === (b.callId ?? b.toolCallId) && a.taskId === b.taskId && a.turnId === b.turnId && a.executionId === b.executionId && a.sessionId === b.sessionId;
  // A specialist job is identified by its activityId alone; the task view only holds one task.
  const sameJob = (a, b) => Boolean(a.activityId) && a.activityId === b.activityId && a.taskId === b.taskId && a.turnId === b.turnId && a.executionId === b.executionId;
  const finished = event => ['specialist_complete', 'specialist_completed'].includes(event.stage);
  for (const event of uniqueEvents) {
    const eventKey = event.eventId ?? event.index;
    const callId = event.callId ?? event.toolCallId;
    const timing = duration(event.durationMs);
    if (event.stage === 'tool_running') rows.push({ key: String(eventKey), name: rowName(event), status: 'running', callId, taskId: event.taskId, turnId: event.turnId, executionId: event.executionId, sessionId: event.sessionId });
    else if (event.stage === 'tool_completed' || event.stage === 'tool_failed') {
      const name = rowName(event), status = outcomeStatus(event.outcome) ?? (event.stage === 'tool_failed' ? 'failed' : 'done');
      const candidates = callId ? rows.filter(row => row.status === 'running' && sameCall(row, event)) : [];
      const starts = uniqueEvents.filter(row => row.stage === 'tool_running' && sameCall(row, event));
      const finishes = uniqueEvents.filter(row => ['tool_completed', 'tool_failed'].includes(row.stage) && sameCall(row, event));
      if (candidates.length === 1 && starts.length === 1 && finishes.length === 1) Object.assign(candidates[0], { status }, timing === undefined ? {} : { durationMs: timing });
      else rows.push({ key: String(eventKey), name, status, callId, ...(timing === undefined ? {} : { durationMs: timing }) });
    } else if (event.stage.startsWith('specialist_')) {
      const status = finished(event) ? outcomeStatus(event.outcome) ?? 'done' : event.stage === 'specialist_failed' ? 'failed' : 'running';
      const candidates = finished(event) ? rows.filter(row => row.team && row.status === 'running' && sameJob(row, event)) : [];
      const starts = uniqueEvents.filter(row => row.stage === 'specialist_started' && sameJob(row, event));
      const ends = uniqueEvents.filter(row => finished(row) && sameJob(row, event));
      if (candidates.length === 1 && starts.length === 1 && ends.length === 1) Object.assign(candidates[0], { name: event.detail, status }, timing === undefined ? {} : { durationMs: timing });
      else rows.push({ key: String(eventKey), name: event.detail, status, team: true, role: event.agent?.role ?? event.agent?.id, activityId: event.activityId, taskId: event.taskId, turnId: event.turnId, executionId: event.executionId, ...(timing === undefined ? {} : { durationMs: timing }) });
    }
  }
  return rows.map(row => ({ ...row, status: settledStatus(row.status, active, waiting) }));
}
export function activityStateLabel(status, active, waiting) {
  if (waiting || status === 'needs_input') return 'Waiting for your input';
  const labels = { failed: 'Failed', cancelled: 'Stopped', interrupted: 'Interrupted', paused_limit: 'Paused at task limit', paused_recovery: 'Task paused', reconciling: 'Checking operation status', awaiting_approval: 'Waiting for approval', blocked: 'Blocked', partial: 'Partially complete', stale: 'Source changed', completed: 'Completed' };
  return labels[status] ?? (active ? 'Working' : 'Recorded activity');
}
