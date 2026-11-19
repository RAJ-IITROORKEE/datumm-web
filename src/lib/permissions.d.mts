import type { ToolRisk } from './admin-tools.mjs';

export type ApprovalMode = 'ask' | 'safe' | 'auto';
export type ApprovalCard = { id: ApprovalMode; title: string; description: string };
export type ToolApproval = { risk: ToolRisk | null; expiresAt: number | null; toolName: string | null; itemId: string; allowId: string; denyId: string };
export const APPROVAL_MODES: ApprovalMode[];
export const DEFAULT_APPROVAL_MODE: 'ask';
export const APPROVAL_CARDS: ApprovalCard[];
export const ALWAYS_ASKS: { title: string; description: string }[];
export function parsePermissions(raw: unknown): { approvalMode: ApprovalMode };
export function permissionsBody(mode: unknown): { approvalMode: ApprovalMode } | null;
export function parseApproval(question: unknown): ToolApproval | null;
export function approvalAnswers(approval: ToolApproval, choice: 'allow' | 'deny'): { question_id: string; option_id: string }[];
export function approvalStatus(approval: ToolApproval, now: number, serverExpired?: boolean): { expired: boolean; label: string };
export function approvalAnnouncement(approval: ToolApproval, now: number, serverExpired?: boolean): string;
/** Rewrites `mcp__<server>__<tool>` as `<tool> on <server>`; other text is unchanged. */
export function plainApprovalText(text: unknown): string;
