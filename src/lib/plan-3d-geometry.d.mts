type Point = number[];
type RoomShape = { rect: number[]; boundary?: Point[] };
type WallShape = { start: Point; end: Point; curve?: { kind: string; mid?: Point } };
type OpeningSpan = { offsetMm: number; widthMm: number; heightMm: number; sillMm: number };
export function polygonArea(points: Point[]): number;
export function roomOutline(room: RoomShape): Point[];
export function arcSegments(wall: WallShape, stepRad?: number): number;
export function sampleArc(wall: WallShape, stepRad?: number): [number, number][];
export function placeOpening(wall: WallShape, opening: Pick<OpeningSpan, 'offsetMm' | 'widthMm'>): {
  centre: [number, number]; start: [number, number]; end: [number, number]; chordMm: number; angle: number;
};
export function curvedWallPositions(wall: WallShape, options: {
  thicknessMm: number; heightMm: number; openings?: OpeningSpan[]; stepRad?: number;
}): number[];
