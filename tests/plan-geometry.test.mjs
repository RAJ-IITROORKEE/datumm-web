import assert from 'node:assert/strict';
import test from 'node:test';
import { dimensionChain, formatLength, pointInRoom, roomCentre, wallLength, wallPath, wallPoint } from '../src/lib/plan-geometry.mjs';

const rooms = [
  { rect: [0, 3000, 4000, 6000] },
  { rect: [4000, 3000, 9000, 6000] },
  { rect: [0, 0, 9000, 3000] },
];

test('dimension chains follow the rooms on the top and left edges', () => {
  assert.deepEqual(dimensionChain(rooms, 'x'), [0, 4000, 9000]);
  assert.deepEqual(dimensionChain(rooms, 'y'), [0, 3000, 6000]);
  assert.deepEqual(dimensionChain([rooms[2]], 'x'), [], 'a single span only repeats the overall dimension');
});

test('measure label shows millimetres and metres', () => {
  assert.equal(formatLength(3450.4), '3,450 mm · 3.45 m');
});

test('polygon rooms use their boundary for hit tests and tags', () => {
  const room = { rect: [0, 0, 4000, 4000], boundary: [[0, 0], [4000, 0], [0, 4000]] };
  assert.equal(pointInRoom(room, 1000, 1000), true);
  assert.equal(pointInRoom(room, 3500, 3500), false);
  const [x, y] = roomCentre(room);
  assert.ok(Math.abs(x - 4000 / 3) < 1e-6 && Math.abs(y - 4000 / 3) < 1e-6);
});

test('arc walls measure and sample along the arc', () => {
  const wall = { start: [2000, 0], end: [-2000, 0], curve: { kind: 'arc', mid: [0, 2000] } };
  assert.ok(Math.abs(wallLength(wall) - Math.PI * 2000) < 1e-6);
  const [x, y] = wallPoint(wall, Math.PI * 1000);
  assert.ok(Math.abs(x) < 1e-6 && Math.abs(y - 2000) < 1e-6);
  assert.match(wallPath(wall, 0), /^M 2000 0 A 2000 2000 0 0 0 -2000 /);
  assert.equal(wallPath({ start: [0, 0], end: [1000, 0] }, 500), 'M 0 500 L 1000 500');
});
