// Admin config history and audit (A2). The backend masks values and sends hashes for free text;
// this module still rebuilds every row key by key, so a later backend change can never put an
// unknown field (or a whole config snapshot) on screen.
export const HISTORY_ACTIONS = ['update', 'restore', 'baseline'];
export const AUDIT_KINDS = ['config', 'knowledge', 'model_test', 'mcp'];
export const AUDIT_ACTIONS = [...HISTORY_ACTIONS, 'add', 'reindex', 'delete', 'test', 'mcp_create',
  'mcp_update', 'mcp_test', 'mcp_tool_mode', 'mcp_enable', 'mcp_disable', 'mcp_remove'];
export const MAX_NOTE = 200;
export const HISTORY_LIMIT = 20;
export const AUDIT_LIMIT = 25;
const MAX_CHANGES = 50;

const LABELS = {
  update: 'Edit', restore: 'Restore', baseline: 'Baseline',
  add: 'Source added', reindex: 'Reindex', delete: 'Source removed', test: 'Tested',
  mcp_create: 'Server added', mcp_update: 'Server edited', mcp_test: 'Connection tested',
  mcp_tool_mode: 'Tool mode set', mcp_enable: 'Server turned on', mcp_disable: 'Server turned off',
  mcp_remove: 'Server removed',
};
const KIND_LABELS = { config: 'Configuration', knowledge: 'Knowledge', model_test: 'Model test', mcp: 'MCP server' };
export const actionLabel = value => LABELS[value] ?? 'Change';
export const kindLabel = value => KIND_LABELS[value] ?? String(value);

const HASH = /^[0-9a-f]{8,64}$/;
const CURSOR = /^[A-Za-z0-9_.~=+/|:-]{1,512}$/;
const NO_CONTROL = /^[^\u0000-\u001f\u007f]+$/;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = value => (Number.isInteger(value) && value >= 0 && value <= 2147483647
  ? value : null);
const positive = value => { const n = whole(value); return n && n >= 1 ? n : null; };
const text = (value, max) => (typeof value === 'string' && value.length <= max
  && NO_CONTROL.test(value) ? value : null);
const oneOf = (value, list) => (list.includes(value) ? value : null);
const iso = value => (typeof value === 'string' && value.length <= 40
  && !Number.isNaN(Date.parse(value)) ? value : null);
const hash = value => (typeof value === 'string' && HASH.test(value) ? value : null);

// Only short scalars (and lists of them) are ever displayed; anything else counts as "no value".
const scalar = value => ['string', 'number', 'boolean'].includes(typeof value)
  && (typeof value !== 'string' || value.length <= 200)
  && (typeof value !== 'number' || Number.isFinite(value));
function shown(value) {
  if (scalar(value)) return { ok: true, value };
  if (Array.isArray(value) && value.length <= 50 && value.every(scalar)) {
    return { ok: true, value };
  }
  return { ok: false };
}

function parseChange(change) {
  if (!isObject(change)) return null;
  const path = text(change.path, 200);
  if (!path) return null;
  const out = { path, beforeHash: hash(change.beforeHash), afterHash: hash(change.afterHash) };
  for (const key of ['before', 'after']) {
    const kept = key in change ? shown(change[key]) : { ok: false };
    if (kept.ok) out[key] = kept.value;
  }
  return out;
}
const parseChanges = value => (Array.isArray(value)
  ? value.slice(0, MAX_CHANGES).map(parseChange).filter(Boolean) : []);

const cell = value => (Array.isArray(value) ? (value.length ? value.join(', ') : '(none)')
  : value === '' ? '(empty)' : String(value));
/** "before → after" when the backend sent values, otherwise just "changed". */
export function formatChange(change) {
  const has = key => change && key in change;
  if (!has('before') && !has('after')) return 'changed';
  return `${has('before') ? cell(change.before) : '(none)'} → `
    + `${has('after') ? cell(change.after) : '(none)'}`;
}

// Plain words for the skill paths; every other path stays as the backend wrote it.
const SKILL_PATHS = [
  [/^builtinSkills\[([^\]]+)\]\.modes$/, 'Starter skill $1: modes'],
  [/^builtinSkills\[([^\]]+)\]$/, 'Starter skill $1'],
  [/^skills\[([^\]]+)\]\.toolHints$/, 'Skill $1: tools that help'],
];
export function pathLabel(path) {
  const hit = SKILL_PATHS.find(([pattern]) => pattern.test(path));
  return hit ? path.replace(hit[0], hit[1]) : path;
}

/** Up to `max` changed paths for a table cell, plus how many more there are. */
export function changedPaths(changes, truncated = false, max = 3) {
  const list = Array.isArray(changes) ? changes : [];
  return {
    paths: list.slice(0, max).map(change => change.path),
    more: Math.max(0, list.length - max), truncated: truncated === true,
  };
}

function parseHistoryRow(row) {
  if (!isObject(row)) return null;
  const revision = positive(row.revision);
  const action = oneOf(row.action, HISTORY_ACTIONS);
  if (!revision || !action) return null;
  return {
    revision, at: iso(row.at), by: text(row.by, 200), action,
    restoredFrom: positive(row.restoredFrom), note: text(row.note, MAX_NOTE),
    configHash: hash(row.configHash), changes: parseChanges(row.changes),
    changesTruncated: row.changesTruncated === true, recovered: row.recovered === true,
    redacted: row.redacted === true, restorable: row.restorable === true,
    identical: row.identical === true,
  };
}

/** Parsed list, or null when it is not a schemaVersion 1 history document. */
export function parseHistory(raw) {
  if (!isObject(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.rows)) return null;
  const current = positive(raw.current);
  if (!current) return null;
  return {
    current, nextBefore: positive(raw.nextBefore),
    rows: raw.rows.map(parseHistoryRow).filter(Boolean),
  };
}

/** One revision plus its difference from the live configuration. The snapshot itself is dropped. */
export function parseHistoryDetail(raw) {
  const row = parseHistoryRow(raw);
  if (!row) return null;
  return {
    ...row, changesFromCurrent: parseChanges(raw.changesFromCurrent),
    changesFromCurrentTruncated: raw.changesFromCurrentTruncated === true,
  };
}

function parseAuditRow(row) {
  if (!isObject(row)) return null;
  return {
    at: iso(row.at), by: text(row.by, 200), summary: text(row.summary, 500) ?? '',
    kind: oneOf(row.kind, AUDIT_KINDS), action: oneOf(row.action, AUDIT_ACTIONS),
    revision: positive(row.revision), restoredFrom: positive(row.restoredFrom),
    note: text(row.note, MAX_NOTE), changes: parseChanges(row.changes),
    changesTruncated: row.changesTruncated === true,
    cursor: typeof row.cursor === 'string' && CURSOR.test(row.cursor) ? row.cursor : null,
  };
}
/** The audit response is still a plain array; null when it is anything else. */
export const parseAuditRows = raw => (Array.isArray(raw)
  ? raw.map(parseAuditRow).filter(Boolean) : null);

function query(params) {
  const search = new URLSearchParams();
  for (const [key, value] of params) if (value != null) search.set(key, value);
  const joined = search.toString();
  return joined ? `?${joined}` : '';
}
export const historyPath = ({ before, limit = HISTORY_LIMIT } = {}) => 'admin/config/history'
  + query([['before', positive(before) ? String(before) : null], ['limit', String(limit)]]);
export const auditPath = ({ before, limit = AUDIT_LIMIT, kind } = {}) => 'admin/audit' + query([
  ['before', typeof before === 'string' && CURSOR.test(before) ? before : null],
  ['limit', String(limit)], ['kind', oneOf(kind, AUDIT_KINDS)],
]);

/** Restore body, or null unless both revisions are bound; the note is trimmed to 200 chars. */
export function restoreBody({ fromRevision, expectedRevision, note } = {}) {
  if (!positive(fromRevision) || whole(expectedRevision) === null) return null;
  const trimmed = typeof note === 'string' ? note.trim().slice(0, MAX_NOTE).trim() : '';
  return { fromRevision, expectedRevision, ...(trimmed && { note: trimmed }) };
}

/** Why Restore is unavailable, or null. Unsaved edits come first: they are the user's to fix. */
export function restoreBlock({
  restorable, revision, current, dirty, saving, pendingChipCount = 0,
  identical, changesFromCurrent, changesFromCurrentTruncated,
}) {
  if (dirty || saving || pendingChipCount > 0) return 'Save or discard your edits first';
  if (!restorable) return 'Contains data that cannot be restored';
  if (revision === current) return 'This is the live revision';
  // The backend refuses an identical snapshot with 422, so do not offer it.
  if (identical === true || (changesFromCurrent?.length === 0 && !changesFromCurrentTruncated)) {
    return 'Same settings as the live revision';
  }
  return null;
}

export const restoredStatus = (from, revision) =>
  `Restored revision ${from} as revision ${revision}`;
