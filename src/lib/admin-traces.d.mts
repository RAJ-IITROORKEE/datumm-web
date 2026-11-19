export type TracePeriod = '24h' | '7d' | '30d';
export type TraceOutcome =
  'completed' | 'failed' | 'cancelled' | 'paused' | 'waiting' | 'running' | 'other';
export type TraceFeedbackFilter = 'up' | 'down' | 'none';
export type TraceSignal = 'retried' | 'model_fallback' | 'output_limit' | 'content_filter'
  | 'refusal' | 'invalid_tool_call' | 'usage_unknown' | 'call_unsettled' | 'specialist_partial'
  | 'budget_exhausted' | 'quick_reply';
export type TraceReason =
  'inaccurate' | 'incomplete' | 'ignored_instructions' | 'too_long' | 'other';

/** Null per field when unreported; the whole object is null when the backend sent none. */
export interface TracePhases {
  admitMs: number | null; startMs: number | null; firstCallMs: number | null;
  firstTokenMs: number | null; answerMs: number | null; modelMs: number | null;
  toolMs: number | null; stepMs: number | null;
  unattributedMs: number | null; maxPacketBytes: number | null; maxToolSchemaBytes: number | null;
}
export interface TraceRoute { lane: 'short' | 'full'; rule: string | null; floor: string | null }
export interface PhaseItem { label: string; value: string }

export interface TraceCall {
  role: string | null; modelId: string | null; status: string | null; finishReason: string | null;
  inputTokens: number | null; outputTokens: number | null; reasoningTokens: number | null;
  durationMs: number | null; usd: string | null; failureCode: string | null;
  /** Time to the first word of the model's reply; null when the backend did not measure it. */
  firstTokenMs: number | null;
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
  phases: TracePhases | null; route: TraceRoute | null;
  /** Skills this run loaded; empty from an older backend. */
  skills: TraceSkill[];
}
export interface TraceSkill { id: string; name: string; hash: string | null }
export interface SkillUse { id: string; name: string; runs: number }
export interface TraceStats {
  turns: number; scanned: number; truncated: boolean; failed: number;
  p50Ms: number | null; p95Ms: number | null;
  firstTokenP50Ms: number | null; firstTokenP95Ms: number | null;
  inputTokens: number; outputTokens: number; usd: string | null;
  /** Runs per skill across the scanned rows, most used first; empty from an older backend. */
  skillUse: SkillUse[];
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
export function formatBytes(value: number | null | undefined): string;
/** Only the phases that are present, in display order. */
export function phaseTimeItems(phases: TracePhases | null | undefined): PhaseItem[];
export function phasePacketItems(phases: TracePhases | null | undefined): PhaseItem[];
