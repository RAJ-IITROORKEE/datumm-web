export type FeedbackKind = 'up' | 'down';
export type FeedbackReason =
  'inaccurate' | 'incomplete' | 'ignored_instructions' | 'too_long' | 'other';
export type AnswerFeedbackBody = {
  turnId: string;
  answerHash: string;
  rating: FeedbackKind | 'cleared';
  reason?: FeedbackReason;
};
export const FEEDBACK_REASONS: readonly (readonly [string, FeedbackReason])[];
/** Labels for the vendored MessageActions `reasons` prop; none is "Other". */
export const FEEDBACK_REASON_LABELS: string[];
/** Null unless `turnId` and a 64-hex `answerHash` are present and the kind and reason are valid. */
export function feedbackBody(input: {
  turnId?: string; answerHash?: string; kind: FeedbackKind | null; reason?: string;
}): AnswerFeedbackBody | null;
export function feedbackPath(taskId: string): string;
export function feedbackVotes(rows: unknown): Record<string, FeedbackKind>;
export function applyFeedback(
  votes: Record<string, FeedbackKind>, body: AnswerFeedbackBody,
): Record<string, FeedbackKind>;
export function feedbackFailureMessage(status: number | undefined): string;
