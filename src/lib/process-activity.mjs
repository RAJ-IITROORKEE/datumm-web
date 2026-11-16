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
/** Only explicitly identified calls in the same scope can close one another. */
export function processRows(events, active, waiting) {
  const rows = [], seen = new Set();
  const uniqueEvents = [...events].sort((a, b) => a.index - b.index).filter(event => { const key = event.eventId ?? event.index; if (seen.has(key)) return false; seen.add(key); return true; });
  const sameCall = (a, b) => Boolean(a.callId ?? a.toolCallId) && Boolean(a.turnId || a.executionId || a.sessionId) && (a.callId ?? a.toolCallId) === (b.callId ?? b.toolCallId) && a.taskId === b.taskId && a.turnId === b.turnId && a.executionId === b.executionId && a.sessionId === b.sessionId;
  for (const event of uniqueEvents) {
    const eventKey = event.eventId ?? event.index;
    const callId = event.callId ?? event.toolCallId;
    if (event.stage === 'tool_running') rows.push({ key: String(eventKey), name: toolName(event), status: 'running', callId, taskId: event.taskId, turnId: event.turnId, executionId: event.executionId, sessionId: event.sessionId });
    else if (event.stage === 'tool_completed' || event.stage === 'tool_failed') {
      const name = toolName(event), status = event.stage === 'tool_failed' ? 'failed' : 'done';
      const candidates = callId ? rows.filter(row => row.status === 'running' && sameCall(row, event)) : [];
      const starts = uniqueEvents.filter(row => row.stage === 'tool_running' && sameCall(row, event));
      const finishes = uniqueEvents.filter(row => ['tool_completed', 'tool_failed'].includes(row.stage) && sameCall(row, event));
      if (candidates.length === 1 && starts.length === 1 && finishes.length === 1) candidates[0].status = status;
      else rows.push({ key: String(eventKey), name, status, callId });
    } else if (event.stage.startsWith('specialist_')) {
      rows.push({ key: String(eventKey), name: event.detail, status: ['specialist_complete', 'specialist_completed'].includes(event.stage) ? 'done' : event.stage === 'specialist_failed' ? 'failed' : 'running', team: true });
    }
  }
  return rows.map(row => ({ ...row, status: settledStatus(row.status, active, waiting) }));
}
export function activityStateLabel(status, active, waiting) {
  if (waiting || status === 'needs_input') return 'Waiting for your input';
  const labels = { failed: 'Failed', cancelled: 'Stopped', interrupted: 'Interrupted', paused_limit: 'Paused at task limit', paused_recovery: 'Task paused', reconciling: 'Checking operation status', awaiting_approval: 'Waiting for approval', blocked: 'Blocked', partial: 'Partially complete', stale: 'Source changed', completed: 'Completed' };
  return labels[status] ?? (active ? 'Working' : 'Recorded activity');
}
