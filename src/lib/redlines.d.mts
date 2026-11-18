export type RedlineConfidence = 'high' | 'medium' | 'low';
/** An exact M1 edit built by the server; the web posts it to the edit route unchanged. */
export type RedlineEdit =
  { kind: 'rename' | 'swap' | 'move-wall' | 'opening' } & Record<string, unknown>;
export type RedlineItem = {
  id: string;
  mark: string;
  summary: string;
  confidence: RedlineConfidence;
  status: 'ready' | 'unclear';
  edit: RedlineEdit | null;
  reason: string;
};
export type RedlineResult = {
  planId: string; version: number; fingerprint: string; model: string; items: RedlineItem[];
};
type Identity = { planId: string; version: number; fingerprint: string };

export const REDLINE_SCHEMA: 'datumm.redlines.v1';
export const REDLINE_ACCEPT: string;
export const REDLINE_LIMITS: Readonly<{
  maxFileBytes: number;
  maxPages: number;
  maxEdgePx: number;
  maxImageBytes: number;
  maxPageText: number;
}>;
export function redlinePath(drawing: Pick<Identity, 'planId' | 'version'>): string;
export function redlineBody(
  drawing: Pick<Identity, 'fingerprint'>,
  source: { image: string; pageText?: string },
): { fingerprint: string; image: string; pageText?: string };
export function clipText(text: unknown, max?: number): string;
export function fitEdge(
  width: number, height: number, max?: number, enlarge?: boolean,
): { width: number; height: number; scale: number };
export function checkFile(
  file: { type?: string; size?: number } | null | undefined,
): { ok: true; kind: 'image' | 'pdf' } | { ok: false; error: string };
export function pageCheck(page: number, count: number): { ok: true } | { ok: false; error: string };
export function parseRedlines(
  raw: unknown, drawing: Pick<Identity, 'planId' | 'version'>,
): RedlineResult | null;
export function defaultTicks(items: RedlineItem[]): string[];
export function canTick(item: RedlineItem): boolean;
export function applyQueue(
  items: RedlineItem[], ticked: string[], applied?: string[],
): RedlineItem[];
export function applyLabel(n: number): string;
export function appliedMessage(done: number, version: number): string;
export function partialMessage(
  done: number, total: number, version: number, reason: string,
): string;
export function confidenceLabel(confidence: string): string;
export function readFailureMessage(failure?: { status?: number; message?: string }): string;
