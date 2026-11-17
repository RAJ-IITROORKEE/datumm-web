// Per-skill versions are derived from config history rows; no second history exists.
// A restore puts one skill's snapshot item back into the draft; the page's Save commits it.
import { MODES, emptyConfig, validateConfig } from './admin-config.mjs';

const KEYS = ['id', 'name', 'description', 'instructions', 'modes', 'enabled'];

/** Newest-first rows whose changes touch `skills[id]` (whole item or one of its fields). */
export function skillVersions(rows, id) {
  const whole = `skills[${id}]`, prefix = `${whole}.`;
  const out = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const mine = (Array.isArray(row?.changes) ? row.changes : [])
      .filter(change => change.path === whole || String(change.path).startsWith(prefix));
    if (!mine.length) continue;
    const item = mine.find(change => change.path === whole);
    const kind = !item ? 'changed' : item.beforeHash === null ? 'added'
      : item.afterHash === null ? 'removed' : 'changed';
    out.push({
      revision: row.revision, at: row.at ?? null, by: row.by ?? null, action: row.action,
      restoredFrom: row.restoredFrom ?? null, restorable: row.restorable === true, kind,
      fields: mine.filter(change => change !== item)
        .map(change => change.path.slice(prefix.length)),
    });
  }
  return out;
}

/** The skill from a history detail snapshot, trimmed to the six stored fields, or null. */
export function skillFromSnapshot(detail, id) {
  const list = detail?.config?.skills;
  const found = Array.isArray(list) ? list.find(item => item?.id === id) : null;
  if (!found) return null;
  const item = Object.fromEntries(KEYS.map(key => [key, found[key]]));
  if (typeof item.enabled !== 'boolean' || !Array.isArray(item.modes)
    || item.modes.some(mode => !MODES.includes(mode))) return null;
  const errors = validateConfig({ ...emptyConfig(), skills: [item] });
  return Object.keys(errors).some(key => key.startsWith('skills.0.')) ? null : item;
}

/** The list with `item` replacing the same id (or appended); null when that would pass 30. */
export function withSkill(skills, item) {
  const at = skills.findIndex(skill => skill.id === item.id);
  if (at >= 0) return skills.map((skill, i) => (i === at ? item : skill));
  return skills.length >= 30 ? null : [...skills, item];
}

/** Modes a skill is live in: a disabled skill is live in none, whatever it stores. */
export const activeModes = skill => (skill.enabled ? skill.modes : []);

// The backend needs one stored mode, so switching the last one off disables the skill instead.
export function toggleSkillMode(skill, mode, on) {
  if (on) {
    return skill.enabled
      ? { ...skill, modes: skill.modes.includes(mode) ? skill.modes : [...skill.modes, mode] }
      : { ...skill, enabled: true, modes: [mode] };
  }
  const modes = skill.modes.filter(m => m !== mode);
  return modes.length ? { ...skill, modes } : { ...skill, enabled: false };
}
