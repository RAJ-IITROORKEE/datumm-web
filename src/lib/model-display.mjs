/** Pure labels for the model picker; ids are `provider/slug`. */
import {formatTokens} from './context-meter.mjs';

const KNOWN = {openai: 'OpenAI', anthropic: 'Anthropic', google: 'Google', qwen: 'Qwen'};

export function modelName(model) {
  const slug = model.split('/').at(-1) ?? model;
  return slug.replace(/^gpt-/i, 'GPT-')
    .replace(/(^|[-_.])([a-z])/g,
      (_, separator, letter) => `${separator === '-' ? ' ' : separator}${letter.toUpperCase()}`);
}

export function modelProvider(model) {
  const provider = model.split('/')[0] ?? '';
  return KNOWN[provider.toLowerCase()] ??
    (provider ? provider.charAt(0).toUpperCase() + provider.slice(1) : 'Model');
}

const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const money = value => {
  const number = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof number === 'number' && Number.isFinite(number) && number >= 0 ? number : undefined;
};

/** Drops ids the service does not serve and any field that is not usable. */
export function parseModelInfo(raw, served) {
  const out = {};
  if (!isObject(raw)) return out;
  for (const id of served) {
    const row = raw[id];
    if (!isObject(row)) continue;
    const entry = {};
    const prompt = money(row.promptPerM), completion = money(row.completionPerM);
    if (prompt !== undefined) entry.promptPerM = prompt;
    if (completion !== undefined) entry.completionPerM = completion;
    if (Number.isInteger(row.contextLength) && row.contextLength > 0) {
      entry.contextLength = row.contextLength;
    }
    if (typeof row.imageInput === 'boolean') entry.imageInput = row.imageInput;
    if (Object.keys(entry).length) out[id] = entry;
  }
  return out;
}

// Fixed-point: String(1e-8) would print "1e-8".
const price = value =>
  value.toLocaleString('en-US', {maximumFractionDigits: 20, useGrouping: false});

export function modelFacts(info) {
  const facts = [];
  if (info?.promptPerM !== undefined && info.completionPerM !== undefined) {
    facts.push(`$${price(info.promptPerM)} / $${price(info.completionPerM)} per M`);
  }
  if (info?.contextLength) facts.push(`${formatTokens(info.contextLength)} context`);
  if (info?.imageInput) facts.push('Reads images');
  return facts;
}

export function groupModels(models, defaultModel) {
  const groups = [];
  for (const id of models) {
    const provider = modelProvider(id);
    let group = groups.find(item => item.provider === provider);
    if (!group) groups.push(group = {provider, models: []});
    if (id === defaultModel) group.models.unshift(id); else group.models.push(id);
  }
  return groups;
}
