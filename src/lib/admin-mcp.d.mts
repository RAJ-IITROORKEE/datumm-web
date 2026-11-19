export type ToolMode = 'allow' | 'ask' | 'never';
export type ToolHint = 'read_only' | 'destructive' | 'idempotent' | 'open_world';
export interface McpTool {
  name: string; description: string; annotations: Partial<Record<ToolHint, true>>;
  hash: string; mode: ToolMode;
}
export interface McpTest {
  at: string | null; ok: boolean; error: string | null; toolCount: number; protocol: string | null;
}
/** A server as the page keeps it. There is no key field, by design. */
export interface McpServer {
  id: string; name: string; url: string; authHeader: string | null; hasKey: boolean;
  enabled: boolean; version: number; lastTest: McpTest | null; tools: McpTool[];
  calls: number; lastCalledAt: string | null; updatedAt: string | null; updatedBy: string | null;
}
export interface McpList {
  servers: McpServer[]; secretsAvailable: boolean; reason: string | null; maxServers: number;
}
export interface McpForm { id: string; name: string; url: string; authHeader: string; key: string }
export type McpField = 'id' | 'name' | 'url' | 'authHeader' | 'key';
export type McpFormErrors = Partial<Record<McpField, string>>;
export interface McpFailure { message: string; fields: McpFormErrors; stale: boolean }
export type McpAction = 'create' | 'update' | 'test' | 'enable' | 'disable' | 'tool' | 'remove';

export const MCP_ID: RegExp;
export const MCP_HEADER: RegExp;
export const TOOL_NAME: RegExp;
export const TOOL_MODES: ToolMode[];
export const MODE_NAMES: Record<ToolMode, string>;
export const MAX_SERVERS: 20;
export const MCP_LIST_PATH: 'admin/mcp';
export const MCP_AUDIT_PATH: string;

export function parseMcpServer(raw: unknown): McpServer | null;
export function parseMcpList(raw: unknown): McpList | null;
export function unavailableCopy(reason: string | null | undefined): { lead: string; detail: string };
export function hintsOf(tool: McpTool): string[];
export function modeCounts(server: McpServer): Record<ToolMode, number>;
export function serverStatus(server: McpServer): {
  id: 'enabled' | 'untested' | 'ready' | 'failed'; label: string;
};
export function enableBlock(server: McpServer): string | null;
export function testSummary(test: McpTest | null): string;
export function auditRowsFor<T extends { kind: string | null; summary: string }>(rows: T[], id: string): T[];
export function blankForm(): McpForm;
export function formFrom(server: McpServer): McpForm;
export function validateForm(form: McpForm, opts?: {
  server?: McpServer | null; ids?: string[]; secretsAvailable?: boolean;
}): McpFormErrors;
export function resetsTools(form: McpForm, server: McpServer | null): boolean;
export function createBody(form: McpForm): Record<string, unknown>;
export function updateBody(form: McpForm, server: McpServer): Record<string, unknown>;
export function versionBody(server: McpServer): { expectedVersion: number };
export function toolModeBody(server: McpServer, mode: string): { mode: ToolMode; expectedVersion: number } | null;
export function serverPath(id: string, action?: 'test' | 'enable' | 'disable'): string | null;
export function toolPath(id: string, tool: string): string | null;
export function mcpFailure(
  result: { ok: boolean; reason?: string; message?: string; issues?: { loc?: unknown[]; msg?: string }[] } | null | undefined,
  action: McpAction,
): McpFailure;
