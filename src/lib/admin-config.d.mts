export type Mode = 'ask' | 'plan' | 'build';
export type AdminSkill = { id: string; name: string; description: string; instructions: string; modes: Mode[]; enabled: boolean };
export type AdminMcp = { id: string; name: string; url: string; enabled: boolean; toolAllowlist: string[] };
export type AdminConfig = {
  models: string[]; defaultModel: string; defaultReasoningEffort: '' | 'low' | 'medium' | 'high'; runUsdLimit: number;
  limits: Record<string, number>; parallelChats: number;
  webSearch: { enabled: boolean; includeDomains: string[]; maxResults: number };
  skills: AdminSkill[]; mcpServers: AdminMcp[];
};
export const LIMIT_KEYS: string[];
export const MODES: Mode[];
export const EFFORTS: string[];
export const CORPORA: string[];
export function emptyConfig(): AdminConfig;
export function normalizeDomain(value: string): string;
export function validateConfig(cfg: AdminConfig): Record<string, string>;
export function sameConfig(a: unknown, b: unknown): boolean;
