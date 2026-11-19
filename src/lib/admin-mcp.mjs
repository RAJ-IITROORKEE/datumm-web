// Pure rules for /admin/mcp (A4c): parse the registry, validate the editor, build request bodies and
// word failures. A tool is an outside service: everything it sends is untrusted data, rebuilt key
// by key here. A key goes out in one request body and is never part of any parsed view.
export const MCP_ID = /^[a-z0-9-]{1,20}$/;
export const MCP_HEADER = /^[A-Za-z][A-Za-z0-9-]{0,39}$/;
export const TOOL_NAME = /^[A-Za-z0-9_-]{1,38}$/;
export const TOOL_MODES = ['allow', 'ask', 'never'];
export const MODE_NAMES = { allow: 'Allow', ask: 'Ask', never: 'Never' };
export const MAX_SERVERS = 20;

const HINTS = {
  read_only: 'The server says it only reads',
  destructive: 'The server says it can change or delete data',
  idempotent: 'The server says repeating it is safe',
  open_world: 'The server says it reaches outside its own data',
};

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const whole = value => (Number.isInteger(value) && value >= 0 && value <= 2147483647 ? value : null);
// Control characters never reach the screen; length is capped so one server cannot flood the page.
const clean = (value, max) => (typeof value === 'string'
  ? value.replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max) : '');
const iso = value => (typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : null);

function parseTest(raw) {
  if (!isObject(raw) || typeof raw.ok !== 'boolean') return null;
  return {
    at: iso(raw.at), ok: raw.ok, error: raw.error == null ? null : clean(raw.error, 300) || null,
    toolCount: whole(raw.toolCount) ?? 0, protocol: raw.protocol == null ? null : clean(raw.protocol, 40) || null,
  };
}

function parseTool(raw) {
  if (!isObject(raw) || typeof raw.name !== 'string' || !TOOL_NAME.test(raw.name)) return null;
  const notes = isObject(raw.annotations) ? raw.annotations : {};
  const annotations = {};
  for (const key of Object.keys(HINTS)) if (notes[key] === true) annotations[key] = true;
  // An unreadable mode shows as Never: the safe reading.
  return { name: raw.name, description: clean(raw.description, 1000), annotations,
    hash: clean(raw.hash, 80), mode: TOOL_MODES.includes(raw.mode) ? raw.mode : 'never' };
}

/** One server view, rebuilt key by key; null unless it has a valid id, https url and version. */
export function parseMcpServer(raw) {
  if (!isObject(raw) || typeof raw.id !== 'string' || !MCP_ID.test(raw.id)) return null;
  const version = whole(raw.version);
  if (version === null || typeof raw.url !== 'string') return null;
  const header = typeof raw.authHeader === 'string' && MCP_HEADER.test(raw.authHeader) ? raw.authHeader : null;
  return {
    id: raw.id, name: clean(raw.name, 120) || raw.id, url: clean(raw.url, 300), authHeader: header,
    hasKey: raw.hasKey === true, enabled: raw.enabled === true, version, lastTest: parseTest(raw.lastTest),
    tools: Array.isArray(raw.tools) ? raw.tools.slice(0, 40).map(parseTool).filter(Boolean) : [],
    calls: whole(raw.calls) ?? 0, lastCalledAt: iso(raw.lastCalledAt), updatedAt: iso(raw.updatedAt),
    updatedBy: raw.updatedBy == null ? null : clean(raw.updatedBy, 200) || null,
  };
}

/** The list response, or null when it is not one. `reason` explains `secretsAvailable: false`. */
export function parseMcpList(raw) {
  if (!isObject(raw) || !Array.isArray(raw.servers)) return null;
  return {
    servers: raw.servers.map(parseMcpServer).filter(Boolean),
    secretsAvailable: raw.secretsAvailable === true,
    reason: raw.reason == null ? null : clean(raw.reason, 200) || null,
    maxServers: whole(raw.maxServers) || MAX_SERVERS,
  };
}

/** Plain words for a capability that is off. The env name is for the admin who sets it up. */
export function unavailableCopy(reason) {
  const lead = 'MCP servers need a server key that is not set up yet.';
  if (!reason || /MCP_SECRET_KEY/.test(reason)) {
    return { lead, detail: 'Ask whoever runs the service to add MCP_SECRET_KEY. Until then no server can be saved.' };
  }
  return { lead, detail: reason };
}

export const hintsOf = tool => Object.keys(HINTS).filter(key => tool.annotations[key]).map(key => HINTS[key]);
export const modeCounts = server => Object.fromEntries(
  TOOL_MODES.map(mode => [mode, server.tools.filter(tool => tool.mode === mode).length]));

export function serverStatus(server) {
  if (server.enabled) return { id: 'enabled', label: 'On' };
  if (!server.lastTest) return { id: 'untested', label: 'Needs a test' };
  return server.lastTest.ok ? { id: 'ready', label: 'Tested, off' } : { id: 'failed', label: 'Test failed' };
}

/** Why the switch cannot turn on, or null. Turning off is always allowed. */
export const enableBlock = server => (server.enabled || server.lastTest?.ok
  ? null : 'Run Test connection first. A server can only be turned on after a passing test.');

export function testSummary(test) {
  if (!test) return 'Not tested yet';
  if (!test.ok) return `Failed${test.error ? `: ${test.error}` : ''}`;
  const tools = `${test.toolCount} ${test.toolCount === 1 ? 'tool' : 'tools'}`;
  return `Passed, ${tools}${test.protocol ? `, protocol ${test.protocol}` : ''}`;
}

// Audit rows come from the shared parser; a row belongs to a server when its summary names the id.
export function auditRowsFor(rows, id) {
  const named = new RegExp(`(^|[^a-z0-9-])${id}([^a-z0-9-]|$)`);
  return rows.filter(row => row.kind === 'mcp' && named.test(row.summary));
}

// --- editor ---------------------------------------------------------------------------------

export const blankForm = () => ({ id: '', name: '', url: 'https://', authHeader: '', key: '' });
export const formFrom = server => ({ id: server.id, name: server.name, url: server.url,
  authHeader: server.authHeader ?? '', key: '' });

function urlProblem(value) {
  if (value.length < 12 || value.length > 300) return 'An https:// address, 12 to 300 characters.';
  let url;
  try { url = new URL(value); } catch { return 'Enter a full address that starts with https://.'; }
  if (url.protocol !== 'https:' || /\s/.test(value)) return 'Enter a full address that starts with https://.';
  if (url.username || url.password) return 'Put the key in the key field, not in the address.';
  if (url.search || url.hash) return 'The address cannot have a ? query or # part.';
  if (url.port && url.port !== '443') return 'Only the standard https port is allowed.';
  return null;
}

/** Field errors for the editor. `server` is the saved server when editing, null when adding. */
export function validateForm(form, { server = null, ids = [], secretsAvailable = true } = {}) {
  const errors = {};
  const url = form.url.trim(), header = form.authHeader.trim(), name = form.name.trim();
  if (!server) {
    if (!MCP_ID.test(form.id)) errors.id = 'Lowercase letters, digits and dashes, 1 to 20.';
    else if (ids.includes(form.id)) errors.id = 'A server with that id already exists.';
  }
  if (name.length < 1 || name.length > 120) errors.name = 'A name, 1 to 120 characters.';
  const bad = urlProblem(url);
  if (bad) errors.url = bad;
  if (header && !MCP_HEADER.test(header)) errors.authHeader = 'Letters, digits and dashes, starting with a letter.';
  if (form.key && /[\r\n]/.test(form.key)) errors.key = 'The key cannot contain line breaks.';
  else if (form.key.length > 500) errors.key = 'The key is at most 500 characters.';
  const keptKey = Boolean(server?.hasKey && header && header === server.authHeader);
  if (!errors.authHeader && !errors.key) {
    if (form.key && !header) errors.authHeader = 'Enter the header name that carries the key.';
    else if (header && !form.key && !keptKey) {
      errors.key = server?.hasKey && header !== server.authHeader
        ? 'Changing the header needs the key entered again.' : 'Enter the key for this header.';
    }
  }
  if (form.key && !secretsAvailable) errors.key = 'Keys cannot be saved until the server key is set up.';
  return errors;
}

/** Will saving this form drop the tools and the passing test? Mirrors the backend rule. */
export const resetsTools = (form, server) => Boolean(server) && (form.url.trim() !== server.url
  || (form.authHeader.trim() || null) !== server.authHeader || form.key !== '');

export function createBody(form) {
  const header = form.authHeader.trim();
  return { id: form.id, name: form.name.trim(), url: form.url.trim(),
    ...(header && form.key && { authHeader: header, key: form.key }) };
}

export function updateBody(form, server) {
  const header = form.authHeader.trim();
  const keep = !form.key && Boolean(header) && server.hasKey && header === server.authHeader;
  return { expectedVersion: server.version, name: form.name.trim(), url: form.url.trim(),
    authHeader: header || null, ...(form.key && { key: form.key }), ...(keep && { keepKey: true }) };
}

export const versionBody = server => ({ expectedVersion: server.version });
export const toolModeBody = (server, mode) => (TOOL_MODES.includes(mode)
  ? { mode, expectedVersion: server.version } : null);

// --- paths ----------------------------------------------------------------------------------

export const MCP_LIST_PATH = 'admin/mcp';
export const MCP_AUDIT_PATH = 'admin/audit?kind=mcp';
export const serverPath = (id, action) => (MCP_ID.test(id)
  ? `admin/mcp/${id}${action ? `/${action}` : ''}` : null);
export const toolPath = (id, tool) => (MCP_ID.test(id) && TOOL_NAME.test(tool)
  ? `admin/mcp/${id}/tools/${tool}` : null);

// --- failures -------------------------------------------------------------------------------

const FIELDS = ['id', 'name', 'url', 'authHeader', 'key'];

/**
 * Wording for a failed call. `issues` is a 422 validation list ({loc, msg}); a string `detail`
 * is a rule the server refused and is shown as sent. 409 is a stale version or, when adding, an id clash.
 */
export function mcpFailure(result, action) {
  const none = { message: '', fields: {}, stale: false };
  if (!result || result.ok) return none;
  const fields = {};
  for (const issue of result.issues ?? []) {
    const field = [...(issue.loc ?? [])].reverse().find(part => FIELDS.includes(part));
    if (field && !fields[field]) fields[field] = clean(issue.msg, 200);
  }
  if (Object.keys(fields).length) return { ...none, fields, message: 'Check the marked fields and try again.' };
  if (result.reason === 'stale') {
    return action === 'create'
      ? { ...none, fields: { id: 'A server with that id already exists.' }, message: 'That id is taken.' }
      : { ...none, stale: true, message: 'Someone changed this server first. The latest version is loaded; check it and try again.' };
  }
  if (result.reason === 'forbidden') return { ...none, message: 'Your account is not an administrator on this service.' };
  if (result.reason === 'blocked' || result.reason === 'missing') {
    return { ...none, message: 'This service does not provide MCP servers.' };
  }
  return { ...none, message: clean(result.message, 300) || 'Something went wrong. Try again.' };
}
