// Admin feedback (A5). The list is text-free (no prompt, answer or note); only the explicit "copy as
// eval case" fetch carries text, and it goes to the clipboard, nowhere else.
import { TRACE_REASONS } from './admin-traces.mjs';

export const FEEDBACK_VOTES = ['down', 'up'];
export const DEFAULT_VOTE = 'down';
export const FEEDBACK_LIMIT = 25;

const ID = /^[A-Za-z0-9._:-]{1,120}$/;
const MODEL = /^[A-Za-z0-9._/:-]{1,160}$/;
const OWNER = /^[a-f0-9]{16}$/;
const CURSOR = /^[^\s]{1,400}$/;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pick = (value, pattern) => (typeof value === 'string' && pattern.test(value) ? value : null);
const oneOf = (value, list) => (list.includes(value) ? value : null);
const iso = value => (typeof value === 'string' && value.length <= 40
  && !Number.isNaN(Date.parse(value)) ? value : null);

function parseRow(row) {
  const id = isObject(row) ? pick(row.id, ID) : null;
  const vote = isObject(row) ? oneOf(row.vote, FEEDBACK_VOTES) : null;
  if (!id || !vote) return null;
  return {
    id, vote, reason: vote === 'down' ? oneOf(row.reason, TRACE_REASONS) : null,
    createdAt: iso(row.createdAt), model: pick(row.model, MODEL),
    ownerHash: pick(row.ownerHash, OWNER), taskId: pick(row.taskId, ID),
  };
}

/** Parsed page, or null when it is not a schemaVersion 1 feedback document. Unknown keys are dropped. */
export function parseFeedbackPage(raw) {
  if (!isObject(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.rows)) return null;
  return { rows: raw.rows.map(parseRow).filter(Boolean), nextBefore: pick(raw.nextBefore, CURSOR) };
}

/** Path (with query) for GET admin/feedback: only valid values are sent. */
export function feedbackPath({ vote, reason, before, limit = FEEDBACK_LIMIT } = {}) {
  const query = new URLSearchParams({ limit: String(Math.min(100, Math.max(1, Math.floor(limit) || FEEDBACK_LIMIT))) });
  for (const [key, value] of [['vote', oneOf(vote, FEEDBACK_VOTES)], ['reason', oneOf(reason, TRACE_REASONS)],
    ['before', pick(before, CURSOR)]]) if (value) query.set(key, value);
  return `admin/feedback?${query}`;
}

/** Path of the eval-case route, or null for an id the proxy would refuse. */
export const casePath = id => (pick(id, ID) ? `admin/feedback/${encodeURIComponent(id)}/case` : null);

const text = value => (typeof value === 'string' ? value : null);
/** The eval case as pretty JSON, rebuilt key by key; null when the response is not a case. */
export function caseJson(raw) {
  const vote = isObject(raw) ? oneOf(raw.vote, FEEDBACK_VOTES) : null;
  if (!vote) return null;
  return JSON.stringify({
    prompt: text(raw.prompt), answerExcerpt: text(raw.answerExcerpt), expected: null,
    reason: vote === 'down' ? oneOf(raw.reason, TRACE_REASONS) : null, vote,
    model: pick(raw.model, MODEL), createdAt: iso(raw.createdAt),
  }, null, 2);
}
