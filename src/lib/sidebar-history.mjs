/**
 * Pure list rules for the Studio sidebar history (chats pinned, grouped under a
 * desktop project, or recent).
 */

/**
 * @template {{ projectId?: string; pinned_at?: unknown }} T
 * @param {T} item
 * @param {{ id: string } | undefined} defaultProject
 */
export const isNormalChat = (item, defaultProject) => !item.projectId || item.projectId === defaultProject?.id;

/**
 * @template {{ projectId?: string; pinned_at?: unknown }} T
 * @param {T[]} chats
 */
export const pinnedChats = (chats) => chats.filter((item) => item.pinned_at);

/**
 * Recent chats. Only the desktop app groups project chats separately, so hosted
 * browsers list every unpinned chat here.
 * @template {{ projectId?: string; pinned_at?: unknown }} T
 * @param {T[]} chats
 * @param {boolean} desktopAvailable
 * @param {{ id: string } | undefined} defaultProject
 */
export const recentChats = (chats, desktopAvailable, defaultProject) =>
  chats.filter((item) => !item.pinned_at && (!desktopAvailable || isNormalChat(item, defaultProject)));
