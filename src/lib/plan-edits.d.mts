export type EditGraph = {
  rooms?: { key: string; name: string; kind?: string }[];
  walls?: { key: string; start: number[]; end: number[]; roomKeys?: string[]; curve?: { kind?: string } }[];
  openings?: { key: string; wallKey: string; kind: string; offsetMm: number; widthMm: number; heightMm: number; sillMm: number }[];
};
export type OpeningFields = { wallKey: string; offsetMm: number; widthMm: number; heightMm: number; sillMm: number };
export type PlanEdit =
  | { kind: 'rename'; roomKey: string; name: string }
  | { kind: 'swap'; roomKeys: [string, string] }
  | { kind: 'move-wall'; wallKey: string; offsetMm: number }
  | { kind: 'opening'; opening: ({ kind: 'update'; openingKey: string } & OpeningFields) | { kind: 'delete'; openingKey: string } };
export type EditCheck = { ok: true; edit: PlanEdit } | { ok: false; error: string };
export type EditChanges = { rooms?: { key: string; fields?: unknown }[]; walls?: string[]; openings?: string[] };
export type EditResult = { planId: string; version: number; fingerprint: string; changes: EditChanges; findings?: unknown };
type Identity = { planId: string; version: number; fingerprint: string };

export const NAME_MAX: 80;
export const MOVE_MAX_MM: 5000;
export const STALE_MESSAGE: string;
export function parseMm(value: unknown): number;
export function renameEdit(roomKey: string, name: unknown, graph?: EditGraph): EditCheck;
export function swapEdit(roomA: string, roomB: string, graph?: EditGraph): EditCheck;
export function moveWallEdit(wallKey: string, offset: unknown, graph?: EditGraph): EditCheck;
export function openingEdit(graph: EditGraph, openingKey: string, action: 'update' | 'delete', fields?: { widthMm?: unknown; offsetMm?: unknown }): EditCheck;
export function editPath(drawing: Pick<Identity, 'planId' | 'version'>): string;
export function editBody(drawing: Pick<Identity, 'fingerprint'>, edit: PlanEdit): { fingerprint: string; edit: PlanEdit };
export function editablePlan(graph: { schemaVersion?: number; provenance?: { source?: string } } | undefined): boolean;
export function isMovableWall(wall: unknown): boolean;
export function interiorWalls(graph: EditGraph | undefined, roomKey: string): { key: string; label: string }[];
export function movePreview(graph: EditGraph | undefined, wallKey: string, offset: unknown): string;
export function moveDirectionHint(graph: EditGraph | undefined, wallKey: string): string;
export function describeChanges(changes: unknown, graph?: EditGraph): string;
export function checksLine(findings: unknown): string;
export function parseEditResult(raw: unknown, drawing: Pick<Identity, 'planId' | 'version'>): EditResult | null;
export function acceptAgainNote(version: number): string;
export function successMessage(result: EditResult, graph?: EditGraph): string;
export function refusalMessage(failure?: { status?: number; message?: string; code?: string }): string;
