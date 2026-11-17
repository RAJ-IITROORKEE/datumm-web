// Targeted plan edits (rename, swap, move a wall, change an opening): build and check the request,
// and word the outcome. Pure; the workspace sends it. The server stays the authority on geometry.
import { wallLength } from './plan-geometry.mjs';
import { parseFindings } from './plan-checks.mjs';

export const NAME_MAX = 80;
export const MOVE_MAX_MM = 5000;
export const STALE_MESSAGE = 'This plan changed elsewhere. Reload to edit the latest version';
const UNINTENDED = 'edit.unintended-change';
const UNINTENDED_MESSAGE = 'That edit would change parts of the plan you did not select, so it was not saved.';

const fail = (error) => ({ ok: false, error });
const pass = (edit) => ({ ok: true, edit });
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/** Whole millimetres from a number or an input string; NaN when it is anything else. */
export function parseMm(value) {
  if (typeof value === 'number') return Number.isSafeInteger(value) ? value : NaN;
  return typeof value === 'string' && /^[+-]?\d{1,9}$/.test(value.trim()) ? Number(value.trim()) : NaN;
}

export function renameEdit(roomKey, name, graph) {
  const room = graph?.rooms?.find((row) => row.key === roomKey);
  if (graph && !room) return fail('Choose a room on this plan.');
  const text = typeof name === 'string' ? name.trim() : '';
  if (!text) return fail('Enter a room name.');
  if (text.length > NAME_MAX) return fail(`Use ${NAME_MAX} characters or fewer.`);
  if (/[\u0000-\u001f\u007f-\u009f]/.test(text)) return fail('Use letters, numbers and punctuation only.');
  if (room && room.name === text) return fail('That is already the room name.');
  return pass({ kind: 'rename', roomKey, name: text });
}

export function swapEdit(roomA, roomB, graph) {
  if (typeof roomA !== 'string' || typeof roomB !== 'string' || !roomA || !roomB) return fail('Choose the room to swap with.');
  if (roomA === roomB) return fail('Choose a different room to swap with.');
  const rooms = [roomA, roomB].map((key) => graph?.rooms?.find((row) => row.key === key));
  if (graph && rooms.some((room) => !room)) return fail('Choose rooms on this plan.');
  if (rooms.some((room) => room?.kind === 'circulation')) return fail('Circulation rooms cannot be swapped.');
  return pass({ kind: 'swap', roomKeys: [roomA, roomB] });
}

export function moveWallEdit(wallKey, offset, graph) {
  const wall = graph?.walls?.find((row) => row.key === wallKey);
  if (graph && !wall) return fail('Choose a wall on this plan.');
  if (wall && !isMovableWall(wall)) return fail('Only straight walls between two rooms can be moved.');
  const offsetMm = parseMm(offset);
  if (!Number.isInteger(offsetMm) || offsetMm === 0) return fail('Enter a whole number of millimetres other than 0.');
  if (Math.abs(offsetMm) > MOVE_MAX_MM) return fail(`Move a wall by at most ${MOVE_MAX_MM.toLocaleString('en-US')} mm at a time.`);
  return pass({ kind: 'move-wall', wallKey, offsetMm });
}

/**
 * The planner's opening edit is nested as `{kind:'opening', opening:{kind:'update'|'delete', ...}}`.
 * It updates width and offset only: its update cannot turn a door into a window.
 */
export function openingEdit(graph, openingKey, action, fields = {}) {
  const opening = graph?.openings?.find((row) => row.key === openingKey);
  if (!opening) return fail('Choose a door or window on this plan.');
  if (action === 'delete') return pass({ kind: 'opening', opening: { kind: 'delete', openingKey } });
  if (action !== 'update') return fail('Unknown opening change.');
  const widthMm = parseMm(fields.widthMm ?? opening.widthMm), offsetMm = parseMm(fields.offsetMm ?? opening.offsetMm);
  if (!(widthMm > 0) || !(offsetMm >= 0)) return fail('Width must be above 0 and the offset 0 or more, in whole millimetres.');
  const wall = graph.walls?.find((row) => row.key === opening.wallKey);
  if (wall && offsetMm + widthMm > Math.round(wallLength(wall))) return fail('The opening would run past the end of its wall.');
  if (widthMm === opening.widthMm && offsetMm === opening.offsetMm) return fail('Change the width or the offset first.');
  return pass({ kind: 'opening', opening: { kind: 'update', openingKey, wallKey: opening.wallKey, offsetMm, widthMm, heightMm: opening.heightMm, sillMm: opening.sillMm } });
}

export const editPath = (drawing) => `variable/plans/${encodeURIComponent(drawing.planId)}/versions/${drawing.version}/edits`;
export const editBody = (drawing, edit) => ({ fingerprint: drawing.fingerprint, edit });

/** Edits apply to generated schema 3 or 4 plans only; a graph that does not say is given the benefit of the doubt. */
export const editablePlan = (graph) => (graph?.schemaVersion === undefined || [3, 4].includes(graph.schemaVersion)) && (graph?.provenance?.source === undefined || graph.provenance.source === 'deterministic');

export const isMovableWall = (wall) => Array.isArray(wall?.roomKeys) && wall.roomKeys.length === 2 && !wall.curve?.kind;
const roomName = (graph, key) => graph?.rooms?.find((row) => row.key === key)?.name ?? key;

/** The interior walls of one room, each named by the room on its other side. */
export function interiorWalls(graph, roomKey) {
  const rows = (graph?.walls ?? []).filter((wall) => isMovableWall(wall) && wall.roomKeys.includes(roomKey));
  const labels = rows.map((wall) => `With ${roomName(graph, wall.roomKeys.find((key) => key !== roomKey))}`);
  return rows.map((wall, index) => ({ key: wall.key, label: labels.filter((text) => text === labels[index]).length > 1 ? `${labels[index]} (wall ${labels.slice(0, index + 1).filter((text) => text === labels[index]).length})` : labels[index] }));
}

/** "Moves the wall between Kitchen and Dining by 300 mm." Empty when the wall is not a shared one. */
export function movePreview(graph, wallKey, offset) {
  const wall = graph?.walls?.find((row) => row.key === wallKey), mm = parseMm(offset);
  if (!isMovableWall(wall) || !Number.isInteger(mm) || mm === 0) return '';
  return `Moves the wall between ${wall.roomKeys.map((key) => roomName(graph, key)).join(' and ')} by ${mm.toLocaleString('en-US')} mm.`;
}

/** Which way a positive number moves the wall: plans are drawn with north up. */
export function moveDirectionHint(graph, wallKey) {
  const wall = graph?.walls?.find((row) => row.key === wallKey);
  if (!isMovableWall(wall)) return '';
  return wall.start[0] === wall.end[0] ? 'A positive number moves it east, a negative number west.' : 'A positive number moves it north, a negative number south.';
}

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
// Rooms arrive as {key, fields}; walls and openings as bare keys.
const unique = (rows) => [...new Set((Array.isArray(rows) ? rows : []).map((row) => (typeof row === 'string' ? row : row?.key)).filter((key) => typeof key === 'string'))];

/** "2 rooms changed: Kitchen, Dining; 1 wall moved". Names come from `graph`; unknown keys print as is. */
export function describeChanges(changes, graph) {
  if (!isObject(changes)) return '';
  const rooms = unique(changes.rooms), walls = unique(changes.walls), openings = unique(changes.openings), parts = [];
  if (rooms.length) {
    const names = rooms.map((key) => roomName(graph, key));
    parts.push(`${count(rooms.length, 'room', 'rooms')} changed: ${names.length > 4 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ')}`);
  }
  if (walls.length) parts.push(`${count(walls.length, 'wall', 'walls')} moved`);
  if (openings.length) parts.push(`${count(openings.length, 'opening', 'openings')} changed`);
  return parts.join('; ') || 'No geometry changed';
}

export function checksLine(findings) {
  const report = parseFindings(findings);
  if (!report) return 'Checks: not available';
  if (report.status === 'pass') return 'Checks: no problems';
  return report.status === 'warn' ? `Checks: ${count(report.advisory, 'item', 'items')} to review` : `Checks: ${count(report.blocking, 'blocking problem', 'blocking problems')}`;
}

/** The 200 body, or null when it does not name a newer version of the same plan. */
export function parseEditResult(raw, drawing) {
  if (!isObject(raw) || raw.planId !== drawing.planId || !Number.isSafeInteger(raw.version) || raw.version <= drawing.version) return null;
  if (typeof raw.fingerprint !== 'string' || !raw.fingerprint) return null;
  return { planId: raw.planId, version: raw.version, fingerprint: raw.fingerprint, changes: isObject(raw.changes) ? raw.changes : {}, findings: raw.findings };
}

export const acceptAgainNote = (version) => `Version ${version} needs to be accepted again.`;

export const successMessage = (result, graph) => `Saved as Version ${result.version} · ${describeChanges(result.changes, graph)} · ${checksLine(result.findings)}`;

/** A plain sentence for a refused or failed edit; the plan on screen is always unchanged. */
export function refusalMessage({ status, message, code } = {}) {
  const text = typeof message === 'string' ? message.trim() : '';
  if (status === 409) return code === 'edit.stale' || !text || text.startsWith('DATUMM could not complete') ? STALE_MESSAGE : text;
  if (status === 404) return 'Plan editing is not available for this plan right now.';
  if (status === 422) return text && !text.startsWith('DATUMM could not complete') ? text : code === UNINTENDED ? UNINTENDED_MESSAGE : 'That edit cannot be applied to this plan.';
  return 'The edit could not be saved. The plan is unchanged.';
}
