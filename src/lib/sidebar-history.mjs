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
export const pinnedChats = (chats) => chats.filter((item) => item.pinned_at);

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
  chats.filter((item) => !item.pinned_at && (!desktopAvailable || isNormalChat(item, defaultProject, knownProjectIds)));
