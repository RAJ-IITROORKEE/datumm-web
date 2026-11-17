import test from 'node:test';
import assert from 'node:assert/strict';
import { arcOf, wallLength } from '../src/lib/plan-geometry.mjs';
import { polygonArea, roomOutline, sampleArc } from '../src/lib/plan-3d-geometry.mjs';
import { ARC_WALL, POLYGON_ROOM, curvedPlanGraph as graph } from '../src/components/dev/curved-plan-fixture.ts';

const room = (key) => graph.rooms.find((row) => row.key === key);
const arcWall = graph.walls.find((row) => row.key === ARC_WALL);

test('the arc wall is a true arc: every point on it is one radius from the centre', () => {
  const arc = arcOf(arcWall);
  assert.ok(arc, 'the fixture arc is a real arc');
  // The intended circle: centre (6500, 5000), radius 2500 (a 3-4-5 triangle on the 4,000 mm chord).
  assert.ok(Math.hypot(arc.ox - 6500, arc.oy - 5000) < 1 && Math.abs(arc.r - 2500) < 1);
  for (const [x, y] of [arcWall.start, arcWall.curve.mid, arcWall.end, ...sampleArc(arcWall)]) {
    assert.ok(Math.abs(Math.hypot(x - arc.ox, y - arc.oy) - arc.r) <= 1, `${x},${y} is off the circle`);
  }
  assert.ok(Math.abs(wallLength(arcWall) - 4636) < 1, 'arc length about 4,636 mm');
  assert.equal(graph.walls.filter((wall) => wall.curve.kind === 'arc').length, 1, 'the other walls are straight');
});

test('the polygon rooms have the expected areas and are not rectangles', () => {
  const living = room(POLYGON_ROOM);
  assert.equal(polygonArea(roomOutline(living)), 40_000_000, '8,000 x 3,000 plus 4,000 x 4,000 mm');
  assert.equal(living.areaMm2, 40_000_000);
  const lounge = room('lounge');
  assert.equal(lounge.areaMm2, polygonArea(roomOutline(lounge)));
  // Square part 4,000 x 4,000 mm plus the circular segment (R 2,500 mm, 1.8546 rad): 18.80 m².
  const exact = 16_000_000 + (2500 ** 2 / 2) * (1.854590436 - 0.96);
  assert.ok(Math.abs(lounge.areaMm2 - exact) / exact < 0.005, `${lounge.areaMm2} is not within 0.5% of ${exact}`);
  assert.ok(lounge.boundary.length <= 12 && living.boundary.length <= 12, 'schema limit of 12 boundary points');
  assert.ok(Math.abs(living.areaMm2 - polygonArea(living.boundary)) === 0 && polygonArea(living.boundary) < (living.rect[2] - living.rect[0]) * (living.rect[3] - living.rect[1]));
});

test('walls follow room edges and the openings fit on their walls', () => {
  const onEdge = ([x, y], [x0, y0], [x1, y1]) => Math.abs((x1 - x0) * (y - y0) - (y1 - y0) * (x - x0)) < 1 && x >= Math.min(x0, x1) - 1 && x <= Math.max(x0, x1) + 1 && y >= Math.min(y0, y1) - 1 && y <= Math.max(y0, y1) + 1;
  for (const wall of graph.walls.filter((row) => row.curve.kind === 'line')) {
    const edges = wall.roomKeys.flatMap((key) => { const p = roomOutline(room(key)); return p.map((point, i) => [point, p[(i + 1) % p.length]]); });
    // A wall may span two room edges (north does), so test points along it rather than its ends.
    for (let f = 0; f <= 1; f += 0.125) {
      const point = [wall.start[0] + (wall.end[0] - wall.start[0]) * f, wall.start[1] + (wall.end[1] - wall.start[1]) * f];
      assert.ok(edges.some(([a, b]) => onEdge(point, a, b)), `wall ${wall.key} leaves the room edges at ${point}`);
    }
  }
  // The arc starts and ends on vertices of the lounge, and the lounge floor passes through its mid point.
  const lounge = roomOutline(room('lounge')), has = (point) => lounge.some(([x, y]) => Math.hypot(x - point[0], y - point[1]) < 1);
  assert.ok(has(arcWall.start) && has(arcWall.end) && has(arcWall.curve.mid));
  for (const opening of graph.openings) {
    const wall = graph.walls.find((row) => row.key === opening.wallKey);
    assert.ok(wall && opening.offsetMm >= 0 && opening.offsetMm + opening.widthMm <= wallLength(wall), `opening ${opening.key} runs off its wall`);
  }
  const onArc = graph.openings.filter((row) => row.wallKey === ARC_WALL).map((row) => row.kind).sort();
  assert.deepEqual(onArc, ['door', 'window']);
});
