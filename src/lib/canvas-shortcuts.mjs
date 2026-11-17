// Single-key shortcuts for the drawing canvas. Pure: the component decides where focus must be.
export const CANVAS_SHORTCUTS = [
  { key: 'v', keys: 'V', action: 'select', label: 'Select' },
  { key: 'h', keys: 'H', action: 'pan', label: 'Pan' },
  { key: 'm', keys: 'M', action: 'measure', label: 'Measure' },
  { key: 'c', keys: 'C', action: 'comment', label: 'Comment' },
  { key: 'f', keys: 'F', action: 'fit', label: 'Fit to view' },
  { key: '2', keys: '2', action: 'view2d', label: '2D view' },
  { key: '3', keys: '3', action: 'view3d', label: '3D view' },
  { key: '?', keys: '?', action: 'help', label: 'Keyboard shortcuts' },
  { key: 'escape', keys: 'Esc', action: 'closeHelp', label: 'Close this list' },
];

/** Shown in the help list and read out as the drawing's description. */
export const CANVAS_NAVIGATION_HELP = 'Drag with Pan or the middle mouse button. The wheel zooms; touch pans or pinches. With the drawing focused, arrow keys pan, + and - zoom, and 0 fits.';

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isEditable(target) {
  if (!target) return false;
  if (EDITABLE_TAGS.has(String(target.tagName).toUpperCase()) || target.isContentEditable) return true;
  return Boolean(target.closest?.('[contenteditable]:not([contenteditable="false"])'));
}

/** Returns the action name for a keydown event, or null when the key must be left alone. */
export function canvasShortcutAction(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return null;
  if (isEditable(event.target) || typeof event.key !== 'string') return null;
  const key = event.key.toLowerCase();
  return CANVAS_SHORTCUTS.find((row) => row.key === key)?.action ?? null;
}

/** Tooltip text such as "Select · V". */
export function canvasShortcutTip(action) {
  const row = CANVAS_SHORTCUTS.find((item) => item.action === action);
  return row ? `${row.label} · ${row.keys}` : '';
}
