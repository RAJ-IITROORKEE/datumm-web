export const REPLACE_EVENT: 'datumm.answer.replace';
export const REPLACE_PART: 'data-answer-replace';
export type DraftState = { text: string; dead: boolean } | null;
export interface DraftStep { state: DraftState; start: boolean; delta: string }
export interface FinishPlan { delta: string; replace: boolean }
export interface AnswerViewPart { text: string; draft: boolean }
export function extendsDraft(previous: string, next: unknown): boolean;
export function draftSuffix(previous: string, next: unknown): string | null;
export function draftStep(state: DraftState, text: unknown): DraftStep;
/** `streamed` is undefined when no draft started. */
export function finishPlan(streamed: string | undefined, answer: string): FinishPlan;
export type MessagePart = { type: string; text?: string; state?: string; data?: unknown };
export function answerView(parts: ReadonlyArray<MessagePart>): AnswerViewPart[];
export function liveDraft(
  messages: ReadonlyArray<{ role: string; parts: ReadonlyArray<MessagePart> }>,
): string;
