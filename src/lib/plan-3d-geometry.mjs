// Pure geometry for the 3D plan view. Plan millimetres in, y up on the sheet. Triangle lists use
// world axes: x as plan x, y up, z as minus plan y (the scene mirrors the sheet that way).
import { arcOf, roomPoints, wallLength, wallPoint } from './plan-geometry.mjs';

// shortcut: facets of 5 degrees read as a smooth curve at plan scale; lower it for close-ups.
const STEP = (5 * Math.PI) / 180;

/** Shoelace area of a polygon in mm². */
export const polygonArea = (points) =>
  Math.abs(points.reduce((sum, [x0, y0], i) => { const [x1, y1] = points[(i + 1) % points.length]; return sum + x0 * y1 - x1 * y0; }, 0)) / 2;

/** Floor outline of a room: its boundary polygon, else its rectangle, without a repeated closing point. */
export function roomOutline(room) {
  const points = roomPoints(room), last = points.at(-1);
  return points.length > 3 && last[0] === points[0][0] && last[1] === points[0][1] ? points.slice(0, -1) : points;
}

/** Facets of an arc wall (1 for a straight wall). */
export function arcSegments(wall, stepRad = STEP) {
  const arc = arcOf(wall);
  return arc ? Math.max(1, Math.ceil(Math.abs(arc.sweep) / stepRad - 1e-9)) : 1;
}

/** Centreline points of a wall, start to end; an arc is cut into equal facets. */
export function sampleArc(wall, stepRad = STEP) {
  const count = arcSegments(wall, stepRad), length = wallLength(wall);
  return Array.from({ length: count + 1 }, (_, i) => wallPoint(wall, (length * i) / count));
}

/** Where an opening sits on the wall centreline, measured along the arc from the wall start. */
export function placeOpening(wall, opening) {
  const start = wallPoint(wall, opening.offsetMm), end = wallPoint(wall, opening.offsetMm + opening.widthMm);
  return {
    centre: wallPoint(wall, opening.offsetMm + opening.widthMm / 2), start, end,
    chordMm: Math.hypot(end[0] - start[0], end[1] - start[1]),
    angle: Math.atan2(end[1] - start[1], end[0] - start[0]),
  };
}

/**
 * Triangles (x, y, z numbers, three per vertex) of an arc wall with real thickness and height.
 * The wall is a grid of quads in (distance along the arc, height); openings leave cells out, so
 * no cap triangle can cut across the curve. Windings face outward for either sweep direction.
 */
export function curvedWallPositions(wall, { thicknessMm, heightMm, openings = [], stepRad = STEP }) {
  const arc = arcOf(wall);
  if (!arc) return [];
  const length = wallLength(wall), count = arcSegments(wall, stepRad), half = thicknessMm / 2;
  const holes = openings.map((o) => ({ a: o.offsetMm, b: o.offsetMm + o.widthMm, sill: o.sillMm, top: Math.min(o.sillMm + o.heightMm, heightMm) })).filter((h) => h.sill < heightMm && h.b > h.a);
  const unique = (values) => [...new Set(values.map((v) => Math.round(v * 1e6) / 1e6))].sort((p, q) => p - q);
  const xs = unique([...Array.from({ length: count + 1 }, (_, i) => (length * i) / count), ...holes.flatMap((h) => [h.a, h.b]).filter((x) => x > 0 && x < length)]);
  const ys = unique([0, heightMm, ...holes.flatMap((h) => [h.sill, h.top])]);
  const solid = (i, j) => {
    if (i < 0 || j < 0 || i >= xs.length - 1 || j >= ys.length - 1) return false;
    const x = (xs[i] + xs[i + 1]) / 2, y = (ys[j] + ys[j + 1]) / 2;
    return !holes.some((h) => x > h.a && x < h.b && y > h.sill && y < h.top);
  };
  const at = (u, v, w) => { const a = arc.a0 + (arc.sweep * u) / length, r = arc.r + w; return [arc.ox + r * Math.cos(a), v, -(arc.oy + r * Math.sin(a))]; };
  const out = [];
  // The (along, up, outward) frame is right-handed for a positive sweep; reverse each quad otherwise.
  const quad = (a, b, c, d) => out.push(...(arc.sweep < 0 ? [a, c, b, a, d, c] : [a, b, c, a, c, d]).flat());
  for (let i = 0; i < xs.length - 1; i++) for (let j = 0; j < ys.length - 1; j++) {
    if (!solid(i, j)) continue;
    const [u0, u1, v0, v1] = [xs[i], xs[i + 1], ys[j], ys[j + 1]];
    quad(at(u0, v0, half), at(u1, v0, half), at(u1, v1, half), at(u0, v1, half));
    quad(at(u0, v0, -half), at(u0, v1, -half), at(u1, v1, -half), at(u1, v0, -half));
    if (!solid(i, j - 1)) quad(at(u0, v0, -half), at(u1, v0, -half), at(u1, v0, half), at(u0, v0, half));
    if (!solid(i, j + 1)) quad(at(u0, v1, -half), at(u0, v1, half), at(u1, v1, half), at(u1, v1, -half));
    if (!solid(i - 1, j)) quad(at(u0, v0, -half), at(u0, v0, half), at(u0, v1, half), at(u0, v1, -half));
    if (!solid(i + 1, j)) quad(at(u1, v0, -half), at(u1, v1, -half), at(u1, v1, half), at(u1, v0, half));
  }
  return out;
}
