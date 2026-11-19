export type HistoryAction = 'update' | 'restore' | 'baseline';
export type AuditKind = 'config' | 'knowledge' | 'model_test' | 'mcp';
export type AuditAction = HistoryAction | 'add' | 'reindex' | 'delete' | 'test' | 'mcp_create' | 'mcp_update'
  | 'mcp_test' | 'mcp_tool_mode' | 'mcp_enable' | 'mcp_disable' | 'mcp_remove';
type Shown = string | number | boolean | (string | number | boolean)[];

export interface ConfigChange {
  path: string; beforeHash: string | null; afterHash: string | null;
  /** Present only when the backend allows the value to be shown. */
  before?: Shown; after?: Shown;
}
export interface HistoryRow {
  revision: number; at: string | null; by: string | null; action: HistoryAction;
  restoredFrom: number | null; note: string | null; configHash: string | null;
  changes: ConfigChange[]; changesTruncated: boolean;
  recovered: boolean; redacted: boolean; restorable: boolean;
  /** True only when the backend says this snapshot equals the live configuration. */
  identical: boolean;
}
export interface HistoryPage { current: number; nextBefore: number | null; rows: HistoryRow[] }
export interface HistoryDetail extends HistoryRow {
  changesFromCurrent: ConfigChange[]; changesFromCurrentTruncated: boolean;
}
export interface AuditRow {
  at: string | null; by: string | null; summary: string;
  kind: AuditKind | null; action: AuditAction | null;
  revision: number | null; restoredFrom: number | null; note: string | null;
  changes: ConfigChange[]; changesTruncated: boolean; cursor: string | null;
}

export const HISTORY_ACTIONS: HistoryAction[];
export const AUDIT_KINDS: AuditKind[];
export const AUDIT_ACTIONS: AuditAction[];
export const MAX_NOTE: 200;
export const HISTORY_LIMIT: number;
export const AUDIT_LIMIT: number;
export function actionLabel(value: string | null | undefined): string;
export function kindLabel(value: string): string;
/** "before → after" when values were sent, otherwise "changed". */
export function formatChange(change: ConfigChange): string;
/** Plain wording for starter-skill and tools-that-help paths; any other path is returned as is. */
export function pathLabel(path: string): string;
export function changedPaths(
  changes: ConfigChange[], truncated?: boolean, max?: number,
): { paths: string[]; more: number; truncated: boolean };
/** Null unless the response is a schemaVersion 1 history document; unknown keys are dropped. */
export function parseHistory(raw: unknown): HistoryPage | null;
/** One revision with its difference from live; the full snapshot is never kept. */
export function parseHistoryDetail(raw: unknown): HistoryDetail | null;
/** Null unless the audit response is an array. */
export function parseAuditRows(raw: unknown): AuditRow[] | null;
export function historyPath(opts?: { before?: number | null; limit?: number }): string;
export function auditPath(
  opts?: { before?: string | null; limit?: number; kind?: string | null },
): string;
export function restoreBody(input?: {
  fromRevision?: unknown; expectedRevision?: unknown; note?: unknown;
}): { fromRevision: number; expectedRevision: number; note?: string } | null;
export function restoreBlock(state: {
  restorable: boolean; revision: number; current: number; dirty: boolean; saving: boolean;
  pendingChipCount?: number; identical?: unknown;
  changesFromCurrent?: ConfigChange[]; changesFromCurrentTruncated?: boolean;
}): string | null;
export function restoredStatus(from: number, revision: number): string;
