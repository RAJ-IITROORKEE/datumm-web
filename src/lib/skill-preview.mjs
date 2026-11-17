// The only place that knows the shape of POST admin/skills/preview (assumed from packet A4b
// section 5; align here when the backend lands). Send only the six stored skill fields.
import { MODES } from './admin-config.mjs';

export const PREVIEW_PATH = 'admin/skills/preview';
const KEYS = ['id', 'name', 'description', 'instructions', 'modes', 'enabled'];
const ID = /^[a-z0-9-]{1,40}$/;

/** Request body, or null when the backend would refuse it (empty or long prompt, bad mode). */
export function previewBody({ prompt, mode, skills }) {
  const text = String(prompt ?? '').trim();
  if (!text || text.length > 2000 || !MODES.includes(mode) || skills.length > 30) return null;
  const pick = s => Object.fromEntries(KEYS.map(k => [k, s[k]]));
  return { prompt: text, mode, skills: skills.map(pick) };
}

/** `{ listed, attached }` of skill ids, or null when `listed` is not an array. */
export function parsePreview(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.listed)) return null;
  const id = value => (typeof value === 'string' && ID.test(value) ? value : null);
  return { listed: raw.listed.map(id).filter(Boolean), attached: id(raw.attached) };
}
