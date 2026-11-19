// "Tools that help": names of model-facing tools a skill works best with. A hint only suggests; it
// never turns a tool on (the backend lists only hints that are offered in the run).
export const HINT_MAX = 6;
export const TOOL_NAME = /^[a-z][a-z0-9_]{0,63}$/;

/** Catalog rows (parseToolCatalog) with model-facing names, each name under the first row that has it. */
export function toolHintOptions(rows) {
  const seen = new Set();
  return (Array.isArray(rows) ? rows : []).flatMap(row => {
    const names = (row.toolNames ?? []).filter(name => TOOL_NAME.test(name) && !seen.has(name));
    names.forEach(name => seen.add(name));
    return names.length ? [{ id: row.id, label: row.label, names }] : [];
  });
}

/** Adds or removes one name; adding past the cap or twice changes nothing. */
export function toggleHint(list, name, on) {
  if (!on) return list.filter(item => item !== name);
  return list.includes(name) || list.length >= HINT_MAX ? list : [...list, name];
}

/** True when `list` is a valid hint list: at most HINT_MAX distinct tool names. */
export const validHints = list => Array.isArray(list) && list.length <= HINT_MAX
  && new Set(list).size === list.length && list.every(name => TOOL_NAME.test(name));
