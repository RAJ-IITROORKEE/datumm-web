// Revision package (`datumm.revision-package.v1`): the lineage of one plan, from its first
// generated version to the one on screen. The payload is untrusted backend data, so anything
// unfamiliar is rejected with null rather than guessed at.
import { checksLine, parseFindings } from './plan-checks.mjs';

const MAX_VERSIONS = 50;
const ID = /^[a-zA-Z0-9-]{1,64}$/;
const isObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isVersion = (value) => Number.isInteger(value) && value >= 1;
const isAbsent = (value) => value === null || value === undefined;
const textList = (value) => {
  if (value === undefined) return [];
  return Array.isArray(value) && value.every(isText) ? value : null;
};
const one = (value) => (typeof value === 'string' ? value : null);

/** Reads the page query (`task`, `plan`, `version`); null unless plan and version are valid. */
export function packageRequest(params) {
  const plan = one(params?.plan), version = one(params?.version), task = one(params?.task);
  if (!plan || !ID.test(plan) || !version || !/^[1-9][0-9]{0,5}$/.test(version)) return null;
  return { planId: plan, version: Number(version), taskId: task && ID.test(task) ? task : null };
}

function parseRoomChange(row) {
  const valid = isObject(row) && isText(row.key)
    && Array.isArray(row.fields) && row.fields.every(isText);
  return valid ? { key: row.key, fields: row.fields } : null;
}

function parseEdit(raw) {
  if (isAbsent(raw)) return null;
  const changes = isObject(raw) ? raw.changes : null;
  if (!isObject(changes) || !Array.isArray(changes.rooms ?? [])) return null;
  const walls = textList(changes.walls), openings = textList(changes.openings);
  const rooms = (changes.rooms ?? []).map(parseRoomChange);
  // The server's own wording of the edit; older versions have none and fall back to counts.
  const summary = isText(raw.summary) && raw.summary.length <= 300 ? raw.summary : '';
  return walls && openings && !rooms.includes(null) ? { rooms, walls, openings, summary } : null;
}

const validCounts = (counts) => counts === undefined
  || (isObject(counts) && Number.isInteger(counts.from) && Number.isInteger(counts.to));

function parseRoomDiff(row) {
  if (!isObject(row) || !isText(row.key)) return null;
  const kindChanged = isObject(row.from) && isObject(row.to) && row.from.kind !== row.to.kind;
  return { key: row.key, kindChanged };
}

/** Returns the diff, null when absent, or false when the shape is unknown. */
function parseDiff(raw) {
  if (isAbsent(raw)) return null;
  if (!isObject(raw)) return false;
  const added = textList(raw.addedRooms), removed = textList(raw.removedRooms);
  if (!added || !removed || !Array.isArray(raw.changedRooms ?? [])) return false;
  if (!validCounts(raw.openingCounts)) return false;
  const changed = (raw.changedRooms ?? []).map(parseRoomDiff);
  if (changed.includes(null)) return false;
  const counts = raw.openingCounts;
  return {
    addedRooms: added, removedRooms: removed, changedRooms: changed,
    siteChanged: raw.siteChanged === true,
    openingCounts: counts ? { from: counts.from, to: counts.to } : null,
  };
}

function parseVersion(raw) {
  if (!isObject(raw) || !isVersion(raw.version) || !isText(raw.fingerprint)) return null;
  if (!isAbsent(raw.parentVersion) && !isVersion(raw.parentVersion)) return null;
  const assumptions = textList(raw.assumptions), edit = parseEdit(raw.edit);
  const diff = parseDiff(raw.diff);
  if (!assumptions || diff === false || (!isAbsent(raw.edit) && !edit)) return null;
  return {
    version: raw.version, parentVersion: raw.parentVersion ?? null, fingerprint: raw.fingerprint,
    createdAt: isText(raw.createdAt) ? raw.createdAt : '', findings: parseFindings(raw.findings),
    assumptions, edit, diff,
  };
}

/** `{planId, version, versions}` ascending, root first and the requested version last; or null. */
export function parsePackage(raw) {
  if (!isObject(raw) || raw.schema !== 'datumm.revision-package.v1') return null;
  if (!isText(raw.planId) || !isVersion(raw.version) || !Array.isArray(raw.versions)) return null;
  if (raw.versions.length === 0 || raw.versions.length > MAX_VERSIONS) return null;
  const versions = raw.versions.map(parseVersion);
  if (versions.includes(null)) return null;
  const linked = versions.every((row, index) => (
    index === 0 ? row.parentVersion === null : row.parentVersion === versions[index - 1].version));
  if (!linked || versions.at(-1).version !== raw.version) return null;
  return { planId: raw.planId, version: raw.version, versions };
}

const FIELD_VERBS = { name: 'renamed', rect: 'resized', boundary: 'resized', area: 'resized' };
const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;
const roomVerb = (fields) => {
  const known = [...new Set(fields.map((field) => FIELD_VERBS[field]).filter(Boolean))];
  return known.length ? known.join(' and ') : 'changed';
};
const roomName = (graph, key) =>
  (graph?.rooms ?? []).find((room) => room.key === key)?.name ?? 'A room';
const openingNoun = (graph, key) => {
  const kind = (graph?.openings ?? []).find((opening) => opening.key === key)?.kind;
  return kind === 'door' || kind === 'window' ? kind : 'opening';
};

function editParts(edit, graph) {
  const counts = new Map();
  for (const key of edit.openings) {
    const noun = openingNoun(graph, key);
    counts.set(noun, (counts.get(noun) ?? 0) + 1);
  }
  return [
    ...edit.rooms.map((row) => `${roomName(graph, row.key)} ${roomVerb(row.fields)}`),
    ...(edit.walls.length ? [`${plural(edit.walls.length, 'wall')} adjusted`] : []),
    ...[...counts].map(([noun, count]) => `${plural(count, noun)} changed`),
  ];
}

function diffParts(diff, graph, parentGraph) {
  const counts = diff.openingCounts;
  return [
    ...diff.addedRooms.map((key) => `${roomName(graph, key)} added`),
    ...diff.removedRooms.map((key) => `${roomName(parentGraph, key)} removed`),
    ...diff.changedRooms.map((row) => (
      `${roomName(graph, row.key)} ${row.kindChanged ? 'changed use' : 'resized'}`)),
    ...(diff.siteChanged ? ['site outline changed'] : []),
    ...(counts && counts.from !== counts.to
      ? [`openings changed from ${counts.from} to ${counts.to}`] : []),
  ];
}

/**
 * One plain line per version: "Version 2: Bedroom 2 resized; 1 door changed".
 * `graphs` maps a version number to that version's graph, for room names; it is optional.
 */
export function changeLog(pkg, graphs = {}) {
  return pkg.versions.map((row) => {
    const line = (text) => ({ version: row.version, text: `Version ${row.version}: ${text}` });
    if (row.parentVersion === null) return line('first generated');
    if (row.edit?.summary) return line(row.edit.summary);
    const fromEdit = row.edit ? editParts(row.edit, graphs[row.version]) : [];
    const parts = fromEdit.length || !row.diff
      ? fromEdit : diffParts(row.diff, graphs[row.version], graphs[row.parentVersion]);
    const none = row.edit || row.diff ? 'no layout changes recorded' : 'changes not recorded';
    return line(parts.length ? parts.join('; ') : none);
  });
}

/** Status line plus each problem and advice note in words; null when the version has no checks. */
export function summariseChecks(version) {
  const report = version?.findings;
  if (!report) return null;
  const messages = (severity) => (
    report.findings.filter((row) => row.severity === severity).map((row) => row.message));
  return {
    status: report.status, line: checksLine(report),
    problems: messages('blocking'), advice: messages('advisory'),
  };
}

/** "18 November 2026", or '' when the stamp is missing or unreadable. */
export function savedOn(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Room and opening names per version for `changeLog`. Only the first and last versions are fetched,
 * so versions in between borrow names from both ends (the last version's names win).
 */
export function graphsByVersion(pkg, first, last) {
  const both = {
    rooms: [...(last?.rooms ?? []), ...(first?.rooms ?? [])],
    openings: [...(last?.openings ?? []), ...(first?.openings ?? [])],
  };
  const ends = { [pkg.versions[0].version]: first, [pkg.version]: last };
  return Object.fromEntries(pkg.versions.map((row) => [row.version, ends[row.version] ?? both]));
}

/**
 * The run's design assumptions (only when that run produced this plan) followed by the plan's
 * own, without repeats: the same list the Review screen shows and Accept records.
 */
export function packageAssumptions(task, pkg) {
  const own = pkg.versions[pkg.versions.length - 1].assumptions;
  const design = isObject(task) && isObject(task.data) ? task.data.agent_design : null;
  const ours = isObject(design) && Array.isArray(design.candidates)
    && design.candidates.some((row) => isObject(row) && row.planId === pkg.planId);
  const run = ours ? textList(design.assumptions) ?? [] : [];
  return [...new Set([...run, ...own])];
}

/** True or false once the task is readable; null when not, so the page leaves the line out. */
export function isAccepted(task, plan) {
  if (!isObject(task)) return null;
  const accepted = isObject(task.acceptance) ? task.acceptance.plan : null;
  return isObject(accepted) && accepted.planId === plan.planId
    && accepted.version === plan.version && accepted.fingerprint === plan.fingerprint;
}
