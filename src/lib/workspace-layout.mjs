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
  setRight,
  reviewScroll,
  requestFrame = requestAnimationFrame,
  doc = document,
}) {
  setStudioView('workspace');
  setWorkspacePane('chat');
  setRight(false);
  requestFrame(() => {
    reviewScroll.current?.stopScroll();
    const target = doc.querySelector(selector) ?? doc.querySelector('.conversation');
    target?.scrollIntoView({behavior: 'smooth', block: 'start'});
    target?.focus?.({preventScroll: true});
  });
}

/** Secondary destinations are explicit navigation into the work area. */
export function openWorkspaceView(view, {setStudioView,setWorkspacePane,setLeft,narrow}) {
  setStudioView(view);
  setWorkspacePane('drawing');
  if(narrow)setLeft(false);
}
