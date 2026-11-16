/**
 * What the browser tells the agent about the user's view. Display state only: never evidence or
 * authority.
 */
export const FRONTEND_CONTEXT_DESCRIPTION = 'datumm.frontend.v1';
export const FRONTEND_CONTEXT_MAX_BYTES = 1024;
export const VIEWPORTS = ['narrow', 'medium', 'wide'];
// Same values as WorkAreaSection and WorkAreaPreview['kind'] in work-area-contract.ts.
export const SECTIONS = ['design', 'activity', 'assets', 'exports'];
export const PREVIEWS = ['drawing', 'answer-output', 'saved-report'];
export const CONTEXT_ACTIONS = [
  'open_work_area', 'expand_process', 'scroll_to_turn', 'suggest_followup',
];

// Control characters, C1 and U+FEFF are refused, as the backend does.
const controlChar = ch => {
  const code = ch.charCodeAt(0);
  return code < 32 || (code >= 127 && code <= 159) || code === 0xfeff;
};
const roomKeyOk = value => typeof value === 'string' && value.length >= 1 && value.length <= 128 &&
  ![...value].some(controlChar);
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const exactKeys = (value, keys) =>
  Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const bytes = text => new TextEncoder().encode(text).length;

/** Same split as workspace-layout.mjs: below 768 px narrow, below 1,180 px medium, else wide. */
export const viewportClass = width => (width < 768 ? 'narrow' : width < 1180 ? 'medium' : 'wide');

/** Strict check of an envelope. Returns a canonical copy, or null: it never trims or repairs. */
export function validateFrontendContext(value) {
  const keys = ['v', 'viewport', 'workArea', 'selection', 'actions'];
  if (!isObject(value) || !exactKeys(value, keys) || value.v !== 1) return null;
  const {viewport, workArea, selection, actions} = value;
  if (!VIEWPORTS.includes(viewport)) return null;
  if (!isObject(workArea) || !exactKeys(workArea, ['open', 'section', 'preview']) ||
      typeof workArea.open !== 'boolean' || !SECTIONS.includes(workArea.section) ||
      !PREVIEWS.includes(workArea.preview)) return null;
  const roomOk = isObject(selection) && exactKeys(selection, ['roomKey']) &&
    roomKeyOk(selection.roomKey);
  if (selection !== null && !roomOk) {
    return null;
  }
  if (!Array.isArray(actions) || actions.length > CONTEXT_ACTIONS.length ||
      new Set(actions).size !== actions.length ||
      !actions.every(name => CONTEXT_ACTIONS.includes(name))) {
    return null;
  }
  const canonical = {
    v: 1, viewport,
    workArea: {open: workArea.open, section: workArea.section, preview: workArea.preview},
    selection: selection === null ? null : {roomKey: selection.roomKey}, actions: [...actions],
  };
  return bytes(JSON.stringify(canonical)) <= FRONTEND_CONTEXT_MAX_BYTES ? canonical : null;
}

/**
 * Build the envelope from display state only. The selection counts only while its key is a room of
 * the current plan; anything oversized or malformed yields null so the prompt is sent without
 * context.
 */
export function buildFrontendContext(input) {
  const {viewportWidth, workAreaOpen, section, preview, selectedKey, roomKeys = [],
    actions = CONTEXT_ACTIONS} = input;
  return validateFrontendContext({
    v: 1, viewport: viewportClass(viewportWidth),
    workArea: {open: Boolean(workAreaOpen), section, preview},
    selection: selectedKey && roomKeys.includes(selectedKey) ? {roomKey: selectedKey} : null,
    actions,
  });
}

/** The AG-UI context entry value: compact JSON of a valid envelope, or null. */
export function serializeFrontendContext(envelope) {
  const valid = validateFrontendContext(envelope);
  return valid ? JSON.stringify(valid) : null;
}

/** Inverse of serializeFrontendContext for the adapter. The raw text is bounded before parsing. */
export function parseFrontendContext(text) {
  if (typeof text !== 'string' || bytes(text) > FRONTEND_CONTEXT_MAX_BYTES) return null;
  try { return validateFrontendContext(JSON.parse(text)); } catch { return null; }
}
