export type ModelStatus = 'enabled' | 'ready' | 'failed' | 'untested' | 'needs_allowlist';
export type ModelPeriod = '7d' | '30d';

export interface ModelTest {
  id: string | null; kind: 'test' | 'legacy'; at: string | null; passed: boolean;
  checks: {
    listed: boolean | null; priced: boolean | null; context: boolean | null;
    tools: boolean | null; imageInput: boolean | null; toolCall: boolean | null;
    finishReason: string | null;
  };
  latencyMs: number | null; inputTokens: number | null; outputTokens: number | null;
  usd: string | null; failureCode: string | null;
}
export interface ModelRow {
  /** `enabled`: served (in the resolved list); `listed`: in the stored admin list. */
  id: string; status: ModelStatus; enabled: boolean; listed: boolean; isDefault: boolean;
  inAllowlist: boolean;
  latestTest: ModelTest | null; price: { promptPerM: string; completionPerM: string } | null;
  contextLength: number | null; imageInput: boolean | null;
}
export interface ModelRegistry { catalogAt: string | null; catalogError: boolean; rows: ModelRow[] }
export interface UsageDay {
  day: string; modelId: string; role: string | null; calls: number; failed: number;
  inputTokens: number; outputTokens: number; reasoningTokens: number; usd: string | null;
  p50Ms: number | null; p95Ms: number | null;
}
export interface ModelUsage {
  from: string | null; to: string | null; scanned: number; truncated: boolean; days: UsageDay[];
}
export interface ModelTotals {
  calls: number; failed: number; inputTokens: number; outputTokens: number; usd: string;
}
export interface CheckItem { key: string; label: string; state: 'pass' | 'fail' | 'na' | 'info' }
type DraftModels = { models: string[]; defaultModel: string };

export const MODEL_STATUSES: ModelStatus[];
export const MODEL_PERIODS: ModelPeriod[];
export const DEFAULT_MODEL_PERIOD: ModelPeriod;
export const MAX_ENABLED: 20;
export const DEFAULT_BLOCK: string;
export const TEST_COST_NOTE: string;
export const MODEL_RE: RegExp;
export function statusLabel(status: string): string;
export function rowStatusLabel(row: ModelRow): string;
export function servedNote(row: ModelRow): string | null;
export function noneServed(rows: ModelRow[]): boolean;
/** Null unless a schemaVersion 1 registry; unknown keys and statuses are dropped. */
export function parseModels(raw: unknown): ModelRegistry | null;
/** One stored test row, or null. */
export function parseTest(raw: unknown): ModelTest | null;
/** Null unless a schemaVersion 1 `{modelId, rows}` document. */
export function parseTests(raw: unknown): ModelTest[] | null;
export function parseUsage(raw: unknown): ModelUsage | null;
/** Exact sum of USD strings (12 decimals); anything that is not a USD string counts as zero. */
export function sumUsd(values: (string | null)[]): string;
/** A Map keyed by model id: a model id may be `__proto__`. */
export function modelTotals(days: UsageDay[]): Map<string, ModelTotals>;
export function daysFor(days: UsageDay[], modelId: string): UsageDay[];
export function statusCounts(rows: ModelRow[]): Record<ModelStatus, number>;
export function priceLabel(row: ModelRow, catalogError?: boolean): string;
export function testLabel(test: ModelTest | null): string;
/** Why Enable is unavailable, or null. */
export function canEnable(row: ModelRow): string | null;
export function enabledIds(models: string[], rows: ModelRow[]): string[];
export function currentDefault(defaultModel: string, rows: ModelRow[]): string;
export function disableBlock(config: DraftModels, rows: ModelRow[], id: string): string | null;
export function nextModels(
  config: DraftModels, rows: ModelRow[], id: string, on: boolean,
): string[];
export function checkItems(test: ModelTest): CheckItem[];
export function modelsPath(): string;
export function usagePath(opts?: { period?: string; model?: string }): string;
export function testsPath(modelId: string, limit?: number): string | null;
export function testBody(modelId: string): { modelId: string } | null;
