export type CanvasShortcutAction =
  | 'select' | 'pan' | 'measure' | 'comment' | 'fit' | 'view2d' | 'view3d' | 'help' | 'closeHelp';
export type CanvasShortcut = { key: string; keys: string; action: CanvasShortcutAction; label: string };
export type CanvasShortcutEvent = {
  key: string; ctrlKey?: boolean; metaKey?: boolean; altKey?: boolean; isComposing?: boolean; repeat?: boolean;
  target?: unknown;
};
export const CANVAS_SHORTCUTS: readonly CanvasShortcut[];
export const CANVAS_NAVIGATION_HELP: string;
export function canvasShortcutAction(event: CanvasShortcutEvent): CanvasShortcutAction | null;
export function canvasShortcutTip(action: CanvasShortcutAction): string;
