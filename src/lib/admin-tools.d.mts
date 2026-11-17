import type { Mode } from './admin-config.mjs';

export type ToolRisk = 'read' | 'external' | 'device' | 'write';
export type ToolRow = {
  id: string; label: string; description: string; group: string; runsOn: string; risk: ToolRisk;
  required: boolean; locked: boolean; allowedModes: Mode[]; defaultModes: Mode[];
};
export type ToolsMap = Record<string, { modes: Mode[] }>;
export const TOOL_ID: RegExp;
export const TOOL_GROUPS: { id: string; label: string }[];
export const RISK_LABELS: Record<ToolRisk, string>;
export const MODE_LABELS: Record<Mode, string>;
export function parseToolCatalog(raw: unknown): ToolRow[];
export function groupToolRows(rows: ToolRow[]): { id: string; label: string; rows: ToolRow[] }[];
export function effectiveModes(row: ToolRow, tools: ToolsMap | undefined): Mode[];
export function lockKind(row: ToolRow): 'required' | 'device' | null;
export function modeDisabled(row: ToolRow, mode: Mode): boolean;
export function toggleToolMode(tools: ToolsMap | undefined, row: ToolRow, mode: Mode, on: boolean): ToolsMap;
export function toolsErrors(tools: ToolsMap | undefined, rows: ToolRow[]): Record<string, string>;
