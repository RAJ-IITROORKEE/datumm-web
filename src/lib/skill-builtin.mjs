// DATUMM starter skills are code-owned: the backend sends a read-only catalog, and the admin only
// chooses the modes each one is on in (`builtinSkills`). Nothing else about them can be edited.
import { BUILTIN_PREFIX, MODES } from './admin-config.mjs';
import { HINT_MAX, TOOL_NAME } from './skill-hints.mjs';

const ID = /^datumm-[a-z0-9-]{1,32}$/;
const text = (value, max) => typeof value === 'string' && value.length >= 1 && value.length <= max;

/** Catalog entries the backend sent, minus anything malformed or repeated; never throws. */
export function parseBuiltinCatalog(raw) {
  if (!Array.isArray(raw)) return [];
  const seen = new Set();
  return raw.flatMap(item => {
    if (!item || typeof item !== 'object' || !ID.test(item.id) || seen.has(item.id)) return [];
    if (!text(item.name, 120) || typeof item.description !== 'string' || item.description.length > 300
      || !text(item.instructions, 4000)) return [];
    seen.add(item.id);
    const hints = Array.isArray(item.toolHints) ? item.toolHints : [];
    const toolHints = [...new Set(hints.filter(n => typeof n === 'string' && TOOL_NAME.test(n)))]
      .slice(0, HINT_MAX);
    return [{ id: item.id, name: item.name, description: item.description,
      instructions: item.instructions, toolHints }];
  });
}

/** Modes a starter skill is on in (none when it is not listed). */
export const builtinModes = (settings, id) => settings?.find(s => s.id === id)?.modes ?? [];

/** The settings with one mode switched; a skill with no modes left drops out of the list. */
export function toggleBuiltinMode(settings, id, mode, on) {
  const list = Array.isArray(settings) ? settings : [];
  const modes = MODES.filter(m => (m === mode ? on : builtinModes(list, id).includes(m)));
  if (!id.startsWith(BUILTIN_PREFIX)) return list;
  if (!modes.length) return list.filter(s => s.id !== id);
  const item = { id, modes };
  return list.some(s => s.id === id) ? list.map(s => (s.id === id ? item : s)) : [...list, item];
}
