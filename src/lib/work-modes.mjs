/**
 * Work-area modes. The stored `workAreaSection` keeps its four old values (the backend frontend
 * context and display actions still use them); this module maps them onto the two modes and the
 * Details drawer, and keeps the "Review has been opened" gate in memory only.
 */
export const WORK_MODES = ['design', 'review'];
export const DRAWER_TABS = ['activity', 'files', 'exports', 'technical'];

const SECTION_TO_TAB = { activity: 'activity', assets: 'files', exports: 'exports' };
const TAB_TO_SECTION = { activity: 'activity', files: 'assets', exports: 'exports' };

/** An old section is always the Design mode; Activity, Assets and Exports only decide the drawer tab. */
export function workStateFromSection(section) {
  return { mode: 'design', drawer: SECTION_TO_TAB[section] ?? null };
}

/** The section a drawer tab keeps in stored state; Technical has none and stays local to the drawer. */
export function sectionForDrawerTab(tab) {
  return TAB_TO_SECTION[tab] ?? null;
}

/** One key per reviewable version: the plan version, plus the exact proposal when one is waiting. */
export function reviewVersionOf({ planVersion, proposalHash } = {}) {
  return `p${Number.isInteger(planVersion) ? planVersion : 0}${proposalHash ? `:${proposalHash}` : ''}`;
}

// Memory only: a reload or a new tab starts locked again, so this can never stand in for approval.
const opened = new Set();
const listeners = new Set();
const keyOf = (taskId, version) => JSON.stringify([taskId, String(version)]);

export function reviewOpened(taskId, version) {
  return Boolean(taskId) && opened.has(keyOf(taskId, version));
}

export function markReviewOpened(taskId, version) {
  if (!taskId || opened.has(keyOf(taskId, version))) return;
  opened.add(keyOf(taskId, version));
  for (const listener of listeners) listener();
}

export function subscribeReviewOpened(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetReviewOpened() {
  opened.clear();
  for (const listener of listeners) listener();
}
