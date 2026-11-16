// In-memory stand-in for the A3 model registry routes. Synthetic data only: no provider is called.
type Test = {
  id: string; kind: 'test' | 'legacy'; at: string; passed: boolean;
  checks: Record<string, boolean | string | null>;
  latencyMs: number | null; inputTokens: number | null; outputTokens: number | null;
  usd: string | null; failureCode: string | null;
};
type Catalog = {
  id: string; inAllowlist: boolean; price: [string, string] | null; contextLength: number;
  imageInput: boolean;
};
type Fail = { ok: false; reason: 'error'; message: string };

const CATALOG: Catalog[] = [
  { id: 'openai/gpt-6-luna', inAllowlist: true, price: ['0.40', '1.60'], contextLength: 400000,
    imageInput: true },
  // The old admin fixture model: in the admin list, but outside the server allowlist.
  { id: 'openai/gpt-6.1-sol', inAllowlist: false, price: ['2.50', '10.00'], contextLength: 1000000,
    imageInput: true },
  { id: 'anthropic/claude-sonnet-5', inAllowlist: true, price: ['3.00', '15.00'],
    contextLength: 500000, imageInput: true },
  { id: 'google/gemini-3-pro', inAllowlist: true, price: ['1.25', '10.00'], contextLength: 1000000,
    imageInput: true },
  { id: 'meta-llama/llama-4-scout', inAllowlist: true, price: ['0.10', '0.40'],
    contextLength: 128000, imageInput: false },
  { id: 'anthropic/claude-opus-5', inAllowlist: true, price: ['15.00', '75.00'],
    contextLength: 500000, imageInput: true },
  { id: 'mistralai/mistral-large-3', inAllowlist: false, price: null, contextLength: 128000,
    imageInput: false },
];
const ROLES: Record<string, string[]> = {
  'openai/gpt-6-luna': ['planner', 'specialist'], 'openai/gpt-6.1-sol': ['planner'],
  'anthropic/claude-sonnet-5': ['planner'], 'google/gemini-3-pro': ['planner'],
};
const DAY_MS = 86_400_000;
const hours = (ago: number) => new Date(Date.now() - ago * 3_600_000).toISOString();

const checks = (passed: boolean) => ({
  listed: true, priced: true, context: true, tools: passed, imageInput: true,
  toolCall: passed, finishReason: passed ? 'tool_calls' : 'length',
});

/** `none`: no test rows at all, so nothing is served (the server fails closed). */
export function createModelsFixture(config: () => { models: string[]; defaultModel: string },
  { none = false } = {}) {
  let seq = 0;
  const tests: Record<string, Test[]> = none ? {} : {
    // A legacy row: nothing measured, so it reads "Legacy · not tested".
    'openai/gpt-6-luna': [{ id: 'legacy:openai/gpt-6-luna', kind: 'legacy', at: hours(400),
      passed: true, checks: {}, latencyMs: null, inputTokens: null, outputTokens: null, usd: null,
      failureCode: null }],
    'openai/gpt-6.1-sol': [{ id: 'legacy:openai/gpt-6.1-sol', kind: 'legacy', at: hours(400),
      passed: true, checks: {}, latencyMs: null, inputTokens: null, outputTokens: null, usd: null,
      failureCode: null }],
    'anthropic/claude-sonnet-5': [{ id: 't-sonnet', kind: 'test', at: hours(30), passed: true,
      checks: checks(true), latencyMs: 2140, inputTokens: 212, outputTokens: 18, usd: '0.0011',
      failureCode: null }],
    'google/gemini-3-pro': [{ id: 't-gemini', kind: 'test', at: hours(20), passed: false,
      checks: checks(false), latencyMs: 30000, inputTokens: 212, outputTokens: 512,
      usd: '0.0052', failureCode: 'no_tool_call' }],
  };
  const latest = (id: string) => tests[id]?.[0] ?? null;
  const status = (entry: Catalog, served: boolean) => {
    const last = latest(entry.id);
    if (!entry.inAllowlist) return 'needs_allowlist';
    if (served) return 'enabled';
    return !last ? 'untested' : last.passed ? 'ready' : 'failed';
  };
  const strip = ({ id, ...rest }: Test) => ({ id, ...rest });

  return {
    list() {
      const { models, defaultModel } = config();
      // Served = the stored list (or the allowlist when it is empty) minus untested models.
      const served = CATALOG.filter(entry => entry.inAllowlist && latest(entry.id)?.passed
        && (!models.length || models.includes(entry.id))).map(entry => entry.id);
      const realDefault = served.includes(defaultModel) ? defaultModel : served[0];
      return {
        schemaVersion: 1, catalogAt: new Date().toISOString(), catalogError: false,
        rows: CATALOG.map(entry => {
          const enabled = served.includes(entry.id), last = latest(entry.id);
          return {
            id: entry.id, status: status(entry, enabled), enabled,
            listed: models.includes(entry.id),
            isDefault: realDefault === entry.id, inAllowlist: entry.inAllowlist,
            latestTest: last && strip(last),
            price: entry.price && { promptPerM: entry.price[0], completionPerM: entry.price[1] },
            contextLength: entry.contextLength, imageInput: entry.imageInput,
          };
        }),
      };
    },
    /** A test that passes, one that fails, and a refusal for the model that is too dear to test. */
    test(modelId: string): { ok: true; data: Test } | Fail {
      const entry = CATALOG.find(item => item.id === modelId);
      if (!entry) return { ok: false, reason: 'error', message: 'Model is not in the catalog.' };
      if (/opus/.test(modelId)) {
        return { ok: false, reason: 'error', message: 'Too expensive to test.' };
      }
      const passed = !/gemini|llama/.test(modelId);
      const row: Test = {
        id: `t-${++seq}`, kind: 'test', at: new Date().toISOString(), passed,
        checks: checks(passed), latencyMs: passed ? 1800 : 30000, inputTokens: 212,
        outputTokens: passed ? 18 : 512, usd: passed ? '0.0009' : '0.0052',
        failureCode: passed ? null : 'no_tool_call',
      };
      (tests[modelId] ??= []).unshift(row);
      return { ok: true, data: structuredClone(row) };
    },
    tests: (modelId: string, limit: number) => ({ schemaVersion: 1, modelId,
      rows: (tests[modelId] ?? []).slice(0, limit).map(strip) }),
    usage(params: URLSearchParams) {
      const span = params.get('period') === '30d' ? 30 : 7, only = params.get('model');
      const days = [];
      for (const [modelId, roles] of Object.entries(ROLES)) {
        if (only && only !== modelId) continue;
        // Sonnet was last used 9 days ago, so it appears only in the 30-day view.
        const first = modelId === 'anthropic/claude-sonnet-5' ? 9 : 0;
        for (let ago = first; ago < Math.min(span, first + 5); ago++) {
          for (const role of roles) {
            const calls = 12 - ago % 5 * 2 + (role === 'planner' ? 6 : 0);
            days.push({
              day: new Date(Date.now() - ago * DAY_MS).toISOString().slice(0, 10), modelId, role,
              calls, failed: modelId.includes('gemini') ? 3 : ago % 4 === 0 ? 1 : 0,
              inputTokens: calls * 1800, outputTokens: calls * 240, reasoningTokens: calls * 60,
              usd: (calls * 0.0042).toFixed(6), p50Ms: 2100 + ago * 40, p95Ms: 7800 + ago * 90,
            });
          }
        }
      }
      const to = new Date();
      return { from: new Date(+to - span * DAY_MS).toISOString(), to: to.toISOString(),
        scanned: 412, truncated: false, days };
    },
  };
}
