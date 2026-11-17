// Pure row model for /admin/tools. The catalog is code-owned on the server; the page can only
// narrow each tool inside its `allowedModes` ceiling (never widen, never touch a Revit write).
import { MODES } from './admin-config.mjs';

export const TOOL_ID = /^[a-z0-9_-]{1,40}$/;
export const TOOL_GROUPS = [
  { id: 'core', label: 'Core' }, { id: 'research', label: 'Research' },
  { id: 'revit', label: 'Revit' }, { id: 'design', label: 'Design' },
];
export const RISK_LABELS = { read: 'Read only', external: 'Outside service', device: 'Revit change', write: 'Writes' };
export const MODE_LABELS = { ask: 'Ask', plan: 'Plan', build: 'Build' };

const text = value => typeof value === 'string' && value.length > 0 && value.length <= 300;
const modeList = value => Array.isArray(value) && value.every(m => MODES.includes(m)) && new Set(value).size === value.length;
const inOrder = modes => MODES.filter(m => modes.includes(m));

export function parseToolCatalog(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set(), rows = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue;
    const { id, label, description, group, runsOn, risk, required, locked, allowedModes, defaultModes } = item;
    if (typeof id !== 'string' || !TOOL_ID.test(id) || seen.has(id)) continue;
    if (![label, description, group].every(text) || !(risk in RISK_LABELS)) continue;
    if (!modeList(allowedModes) || !modeList(defaultModes) || defaultModes.some(m => !allowedModes.includes(m))) continue;
    seen.add(id);
    rows.push({ id, label, description, group, runsOn: typeof runsOn === 'string' ? runsOn : '', risk,
      required: required === true, locked: locked === true, allowedModes, defaultModes });
  }
  return rows;
}

// The server sends display labels ('Core'); ids are lowercase, so compare without case.
const inGroup = (row, id) => row.group.toLowerCase() === id;
export function groupToolRows(rows) {
  const known = TOOL_GROUPS.map(g => ({ ...g, rows: rows.filter(r => inGroup(r, g.id)) }));
  const other = [...new Set(rows.map(r => r.group))].filter(g => !TOOL_GROUPS.some(k => k.id === g.toLowerCase()))
    .map(id => ({ id, label: id.charAt(0).toUpperCase() + id.slice(1), rows: rows.filter(r => r.group === id) }));
  return [...known, ...other].filter(g => g.rows.length);
}

export const effectiveModes = (row, tools) => tools?.[row.id]?.modes ?? row.defaultModes;

// A Revit write is not a model tool: its exact-proposal approval is fixed, so the row is never a switch.
export const lockKind = row => (row.required ? 'required' : row.locked ? 'device' : null);
export const modeDisabled = (row, mode) => lockKind(row) !== null || !row.allowedModes.includes(mode);

export function toggleToolMode(tools, row, mode, on) {
  if (modeDisabled(row, mode)) return tools;
  const current = effectiveModes(row, tools);
  const next = inOrder(on ? [...current, mode] : current.filter(m => m !== mode));
  const { [row.id]: _dropped, ...rest } = tools ?? {};
  // Matching the default is stored as "no entry" so an untouched config stays byte-identical.
  return next.join() === inOrder(row.defaultModes).join() ? rest : { ...rest, [row.id]: { modes: next } };
}

export function toolsErrors(tools, rows) {
  const errors = {};
  for (const [id, entry] of Object.entries(tools ?? {})) {
    const row = rows.find(r => r.id === id);
    if (!row) errors[`tools.${id}`] = 'Unknown tool.';
    else if (lockKind(row)) errors[`tools.${id}`] = 'This tool cannot be switched.';
    else if (entry.modes.some(m => !row.allowedModes.includes(m))) errors[`tools.${id}`] = 'A mode is not allowed for this tool.';
  }
  return errors;
}
