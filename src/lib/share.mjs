/** Pure helpers for chat sharing: link, token and public-page payload checks. */
export const shareUrl = (origin, token) => `${origin}/share/${encodeURIComponent(token)}`;
export const validToken = (token) => typeof token === 'string' && /^[A-Za-z0-9_-]{8,128}$/.test(token);
/** `GET tasks/{id}/share` body to the active token, or null. */
export const shareToken = (body) => (validToken(body?.token) ? body.token : null);
/** SVG as an image source: shown through <img>, never injected as markup. */
export const svgDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const text = (value) => (typeof value === 'string' ? value : '');
const list = (value, row) => (Array.isArray(value) ? value.map(row).filter(Boolean) : []);
const link = (url) => { try { return ['https:', 'http:'].includes(new URL(url).protocol) ? url : ''; } catch { return ''; } };

/** Defensive shape for the public `GET /v2/shared/{token}` payload; null when unusable. */
export function sharedView(body) {
  if (!body || typeof body !== 'object') return null;
  return {
    title: text(body.title).trim() || 'Shared chat',
    createdAt: text(body.createdAt),
    messages: list(body.messages, (m) => (m && text(m.text) ? { role: m.role === 'user' ? 'user' : 'assistant', text: text(m.text), at: text(m.at) } : null)),
    steps: list(body.steps, (s) => (s && text(s.title) ? { title: text(s.title), status: text(s.status) } : null)),
    sources: list(body.sources, (s) => (s && link(s.url) ? { title: text(s.title) || s.url, url: s.url } : null)),
    svg: typeof body.plan?.svg === 'string' && /^\s*(?:<\?xml[^>]*>\s*)?<svg\b/i.test(body.plan.svg) ? body.plan.svg : null,
  };
}
