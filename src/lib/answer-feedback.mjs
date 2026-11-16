// Answer rating contract (A1). The vendored bar speaks labels; the service speaks a fixed enum.
// The last label is "Something else", never "Other", so the vendored free-text input stays hidden.
export const FEEDBACK_REASONS = [
  ['Not accurate', 'inaccurate'],
  ['Incomplete', 'incomplete'],
  ["Didn't follow instructions", 'ignored_instructions'],
  ['Too long', 'too_long'],
  ['Something else', 'other'],
];
export const FEEDBACK_REASON_LABELS = FEEDBACK_REASONS.map(([label]) => label);

const HASH = /^[a-f0-9]{64}$/;
const reasonId = label => FEEDBACK_REASONS.find(([text]) => text === label)?.[1];

/** Body for POST tasks/{id}/feedback, or null when the rating is not bound to a proven answer. */
export function feedbackBody({ turnId, answerHash, kind, reason }) {
  if (typeof turnId !== 'string' || !turnId) return null;
  if (typeof answerHash !== 'string' || !HASH.test(answerHash)) return null;
  const base = { turnId, answerHash };
  if (kind === null) return { ...base, rating: 'cleared' };
  if (kind === 'up') return reason === undefined ? { ...base, rating: 'up' } : null;
  if (kind !== 'down') return null;
  if (reason === undefined) return { ...base, rating: 'down' };
  const id = reasonId(reason);
  return id ? { ...base, rating: 'down', reason: id } : null;
}

export const feedbackPath = taskId => `tasks/${encodeURIComponent(taskId)}/feedback`;

/** The owner's saved votes as {turnId: 'up' | 'down'}; anything malformed is dropped. */
export function feedbackVotes(rows) {
  const votes = {};
  if (!Array.isArray(rows)) return votes;
  for (const row of rows) {
    const rated = row?.rating === 'up' || row?.rating === 'down';
    if (rated && typeof row.turnId === 'string') votes[row.turnId] = row.rating;
  }
  return votes;
}

/** Votes after a successful save of `body`. */
export function applyFeedback(votes, body) {
  const next = { ...votes };
  if (body.rating === 'cleared') delete next[body.turnId]; else next[body.turnId] = body.rating;
  return next;
}

export function feedbackFailureMessage(status) {
  if (status === 409) {
    return 'This answer changed or is not saved yet, so your rating was not saved. '
      + 'Reload the chat.';
  }
  if (status === 429) {
    return 'Too many ratings in a short time. Your rating was not saved; try again in a minute.';
  }
  return 'Your rating was not saved. Try again.';
}
