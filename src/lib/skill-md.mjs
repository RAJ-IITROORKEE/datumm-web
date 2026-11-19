// SKILL.md is only the editor and import/export format. The stored skill item keeps its shape:
// name -> id, optional title -> name, description -> description, body -> instructions.
// Bounds mirror the backend Skill model (app_config.py); the backend still validates.
// The optional `tools:` header line (comma separated) is the skill's "Tools that help" (toolHints).
import { HINT_MAX, TOOL_NAME } from './skill-hints.mjs';

export const SKILL_LIMITS = {
  id: 40, name: 120, description: 300, instructions: 4000, file: 6000, tools: HINT_MAX,
};
const ID = /^[a-z0-9-]{1,40}$/;
// Tab and newline stay legal; every other control character is refused.
const CONTROL = /[\u0000-\u0008\u000b-\u001f\u007f]/;

const fail = (field, message) => ({ field, message });
const only = (field, message) => ({ ok: false, errors: [fail(field, message)] });
const longer = (what, max) => `The ${what} is longer than ${max} characters.`;

function unquote(value) {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try { return JSON.parse(value); } catch { return value.slice(1, -1); }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  return value;
}

const toolTokens = value => String(value ?? '').replace(/^\[|\]$/g, '').split(',')
  .map(name => name.trim()).filter(Boolean);

/** `{ ok: true, skill }` or `{ ok: false, errors: [{ field, message }] }`. */
export function parseSkillMd(input) {
  const text = String(input ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  if (text.length > SKILL_LIMITS.file) {
    return only('file', longer('file', SKILL_LIMITS.file));
  }
  if (CONTROL.test(text)) {
    return only('file', 'The file contains a control character.');
  }
  const lines = text.split('\n');
  if (lines[0].trim() !== '---') {
    return only('file', 'Start the file with a "---" line, then name and description.');
  }
  const end = lines.findIndex((line, i) => i > 0 && line.trim() === '---');
  if (end < 0) return only('file', 'Close the header with a second "---" line.');
  const head = {};
  for (const line of lines.slice(1, end)) {
    const at = line.indexOf(':');
    if (at > 0) head[line.slice(0, at).trim()] = unquote(line.slice(at + 1).trim());
  }
  const body = lines.slice(end + 1).join('\n').trim();
  const tools = [...new Set(toolTokens(head.tools))];
  const errors = [];
  const id = head.name ?? '';
  if (!id) errors.push(fail('name', 'Add a name line (lowercase letters, digits and dashes).'));
  else if (!ID.test(id)) {
    errors.push(fail('name', 'The name uses lowercase letters, digits and dashes, 1 to 40.'));
  }
  const title = head.title ?? '';
  if (title.length > SKILL_LIMITS.name) {
    errors.push(fail('title', longer('title', SKILL_LIMITS.name)));
  }
  const description = head.description ?? '';
  if (!description) {
    errors.push(fail('description', 'Add a description line, starting "Use when".'));
  }
  else if (description.length > SKILL_LIMITS.description) {
    errors.push(fail('description', longer('description', SKILL_LIMITS.description)));
  }
  if (!body) errors.push(fail('body', 'Add the instructions below the header.'));
  else if (body.length > SKILL_LIMITS.instructions) {
    errors.push(fail('body', longer('instructions', SKILL_LIMITS.instructions)));
  }
  if (tools.length > SKILL_LIMITS.tools) {
    errors.push(fail('tools', `Tools that help: at most ${SKILL_LIMITS.tools} tool names.`));
  } else if (tools.some(name => !TOOL_NAME.test(name))) {
    errors.push(fail('tools', 'Tool names use lowercase letters, digits and underscores, as in "web_search".'));
  }
  if (errors.length) return { ok: false, errors };
  const skill = { id, name: title || id, description, instructions: body };
  return { ok: true, skill: tools.length ? { ...skill, toolHints: tools } : skill };
}

const one = value => (/^["'\s]|\s$/.test(value) ? JSON.stringify(value) : value);

/** SKILL.md text for a skill; the title line appears only when the name differs from the id. */
export function formatSkillMd({ id, name, description, instructions, toolHints }) {
  const lines = ['---', `name: ${id}`];
  if (name && name !== id) lines.push(`title: ${one(name.replace(/\s+/g, ' ').trim())}`);
  lines.push(`description: ${one(String(description ?? '').replace(/\s+/g, ' ').trim())}`);
  if (toolHints?.length) lines.push(`tools: ${toolHints.join(', ')}`);
  lines.push('---');
  return `${lines.join('\n')}\n${instructions}\n`;
}

const KEYS = ['id', 'name', 'description', 'instructions'];
const same = (a, b) => KEYS.every(k => a[k] === b[k])
  && (a.toolHints ?? []).join() === (b.toolHints ?? []).join();

/** What Apply writes: null when the editor text parses to what the stored skill would show,
 * so opening and applying an older skill never rewrites its whitespace. */
export function editedSkill(stored, parsed) {
  if (!stored) return parsed;
  const shown = parseSkillMd(formatSkillMd(stored));
  return same(stored, parsed) || (shown.ok && same(shown.skill, parsed)) ? null : parsed;
}

/** The agent picks a skill by its "Use when..." line; older skills may lack one. */
export const hasUseWhen = description => /\buse\s+(when|for)\b/i.test(String(description ?? ''));

function headerOf(input) {
  const lines = String(input ?? '').replace(/^﻿/, '').replace(/\r\n?/g, '\n').split('\n');
  const closes = (l, i) => i > 0 && l.trim() === '---';
  return { lines, end: lines[0].trim() === '---' ? lines.findIndex(closes) : -1 };
}
const TOOLS_LINE = /^tools\s*:/;

/** Tool names on the header's `tools:` line, even when the rest of the file does not parse yet. */
export function skillMdTools(input) {
  const { lines, end } = headerOf(input);
  const line = end < 0 ? undefined : lines.slice(1, end).find(l => TOOLS_LINE.test(l));
  return line ? toolTokens(unquote(line.slice(line.indexOf(':') + 1).trim())) : [];
}

/** The text with its `tools:` line replaced (removed when `names` is empty); no header, no change. */
export function setSkillMdTools(input, names) {
  const { lines, end } = headerOf(input);
  if (end < 0) return String(input ?? '');
  const head = lines.slice(1, end).filter(l => !TOOLS_LINE.test(l));
  if (names.length) head.push(`tools: ${names.join(', ')}`);
  return [lines[0], ...head, ...lines.slice(end)].join('\n');
}

/** Lengths for the editor counters; works on files that do not parse yet. */
export function skillMdCounts(input) {
  const { lines, end } = headerOf(input);
  if (end < 0) return { description: 0, body: 0 };
  const line = lines.slice(1, end).find(l => /^description\s*:/.test(l));
  const value = line ? unquote(line.slice(line.indexOf(':') + 1).trim()) : '';
  return { description: value.length, body: lines.slice(end + 1).join('\n').trim().length };
}
