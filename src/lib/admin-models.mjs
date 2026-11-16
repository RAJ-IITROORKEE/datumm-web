// Admin model registry (A3). The backend sends text-free rows; this module rebuilds every row,
// test and usage day key by key, so a later backend change cannot put an unknown field on screen.
export const MODEL_STATUSES = ['enabled', 'ready', 'failed', 'untested', 'needs_allowlist'];
export const MODEL_PERIODS = ['7d', '30d'];
export const DEFAULT_MODEL_PERIOD = '7d';
export const MAX_ENABLED = 20;
export const DEFAULT_BLOCK = 'Choose another default first.';
export const TEST_COST_NOTE = 'at most $0.05 per test, 20 tests a day';

const STATUS_LABELS = {
  enabled: 'Enabled', ready: 'Ready', failed: 'Failed', untested: 'Untested',
  needs_allowlist: 'Needs allowlist',
};
export const statusLabel = status => STATUS_LABELS[status] ?? 'Unknown';
const unserved = row => row.listed && !row.enabled;
/** The status badge: a stored model the server does not serve says so. */
export const rowStatusLabel = row => (unserved(row) ? 'Listed, not served'
  : statusLabel(row.status));
/** Why a stored model is not served, or null. */
export const servedNote = row => (unserved(row) ? `Not served: ${row.latestTest
  && !row.latestTest.passed ? 'last test failed' : 'no passing test'}` : null);
/** True when the server serves no model at all (it fails closed). */
export const noneServed = rows => rows.length > 0 && !rows.some(row => row.enabled);

export const MODEL_RE = /^[A-Za-z0-9._/:-]{1,160}$/;
const SEGMENT = /^(?!\.{1,2}$)[A-Za-z0-9._:-]{1,80}$/;
const TOKEN = /^[A-Za-z0-9_.:-]{1,80}$/;
// Legacy test ids are `legacy:<provider>/<model>`.
const TEST_ID = /^[A-Za-z0-9._:/-]{1,200}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
// The backend's quantized decimal strings (traces.py USD_RE); exponent forms are refused.
const USD = /^\d{1,10}(?:\.\d{1,12})?$/;
const PRICE = /^\d{1,6}(?:\.\d{1,12})?$/;
const CHECKS = ['listed', 'priced', 'context', 'tools', 'imageInput', 'toolCall'];
const MAX_ROWS = 60;
const MAX_DAYS = 10000;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const pick = (value, pattern) => (typeof value === 'string' && pattern.test(value) ? value : null);
const whole = (value, max = 2147483647) => (Number.isInteger(value) && value >= 0 && value <= max
  ? value : null);
const flag = value => (typeof value === 'boolean' ? value : null);
const iso = value => (typeof value === 'string' && value.length <= 40
  && !Number.isNaN(Date.parse(value)) ? value : null);

function parseTestRow(raw) {
  if (!isObject(raw) || typeof raw.passed !== 'boolean') return null;
  const kind = raw.kind === 'test' || raw.kind === 'legacy' ? raw.kind : null;
  if (!kind) return null;
  const checks = isObject(raw.checks) ? raw.checks : {};
  return {
    id: pick(raw.id, TEST_ID), kind, at: iso(raw.at), passed: raw.passed,
    checks: {
      ...Object.fromEntries(CHECKS.map(key => [key, flag(checks[key])])),
      finishReason: pick(checks.finishReason, TOKEN),
    },
    // Unreported measurements stay null: a legacy row never shows 0 ms or $0.
    latencyMs: whole(raw.latencyMs, 3600000), inputTokens: whole(raw.inputTokens),
    outputTokens: whole(raw.outputTokens), usd: pick(raw.usd, USD),
    failureCode: pick(raw.failureCode, TOKEN),
  };
}
/** One stored test row (the POST response), or null when it is not one. */
export const parseTest = parseTestRow;
/** The tests list, or null unless a schemaVersion 1 `{modelId, rows}` document. */
export const parseTests = raw => (isObject(raw) && raw.schemaVersion === 1
  && Array.isArray(raw.rows) ? raw.rows.slice(0, 50).map(parseTestRow).filter(Boolean) : null);

function parsePrice(raw) {
  if (!isObject(raw)) return null;
  const promptPerM = pick(raw.promptPerM, PRICE), completionPerM = pick(raw.completionPerM, PRICE);
  return promptPerM && completionPerM ? { promptPerM, completionPerM } : null;
}

function parseRow(raw) {
  if (!isObject(raw)) return null;
  const id = pick(raw.id, MODEL_RE);
  // An unknown status cannot be classified, so the row is dropped rather than made enable-able.
  if (!id || !MODEL_STATUSES.includes(raw.status)) return null;
  return {
    // `enabled` means served (in the resolved list); `listed` means in the stored admin list.
    id, status: raw.status, enabled: raw.enabled === true, listed: raw.listed === true,
    isDefault: raw.isDefault === true,
    inAllowlist: raw.inAllowlist === true, latestTest: parseTestRow(raw.latestTest),
    price: parsePrice(raw.price), contextLength: whole(raw.contextLength, 2000000000),
    imageInput: flag(raw.imageInput),
  };
}

/** Parsed registry, or null when it is not a schemaVersion 1 document. */
export function parseModels(raw) {
  if (!isObject(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.rows)) return null;
  return {
    catalogAt: iso(raw.catalogAt), catalogError: raw.catalogError === true,
    rows: raw.rows.slice(0, MAX_ROWS).map(parseRow).filter(Boolean),
  };
}

function parseDay(raw) {
  if (!isObject(raw)) return null;
  const day = pick(raw.day, DAY), modelId = pick(raw.modelId, MODEL_RE);
  if (!day || !modelId) return null;
  return {
    day, modelId, role: pick(raw.role, TOKEN), calls: whole(raw.calls) ?? 0,
    failed: whole(raw.failed) ?? 0, inputTokens: whole(raw.inputTokens) ?? 0,
    outputTokens: whole(raw.outputTokens) ?? 0, reasoningTokens: whole(raw.reasoningTokens) ?? 0,
    usd: pick(raw.usd, USD), p50Ms: whole(raw.p50Ms), p95Ms: whole(raw.p95Ms),
  };
}

/** Parsed usage, or null when it is not a usage document. */
export function parseUsage(raw) {
  if (!isObject(raw) || !Array.isArray(raw.days)) return null;
  return {
    from: iso(raw.from), to: iso(raw.to), scanned: whole(raw.scanned) ?? 0,
    truncated: raw.truncated === true,
    days: raw.days.slice(0, MAX_DAYS).map(parseDay).filter(Boolean),
  };
}

// Dollars are summed as integers (12 decimals) so a column of strings never drifts.
const SCALE = 12;
const toScaled = value => {
  const [whole_, fraction = ''] = value.split('.');
  return BigInt(whole_) * 10n ** BigInt(SCALE) + BigInt(fraction.padEnd(SCALE, '0'));
};
function fromScaled(total) {
  const text = total.toString().padStart(SCALE + 1, '0');
  const fraction = text.slice(-SCALE).replace(/0+$/, '');
  return `${text.slice(0, -SCALE)}${fraction ? `.${fraction}` : ''}`;
}
/** Exact sum of USD strings; a value that is not a USD string counts as zero. */
export const sumUsd = values => fromScaled(values
  .reduce((sum, value) => sum + (typeof value === 'string' && USD.test(value)
    ? toScaled(value) : 0n), 0n));

/** Per-model totals from the daily rows: a Map, because a model id may be `__proto__`. */
export function modelTotals(days) {
  const by = new Map();
  for (const day of days) {
    const list = by.get(day.modelId) ?? [];
    list.push(day); by.set(day.modelId, list);
  }
  return new Map([...by].map(([id, list]) => [id, {
    calls: list.reduce((sum, day) => sum + day.calls, 0),
    failed: list.reduce((sum, day) => sum + day.failed, 0),
    inputTokens: list.reduce((sum, day) => sum + day.inputTokens, 0),
    outputTokens: list.reduce((sum, day) => sum + day.outputTokens, 0),
    usd: sumUsd(list.map(day => day.usd)),
  }]));
}
/** Daily rows of one model, newest day first. */
export const daysFor = (days, modelId) => days.filter(day => day.modelId === modelId)
  .sort((a, b) => b.day.localeCompare(a.day) || (a.role ?? '').localeCompare(b.role ?? ''));

export function statusCounts(rows) {
  const counts = { enabled: 0, ready: 0, failed: 0, untested: 0, needs_allowlist: 0 };
  for (const row of rows) counts[row.status]++;
  return counts;
}

const money = value => Number(value).toLocaleString('en-US',
  { minimumFractionDigits: 2, maximumFractionDigits: 4 });
/** Catalog price per million tokens; a null price is "unavailable" only when the catalog failed. */
export function priceLabel(row, catalogError = false) {
  if (!row.price) return catalogError ? 'Price unavailable' : 'No price listed';
  return `$${money(row.price.promptPerM)} in · $${money(row.price.completionPerM)} out`;
}

/** What the "Last test" cell says, before the date. */
export function testLabel(test) {
  if (!test) return 'Never tested';
  if (test.kind === 'legacy') return 'Legacy · not tested';
  return test.passed ? 'Passed' : `Failed${test.failureCode ? ` · ${test.failureCode}` : ''}`;
}

/** Why Enable is unavailable, or null. The server repeats these as 422s on save. */
export function canEnable(row) {
  if (row.status === 'enabled') return null;
  if (row.status === 'needs_allowlist' || !row.inAllowlist) {
    return 'Add it to the server allowlist first';
  }
  if (row.status === 'untested') return 'Test this model first';
  if (row.status === 'failed') return 'Last test failed';
  return null;
}

// An empty admin list means "use the server list", so the rows (the resolved list) stand in.
export const enabledIds = (models, rows) => (models.length
  ? [...models] : rows.filter(row => row.enabled).map(row => row.id));
// A stored default the server does not serve is not the real one: the server-reported one is.
export const currentDefault = (defaultModel, rows) => (defaultModel
  && !rows.some(row => row.id === defaultModel && unserved(row)) ? defaultModel
  : rows.find(row => row.isDefault)?.id || '');
/** The inline error for disabling the default model, or null. */
export const disableBlock = (config, rows, id) => (
  currentDefault(config.defaultModel, rows) === id ? DEFAULT_BLOCK : null);
/** The explicit model list after enabling or disabling one id. */
export function nextModels(config, rows, id, on) {
  const kept = enabledIds(config.models, rows).filter(model => model !== id);
  return on ? [...kept, id] : kept;
}

/** Result rows for the test dialog; `na` marks a check the backend did not report. */
export function checkItems(test) {
  const state = value => (value === true ? 'pass' : value === false ? 'fail' : 'na');
  return [
    ['listed', 'Listed in the catalog'], ['priced', 'Fully priced'],
    ['context', 'Enough context'], ['tools', 'Supports tools'],
    ['toolCall', 'Made a valid tool call'],
  ].map(([key, label]) => ({ key, label, state: state(test.checks[key]) }))
    .concat([{ key: 'imageInput', label: test.checks.imageInput ? 'Accepts images' : 'Text only',
      state: 'info' }]);
}

const query = pairs => {
  const joined = new URLSearchParams(pairs.filter(([, value]) => value)).toString();
  return joined ? `?${joined}` : '';
};
export const modelsPath = () => 'admin/models';
export const usagePath = ({ period = DEFAULT_MODEL_PERIOD, model } = {}) => 'admin/models/usage'
  + query([['period', MODEL_PERIODS.includes(period) ? period : DEFAULT_MODEL_PERIOD],
    ['model', pick(model, MODEL_RE)]]);
/** Model ids contain `/`, so the tests path has two id segments; null for any other form. */
export function testsPath(modelId, limit = 10) {
  const [provider, name, ...rest] = String(modelId).split('/');
  if (rest.length || !SEGMENT.test(provider ?? '') || !SEGMENT.test(name ?? '')) return null;
  return `admin/models/${provider}/${name}/tests?limit=${Math.min(50, Math.max(1, limit | 0))}`;
}
/** POST body for a test, or null for an id the backend would refuse. */
export const testBody = modelId => (pick(modelId, MODEL_RE) ? { modelId } : null);
