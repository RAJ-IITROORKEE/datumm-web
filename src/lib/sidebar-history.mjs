/**
 * Pure list rules for the Studio sidebar history (chats pinned, grouped under a
 * desktop project, or recent).
 */

/**
 * @template {{ projectId?: string; pinned_at?: unknown }} T
 * @param {T} item
 * @param {{ id: string } | undefined} defaultProject
 * @param {Set<string>} [knownProjectIds]
 */
export const isNormalChat = (item, defaultProject, knownProjectIds) =>
  !item.projectId || item.projectId === defaultProject?.id || Boolean(knownProjectIds) && !knownProjectIds.has(item.projectId);

/**
 * @template {{ projectId?: string; pinned_at?: unknown }} T
 * @param {T[]} chats
 */
export const pinnedChats = (chats) => uniqueChats(chats).filter((item) => item.pinned_at);

/**
 * Recent chats. Pass `desktopAvailable` true whenever project groups are shown
 * (desktop, or hosted accounts whose backend lists projects); otherwise every
 * unpinned chat is listed here.
 * @template {{ projectId?: string; pinned_at?: unknown }} T
 * @param {T[]} chats
 * @param {boolean} desktopAvailable
 * @param {{ id: string } | undefined} defaultProject
 * @param {Set<string>} [knownProjectIds] chats of unlisted projects stay visible here
 */
export const recentChats = (chats, desktopAvailable, defaultProject, knownProjectIds) =>
  uniqueChats(chats).filter((item) => !item.pinned_at && (!desktopAvailable || isNormalChat(item, defaultProject, knownProjectIds)));

/** @template T @param {T[]} chats @returns {T[]} */
export function uniqueChats(chats) {
  const seen = new Set();
  return chats.filter((item) => {
    const id = /** @type {{id?: string}} */ (item).id;
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Search is local to the loaded history, including chats in collapsed projects.
 * @template {{id: string, title: string, projectId?: string}} T
 * @param {T[]} chats
 * @param {{id: string, title: string, archived_at?: unknown, isDefault?: boolean}[]} projects
 * @param {string} query
 * @returns {T[]}
 */
export function filterSidebarChats(chats, projects, query) {
  const term = query.trim().toLocaleLowerCase();
  const titles = new Map(projects.map(project => [project.id, project.title]));
  return uniqueChats(chats).filter(item => !term || item.title.toLocaleLowerCase().includes(term) ||
    (titles.get(item.projectId ?? '') ?? '').toLocaleLowerCase().includes(term));
}

/**
 * @param {{id: string, title: string, projectId?: string}[]} chats
 * @param {{id: string, title: string, archived_at?: unknown, isDefault?: boolean}[]} projects
 * @param {{id: string, title: string, disabled?: boolean}[]} navigation
 * @param {string} query
 */
export function sidebarSearchResults(chats, projects, navigation, query) {
  const term = query.trim().toLocaleLowerCase();
  const titles = new Map(projects.map(project => [project.id, project.title]));
  return [
    ...filterSidebarChats(chats, projects, query).map(item => ({kind: 'chat', id: item.id, title: item.title,
      detail: titles.get(item.projectId ?? '') ?? 'Chat'})),
    ...projects.filter(project => !project.archived_at && !project.isDefault && (!term || project.title.toLocaleLowerCase().includes(term)))
      .map(project => ({kind: 'project', id: project.id, title: project.title, detail: 'New chat in project'})),
    ...navigation.filter(item => !item.disabled && (!term || item.title.toLocaleLowerCase().includes(term)))
      .map(item => ({kind: 'navigation', id: item.id, title: item.title, detail: 'Navigation'})),
  ];
}

/** @param {number} index @param {number} count @param {string} key */
export function nextSearchIndex(index, count, key) {
  if (!count) return -1;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;
  if (key === 'ArrowDown') return (index + 1 + count) % count;
  if (key === 'ArrowUp') return index < 0 ? count - 1 : (index - 1 + count) % count;
  return index >= 0 && index < count ? index : 0;
}

/**
 * @param {{key: string, ctrlKey?: boolean, metaKey?: boolean, altKey?: boolean, defaultPrevented?: boolean, isComposing?: boolean, keyCode?: number}} event
 * @param {boolean} editing
 * @param {boolean} higherDialog
 */
export const isSidebarSearchShortcut = (event, editing, higherDialog) =>
  !editing && !higherDialog && !event.defaultPrevented && !event.isComposing && event.keyCode !== 229 &&
  !event.altKey && Boolean(event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k';

/**
 * Date groups by creation time (not activity), so rows never jump while a chat runs.
 * Input order is kept inside each group; empty groups are omitted.
 * @template {{created_at?: unknown}} T
 * @param {T[]} chats
 * @param {Date} [now]
 * @returns {{label: string, items: T[]}[]}
 */
export function groupChatsByDate(chats, now = new Date()) {
  const [y, m, d] = [now.getFullYear(), now.getMonth(), now.getDate()];
  // Calendar arithmetic, not 24 h steps, so 23- and 25-hour DST days still start at midnight.
  const [today, yesterday, week] = [0, 1, 7].map(back => new Date(y, m, d - back).getTime());
  const labels = ['Today', 'Yesterday', 'Previous 7 days', 'Older'];
  const groups = labels.map(label => ({label, items: /** @type {T[]} */ ([])}));
  for (const chat of chats) {
    const time = typeof chat.created_at === 'string' ? Date.parse(chat.created_at) : NaN;
    const index = Number.isNaN(time) ? 3
      : time >= today ? 0 : time >= yesterday ? 1 : time >= week ? 2 : 3;
    groups[index].items.push(chat);
  }
  return groups.filter(group => group.items.length);
}

/**
 * A Revit operation whose result the user still has to check. Mirrors the receipt and
 * outcome branches of workflowState (src/lib/workflow-state.ts) from data, not label text.
 * @param {{data?: Record<string, any>, modelOutcome?: {state?: string}}} task
 */
export function needsRevitCheck(task) {
  const build = task.data?.native_build;
  if (!build) return task.modelOutcome?.state === 'unknown';
  if (!build.operationId) return false;
  return ['failed', 'rolled_back'].includes(build.state) ||
    ['stale', 'partial', 'committed', 'unknown'].includes(build.outcomeReceipt?.status) ||
    !build.feedback?.verified;
}

/**
 * The one text-chip rule. `flow` is workflowState(task); the caller passes it so this
 * module stays free of UI-side imports.
 * @param {{status: string, data?: Record<string, any>, modelOutcome?: {state?: string}}} task
 * @param {{kind: string}} flow
 * @param {boolean} pendingQuestion
 * @returns {'Working' | 'Needs attention' | null}
 */
export function chatChip(task, flow, pendingQuestion) {
  if (['queued', 'running'].includes(task.status) && flow.kind === 'in_progress') return 'Working';
  if (pendingQuestion || ['failed', 'interrupted'].includes(task.status) || needsRevitCheck(task)) {
    return 'Needs attention';
  }
  return null;
}
