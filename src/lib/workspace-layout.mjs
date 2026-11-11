/**
 * Pure layout rules for the Studio workspace: when the plan canvas may open and
 * how "Review" moves focus between the conversation and the plan.
 */

/**
 * A conversation alone never opens the studio; it needs plan geometry.
 * @param {unknown} activeDrawing
 * @param {unknown} previewSvg
 */
export const isRenderablePlan = (activeDrawing, previewSvg) => Boolean(activeDrawing || previewSvg);

/**
 * Focus the sole conversation before a plan exists, otherwise the plan target.
 * @param {string} selector
 * @param {{
 *   hasRenderablePlan: boolean;
 *   setStudioView: (view: 'workspace') => void;
 *   setRight: (open: boolean) => void;
 *   setTab: (tab: 'assistant' | 'preview') => void;
 *   reviewScroll: { current: { stopScroll: () => void } | null };
 *   requestFrame?: (callback: () => void) => unknown;
 *   doc?: { querySelector: (selector: string) => { scrollIntoView: (options: object) => void } | null };
 * }} env
 */
export function reviewFocus(
  selector,
  {
    hasRenderablePlan,
    setStudioView,
    setRight,
    setTab,
    reviewScroll,
    requestFrame = requestAnimationFrame,
    doc = document,
  },
) {
  setStudioView('workspace');
  if (hasRenderablePlan) {
    setRight(true);
    setTab('assistant');
  } else {
    setRight(false);
    setTab('preview');
  }
  requestFrame(() => {
    reviewScroll.current?.stopScroll();
    doc
      .querySelector(hasRenderablePlan ? selector : '.conversation')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
