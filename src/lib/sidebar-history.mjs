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
