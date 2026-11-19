import type { ToolRow } from './admin-tools.mjs';

export type ToolHintOption = { id: string; label: string; names: string[] };
export const HINT_MAX: 6;
export const TOOL_NAME: RegExp;
export function toolHintOptions(rows: ToolRow[]): ToolHintOption[];
export function toggleHint(list: string[], name: string, on: boolean): string[];
export function validHints(list: unknown): boolean;
