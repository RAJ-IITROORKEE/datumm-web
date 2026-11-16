export type ProcessStatus = 'done' | 'failed' | 'waiting' | 'running' | 'cancelled' | 'interrupted' | 'stale' | 'partial' | 'blocked' | 'queued' | 'skipped' | 'recorded' | 'unconfirmed';
export type ProcessRow = { key: string; name: string; status: ProcessStatus; team?: boolean; callId?: string; role?: string; activityId?: string; durationMs?: number; retries?: number };
export function processStatus(value: string): ProcessStatus;
export const HOSTED_TOOL_STAGES: Record<string, string>;
export function outcomeStatus(outcome: string | undefined): ProcessStatus | undefined;
export function settledStatus(status: ProcessStatus, active: boolean, waiting: boolean): ProcessStatus;
export function aggregateStatus(statuses: ProcessStatus[]): ProcessStatus;
export function processRows(events: { index: number; eventId?: string; stage: string; detail: string; callId?: string; toolCallId?: string; tool?: string; activityId?: string; outcome?: string; durationMs?: number; agent?: { id?: string; role?: string }; taskId?: string; turnId?: string; executionId?: string; sessionId?: string }[], active: boolean, waiting: boolean): ProcessRow[];
export function activityStateLabel(status: string | undefined, active: boolean, waiting: boolean): string;
