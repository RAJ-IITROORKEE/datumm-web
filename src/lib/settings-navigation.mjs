/**
 * @param {boolean} settingsOpen
 * @param {boolean} desktopLayout
 * @param {boolean} left
 * @param {boolean | null} previousLeft
 * @returns {{ left: boolean; previousLeft: boolean | null }}
 */
export function settingsSidebarTransition(settingsOpen, desktopLayout, left, previousLeft) {
  if (settingsOpen && desktopLayout) {
    return previousLeft === null ? { left: false, previousLeft: left } : { left, previousLeft };
  }
  return previousLeft === null ? { left, previousLeft } : { left: previousLeft, previousLeft: null };
}
