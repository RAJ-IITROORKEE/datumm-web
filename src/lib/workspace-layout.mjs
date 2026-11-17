/**
 * Pure layout rules for the Studio workspace: when the plan canvas may open and
 * how "Review" moves focus between the conversation and the plan.
 */

/**
 * A conversation alone never opens the studio; it needs plan geometry: rooms or a non-empty SVG.
 * @param {{ graph?: { rooms?: unknown[] } } | null | undefined} activeDrawing
 * @param {unknown} previewSvg
 */
export const isRenderablePlan = (activeDrawing, previewSvg) =>
  Boolean(activeDrawing?.graph?.rooms?.length) || (typeof previewSvg === 'string' && previewSvg.trim() !== '');

/** Review controls always lead to the stable chat and its exact approval card. */
export function reviewFocus(selector, {
  setStudioView,
  setWorkspacePane,
  closeProperties,
  reviewScroll,
  requestFrame = requestAnimationFrame,
  doc = document,
}) {
  setStudioView('workspace');
  setWorkspacePane('chat');
  closeProperties();
  requestFrame(() => {
    reviewScroll.current?.stopScroll();
    const target = doc.querySelector(selector) ?? doc.querySelector('.conversation');
    target?.scrollIntoView({behavior: 'smooth', block: 'start'});
    target?.focus?.({preventScroll: true});
  });
}

export const DEFAULT_WORKSPACE_LAYOUT = {version: 2, navigationWidth: 224, chatWidth: 380};
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Legacy right was the chat column, never a fourth inspector column. */
export function readWorkspaceLayout(storage) {
  try {
    const saved = JSON.parse(storage.getItem('datumm-workspace-layout-v2') ?? 'null');
    if (saved?.version === 2 && Number.isFinite(saved.navigationWidth) && Number.isFinite(saved.chatWidth)) {
      // Old records cannot distinguish a factory width from a custom choice at that same width.
      const formerDefault = (saved.navigationDefaultRevision ?? 0) < 2 &&
        (saved.navigationWidth === 248 || (!saved.navigationDefaultRevision && saved.navigationWidth === 272));
      const navigationWidth = formerDefault ? DEFAULT_WORKSPACE_LAYOUT.navigationWidth : saved.navigationWidth;
      return {version: 2, navigationWidth: clamp(navigationWidth, 220, 360), chatWidth: clamp(saved.chatWidth, 320, 620)};
    }
    const legacy = JSON.parse(storage.getItem('datumm-panel-widths') ?? 'null');
    if (legacy && Number.isFinite(legacy.left) && Number.isFinite(legacy.right)) {
      return {version: 2, navigationWidth: clamp(legacy.left === 242 ? DEFAULT_WORKSPACE_LAYOUT.navigationWidth : legacy.left, 220, 360), chatWidth: clamp(legacy.right === 316 ? 380 : legacy.right, 320, 620)};
    }
  } catch {}
  return {...DEFAULT_WORKSPACE_LAYOUT};
}

/** Mark new saves so deliberate widths survive subsequent default migrations. */
export function storedWorkspaceLayout(layout) {
  return {...layout, navigationDefaultRevision: 2};
}

/** A drag changes only its own side; the other side keeps its stored, unclamped value. */
export function resizeWorkspaceLayout(layout, side, width) {
  return side === 'left'
    ? {version: 2, navigationWidth: clamp(width, 220, 360), chatWidth: layout.chatWidth}
    : {version: 2, navigationWidth: layout.navigationWidth, chatWidth: clamp(width, 320, 620)};
}

/** Viewport clamping is presentation only; it never writes stored preferences. */
export function effectiveWorkspaceLayout(layout, viewportWidth, navigationOpen = true) {
  const navigationWidth = navigationOpen ? clamp(layout.navigationWidth, 220, 360) : 52;
  const navigationTotalWidth = navigationWidth;
  const remaining = viewportWidth - navigationTotalWidth - 16;
  const split = viewportWidth >= 1180 && remaining >= 640;
  const chatMaxWidth = split ? Math.min(620, Math.floor(remaining / 2)) : 620;
  return {navigationWidth, navigationTotalWidth, chatWidth: clamp(layout.chatWidth, 320, chatMaxWidth), chatMaxWidth, split};
}

export function workspaceScene(taskId, snapshotId, submitting) {
  return taskId ? snapshotId === taskId ? 'task' : 'task-loading' : submitting ? 'submitting' : 'home';
}

/** Secondary destinations are explicit navigation into the work area. */
export function openWorkspaceView(view, {setStudioView,setWorkspacePane,setLeft,narrow}) {
  setStudioView(view);
  setWorkspacePane('drawing');
  if(narrow)setLeft(false);
}
