import type { TraceReason } from './admin-traces.mjs';

export type FeedbackVote = 'up' | 'down';
export interface FeedbackRow {
  id: string; vote: FeedbackVote; reason: TraceReason | null; createdAt: string | null;
  model: string | null; ownerHash: string | null; taskId: string | null;
}
export interface FeedbackPage { rows: FeedbackRow[]; nextBefore: string | null }
export interface FeedbackFilters { vote?: string; reason?: string; before?: string; limit?: number }

export const FEEDBACK_VOTES: FeedbackVote[];
export const DEFAULT_VOTE: FeedbackVote;
export const FEEDBACK_LIMIT: number;
/** Null when the response is not a schemaVersion 1 feedback document; unknown keys are dropped. */
export function parseFeedbackPage(raw: unknown): FeedbackPage | null;
/** Service path with query; only valid values are sent. */
export function feedbackPath(filters?: FeedbackFilters): string;
/** Eval-case path for a row id, or null for an id the service proxy would refuse. */
export function casePath(id: string): string | null;
/** Pretty eval-case JSON rebuilt key by key (`expected` is always null), or null when unreadable. */
export function caseJson(raw: unknown): string | null;
