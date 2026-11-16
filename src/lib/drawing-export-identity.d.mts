type Identity = {planId:string;version:number;fingerprint:string};
export function exactConceptName(plan: Identity | null | undefined, candidates?: readonly Identity[]): string | undefined;
export function safeDrawingSegment(value: unknown, fallback?: string): string;
export function drawingExportName(plan: Identity, view: '2d' | '3d', conceptName?: string): string;
