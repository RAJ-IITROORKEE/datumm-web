// Pure plan geometry for the 2D drawing: model millimetres, y up. `depth` flips y for SVG.

/** Outline of a room in model coordinates: its polygon boundary, else its rectangle. */
export function roomPoints(room) {
  if (room.boundary?.length >= 3) return room.boundary;
  const [x0, y0, x1, y1] = room.rect;
  return [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
}

const box = (room) => {
  const points = roomPoints(room), xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
};

/** Where the room tag goes: rectangle centre, or the polygon's area centroid. */
export function roomCentre(room) {
  const points = roomPoints(room);
  let area = 0, cx = 0, cy = 0;
  points.forEach(([x0, y0], i) => {
    const [x1, y1] = points[(i + 1) % points.length], cross = x0 * y1 - x1 * y0;
    area += cross; cx += (x0 + x1) * cross; cy += (y0 + y1) * cross;
  });
  if (!area) { const b = box(room); return [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2]; }
  return [cx / (3 * area), cy / (3 * area)];
}

export function pointInRoom(room, x, y) {
  const points = roomPoints(room);
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Breakpoints of the room dimension chain along one edge: the rooms that touch
 * the top edge (axis 'x') or the left edge (axis 'y'). Empty when the chain
 * would only repeat the overall dimension.
 */
export function dimensionChain(rooms, axis) {
  const boxes = rooms.map(box);
  if (!boxes.length) return [];
  const edge = axis === 'x' ? Math.max(...boxes.map((b) => b[3])) : Math.min(...boxes.map((b) => b[0]));
  const touching = boxes.filter((b) => Math.abs((axis === 'x' ? b[3] : b[0]) - edge) < 1);
  const stops = [...new Set(touching.flatMap((b) => (axis === 'x' ? [b[0], b[2]] : [b[1], b[3]])).map(Math.round))].sort((a, b) => a - b);
  return stops.length > 2 ? stops : [];
}

/** "3,450 mm · 3.45 m" */
export const formatLength = (mm) => `${Math.round(mm).toLocaleString('en-US')} mm · ${(mm / 1000).toFixed(2)} m`;

const arcOf = (wall) => {
  const mid = wall.curve?.kind === 'arc' ? wall.curve.mid : null;
  if (!mid) return null;
  const [ax, ay] = wall.start, [bx, by] = mid, [cx, cy] = wall.end;
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
  if (Math.abs(d) < 1e-9) return null;
  const ox = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
  const oy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
  const ccw = d > 0, a0 = Math.atan2(ay - oy, ax - ox);
  let sweep = Math.atan2(cy - oy, cx - ox) - a0;
  if (ccw && sweep <= 0) sweep += 2 * Math.PI;
  if (!ccw && sweep >= 0) sweep -= 2 * Math.PI;
  return { ox, oy, r: Math.hypot(ax - ox, ay - oy), a0, sweep };
};

export function wallLength(wall) {
  const arc = arcOf(wall);
  return arc ? Math.abs(arc.sweep) * arc.r : Math.hypot(wall.end[0] - wall.start[0], wall.end[1] - wall.start[1]);
}

/** Point on the wall centreline, `distance` mm from its start. */
export function wallPoint(wall, distance) {
  const arc = arcOf(wall), length = wallLength(wall) || 1, f = distance / length;
  if (arc) { const a = arc.a0 + arc.sweep * f; return [arc.ox + arc.r * Math.cos(a), arc.oy + arc.r * Math.sin(a)]; }
  return [wall.start[0] + (wall.end[0] - wall.start[0]) * f, wall.start[1] + (wall.end[1] - wall.start[1]) * f];
}

/** SVG path for the wall centreline between two distances from its start. */
export function wallPath(wall, depth, from = 0, to = wallLength(wall)) {
  const arc = arcOf(wall), [x0, y0] = wallPoint(wall, from), [x1, y1] = wallPoint(wall, to);
  if (!arc) return `M ${x0} ${depth - y0} L ${x1} ${depth - y1}`;
  const part = Math.abs(arc.sweep) * (to - from) / (wallLength(wall) || 1);
  // Counter-clockwise in model space is clockwise flag 0 once y is flipped.
  return `M ${x0} ${depth - y0} A ${arc.r} ${arc.r} 0 ${part > Math.PI ? 1 : 0} ${arc.sweep > 0 ? 0 : 1} ${x1} ${depth - y1}`;
}

/** Sheet extents and the text unit every label and offset derives from. */
export function planSheet(graph) {
  const w = graph.site.widthMm, d = graph.site.depthMm;
  const unit = Math.min(500, Math.max(140, Math.max(w, d) / 45)), pad = unit * 9;
  return { unit, pad, bounds: [-pad, -pad, w + pad * 2, d + pad * 2] };
}
