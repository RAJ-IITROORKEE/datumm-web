// Plan check findings (datumm.findings.v1): validate, group and word them for architects.
// The report is untrusted backend data, so anything unfamiliar is rejected rather than guessed at.

export const CATEGORY_ORDER = ['geometry', 'brief', 'circulation', 'openings', 'code'];
const CATEGORY_LABELS = { geometry: 'Geometry', brief: 'Brief', circulation: 'Circulation', openings: 'Openings', code: 'Code' };
const SEVERITIES = ['blocking', 'advisory'];
const STATUSES = ['pass', 'warn', 'fail'];

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const optionalText = (value) => (isText(value) ? value : '');
const keyList = (value) => (value === undefined ? [] : Array.isArray(value) && value.every(isText) ? value : null);
const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

function parseFinding(raw) {
  if (!isPlainObject(raw) || !isText(raw.code) || !isText(raw.message)) return null;
  if (!CATEGORY_ORDER.includes(raw.category) || !SEVERITIES.includes(raw.severity)) return null;
  const refs = raw.refs === undefined ? {} : raw.refs;
  if (!isPlainObject(refs)) return null;
  const rooms = keyList(refs.rooms), walls = keyList(refs.walls), openings = keyList(refs.openings);
  if (!rooms || !walls || !openings) return null;
  return {
    code: raw.code, category: raw.category, severity: raw.severity, message: raw.message,
    why: optionalText(raw.why), fix: optionalText(raw.fix), expected: optionalText(raw.expected), actual: optionalText(raw.actual),
    refs: { rooms, walls, openings },
  };
}

/** Returns `{ruleSet, status, blocking, advisory, findings}` or null for any shape we do not know. */
export function parseFindings(raw) {
  if (!isPlainObject(raw) || raw.schema !== 'datumm.findings.v1' || !isText(raw.ruleSet) || !STATUSES.includes(raw.status) || !Array.isArray(raw.findings)) return null;
  const findings = raw.findings.map(parseFinding);
  if (findings.some((row) => row === null)) return null;
  const blocking = findings.filter((row) => row.severity === 'blocking').length;
  return { ruleSet: raw.ruleSet, status: raw.status, blocking, advisory: findings.length - blocking, findings };
}

/** Groups in the fixed category order, empty groups dropped, blocking findings first inside a group. */
export function groupFindings(findings) {
  return CATEGORY_ORDER.map((category) => ({
    category, label: CATEGORY_LABELS[category],
    findings: findings.filter((row) => row.category === category).sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'blocking' ? -1 : 1)),
  })).filter((group) => group.findings.length > 0);
}

export function statusLabel(status) {
  return status === 'pass' ? 'No problems found' : status === 'warn' ? 'Needs attention' : status === 'fail' ? 'Problems to fix' : 'Not checked';
}

/** One flat key list: plan views match room, wall and opening keys in the same `highlights` array. */
export function refsToHighlights(finding) {
  const { rooms = [], walls = [], openings = [] } = finding?.refs ?? {};
  return [...new Set([...rooms, ...walls, ...openings])];
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`;

/** "Living, Kitchen · 1 wall": room names when known, counts for the rest; never raw ids. */
export function refsSummary(finding, roomNames = {}) {
  const { rooms = [], walls = [], openings = [] } = finding?.refs ?? {};
  const named = rooms.map((key) => roomNames[key]).filter(Boolean), unnamed = rooms.length - named.length;
  return [named.join(', '), unnamed > 0 ? plural(unnamed, 'room') : '', walls.length ? plural(walls.length, 'wall') : '', openings.length ? plural(openings.length, 'opening') : ''].filter(Boolean).join(' · ');
}

/** Per-alternative result the run carries beside each candidate; null when absent or malformed. */
export function parseCandidateChecks(raw) {
  if (!isPlainObject(raw) || !STATUSES.includes(raw.status)) return null;
  const count = (value) => (Number.isInteger(value) && value >= 0 ? value : 0);
  return { status: raw.status, blocking: count(raw.blocking), advisory: count(raw.advisory) };
}

/** Run-level recommendation; null when absent or malformed. */
export function parseRecommended(raw) {
  if (!isPlainObject(raw) || !isText(raw.planId) || !Number.isInteger(raw.version)) return null;
  return { planId: raw.planId, version: raw.version, reason: optionalText(raw.reason) };
}

/** Short wording for a check result, e.g. "2 problems · 1 advice note". */
export function checksLine(checks) {
  if (!checks) return '';
  if (checks.status === 'pass') return 'All checks pass';
  return [checks.blocking ? plural(checks.blocking, 'problem') : '', checks.advisory ? plural(checks.advisory, 'advice note') : ''].filter(Boolean).join(' · ') || statusLabel(checks.status);
}

/** One row per alternative for the review card; [] when the run carries neither checks nor a recommendation. */
export function alternativeChecks(candidates, recommendedRaw) {
  const recommended = parseRecommended(recommendedRaw);
  const rows = (Array.isArray(candidates) ? candidates : []).map((candidate, index) => ({
    index, checks: parseCandidateChecks(candidate?.checks),
    recommended: Boolean(recommended && candidate?.planId === recommended.planId && candidate?.version === recommended.version),
  }));
  return rows.some((row) => row.checks || row.recommended) ? { rows, reason: recommended?.reason ?? '' } : { rows: [], reason: '' };
}
