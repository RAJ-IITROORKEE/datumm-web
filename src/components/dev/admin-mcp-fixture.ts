// In-memory stand-in for the A4c MCP registry routes. Synthetic data only: no server is contacted,
// and a key is dropped the moment it arrives (only `hasKey` is kept, as on the real service).
export type McpScenario = 'mcp-off' | 'mcp-empty' | 'mcp-failed' | 'mcp-ready' | 'mcp-stale';

type Tool = { name: string; description: string; annotations: Record<string, boolean>; hash: string; mode: string };
type Server = {
  id: string; name: string; url: string; authHeader: string | null; hasKey: boolean; enabled: boolean;
  version: number; lastTest: null | { at: string; ok: boolean; error: string | null; toolCount: number; protocol: string | null };
  tools: Tool[]; calls: number; lastCalledAt: string | null; updatedAt: string; updatedBy: string;
};
type Fail = { ok: false; reason: 'error' | 'stale' | 'missing'; message: string; issues?: { loc: string[]; msg: string }[] };
type Body = Record<string, unknown>;

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000).toISOString();
const tool = (name: string, description: string, annotations: Record<string, boolean>, mode = 'never'): Tool =>
  ({ name, description, annotations, hash: `h-${name}`, mode });
const DOCS_TOOLS = [
  tool('search_docs', 'Search the public documentation. Synthetic fixture tool.', { read_only: true, idempotent: true }, 'allow'),
  tool('get_page', 'Read one documentation page by path.', { read_only: true, open_world: true }, 'ask'),
  tool('delete_page', 'Delete a page. Fixture text, nothing is deleted.', { destructive: true }),
];
const server = (over: Partial<Server> & { id: string }): Server => ({
  name: over.id, url: `https://${over.id}.example.invalid/mcp`, authHeader: null, hasKey: false, enabled: false,
  version: 1, lastTest: null, tools: [], calls: 0, lastCalledAt: null, updatedAt: ago(5),
  updatedBy: 'preview@example.invalid', ...over,
});
const passed = (toolCount: number) => ({ at: ago(4), ok: true, error: null, toolCount, protocol: '2025-06-18' });
const seed = (scenario: McpScenario): Server[] => {
  if (scenario === 'mcp-empty' || scenario === 'mcp-off') return [];
  if (scenario === 'mcp-failed') {
    return [server({ id: 'weather', name: 'Weather service', authHeader: 'Authorization', hasKey: true,
      lastTest: { at: ago(1), ok: false, error: 'not authorised (HTTP 401)', toolCount: 0, protocol: null } })];
  }
  return [
    server({ id: 'docs', name: 'Docs search', enabled: true, version: 4, lastTest: passed(3),
      tools: DOCS_TOOLS, calls: 12, lastCalledAt: ago(2) }),
    server({ id: 'maps', name: 'Map lookups', authHeader: 'X-Api-Key', hasKey: true }),
  ];
};

export function createMcpFixture(scenario: McpScenario) {
  let servers = seed(scenario);
  const log: { at: string; by: string; summary: string; kind: 'mcp'; action: string; cursor: string }[] = [];
  const note = (action: string, id: string, what: string) => log.unshift({ at: new Date().toISOString(),
    by: 'preview@example.invalid', summary: `${what} ${id}`, kind: 'mcp', action, cursor: `${Date.now()}|${log.length}` });
  note('mcp_create', 'docs', 'Added server');
  const stale: Fail = { ok: false, reason: 'stale', message: 'Version changed.' };
  const find = (id: string) => servers.find(s => s.id === id);
  const put = (next: Server) => { servers = servers.map(s => (s.id === next.id ? next : s)); return { ok: true as const, data: structuredClone(next) }; };

  return function handle(path: string, init?: { method?: string; body?: unknown }) {
    if (path.startsWith('admin/audit')) {
      return path.includes('kind=mcp') ? { ok: true as const, data: structuredClone(log) } : null;
    }
    if (!path.startsWith('admin/mcp')) return null;
    const method = init?.method ?? 'GET', body = (init?.body ?? {}) as Body;
    const [, , id, action, name] = path.split('/');
    if (!id) {
      if (method === 'GET') {
        return { ok: true as const, data: { servers: structuredClone(servers), secretsAvailable: true, reason: null, maxServers: 20 } };
      }
      if (scenario === 'mcp-stale' || find(String(body.id))) return stale;
      const created = server({ id: String(body.id), name: String(body.name), url: String(body.url),
        authHeader: (body.authHeader as string) ?? null, hasKey: Boolean(body.key) });
      servers = [...servers, created]; note('mcp_create', created.id, 'Added server');
      return { ok: true as const, data: structuredClone(created) };
    }
    const current = find(id);
    if (!current) return { ok: false as const, reason: 'missing' as const, message: 'No such server.' };
    if (method === 'DELETE') {
      if (scenario === 'mcp-stale') return stale;
      servers = servers.filter(s => s.id !== id); note('mcp_remove', id, 'Removed server');
      return { ok: true as const, data: { removed: id } };
    }
    if (action === 'test') {
      const ok = !current.url.includes('down');
      const tools = ok ? DOCS_TOOLS.slice(0, 2).map(t => ({ ...t, mode: current.tools.find(c => c.hash === t.hash)?.mode ?? 'never' })) : [];
      note('mcp_test', id, 'Tested server');
      return put({ ...current, version: current.version + 1, tools, enabled: ok && current.enabled,
        lastTest: ok ? passed(tools.length) : { at: ago(0), ok, error: 'timed out', toolCount: 0, protocol: null } });
    }
    if (body.expectedVersion !== current.version || scenario === 'mcp-stale') return stale;
    if (action === 'enable' || action === 'disable') {
      if (action === 'enable' && !current.lastTest?.ok) {
        return { ok: false as const, reason: 'error' as const, message: 'Run a passing test before turning this server on.' };
      }
      note(`mcp_${action}`, id, action === 'enable' ? 'Turned on' : 'Turned off');
      return put({ ...current, version: current.version + 1, enabled: action === 'enable' });
    }
    if (action === 'tools') {
      note('mcp_tool_mode', id, `Set ${name} to ${String(body.mode)} on`);
      return put({ ...current, version: current.version + 1,
        tools: current.tools.map(t => (t.name === name ? { ...t, mode: String(body.mode) } : t)) });
    }
    const header = (body.authHeader as string | null) ?? null;
    const changed = body.url !== current.url || header !== current.authHeader || Boolean(body.key);
    note('mcp_update', id, 'Edited server');
    return put({ ...current, name: String(body.name), url: String(body.url), authHeader: header,
      hasKey: Boolean(header) && (Boolean(body.key) || body.keepKey === true),
      version: current.version + 1, ...(changed && { tools: [], enabled: false, lastTest: null }) });
  };
}
