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
/** IDs close concurrent calls when present. Legacy same-name overlap stays visibly unconfirmed. */
export function processRows(events, active, waiting) {
  const rows = [], seen = new Set();
  for (const event of [...events].sort((a, b) => a.index - b.index)) {
    const eventKey = event.eventId ?? event.index;
    if (seen.has(eventKey)) continue;
    seen.add(eventKey);
    const callId = event.callId ?? event.toolCallId;
    if (event.stage === 'tool_running') rows.push({ key: String(eventKey), name: toolName(event), status: 'running', callId });
    else if (event.stage === 'tool_completed' || event.stage === 'tool_failed') {
      const name = toolName(event), status = event.stage === 'tool_failed' ? 'failed' : 'done';
      const candidates = rows.filter(row => row.status === 'running' && (callId ? row.callId === callId : !row.callId && row.name === name));
      if (candidates.length === 1) candidates[0].status = status;
      else rows.push({ key: String(eventKey), name, status, callId });
    } else if (event.stage.startsWith('specialist_')) {
      rows.push({ key: String(eventKey), name: event.detail, status: event.stage === 'specialist_completed' ? 'done' : event.stage === 'specialist_failed' ? 'failed' : 'running', team: true });
    }
  }
  return rows.map(row => ({ ...row, status: settledStatus(row.status, active, waiting) }));
}
export function activityStateLabel(status, active, waiting) {
  if (waiting || status === 'needs_input') return 'Waiting for your input';
  const labels = { failed: 'Failed', cancelled: 'Stopped', interrupted: 'Interrupted', paused_limit: 'Paused at task limit', paused_recovery: 'Recovery required', reconciling: 'Checking operation status', awaiting_approval: 'Waiting for approval', blocked: 'Blocked', partial: 'Partially complete', stale: 'Source changed', completed: 'Completed' };
  return labels[status] ?? (active ? 'Working' : 'Recorded activity');
}
