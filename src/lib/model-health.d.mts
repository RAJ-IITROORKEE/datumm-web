export type HealthCheck = {
  code: string; severity: 'warn' | 'info'; message: string; count: number;
  elementIds: (number | string)[];
};
export type ModelHealth = {
  documentId: string; revision: number; coverage: 'complete' | 'partial'; title: string;
  counts: Record<string, number>; checks: HealthCheck[]; limitations: string[];
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
export function healthPath(deviceId: string): string;
export function toolsPath(deviceId: string): string;
/** Null for any wrong schema or shape. */
export function parseModelHealth(value: unknown): ModelHealth | null;
export function groupChecks(health: ModelHealth): { problems: HealthCheck[]; notes: HealthCheck[] };
export const SHOW_ACTIONS: readonly ['select', 'show'];
export function showElementsRequest(
  health: ModelHealth | null, check: HealthCheck | null, action?: 'select' | 'show',
): ToolRequest | null;
export function onlySession(result: unknown): string | null;
export function viewsRequest(sessionId: string, offset?: number): ToolRequest;
export function planImageRequest(sessionId: string, viewId: string): ToolRequest;
export function parseViews(result: unknown): { views: PlanView[]; total: number; more: boolean } | null;
export function parsePlanImage(result: unknown): PlanImage | null;
export function imageLabel(image: Pick<PlanImage, 'viewName' | 'scale' | 'revision'>): string;
export function revitFailureMessage(error: unknown): string;
