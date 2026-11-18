// Revit checks (V3a): parse the `datumm.model-health.v1` answer strictly, group the checks, build
// the read-only "Show in Revit" request and read the floor-plan views and image. Pure. Nothing
// here writes the model: `show_model_elements` only changes Revit's selection.
export const HEALTH_SCHEMA = 'datumm.model-health.v1';
export const MAX_ELEMENT_IDS = 50;
// "select" only selects; "show" also zooms Revit to the elements. Neither changes the model.
export const SHOW_ACTIONS = ['select', 'show'];
// The service allows 2,000,000 base64 characters; this is the same bound with headroom.
export const MAX_IMAGE_BASE64 = 2_200_000;
export const MAX_IMAGE_EDGE = 2048;
export const PLAN_IMAGE_PIXELS = 1200;
export const VIEW_PAGE = 100;
const MAX_CHECKS = 100;
const MAX_LIMITATIONS = 20;
const TEXT_MAX = 500;
const CONTROL = /[\u0000-\u001f\u007f-\u009f]+/g;
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
// "iVBORw0KGgo" is the base64 of the 8-byte PNG signature.
const PNG_PREFIX = 'iVBORw0KGgo';

const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const count = (value) => Number.isSafeInteger(value) && value >= 0;
const plain = (value, max = TEXT_MAX) => String(value).replace(CONTROL, ' ').trim().slice(0, max);
const elementId = (value) =>
  count(value) || (typeof value === 'string' && value.trim() !== '' && value.length <= 200);

export const healthPath = (deviceId) => `devices/${encodeURIComponent(deviceId)}/health`;
export const toolsPath = (deviceId) => `devices/${encodeURIComponent(deviceId)}/tools`;

function parseCheck(item) {
  if (!isObject(item) || typeof item.code !== 'string' || item.code.trim() === '') return null;
  if (!['warn', 'info'].includes(item.severity)) return null;
  if (typeof item.message !== 'string' || item.message.trim() === '' || !count(item.count)) return null;
  const ids = item.elementIds ?? [];
  if (!Array.isArray(ids) || ids.length > MAX_ELEMENT_IDS || !ids.every(elementId)) return null;
  if (new Set(ids).size !== ids.length) return null;
  return {
    code: plain(item.code, 80), severity: item.severity, message: plain(item.message),
    count: item.count, elementIds: ids,
  };
}

/** Returns null for any wrong schema or shape: a half-read health report is never shown. */
export function parseModelHealth(value) {
  if (!isObject(value) || value.schema !== HEALTH_SCHEMA) return null;
  if (typeof value.documentId !== 'string' || value.documentId.trim() === '') return null;
  if (!count(value.revision) || !['complete', 'partial'].includes(value.coverage)) return null;
  if (!isObject(value.counts) || !Object.values(value.counts).every(count)) return null;
  if (!Array.isArray(value.checks) || value.checks.length > MAX_CHECKS) return null;
  if (!Array.isArray(value.limitations) || value.limitations.length > MAX_LIMITATIONS) return null;
  if (!value.limitations.every((line) => typeof line === 'string')) return null;
  const checks = value.checks.map(parseCheck);
  if (checks.includes(null)) return null;
  return {
    documentId: value.documentId, revision: value.revision, coverage: value.coverage,
    title: typeof value.title === 'string' ? plain(value.title, 200) : '',
    counts: { ...value.counts }, checks, limitations: value.limitations.map((line) => plain(line)),
  };
}

/** Problems are the warnings; Notes are the information lines. Order is kept. */
export function groupChecks(health) {
  return {
    problems: health.checks.filter((check) => check.severity === 'warn'),
    notes: health.checks.filter((check) => check.severity === 'info'),
  };
}

/** Exact document and revision of the check; the service fills in the session. */
export function showElementsRequest(health, check, action = 'select') {
  if (!health || !check || !SHOW_ACTIONS.includes(action)) return null;
  if (check.elementIds.length < 1 || check.elementIds.length > MAX_ELEMENT_IDS) return null;
  return {
    name: 'show_model_elements',
    arguments: {
      documentId: health.documentId, expectedRevision: health.revision,
      elementIds: check.elementIds, action,
    },
  };
}

// The tools route answers `{ok, data}` for most reads; list_revit_sessions answers a bare array.
const unwrap = (result) => (isObject(result) && 'data' in result ? result.data : result);

/** The one open Revit session, or null: with none or several there is no safe choice. */
export function onlySession(result) {
  const sessions = unwrap(result);
  if (!Array.isArray(sessions) || sessions.length !== 1) return null;
  const id = sessions[0]?.sessionId;
  return typeof id === 'string' && id.trim() !== '' ? id : null;
}

export const viewsRequest = (sessionId, offset = 0) => ({
  name: 'get_model_views', arguments: { sessionId, kind: 'plans', offset, limit: VIEW_PAGE },
});

export const planImageRequest = (sessionId, viewId) => ({
  name: 'get_plan_image', arguments: { sessionId, viewId, pixelSize: PLAN_IMAGE_PIXELS },
});

/** Floor-plan views of one page; rows that do not fit the shape are dropped. */
export function parseViews(result) {
  const data = unwrap(result);
  if (!isObject(data) || !Array.isArray(data.plans) || !count(data.total)) return null;
  const views = data.plans
    .filter((row) => isObject(row) && typeof row.id === 'string' && row.id !== ''
      && typeof row.name === 'string' && Number.isSafeInteger(row.scale) && row.scale > 0)
    .map((row) => ({ id: row.id, name: plain(row.name, 120), scale: row.scale }));
  return { views, total: data.total, more: data.nextOffset != null };
}

/** A PNG the page may show: right type, bounded size, real signature. Otherwise null. */
export function parsePlanImage(result) {
  const data = unwrap(result);
  if (!isObject(data) || data.contentType !== 'image/png') return null;
  const { base64 } = data;
  if (typeof base64 !== 'string' || base64.length > MAX_IMAGE_BASE64) return null;
  if (!base64.startsWith(PNG_PREFIX) || !BASE64.test(base64)) return null;
  const edge = (n) => Number.isSafeInteger(n) && n >= 1 && n <= MAX_IMAGE_EDGE;
  if (!edge(data.width) || !edge(data.height) || !count(data.revision)) return null;
  if (typeof data.viewName !== 'string' || !Number.isSafeInteger(data.scale) || data.scale < 1) return null;
  return {
    src: `data:image/png;base64,${base64}`, width: data.width, height: data.height,
    viewName: plain(data.viewName, 120), scale: data.scale, revision: data.revision,
    documentId: typeof data.documentId === 'string' ? data.documentId : '',
  };
}

export const planSnapshotRequest = (sessionId, viewId) => ({
  name: 'get_plan_snapshot', arguments: { sessionId, viewId },
});

const MAX_SNAPSHOT_SVG = 600_000;
// The SVG is shown only as an <img>, where scripts never run; refusing active content is a second guard.
const ACTIVE_SVG = /<script|<foreignObject|\son\w+\s*=|href\s*=|url\(/i;

/**
 * The add-in's measured drawing of a floor plan (walls, openings, room labels on a light ground),
 * as an image source, or null for anything unexpected. Clearer than the Revit render, which uses
 * Revit's own canvas colour (dark in a dark theme).
 */
export function parsePlanSnapshot(result) {
  const data = unwrap(result);
  if (!isObject(data) || typeof data.svg !== 'string' || data.svg.length > MAX_SNAPSHOT_SVG) return null;
  if (!/^<svg[\s>]/.test(data.svg) || ACTIVE_SVG.test(data.svg) || !count(data.revision)) return null;
  if (typeof data.viewName !== 'string') return null;
  return {
    src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.svg)}`, width: 1200, height: 900,
    viewName: plain(data.viewName, 120), scale: 0, revision: data.revision,
    documentId: typeof data.documentId === 'string' ? data.documentId : '',
  };
}

export const imageLabel = (image) =>
  `${image.viewName}${image.scale ? ` · scale 1:${image.scale}` : ''} · model revision ${image.revision}`;

/** Plain words for a failed call; the server's own text is used only to tell the cases apart. */
export function revitFailureMessage(error) {
  const status = Number(error?.status) || 0;
  const text = String(error?.message ?? '');
  if (status === 503 || /offline|disconnected|not connected/i.test(text)) {
    return 'Revit is not connected. Open your model in Revit and connect DATUMM.';
  }
  if (/stale|revision|changed/i.test(text)) {
    return 'The model changed since this check. Check the model again, then try again.';
  }
  if (status === 409 && /document|session|open/i.test(text)) {
    return 'Open a model in Revit and connect DATUMM.';
  }
  if (/busy/i.test(text)) return 'Revit is busy. Finish the open command in Revit and try again.';
  // A 409 detail is one plain sentence from the service; drop a leading CODE: tag.
  const sentence = text.replace(/^[A-Z_]{3,}:\s*/, '').trim();
  if (status === 409 && sentence !== '' && sentence.length <= 200) return sentence;
  if (status === 422) return 'DATUMM could not send that request. Check the model again.';
  if (status === 403 || status === 404) {
    return 'This DATUMM service does not offer Revit checks yet.';
  }
  return 'Revit could not do that. Try again in a moment.';
}

export const NO_MODEL_GUIDANCE = 'Open a model in Revit and connect DATUMM.';
