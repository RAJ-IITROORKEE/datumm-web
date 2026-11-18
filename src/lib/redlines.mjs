// Redline intake (RD1): build the read request, parse the `datumm.redlines.v1` answer, choose the
// default ticks and queue the ticked edits. Pure. The model's `mark` is drawing text, never
// markup, and nothing here approves a change: the architect ticks, then the existing edit route
// applies each one.
export const REDLINE_SCHEMA = 'datumm.redlines.v1';
export const REDLINE_LIMITS = Object.freeze({
  maxFileBytes: 20_000_000,
  maxPages: 100,
  maxEdgePx: 2400,
  maxImageBytes: 2_500_000,
  maxPageText: 8000,
});
const ACCEPT_IMAGES = ['image/png', 'image/jpeg', 'image/webp'];
export const REDLINE_ACCEPT = [...ACCEPT_IMAGES, 'application/pdf'].join(',');
const CONFIDENCE = ['high', 'medium', 'low'];
const EDIT_KINDS = ['rename', 'swap', 'move-wall', 'opening'];
const OPENING_ACTIONS = ['create', 'update', 'delete'];
const MAX_ITEMS = 12;
const MARK_MAX = 200;
const SUMMARY_MAX = 300;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]+/g;

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const plain = (value, max) => String(value).replace(CONTROL, ' ').trim().slice(0, max);

export const redlinePath = (drawing) =>
  `variable/plans/${encodeURIComponent(drawing.planId)}/versions/${drawing.version}/redlines`;

/** `image` is a data: URL; `pageText` is optional and clipped to the server's limit. */
export function redlineBody(drawing, { image, pageText }) {
  const body = { fingerprint: drawing.fingerprint, image };
  const text = clipText(pageText);
  if (text) body.pageText = text;
  return body;
}

export function clipText(text, max = REDLINE_LIMITS.maxPageText) {
  if (typeof text !== 'string') return '';
  return text.replace(CONTROL, ' ').replace(/ {2,}/g, ' ').trim().slice(0, max);
}

/** Scales a size so its longest edge is at most `max`; it enlarges only when `enlarge` is set. */
export function fitEdge(width, height, max = REDLINE_LIMITS.maxEdgePx, enlarge = false) {
  const longest = Math.max(width, height);
  const scale = longest > 0 && (enlarge || longest > max) ? max / longest : 1;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    scale,
  };
}

/** Checks a chosen file before any work is done on it. */
export function checkFile(file) {
  if (!file || typeof file.type !== 'string') {
    return { ok: false, error: 'Choose an image or a PDF.' };
  }
  const isPdf = file.type === 'application/pdf';
  const kind = isPdf ? 'pdf' : ACCEPT_IMAGES.includes(file.type) ? 'image' : '';
  if (!kind) return { ok: false, error: 'Use a PNG, JPEG, WebP or PDF file.' };
  if (!(file.size > 0)) return { ok: false, error: 'That file is empty.' };
  if (file.size > REDLINE_LIMITS.maxFileBytes) {
    return { ok: false, error: 'Use a file under 20 MB.' };
  }
  return { ok: true, kind };
}

export const pageCheck = (page, count) =>
  Number.isInteger(page) && page >= 1 && page <= count
    ? { ok: true }
    : { ok: false, error: `Choose a page from 1 to ${count}.` };

function parseEdit(edit) {
  if (!isObject(edit) || !EDIT_KINDS.includes(edit.kind)) return null;
  if (edit.kind === 'rename') return isText(edit.roomKey) && isText(edit.name) ? edit : null;
  if (edit.kind === 'swap') {
    const keys = edit.roomKeys;
    return Array.isArray(keys) && keys.length === 2 && keys.every(isText) ? edit : null;
  }
  if (edit.kind === 'move-wall') {
    return isText(edit.wallKey) && Number.isSafeInteger(edit.offsetMm) ? edit : null;
  }
  return isObject(edit.opening) && OPENING_ACTIONS.includes(edit.opening.kind) ? edit : null;
}

function parseItem(raw) {
  if (!isObject(raw) || !isText(raw.id) || !isText(raw.mark) || !isText(raw.summary)) return null;
  if (!CONFIDENCE.includes(raw.confidence)) return null;
  if (!['ready', 'unclear'].includes(raw.status)) return null;
  const item = {
    id: raw.id,
    mark: plain(raw.mark, MARK_MAX),
    summary: plain(raw.summary, SUMMARY_MAX),
    confidence: raw.confidence,
    status: raw.status,
    edit: null,
    reason: '',
  };
  if (raw.status === 'ready') {
    item.edit = parseEdit(raw.edit);
    return item.edit ? item : null;
  }
  if (raw.edit != null) return null;
  item.reason = isText(raw.reason)
    ? plain(raw.reason, SUMMARY_MAX)
    : 'The mark could not be turned into a change.';
  return item;
}

/**
 * The 200 body, or null when it is not a redline answer for this exact plan version. One bad item
 * rejects the whole answer: a half-read list could hide a change the architect should see.
 */
export function parseRedlines(raw, drawing) {
  if (!isObject(raw) || raw.schema !== REDLINE_SCHEMA || !Array.isArray(raw.items)) return null;
  if (raw.planId !== drawing.planId || raw.version !== drawing.version) return null;
  if (!isText(raw.fingerprint) || raw.items.length > MAX_ITEMS) return null;
  const items = raw.items.map(parseItem);
  if (items.some((item) => !item)) return null;
  if (new Set(items.map((item) => item.id)).size !== items.length) return null;
  return {
    planId: raw.planId,
    version: raw.version,
    fingerprint: raw.fingerprint,
    model: typeof raw.model === 'string' ? plain(raw.model, 120) : '',
    items,
  };
}

/** High and medium are ticked, low is not, and an unclear item can never be ticked. */
export const defaultTicks = (items) =>
  items.filter((item) => canTick(item) && item.confidence !== 'low').map((item) => item.id);

export const canTick = (item) => item.status === 'ready' && Boolean(item.edit);

/** The ticked, ready, not yet applied items in the order the server listed them. */
export const applyQueue = (items, ticked, applied = []) =>
  items.filter((item) => canTick(item) && ticked.includes(item.id) && !applied.includes(item.id));

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const applyLabel = (n) =>
  (n > 0 ? `Apply ${count(n, 'change', 'changes')}` : 'Apply changes');

export const appliedMessage = (done, version) =>
  `${count(done, 'change', 'changes')} applied · Saved as Version ${version}`;

export const partialMessage = (done, total, version, reason) =>
  `${done} of ${count(total, 'change', 'changes')} applied. Stopped there: ${reason}`
  + `${done ? ` Version ${version} is saved.` : ''}`;

const CONFIDENCE_LABELS = {
  high: 'High confidence',
  medium: 'Medium confidence',
  low: 'Low confidence',
};
export const confidenceLabel = (confidence) => CONFIDENCE_LABELS[confidence] ?? '';

/**
 * A plain sentence for a read that failed; a read never touches the plan. The server's own
 * message (`detail.message`) is shown for 422, 429 and 502 unless the client already replaced it
 * with a generic line.
 */
export function readFailureMessage({ status, message } = {}) {
  const text = typeof message === 'string' ? message.trim() : '';
  const own = text && !/^DATUMM (?:could not|service is)/.test(text) ? text : '';
  if (status === 409) return 'This plan changed elsewhere. Reload to read the latest version.';
  if (status === 404 || status === 405) return 'Reading marked-up plans is not available.';
  if (status === 413) return 'That page is too large to send. Try a smaller file.';
  if (status === 429) return own || 'You have reached today’s limit for reading marked-up plans.';
  if (status === 422) return own || 'That image could not be read.';
  if (status === 502) return own || 'The model could not read the markup. Try again.';
  return 'The markup could not be read. The plan is unchanged.';
}
