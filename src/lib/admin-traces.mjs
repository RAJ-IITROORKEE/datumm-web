// Admin traces (A1). The backend sends text-free rows; this module still keeps only the allowlisted
// keys, so a later backend change can never put an unknown field on screen.
export const TRACE_PERIODS = ['24h', '7d', '30d'];
export const DEFAULT_PERIOD = '7d';
export const TRACE_OUTCOMES = [
  'completed', 'failed', 'cancelled', 'paused', 'waiting', 'running', 'other',
];
export const TRACE_FEEDBACK = ['up', 'down', 'none'];
export const TRACE_SIGNALS = [
  'retried', 'model_fallback', 'output_limit', 'content_filter', 'refusal', 'invalid_tool_call',
  'usage_unknown', 'call_unsettled', 'specialist_partial', 'budget_exhausted',
  'quick_reply',
];
export const TRACE_REASONS = [
  'inaccurate', 'incomplete', 'ignored_instructions', 'too_long', 'other',
];

const LABELS = {
  outcome: {
    completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled', paused: 'Paused',
    waiting: 'Waiting', running: 'Running', other: 'Other',
  },
  feedback: { up: 'Up', down: 'Down', none: 'No rating' },
  signal: {
    retried: 'Retried', model_fallback: 'Model fallback', output_limit: 'Output limit',
    content_filter: 'Content filter', refusal: 'Refusal', invalid_tool_call: 'Invalid tool call',
    usage_unknown: 'Usage unknown', call_unsettled: 'Call unsettled',
    specialist_partial: 'Specialist partial', budget_exhausted: 'Budget exhausted',
    quick_reply: 'Answered directly',
  },
  reason: {
    inaccurate: 'Inaccurate', incomplete: 'Incomplete',
    ignored_instructions: 'Ignored instructions', too_long: 'Too long', other: 'Something else',
  },
};
export const outcomeLabel = value => LABELS.outcome[value] ?? 'Other';
export const feedbackFilterLabel = value => LABELS.feedback[value] ?? String(value);
export const signalLabel = value => LABELS.signal[value] ?? String(value);
export const reasonLabel = value => LABELS.reason[value] ?? 'Something else';

const MODEL = /^[A-Za-z0-9._/:-]{1,160}$/;
const TOKEN = /^[A-Za-z0-9_.:-]{1,80}$/;
// A turn id is the client's request key (crypto.randomUUID); anything else may carry user text.
const CLIENT_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const MODE = /^[A-Za-z0-9_.-]{1,40}$/;
const OWNER = /^[a-f0-9]{16}$/;
const CURSOR = /^[A-Za-z0-9_.~=+/-]{1,512}$/;
// The backend's quantized decimal string (traces.py USD_RE); exponent forms are refused.
const USD = /^\d{1,10}(?:\.\d{1,12})?$/;

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finite = value => typeof value === 'number' && Number.isFinite(value) && value >= 0;
const count = value => (finite(value) ? Math.floor(value) : 0);
const whole = value => (finite(value) ? Math.floor(value) : null);
const ms = value => (finite(value) ? Math.round(value) : null);
const pick = (value, pattern) => (typeof value === 'string' && pattern.test(value) ? value : null);
const oneOf = (value, list, fallback = null) => (list.includes(value) ? value : fallback);
const usd = value => pick(typeof value === 'number' ? String(value) : value, USD);
const list = (value, max, map) => (Array.isArray(value)
  ? value.slice(0, max).map(map).filter(Boolean) : []);
const iso = value => (typeof value === 'string' && value.length <= 40
  && !Number.isNaN(Date.parse(value)) ? value : null);
const PHASE_MS = [
  'admitMs', 'startMs', 'firstCallMs', 'answerMs', 'modelMs', 'toolMs', 'stepMs', 'unattributedMs',
];
const PHASE_BYTES = ['maxPacketBytes', 'maxToolSchemaBytes'];
const ROUTE_LANES = ['short', 'full'];
const ROUTE_TOKEN = /^[a-z][a-z0-9_]{0,40}$/;
// Phases are exact integers. A float, a string or an out-of-range value is not a measurement.
const phaseValue = (value, max) => (Number.isInteger(value) && value >= 0 && value <= max
  ? value : null);

function parseCall(call) {
  if (!isObject(call)) return null;
  return {
    role: pick(call.role, TOKEN), modelId: pick(call.modelId, MODEL),
    status: pick(call.status, TOKEN), finishReason: pick(call.finishReason, TOKEN),
    // Unreported usage stays null: a call must never show 0 tokens it did not report.
    inputTokens: whole(call.inputTokens), outputTokens: whole(call.outputTokens),
    reasoningTokens: whole(call.reasoningTokens), durationMs: ms(call.durationMs),
    usd: usd(call.usd), failureCode: pick(call.failureCode, TOKEN),
  };
}

function parseFeedback(value) {
  const rating = isObject(value) ? oneOf(value.rating, ['up', 'down']) : null;
  return rating ? { rating, reason: oneOf(value.reason, TRACE_REASONS), at: iso(value.at) } : null;
}

const STEP_KEYS = ['total', 'succeeded', 'failed', 'skipped', 'stopped', 'retried', 'unconfirmed'];
const parseTool = tool => (isObject(tool) && pick(tool.name, TOKEN)
  ? { name: tool.name, calls: count(tool.calls), failed: count(tool.failed) } : null);
const parseSpecialist = item => (isObject(item) && pick(item.role, TOKEN)
  ? { role: item.role, outcome: pick(item.outcome, TOKEN), durationMs: ms(item.durationMs) }
  : null);
const parseSignal = signal => oneOf(signal, TRACE_SIGNALS);
// An absent object stays null: a missing phase is unknown, never 0 ms.
function parsePhases(value) {
  if (!isObject(value)) return null;
  return Object.fromEntries([
    ...PHASE_MS.map(key => [key, phaseValue(value[key], 2147483647)]),
    ...PHASE_BYTES.map(key => [key, phaseValue(value[key], 2147483647)]),
  ]);
}
function parseRoute(value) {
  const lane = isObject(value) ? oneOf(value.lane, ROUTE_LANES) : null;
  return lane
    ? { lane, rule: pick(value.rule, ROUTE_TOKEN), floor: pick(value.floor, ROUTE_TOKEN) }
    : null;
}

function parseRow(row) {
  if (!isObject(row)) return null;
  const traceId = pick(row.traceId, TOKEN);
  if (!traceId) return null;
  const steps = isObject(row.steps) ? row.steps : {};
  const tokens = isObject(row.tokens) ? row.tokens : {};
  return {
    traceId, taskId: pick(row.taskId, TOKEN), turnId: pick(row.turnId, CLIENT_UUID),
    at: iso(row.at), ownerHash: pick(row.ownerHash, OWNER), mode: pick(row.mode, MODE),
    reasoningEffort: pick(row.reasoningEffort, TOKEN),
    requestedModel: pick(row.requestedModel, MODEL),
    servedModels: list(row.servedModels, 12, model => pick(model, MODEL)),
    status: pick(row.status, TOKEN), outcome: oneOf(row.outcome, TRACE_OUTCOMES, 'other'),
    failureCode: pick(row.failureCode, TOKEN), recoveryAction: pick(row.recoveryAction, TOKEN),
    durationMs: ms(row.durationMs), modelMs: ms(row.modelMs),
    steps: Object.fromEntries(STEP_KEYS.map(key => [key, count(steps[key])])),
    tools: list(row.tools, 20, parseTool),
    specialists: list(row.specialists, 6, parseSpecialist),
    calls: list(row.calls, 40, parseCall), callsTruncated: row.callsTruncated === true,
    tokens: {
      input: count(tokens.input), output: count(tokens.output), reasoning: count(tokens.reasoning),
    },
    usd: usd(row.usd), signals: list(row.signals, TRACE_SIGNALS.length, parseSignal),
    feedback: parseFeedback(row.feedback),
    phases: parsePhases(row.phases), route: parseRoute(row.route),
  };
}

/** Parsed response, or null when it is not a schemaVersion 1 traces document. */
export function parseTraces(raw) {
  if (!isObject(raw) || raw.schemaVersion !== 1 || !Array.isArray(raw.rows)) return null;
  const stats = isObject(raw.stats) ? raw.stats : {};
  const feedback = isObject(stats.feedback) ? stats.feedback : {};
  const reasons = isObject(feedback.reasons) ? feedback.reasons : {};
  return {
    from: iso(raw.from), to: iso(raw.to), nextCursor: pick(raw.nextCursor, CURSOR),
    stats: {
      turns: count(stats.turns), scanned: count(stats.scanned), truncated: stats.truncated === true,
      failed: count(stats.failed), p50Ms: ms(stats.p50Ms), p95Ms: ms(stats.p95Ms),
      inputTokens: count(stats.inputTokens), outputTokens: count(stats.outputTokens),
      usd: usd(stats.usd),
      feedback: {
        up: count(feedback.up), down: count(feedback.down),
        reasons: Object.fromEntries(TRACE_REASONS.map(key => [key, count(reasons[key])])),
      },
    },
    rows: raw.rows.map(parseRow).filter(Boolean),
  };
}

/** Query string for GET admin/traces: only valid values are sent, and the period always is. */
export function traceQuery(filters = {}) {
  const query = new URLSearchParams();
  query.set('period', oneOf(filters.period, TRACE_PERIODS, DEFAULT_PERIOD));
  for (const [key, value] of [
    ['mode', pick(filters.mode, MODE)], ['model', pick(filters.model, MODEL)],
    ['outcome', oneOf(filters.outcome, TRACE_OUTCOMES)],
    ['feedback', oneOf(filters.feedback, TRACE_FEEDBACK)],
    ['owner', pick(filters.owner, OWNER)], ['signal', oneOf(filters.signal, TRACE_SIGNALS)],
    ['cursor', pick(filters.cursor, CURSOR)],
  ]) {
    if (value) query.set(key, value);
  }
  return `?${query}`;
}

const number = value => value.toLocaleString('en-US');
export const formatCount = number;
export function formatDuration(value) {
  if (value === null || value === undefined) return '—';
  if (value < 1000) return `${value} ms`;
  // Round once, then split, so 119,600 ms reads "2 min 0 s" and never "1 min 60 s".
  const tenths = Math.round(value / 100);
  if (tenths < 600) return `${(tenths / 10).toFixed(1)} s`;
  const seconds = Math.round(value / 1000);
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ${seconds % 60} s`;
  const minutes = Math.round(value / 60000);
  if (minutes < 1440) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  const hours = Math.round(value / 3600000);
  return `${Math.floor(hours / 24)} d ${hours % 24} h`;
}
export function formatUsd(value) {
  if (value === null || value === undefined) return '—';
  const amount = Number(value);
  return `$${amount < 1 ? amount.toFixed(4) : amount.toFixed(2)}`;
}
const tokenCount = value => (value === null || value === undefined ? '—' : number(value));
export const formatTokens = tokens =>
  `${tokenCount(tokens.input)} in · ${tokenCount(tokens.output)} out`;
export function feedbackLabel(feedback) {
  if (!feedback) return 'None';
  if (feedback.rating === 'up') return 'Up';
  return `Down${feedback.reason ? ` · ${reasonLabel(feedback.reason)}` : ''}`;
}
export function stepsSummary(steps) {
  const parts = [`${number(steps.total)} ${steps.total === 1 ? 'step' : 'steps'}`];
  for (const key of ['failed', 'skipped', 'stopped', 'retried', 'unconfirmed']) {
    if (steps[key]) parts.push(`${number(steps[key])} ${key}`);
  }
  return parts.join(' · ');
}
export function formatBytes(value) {
  if (value === null || value === undefined) return '—';
  return `${number(value)} bytes`;
}
const TIME_ITEMS = [
  ['admitMs', 'Admission'], ['startMs', 'Start'], ['firstCallMs', 'First call'],
  ['answerMs', 'First answer'], ['modelMs', 'Model'], ['toolMs', 'Tools'],
  ['unattributedMs', 'Unattributed'],
];
const PACKET_ITEMS = [
  ['maxPacketBytes', 'Largest packet'], ['maxToolSchemaBytes', 'Largest tool schemas'],
];
// Only present values become items: a null phase is never shown as 0 ms.
const phaseItems = (phases, table, format) => table
  .filter(([key]) => typeof phases?.[key] === 'number')
  .map(([key, label]) => ({ label, value: format(phases[key]) }));
export const phaseTimeItems = phases => phaseItems(phases, TIME_ITEMS, formatDuration);
export const phasePacketItems = phases => phaseItems(phases, PACKET_ITEMS, formatBytes);
