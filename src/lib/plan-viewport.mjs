export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const fitViewport = () => ({ zoom: 1, x: 0, y: 0 });
/** SVG's default meet fitting, in viewport pixels before zoom. */
export function fitContentSize(size, bounds) {
 const width = Math.max(0, size.width || 0), height = Math.max(0, size.height || 0);
 const scale = bounds[2] > 0 && bounds[3] > 0 ? Math.min(width / bounds[2], height / bounds[3]) : 0;
 return { width, height, contentWidth: Math.max(0, bounds[2] * scale || 0), contentHeight: Math.max(0, bounds[3] * scale || 0) };
}
/** Retain a positive area of fitted content inside the viewport on each axis. */
export function boundViewport(view, size) {
 const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : 1, MIN_ZOOM, MAX_ZOOM);
 const width = Math.max(0, size.width || 0), height = Math.max(0, size.height || 0);
 const contentWidth = Math.max(0, size.contentWidth ?? width) * zoom, contentHeight = Math.max(0, size.contentHeight ?? height) * zoom;
 const marginX = Math.min(32, width / 2, contentWidth / 2), marginY = Math.min(32, height / 2, contentHeight / 2);
 const limitX = width && contentWidth ? (width + contentWidth) / 2 - marginX : 0, limitY = height && contentHeight ? (height + contentHeight) / 2 - marginY : 0;
 return { zoom, x: clamp(Number.isFinite(view.x) ? view.x : 0, -limitX, limitX), y: clamp(Number.isFinite(view.y) ? view.y : 0, -limitY, limitY) };
}
export function panViewport(view, dx, dy, size) { return boundViewport({ ...view, x: view.x + dx, y: view.y + dy }, size); }
/** point is measured from the viewport's top-left. */
export function zoomViewport(view, requested, point, size) {
 const zoom = clamp(requested, MIN_ZOOM, MAX_ZOOM);
 const ratio = zoom / view.zoom, px = point.x - size.width / 2, py = point.y - size.height / 2;
 return boundViewport({ zoom, x: px - (px - view.x) * ratio, y: py - (py - view.y) * ratio }, size);
}
export function worldToScreen(point, view, size) { return { x: size.width / 2 + view.x + point.x * view.zoom, y: size.height / 2 + view.y + point.y * view.zoom }; }
export function screenToWorld(point, view, size) { return { x: (point.x - size.width / 2 - view.x) / view.zoom, y: (point.y - size.height / 2 - view.y) / view.zoom }; }
