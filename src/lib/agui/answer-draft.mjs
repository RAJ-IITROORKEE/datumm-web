// Answer draft streaming (N5): pure decisions for the adapter and the chat. A draft is the model's
// answer text while it is written; only the server-checked answer is ever saved.
export const REPLACE_EVENT = 'datumm.answer.replace';
export const REPLACE_PART = 'data-answer-replace';
const MAX_DRAFT = 12000;

/** True when `next` is `previous` plus more text (or the same text). */
export const extendsDraft = (previous, next) =>
  typeof next === 'string' && next.startsWith(previous);

/** The new characters when `next` extends `previous`, else null. */
export const draftSuffix = (previous, next) => (extendsDraft(previous, next)
  ? next.slice(previous.length) : null);

/**
 * One backend draft frame. `state` is null before any draft, then `{text, dead}`.
 * Returns `{state, start, delta}`: `start` opens the message, `delta` is text to send ('' = none).
 * A frame that does not extend the sent text ends the draft: nothing more is sent until the answer.
 */
export function draftStep(state, text) {
  const idle = { state, start: false, delta: '' };
  if (typeof text !== 'string' || !text || text.length > MAX_DRAFT || state?.dead) return idle;
  if (!state) return { state: { text, dead: false }, start: true, delta: text };
  if (state.text.startsWith(text)) return idle; // an older or repeated frame, not a divergence
  const delta = draftSuffix(state.text, text);
  if (delta === null) return { state: { ...state, dead: true }, start: false, delta: '' };
  return { state: { text, dead: false }, start: false, delta };
}

/**
 * How the checked answer closes a draft. `streamed` is the text already sent, or undefined when no
 * draft started (today's single message). Otherwise: send the missing suffix, or replace the text.
 */
export function finishPlan(streamed, answer) {
  if (streamed === undefined) return { delta: answer, replace: false };
  const delta = draftSuffix(streamed, answer);
  return delta === null ? { delta: '', replace: true } : { delta, replace: false };
}

/** What a message shows per text part: the checked replacement wins; `draft` while it streams. */
export function answerView(parts) {
  const replaced = parts.find(part => part.type === REPLACE_PART)?.data?.text;
  return parts.filter(part => part.type === 'text').map((part, index) => ({
    text: index === 0 && typeof replaced === 'string' ? replaced : part.text,
    draft: part.state === 'streaming',
  }));
}

/** The draft text of the newest assistant message while it is still being written, else ''. */
export function liveDraft(messages) {
  const last = messages.at(-1);
  if (last?.role !== 'assistant') return '';
  return answerView(last.parts).find(view => view.draft)?.text ?? '';
}
