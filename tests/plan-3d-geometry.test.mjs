import test from 'node:test';
import assert from 'node:assert/strict';
import { wallLength } from '../src/lib/plan-geometry.mjs';
import { arcSegments, curvedWallPositions, placeOpening, polygonArea, roomOutline, sampleArc } from '../src/lib/plan-3d-geometry.mjs';

const near = (actual, expected, tolerance = 1e-6) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not within ${tolerance} of ${expected}`);
// Quarter circle of radius 1000 mm about the origin, counter-clockwise from (1000, 0) to (0, 1000).
const R = 1000, quarter = { start: [R, 0], end: [0, R], curve: { kind: 'arc', mid: [R * Math.SQRT1_2, R * Math.SQRT1_2] } };
const clockwise = { start: [0, R], end: [R, 0], curve: { kind: 'arc', mid: quarter.curve.mid } };
const signedVolume = (p) => { let sum = 0; for (let i = 0; i < p.length; i += 9) { const [a, b, c] = [p.slice(i, i + 3), p.slice(i + 3, i + 6), p.slice(i + 6, i + 9)]; sum += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]); } return sum / 6; };

test('polygon area and room outline use the boundary, else the rectangle', () => {
  const lShape = [[0, 0], [4000, 0], [4000, 2000], [2000, 2000], [2000, 4000], [0, 4000]];
  assert.equal(polygonArea(lShape), 12_000_000);
  assert.deepEqual(roomOutline({ rect: [0, 0, 4000, 4000], boundary: lShape }), lShape);
  assert.deepEqual(roomOutline({ rect: [0, 0, 4000, 4000], boundary: [...lShape, lShape[0]] }), lShape, 'a closing duplicate is dropped');
  assert.equal(polygonArea(roomOutline({ rect: [1000, 500, 4000, 2500] })), 6_000_000);
});

test('arc wall length, facets and sampled points lie on the circle', () => {
  near(wallLength(quarter), (Math.PI / 2) * R);
  assert.equal(arcSegments(quarter), 18, 'a quarter turn in 5 degree facets');
  assert.equal(arcSegments({ start: [0, 0], end: [1000, 0] }), 1, 'a straight wall is one segment');
  const points = sampleArc(quarter);
  assert.equal(points.length, 19);
  near(points[0][0], R, 1e-9); near(points[18][1], R, 1e-9);
  for (const [x, y] of points) near(Math.hypot(x, y), R, 1e-9);
  near(Math.hypot(...points[9]) , R, 1e-9);
  near(points[9][0], R * Math.SQRT1_2, 1e-6);
});

test('an opening is placed along the arc, not along the chord', () => {
  // Half the arc starting a quarter of the way in: centre at 45 degrees, ends at 22.5 and 67.5.
  const arcLength = (Math.PI / 2) * R, placed = placeOpening(quarter, { offsetMm: arcLength / 4, widthMm: arcLength / 2 });
  near(placed.centre[0], R * Math.SQRT1_2); near(placed.centre[1], R * Math.SQRT1_2);
  near(placed.start[0], R * Math.cos(Math.PI / 8)); near(placed.end[1], R * Math.sin((3 * Math.PI) / 8));
  near(placed.chordMm, 2 * R * Math.sin(Math.PI / 8));
  near(placed.angle, (3 * Math.PI) / 4);
  const straight = placeOpening({ start: [0, 0], end: [4000, 0] }, { offsetMm: 1000, widthMm: 900 });
  assert.deepEqual(straight.centre, [1450, 0]); assert.equal(straight.chordMm, 900); assert.equal(straight.angle, 0);
});

test('curved wall shell is closed, outward wound and as thick as asked, for both sweep directions', () => {
  const thicknessMm = 100, heightMm = 2000, ring = 9 * Math.sin(Math.PI / 36) * ((R + 50) ** 2 - (R - 50) ** 2);
  for (const wall of [quarter, clockwise]) {
    const solid = curvedWallPositions(wall, { thicknessMm, heightMm });
    assert.equal(solid.length % 9, 0);
    // Exact: 18 facets of 5 degrees make a polygon ring, so volume is ring area times height.
    near(signedVolume(solid), ring * heightMm, ring * heightMm * 1e-9);
    const door = { offsetMm: 400, widthMm: 900, heightMm: 2100, sillMm: 0 }, window = { offsetMm: 1350, widthMm: 150, heightMm: 600, sillMm: 800 };
    const cut = signedVolume(curvedWallPositions(wall, { thicknessMm, heightMm: 2400, openings: [door, window] }));
    const full = signedVolume(curvedWallPositions(wall, { thicknessMm, heightMm: 2400 }));
    near((full - cut) / (900 * 2100 * thicknessMm + 150 * 600 * thicknessMm), 1, 0.01);
  }
  assert.deepEqual(curvedWallPositions({ start: [0, 0], end: [1000, 0] }, { thicknessMm, heightMm }), [], 'a straight wall has no curved shell');
});
