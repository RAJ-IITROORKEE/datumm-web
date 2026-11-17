// Synthetic v6/v7-shaped plan graph with an L-shaped room and an arc wall, for /dev/ux only.
// Hosted plans are rectangular today, so this is the one place the 3D polygon and arc paths show.
// Plain TypeScript with no imports, so tests/curved-plan-fixture.test.mjs can load it directly.
type Point = number[];

// Arc wall: chord (8000,3000)-(8000,7000), centre (6500,5000), R = 2500 (a 3-4-5 triangle), so the
// mid point (9000,5000) lies exactly on the circle.
const centre: Point = [6500, 5000], radius = 2500, facets = 8, half = Math.atan2(2000, 1500);
// Rooms are polygons, so the lounge floor follows the arc in facets; schema limit is 12 points.
const arcFloor: Point[] = Array.from({ length: facets - 1 }, (_, i) => {
  const angle = -half + ((i + 1) * 2 * half) / facets;
  return [Math.round(centre[0] + radius * Math.cos(angle)), Math.round(centre[1] + radius * Math.sin(angle))];
});
const loungeBoundary: Point[] = [[4000, 3000], [8000, 3000], ...arcFloor, [8000, 7000], [4000, 7000]];
const livingBoundary: Point[] = [[0, 0], [8000, 0], [8000, 3000], [4000, 3000], [4000, 7000], [0, 7000]];

// Shoelace area, kept local so this file has no imports.
const area = (points: Point[]) => Math.abs(points.reduce((sum, [x0, y0], i) => {
  const [x1, y1] = points[(i + 1) % points.length];
  return sum + x0 * y1 - x1 * y0;
}, 0)) / 2;

const line = { kind: 'line' };
const wall = (key: string, start: Point, end: Point, kind: string, roomKeys: string[], curve: { kind: string; mid?: Point } = line) =>
  ({ key, start, end, kind, roomKeys, curve });
const opening = (key: string, wallKey: string, kind: string, offsetMm: number, widthMm: number, heightMm: number, sillMm: number) =>
  ({ key, wallKey, kind, offsetMm, widthMm, heightMm, sillMm });

export const ARC_WALL = 'arc-east';
export const POLYGON_ROOM = 'living';

export const curvedPlanGraph = {
  site: { widthMm: 10000, depthMm: 8000 },
  wallThicknessMm: 200,
  wallHeightMm: 3000,
  assumptions: ['Synthetic development fixture: an L-shaped living room and an arc exterior wall.'],
  rooms: [
    { key: 'living', name: 'Living', kind: 'living', areaMm2: area(livingBoundary), rect: [0, 0, 8000, 7000], boundary: livingBoundary },
    { key: 'lounge', name: 'Curved lounge', kind: 'other', areaMm2: area(loungeBoundary), rect: [4000, 3000, 9000, 7000], boundary: loungeBoundary },
  ],
  walls: [
    wall('south', [0, 0], [8000, 0], 'exterior', ['living']),
    wall('east-low', [8000, 0], [8000, 3000], 'exterior', ['living']),
    wall(ARC_WALL, [8000, 3000], [8000, 7000], 'exterior', ['lounge'], { kind: 'arc', mid: [9000, 5000] }),
    wall('north', [8000, 7000], [0, 7000], 'exterior', ['living', 'lounge']),
    wall('west', [0, 7000], [0, 0], 'exterior', ['living']),
    wall('inner-ew', [8000, 3000], [4000, 3000], 'interior', ['living', 'lounge']),
    wall('inner-ns', [4000, 3000], [4000, 7000], 'interior', ['living', 'lounge']),
  ],
  // The arc is 4,636 mm long: the window and door sit along it, 700 mm apart.
  openings: [
    opening('arc-window', ARC_WALL, 'window', 500, 1300, 1200, 900),
    opening('arc-door', ARC_WALL, 'door', 2500, 1000, 2100, 0),
    opening('entry-door', 'south', 'door', 1200, 1000, 2100, 0),
    opening('west-window', 'west', 'window', 2500, 1500, 1200, 900),
    opening('inner-door', 'inner-ns', 'door', 1500, 900, 2100, 0),
  ],
};
