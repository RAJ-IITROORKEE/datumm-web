// Pure validation for the /admin config editor. Bounds mirror AppConfig in the domain API (app_config.py).
export const LIMIT_KEYS = ['agent_model_calls', 'agent_tool_calls', 'agent_research_calls', 'agent_web_searches', 'agent_knowledge_searches', 'continuation_segments'];
export const MODES = ['ask', 'plan', 'build'];
export const EFFORTS = ['', 'low', 'medium', 'high'];
export const CORPORA = ['nbc', 'revit', 'pyrevit', 'other'];
const ID = /^[a-z0-9-]{1,40}$/, DOMAIN = /^[a-z0-9.-]{3,100}$/, MCP_URL = /^https:\/\/[^\s]{4,300}$/;

export const emptyConfig = () => ({ models: [], defaultModel: '', defaultReasoningEffort: '', runUsdLimit: 0, limits: {}, parallelChats: 3, webSearch: { enabled: true, includeDomains: [], maxResults: 5 }, skills: [], mcpServers: [] });

export function normalizeDomain(value) {
  return String(value ?? '').trim().toLowerCase().replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0];
}

const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;
const short = v => typeof v === 'string' && v.length >= 1 && v.length <= 120;

export function validateConfig(cfg) {
  const e = {};
  const list = (key, max, each) => {
    const items = cfg[key];
    if (!Array.isArray(items) || items.length > max) e[key] = `At most ${max} entries.`;
    else items.forEach((item, i) => each(item, i));
  };
  list('models', 20, (m, i) => { if (!short(m)) e[`models.${i}`] = '1 to 120 characters.'; });
  if (cfg.models.length && cfg.defaultModel && !cfg.models.includes(cfg.defaultModel)) e.defaultModel = 'Must be one of the models above (or empty for the server default).';
  if (!EFFORTS.includes(cfg.defaultReasoningEffort)) e.defaultReasoningEffort = 'Low, medium, high or empty.';
  if (!Number.isFinite(cfg.runUsdLimit) || cfg.runUsdLimit < 0 || cfg.runUsdLimit > 10) e.runUsdLimit = '0 to 10 (0 uses the server default).';
  if (!int(cfg.parallelChats, 1, 5)) e.parallelChats = 'Whole number from 1 to 5.';
  for (const [k, v] of Object.entries(cfg.limits ?? {})) {
    if (!LIMIT_KEYS.includes(k)) e[`limits.${k}`] = 'Unknown limit.';
    else if (!int(v, 0, 100)) e[`limits.${k}`] = 'Whole number from 0 to 100.';
  }
  const ws = cfg.webSearch ?? {};
  if (!int(ws.maxResults, 1, 10)) e['webSearch.maxResults'] = 'Whole number from 1 to 10.';
  if (!Array.isArray(ws.includeDomains) || ws.includeDomains.length > 30) e['webSearch.includeDomains'] = 'At most 30 domains.';
  else if (ws.includeDomains.some(d => !DOMAIN.test(d))) e['webSearch.includeDomains'] = 'Domains use a-z, 0-9, dot and dash (3 to 100 characters).';
  const dupes = (items, key) => items.forEach((item, i) => { if (items.findIndex(o => o.id === item.id) !== i) e[`${key}.${i}.id`] = 'Duplicate id.'; });
  list('skills', 30, (s, i) => {
    const p = `skills.${i}.`;
    if (!ID.test(s.id)) e[p + 'id'] = 'Lowercase letters, digits and dashes, 1 to 40.';
    if (!short(s.name)) e[p + 'name'] = '1 to 120 characters.';
    if ((s.description ?? '').length > 300) e[p + 'description'] = 'At most 300 characters.';
    if (!s.instructions || s.instructions.length > 4000) e[p + 'instructions'] = '1 to 4000 characters.';
    if (!Array.isArray(s.modes) || !s.modes.length || s.modes.some(m => !MODES.includes(m))) e[p + 'modes'] = 'Pick at least one mode.';
  });
  dupes(cfg.skills ?? [], 'skills');
  list('mcpServers', 20, (s, i) => {
    const p = `mcpServers.${i}.`;
    if (!ID.test(s.id)) e[p + 'id'] = 'Lowercase letters, digits and dashes, 1 to 40.';
    if (!short(s.name)) e[p + 'name'] = '1 to 120 characters.';
    if (!MCP_URL.test(s.url ?? '')) e[p + 'url'] = 'An https:// URL, 4 to 300 characters, no spaces.';
    if (!Array.isArray(s.toolAllowlist) || s.toolAllowlist.length > 50 || s.toolAllowlist.some(t => !short(t))) e[p + 'toolAllowlist'] = 'At most 50 tool names, 1 to 120 characters each.';
  });
  dupes(cfg.mcpServers ?? [], 'mcpServers');
  return e;
}

const stable = v => JSON.stringify(v, (_, x) => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a < b ? -1 : 1)) : x);
export const sameConfig = (a, b) => stable(a) === stable(b);
