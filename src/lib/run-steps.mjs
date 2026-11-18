// TR1: parse GET tasks/{id}/steps and word its rows. The body is untrusted: anything malformed is dropped,
// and a malformed envelope is null, so the UI shows an error instead of a wrong step.
const KINDS = ['model', 'tool', 'question', 'approval', 'check', 'edit', 'stage'];
const STATUSES = ['succeeded', 'failed', 'partial', 'stale', 'skipped', 'stopped', 'running', 'waiting', 'unknown'];
const STATUS_WORDS = { failed: 'Failed', partial: 'Partial', stale: 'Stale', skipped: 'Skipped', stopped: 'Stopped',
  running: 'Running', waiting: 'Waiting', unknown: 'Not confirmed' };
const MAX_DEPTH = 6;
const MAX_LABEL = 160;
const count = value => Number.isSafeInteger(value) && value >= 0;
const text = (value, max) => typeof value === 'string' && value.length > 0 && value.length <= max ? value : null;

function parseNode(raw, depth) {
  if (!raw || typeof raw !== 'object' || depth > MAX_DEPTH) return null;
  const label = text(raw.label, MAX_LABEL);
  if (!KINDS.includes(raw.kind) || !label) return null;
  const tokens = raw.tokens && count(raw.tokens.input) && count(raw.tokens.output)
    ? { input: raw.tokens.input, output: raw.tokens.output } : null;
  return {
    kind: raw.kind, label, startedAt: text(raw.startedAt, 40),
    durationMs: count(raw.durationMs) ? raw.durationMs : null,
    status: STATUSES.includes(raw.status) ? raw.status : 'unknown',
    model: text(raw.model, 160), tokens,
    usd: typeof raw.usd === 'string' && /^\d+(\.\d+)?$/.test(raw.usd) ? raw.usd : null,
    children: Array.isArray(raw.children) ? raw.children.map(child => parseNode(child, depth + 1)).filter(Boolean) : [],
  };
}

/** Null unless the body is the v1 envelope; invalid runs and nodes are dropped rather than guessed at. */
export function parseRunSteps(body) {
  if (!body || typeof body !== 'object' || body.schemaVersion !== 1 || !Array.isArray(body.runs)) return null;
  const runs = body.runs.flatMap(run => {
    const runId = run && text(run.runId, 80);
    if (!runId) return [];
    return [{ runId, startedAt: text(run.startedAt, 40), status: text(run.status, 40) ?? 'other',
      truncated: run.truncated === true,
      children: Array.isArray(run.children) ? run.children.map(child => parseNode(child, 1)).filter(Boolean) : [] }];
  });
  return { runs };
}

export function formatDuration(ms) {
  if (!count(ms)) return '';
  if (ms < 1000) return `${ms} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`;
}

/** The backend sends exact decimal strings; show them rounded, never as a float calculation. */
export function formatUsd(usd) {
  const amount = typeof usd === 'string' ? Number(usd) : NaN;
  if (!Number.isFinite(amount)) return '';
  return amount === 0 ? '$0' : `$${amount.toFixed(amount >= 1 ? 2 : 4)}`;
}

export const formatTokens = tokens => tokens ? `${tokens.input.toLocaleString('en-US')} in · ${tokens.output.toLocaleString('en-US')} out` : '';

/** The grey line under a label: status when it is not plain success, then time, tokens and cost. */
export function nodeMeta(node) {
  return [STATUS_WORDS[node.status] ?? '', formatDuration(node.durationMs), formatTokens(node.tokens), formatUsd(node.usd)]
    .filter(Boolean).join(' · ');
}

/** Every run row is a root treeitem; ids are positional paths so they stay stable between refreshes. */
export function treeRows(runs) {
  const rows = [];
  const walk = (nodes, parent, level, prefix) => nodes.forEach((node, index) => {
    const id = `${prefix}.${index}`;
    rows.push({ id, parent, level, node, size: nodes.length, position: index + 1, hasChildren: node.children.length > 0 });
    walk(node.children, id, level + 1, id);
  });
  runs.forEach((run, index) => {
    const id = `r${index}`;
    const node = { kind: 'run', label: `Run ${index + 1}`, startedAt: run.startedAt, durationMs: null,
      status: 'unknown', model: null, tokens: null, usd: null, children: run.children, runStatus: run.status,
      truncated: run.truncated };
    rows.push({ id, parent: null, level: 1, node, size: runs.length, position: index + 1, hasChildren: run.children.length > 0 });
    walk(run.children, id, 2, id);
  });
  return rows;
}

/** Small trees open fully; a long one opens only its runs, so the first view stays short. */
export function initialExpanded(runs) {
  const rows = treeRows(runs);
  return new Set(rows.filter(row => row.hasChildren && (rows.length <= 40 || row.level === 1)).map(row => row.id));
}

/** Rows a reader can see: a row shows only when every ancestor is open. */
export function visibleRows(rows, expanded) {
  const open = new Map(rows.map(row => [row.id, expanded.has(row.id)]));
  const parents = new Map(rows.map(row => [row.id, row.parent]));
  const shown = row => { for (let up = row.parent; up; up = parents.get(up)) if (!open.get(up)) return false; return true; };
  return rows.filter(shown);
}

/**
 * WAI-ARIA tree keys over the visible rows. Returns `{focus}` to move, `{toggle: [id, open]}` to expand or
 * collapse, or null when the key is not handled (so Tab and typing keep working).
 */
export function treeKey(visible, id, key, expanded) {
  const index = visible.findIndex(row => row.id === id);
  const row = visible[index];
  if (!row) return null;
  if (key === 'ArrowDown') return index < visible.length - 1 ? { focus: visible[index + 1].id } : null;
  if (key === 'ArrowUp') return index > 0 ? { focus: visible[index - 1].id } : null;
  if (key === 'Home') return { focus: visible[0].id };
  if (key === 'End') return { focus: visible.at(-1).id };
  if (key === 'ArrowRight') {
    if (!row.hasChildren) return null;
    return expanded.has(id) ? { focus: visible[index + 1].id } : { toggle: [id, true] };
  }
  if (key === 'ArrowLeft') {
    if (row.hasChildren && expanded.has(id)) return { toggle: [id, false] };
    return row.parent ? { focus: row.parent } : null;
  }
  if ((key === 'Enter' || key === ' ') && row.hasChildren) return { toggle: [id, !expanded.has(id)] };
  return null;
}
