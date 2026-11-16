// Pure registry for agent "display actions". It imports nothing on purpose: no command, API or
// draft setter can be reachable from here (tests/display-actions.test.mjs inspects this file).
export const DISPLAY_ACTIONS = [
  'open_work_area', 'expand_process', 'scroll_to_turn', 'suggest_followup',
];
const SECTIONS = ['design', 'activity', 'assets', 'exports'];
const SECTION_NAMES = {
  design: 'Design', activity: 'Activity', assets: 'Assets', exports: 'Exports',
};
const MAX_ACTIONS = 2;
export const FOLLOWUP_MAX = 160;
const SCROLL_TOLERANCE = 4;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const turnIdOk = value => typeof value === 'string' && value.length >= 1 && value.length <= 128;
// Model text may be steered by retrieved content, so a suggestion is plain one-line prose only.
// Control characters, C1, line/paragraph separators, U+FEFF and markup characters are all rejected
// (mirrors the backend).
const badChar = ch => {
  const code = ch.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159) || code === 0x2028 || code === 0x2029 ||
    code === 0xfeff || '<>`'.includes(ch);
};
// The backend's case-insensitive match also folds Turkish dotted and dotless I to "i".
const markerText = value => value.replace(/[\u0130\u0131]/g, 'i');
const textOk = value => typeof value === 'string' && value.trim() === value && value.length >= 1 &&
  value.length <= FOLLOWUP_MAX && ![...value].some(badChar) && !value.includes('](') &&
  !/viewport (?:context|annotation):/i.test(markerText(value));

function parseAction(value) {
  if (!isObject(value)) return null;
  switch (value.action) {
    case 'open_work_area':
      return exactKeys(value, ['action', 'section']) && SECTIONS.includes(value.section)
        ? {action: value.action, section: value.section} : null;
    case 'expand_process':
    case 'scroll_to_turn':
      return exactKeys(value, ['action', 'turnId']) && turnIdOk(value.turnId)
        ? {action: value.action, turnId: value.turnId} : null;
    case 'suggest_followup':
      return exactKeys(value, ['action', 'text']) && textOk(value.text)
        ? {action: value.action, text: value.text} : null;
    default: return null;
  }
}

/**
 * Closed-enum parse. Any bad entry, an empty list, a third entry or a repeated action rejects the
 * whole array.
 */
export function parseDisplayActions(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_ACTIONS) return null;
  const actions = value.map(parseAction);
  if (actions.includes(null) || new Set(actions.map(item => item.action)).size !== actions.length) {
    return null;
  }
  return actions;
}

/**
 * The shared-vector rule: the items, and every target turn is one of this task's turns.
 * Null when rejected.
 */
export function validateDisplayItems(value, turnIds = []) {
  const actions = parseDisplayActions(value);
  const known = item => item.turnId === undefined || turnIds.includes(item.turnId);
  return actions?.every(known) ? actions : null;
}

const sameScope = (a, b) =>
  isObject(a) && isObject(b) && typeof a.key === 'string' && a.key === b.key && a.epoch === b.epoch;

/**
 * Decide whether the actions of one answer may apply now. `value` is `presentation.actions`:
 * {schemaVersion:1, kind:'display-actions', answerHash, taskId, turnId, items}.
 * Returns {actions} when applicable, else
 * {denied: 'unknown'|'unbound'|'history'|'stale'|'missing_target'}.
 * `unknown` and `unbound` carry no actions; the others carry the schema-valid, bound actions so a
 * caller can list them as inert rows. `completion` must already be verified against the answer text
 * by the caller. Identities come from the task snapshot and live scope, never from answer text.
 */
export function validateDisplayActions(value, context) {
  const {taskId, turnId, answerHash, completion, scope, liveScope} = context;
  const {turnIds = [], live = false} = context;
  if (value === undefined || value === null) return {actions: []};
  const keys = ['schemaVersion', 'kind', 'answerHash', 'taskId', 'turnId', 'items'];
  if (!isObject(value) || !exactKeys(value, keys)) return {denied: 'unknown'};
  const proven = isObject(completion) && completion.status === 'completed' &&
    completion.taskId === taskId && completion.turnId === turnId &&
    completion.answerHash === answerHash;
  const bound = taskId && turnId && answerHash && proven && value.schemaVersion === 1 &&
    value.kind === 'display-actions' && value.taskId === taskId && value.turnId === turnId &&
    value.answerHash === answerHash;
  if (!bound) return {denied: 'unbound'};
  const actions = parseDisplayActions(value.items);
  if (!actions) return {denied: 'unknown'};
  if (!live) return {denied: 'history', actions};
  if (!sameScope(scope, liveScope)) return {denied: 'stale', actions};
  const targets = actions.filter(item => item.turnId !== undefined).map(item => item.turnId);
  if (targets.some(id => !turnIds.includes(id))) return {denied: 'missing_target', actions};
  return {actions};
}

/**
 * The scope captured at submit, only for the answer to the command this browser sent (its
 * idempotency key is the turn id) and only for its last turn after the submit cursor; null for
 * history or other devices.
 */
export function liveScopeFor(live, taskId, turnId, completionSequence, last) {
  const own = live?.scope && live.taskId === taskId && live.key === turnId;
  return own && last && completionSequence > live.submission.startCursor ? live.scope : null;
}

// Fields each action changes, and therefore the only fields Undo may restore or compare.
const UNDO_FIELDS = {
  open_work_area: ['section', 'workAreaOpen', 'workspacePane'],
  expand_process: ['processOpen'],
  scroll_to_turn: ['scrollTop'],
  suggest_followup: ['placeholder'],
};
const pick = (view, fields) => Object.fromEntries(fields.map(field => [field, view?.[field]]));
const sameField = (field, a, b) =>
  field === 'scrollTop' ? Math.abs(Number(a) - Number(b)) <= SCROLL_TOLERANCE : a === b;

/**
 * Record what an action changed. `before` and `after` are full or partial view snapshots.
 * `unchecked` fields are restored by Undo but never compared (the narrow pane the user may leave).
 */
export function captureUndo(action, before, after, scope, unchecked = []) {
  const fields = UNDO_FIELDS[action.action];
  const record = {action: action.action, scope: {key: scope.key, epoch: scope.epoch},
    before: pick(before, fields), applied: pick(after, fields), unchecked: [...unchecked]};
  const noop = fields.every(field => sameField(field, record.before[field], record.applied[field]));
  return {...record, noop};
}

/** Undo is allowed only in the same scope and while every checked field keeps its applied value. */
export function undoStatus(record, current, liveScope) {
  if (!record || !sameScope(record.scope, liveScope)) return {ok: false, reason: 'view_changed'};
  const checked = field => !record.unchecked?.includes(field);
  const fields = (UNDO_FIELDS[record.action] ?? []).filter(checked);
  if (!fields.every(field => sameField(field, current?.[field], record.applied[field]))) {
    return {ok: false, reason: 'view_changed'};
  }
  return {ok: true, restore: {...record.before}};
}

const DONE = {
  expand_process: 'Expanded process details', scroll_to_turn: 'Scrolled to an earlier turn',
  suggest_followup: 'Suggested a follow-up in the message box',
};
const OFFER = {
  expand_process: 'expand process details', scroll_to_turn: 'scroll to an earlier turn',
  suggest_followup: 'suggest a follow-up',
};
const NOOP = {
  expand_process: 'Process details were already open', scroll_to_turn: 'Already at that turn',
  suggest_followup: DONE.suggest_followup,
};
const SKIPPED = {
  missing_target: 'Not applied: that turn is not shown',
  composer: 'Not applied: the message box has text',
};

/** Public wording for one process-list row, or null when there is nothing to say. */
export function describeAction(action, state, reason) {
  const section = action.action === 'open_work_area' ? SECTION_NAMES[action.section] : '';
  const open = action.action === 'open_work_area';
  if (state === 'applied') return open ? `Opened ${section}` : DONE[action.action];
  if (state === 'noop') return open ? `${section} was already showing` : NOOP[action.action];
  if (state === 'undone') return 'Undone';
  if (state === 'offered') {
    const offer = open ? `open ${section}` : OFFER[action.action];
    return `Offered: ${offer}${reason === 'narrow' ? ' (narrow screen)' : ''}`;
  }
  if (state === 'skipped') return SKIPPED[reason] ?? 'Not applied: view changed';
  return null;
}

export const actionButtonLabel = action =>
  action.action === 'open_work_area' ? `Open ${SECTION_NAMES[action.section]}` : 'Apply';
