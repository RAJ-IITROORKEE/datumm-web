export type Mode = 'ask' | 'plan' | 'build';
export type AdminSkill = { id: string; name: string; description: string; instructions: string; modes: Mode[]; enabled: boolean };
export type AdminMcp = { id: string; name: string; url: string; enabled: boolean; toolAllowlist: string[] };
export type AdminConfig = {
  models: string[]; defaultModel: string; defaultReasoningEffort: '' | 'low' | 'medium' | 'high'; runUsdLimit: number;
  limits: Record<string, number>; parallelChats: number;
  webSearch: { enabled: boolean; includeDomains: string[]; maxResults: number };
  webSearchProvider?: 'openrouter' | 'tavily';
  skills: AdminSkill[]; mcpServers: AdminMcp[];
  /** Present only when the backend reports `adminTools`; never added by the editor otherwise. */
  tools?: Record<string, { modes: Mode[] }>;
  /** Present only when the backend reports `dailyLimits`; null means unlimited. */
  dailyLimits?: { runs: number | null; modelCalls: number | null };
};
export const LIMIT_KEYS: string[];
export const MODES: Mode[];
export const EFFORTS: string[];
export const SEARCH_PROVIDERS: string[];
export const CORPORA: string[];
export function emptyConfig(): AdminConfig;
export function normalizeDomain(value: string): string;
export function validateConfig(cfg: AdminConfig): Record<string, string>;
export function sameConfig(a: unknown, b: unknown): boolean;
