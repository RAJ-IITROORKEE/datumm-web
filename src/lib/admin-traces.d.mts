export type TracePeriod = '24h' | '7d' | '30d';
export type TraceOutcome =
  'completed' | 'failed' | 'cancelled' | 'paused' | 'waiting' | 'running' | 'other';
export type TraceFeedbackFilter = 'up' | 'down' | 'none';
export type TraceSignal = 'retried' | 'model_fallback' | 'output_limit' | 'content_filter'
  | 'refusal' | 'invalid_tool_call' | 'usage_unknown' | 'call_unsettled' | 'specialist_partial'
  | 'budget_exhausted';
export type TraceReason =
  'inaccurate' | 'incomplete' | 'ignored_instructions' | 'too_long' | 'other';

export interface TraceCall {
  role: string | null; modelId: string | null; status: string | null; finishReason: string | null;
  inputTokens: number | null; outputTokens: number | null; reasoningTokens: number | null;
  durationMs: number | null; usd: string | null; failureCode: string | null;
}
export interface TraceRow {
  traceId: string; taskId: string | null;
  /** Only a client request key (lowercase UUID v4); any other value arrives as null. */
  turnId: string | null; at: string | null; ownerHash: string | null;
  mode: string | null; reasoningEffort: string | null; requestedModel: string | null;
  servedModels: string[]; status: string | null; outcome: TraceOutcome; failureCode: string | null;
  recoveryAction: string | null; durationMs: number | null; modelMs: number | null;
  steps: {
    total: number; succeeded: number; failed: number; skipped: number; stopped: number;
    retried: number; unconfirmed: number;
  };
  tools: { name: string; calls: number; failed: number }[];
  specialists: { role: string; outcome: string | null; durationMs: number | null }[];
  calls: TraceCall[]; callsTruncated: boolean;
  tokens: { input: number; output: number; reasoning: number };
  usd: string | null; signals: TraceSignal[];
  feedback: { rating: 'up' | 'down'; reason: TraceReason | null; at: string | null } | null;
}
export interface TraceStats {
  turns: number; scanned: number; truncated: boolean; failed: number;
  p50Ms: number | null; p95Ms: number | null;
  inputTokens: number; outputTokens: number; usd: string | null;
  feedback: { up: number; down: number; reasons: Record<TraceReason, number> };
}
export interface Traces {
  from: string | null; to: string | null; nextCursor: string | null;
  stats: TraceStats; rows: TraceRow[];
}
export interface TraceFilters {
  period?: string; mode?: string; model?: string; outcome?: string; feedback?: string;
  owner?: string; signal?: string; cursor?: string;
}

export const TRACE_PERIODS: TracePeriod[];
export const DEFAULT_PERIOD: TracePeriod;
export const TRACE_OUTCOMES: TraceOutcome[];
export const TRACE_FEEDBACK: TraceFeedbackFilter[];
export const TRACE_SIGNALS: TraceSignal[];
export const TRACE_REASONS: TraceReason[];
export function outcomeLabel(value: string): string;
export function feedbackFilterLabel(value: string): string;
export function signalLabel(value: string): string;
export function reasonLabel(value: string): string;
/** Null when the response is not a schemaVersion 1 traces document; unknown keys are dropped. */
export function parseTraces(raw: unknown): Traces | null;
/** Query string including the leading `?`; only valid values are sent and the period always is. */
export function traceQuery(filters?: TraceFilters): string;
export function formatCount(value: number): string;
export function formatDuration(value: number | null | undefined): string;
export function formatUsd(value: string | null | undefined): string;
export function formatTokens(tokens: { input: number | null; output: number | null }): string;
export function feedbackLabel(feedback: TraceRow['feedback']): string;
export function stepsSummary(steps: TraceRow['steps']): string;
