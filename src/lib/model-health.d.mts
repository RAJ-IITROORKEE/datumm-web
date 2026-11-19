export type HealthCheck = {
  code: string; severity: 'warn' | 'info'; message: string; count: number;
  elementIds: (number | string)[];
};
export type RevitWarning = {
  key: string; failureDefinitionId: string; severity: string; description: string;
  elementIds: (number | string)[];
};
export type RevitWarnings = {
  coverage: 'complete' | 'partial' | 'unavailable'; total: number; items: RevitWarning[];
};
export type ModelHealth = {
  documentId: string; revision: number; coverage: 'complete' | 'partial'; title: string;
  counts: Record<string, number>; checks: HealthCheck[]; limitations: string[];
  /** A missing `warnings` from an older service reads as coverage "unavailable". */
  warnings: RevitWarnings;
};
export type PlanModelCompare = {
  documentId: string; revision: number; planId: string; version: number;
  matched: {
    name: string; planAreaM2: number; revitAreaM2: number; differencePct: number;
    revitElementId: number | string;
  }[];
  onlyInPlan: string[];
  onlyInRevit: { name: string; elementId: number | string }[];
  limitations: string[];
};
export type ToolRequest = { name: string; arguments: Record<string, unknown> };
export type PlanView = { id: string; name: string; scale: number };
export type PlanImage = {
  src: string; width: number; height: number; viewName: string; scale: number; revision: number;
  documentId: string;
};

export const HEALTH_SCHEMA: 'datumm.model-health.v1';
export const MAX_ELEMENT_IDS: 50;
export const MAX_IMAGE_BASE64: number;
export const MAX_IMAGE_EDGE: number;
export const PLAN_IMAGE_PIXELS: number;
export const VIEW_PAGE: number;
export const NO_MODEL_GUIDANCE: string;
export const WARNING_CODE: 'REVIT_WARNING';
export const COMPARE_SCHEMA: 'datumm.plan-model-compare.v1';
export const AREA_FLAG_PCT: 10;
export function comparePath(deviceId: string): string;
export function healthPath(deviceId: string): string;
export function toolsPath(deviceId: string): string;
/** Null for any wrong schema or shape. */
export function parseModelHealth(value: unknown): ModelHealth | null;
export function groupChecks(health: ModelHealth): { problems: HealthCheck[]; notes: HealthCheck[] };
/** Revit warnings grouped by description, shaped like checks. */
export function groupWarnings(warnings: RevitWarnings): HealthCheck[];
/** Null unless both checks listed every warning, share a document and differ in revision. */
export function warningDelta(
  previous: ModelHealth | null, next: ModelHealth | null,
): { added: number; resolved: number } | null;
export function deltaText(delta: { added: number; resolved: number }): string;
/** Null for a wrong schema or shape, or an answer for another plan or version than `expected`. */
export function parsePlanModelCompare(
  value: unknown, expected: { planId: string; version: number },
): PlanModelCompare | null;
export function differsFromPlan(row: { differencePct: number }): boolean;
export const SHOW_ACTIONS: readonly ['select', 'show'];
export function showElementsRequest(
  health: { documentId: string; revision: number } | null,
  check: { elementIds: (number | string)[] } | null, action?: 'select' | 'show',
): ToolRequest | null;
export function onlySession(result: unknown): string | null;
export function viewsRequest(sessionId: string, offset?: number): ToolRequest;
export function planImageRequest(sessionId: string, viewId: string): ToolRequest;
export function parseViews(result: unknown): { views: PlanView[]; total: number; more: boolean } | null;
export function parsePlanImage(result: unknown): PlanImage | null;
export function planSnapshotRequest(sessionId: string, viewId: string): ToolRequest;
/** Measured drawing (light ground) as an image source; scale is 0 (not reported). */
export function parsePlanSnapshot(result: unknown): PlanImage | null;
export function imageLabel(image: Pick<PlanImage, 'viewName' | 'scale' | 'revision'>): string;
export function revitFailureMessage(error: unknown): string;
