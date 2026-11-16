/** Validate the optional saved presentation against its exact answer and scope. */
export async function validateAnswerPresentation(value, { taskId, turnId, text, state }, digest = globalThis.crypto?.subtle) {
  if (state !== 'saved' || !taskId || !turnId || !digest || !value || typeof value !== 'object' || Array.isArray(value)) return null;
  const { schemaVersion, taskId: owner, turnId: turn, answerHash, summary, nextPrompts } = value;
  if (schemaVersion !== 1 || owner !== taskId || turn !== turnId || typeof answerHash !== 'string' || !/^[a-f0-9]{64}$/.test(answerHash) ||
      typeof summary !== 'string' || !summary.trim() || summary.length > 600 || !text.includes(summary) || !Array.isArray(nextPrompts) || nextPrompts.length > 3 ||
      !nextPrompts.every(prompt => typeof prompt === 'string' && !!prompt.trim() && prompt.length <= 180 && !/\b(?:approv\w*|authori[sz]\w*|accept\w*|proceed\w*|execut\w*|appl(?:y|ies|ied|ying)|commit\w*)\b/i.test(prompt))) return null;
  try {
    const bytes = new TextEncoder().encode(text);
    const hash = Array.from(new Uint8Array(await digest.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
    if (hash !== answerHash) return null;
    return { schemaVersion: 1, taskId: owner, turnId: turn, answerHash, summary, nextPrompts: [...nextPrompts] };
  } catch { return null; }
}

/** Complete compact prose can be rendered verbatim; block structures stay in the full answer. */
export function isCompactProse(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 720) return false;
  const lines = text.split(/\r?\n/);
  return !lines.some((line, index) =>
    /^\s*(?:#{1,6}\s|`{3,}|~{3,}|>|[-*+]\s|\d+[.)]\s|\|)/.test(line) ||
    /^(?: {4}|\t)\S/.test(line) || /^\s*(?:(?:[-*_]\s*){3,}|={3,})$/.test(line) ||
    (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? '')) ||
    /<\/?[a-z][^>]*>/i.test(line)
  );
}

// The preview is rendered as text, not Markdown. Convert complete inline
// constructs before limiting it, so truncation cannot reveal link targets.
function plainPreview(text) {
  return text.replace(/\[([^\]\n]+)\]\((?:[^()\n]|\([^()\n]*\))*\)/g, '$1')
    .replace(/`([^`\n]+)`/g, '$1').replace(/\*\*([^*\n]+)\*\*/g, '$1');
}

function listPreview(lines, limit) {
  const first = lines.findIndex(line => line.trim());
  const thematicBreak = line => /^ {0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line);
  if (first < 0 || thematicBreak(lines[first]) || !/^ {0,3}(?:[-*+]\s|\d+[.)]\s)/.test(lines[first])) return null;
  const excerpt = [];
  let items = 0;
  for (let i = first; i < lines.length; i++) {
    const line = lines[i];
    const item = /^\s*(?:[-*+]\s|\d+[.)]\s)/.test(line);
    // Do not absorb a subsequent block, including a table without leading pipes.
    if (thematicBreak(line) || /^\s*(?:#{1,6}\s|`{3,}|~{3,}|>|\|)/.test(line) ||
        (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? ''))) break;
    if (item && ++items > 3) break;
    if (!item && line.trim() && !/^\s+/.test(line)) break;
    excerpt.push(line);
  }
  const plain = plainPreview(excerpt.join('\n').trim())
    // Unsupported or incomplete link syntax is safer omitted than exposed.
    .replace(/!?\[[^\]\n]*\]\([^\n]*/g, '')
    .replace(/(?<!\w)([*_~]{1,2})([^\n]+?)\1(?!\w)/g, '$2');
  // Count displayed grapheme clusters so combining marks and joined emoji
  // remain intact at the preview boundary.
  const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
  const chars = Array.from(segmenter.segment(plain), part => part.segment);
  let end = Math.max(0, limit);
  for (const match of plain.matchAll(/(?:https?:\/\/|www\.)\S+/gi)) {
    const start = Array.from(segmenter.segment(plain.slice(0, match.index))).length;
    const finish = start + Array.from(segmenter.segment(match[0])).length;
    if (start < end && finish > end) end = start;
  }
  let bounded = chars.slice(0, end).join('').trimEnd();
  if (chars.length > limit) {
    bounded = bounded.replace(/(?:^|\n)\s*(?:[-*+]|\d+[.)])\s*$/, '').trimEnd();
  }
  return { text: bounded ? `${bounded}…` : '', shortened: true };
}

/** Literal excerpt, never a generated or inferred summary. */
export function answerPreview(text, limit = 320) {
  const lines = text.split(/\r?\n/);
  if (text.length > limit) {
    const list = listPreview(lines, limit);
    if (list) return list;
  }
  const firstDetail = lines.findIndex((line, index) => /^\s*(?:#{1,6}\s|`{3,}|~{3,}|\||>)/.test(line) || (text.length > limit && /^\s*(?:[-*+]\s|\d+[.)]\s)/.test(line)) || (line.includes('|') && /^\s*\|?\s*:?-{3,}/.test(lines[index + 1] ?? '')));
  const prose = (firstDetail < 0 ? text : lines.slice(0, firstDetail).join('\n')).trim();
  const boundaries = [...prose.matchAll(/[.!?](?=\s|$)/g)];
  const selected = boundaries.length >= 3 ? prose.slice(0, boundaries[2].index + 1).trimEnd() : prose;
  // Show inline Markdown as text before applying the length bound, so a URL
  // cannot be cut in half and exposed as markup in the conversation.
  const plain = plainPreview(selected);
  const excerpt = plain.slice(0, limit).trimEnd();
  const shortened = selected !== text.trim() || excerpt.length < plain.length;
  return { text: excerpt ? `${excerpt}${plain.length > limit ? '…' : ''}` : '', shortened };
}
