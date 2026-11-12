/** Read-only projections of answer text. These IDs are UI addresses, never artifact/revision IDs. */
export function splitTableRow(line) {
  const value = line.trim().replace(/^\|/, '').replace(/(?<!\\)\|$/, '');
  const cells = [];
  let cell = '';
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '\\' && value[i + 1] === '|') { cell += '|'; i++; }
    else if (value[i] === '|') { cells.push(cell.trim()); cell = ''; }
    else cell += value[i];
  }
  cells.push(cell.trim());
  return cells;
}

export function answerOutputs(text, source) {
  if (!text?.trim()) return [];
  const lines = text.split(/\r?\n/), outputs = [];
  let heading = '', tableIndex = 0, diagramIndex = 0;
  for (let i = 0; i < lines.length; i++) {
    const title = lines[i].match(/^ {0,3}#{1,6}\s+(.+?)\s*#*$/);
    if (title) heading = title[1];
    const fence = lines[i].match(/^ {0,3}(`{3,}|~{3,})([^\s]*)/);
    if (fence) {
      const start = i, marker = fence[1][0], length = fence[1].length;
      while (++i < lines.length && !new RegExp(`^ {0,3}${marker}{${length},}\\s*$`).test(lines[i])) { /* scan fence */ }
      if (fence[2].toLowerCase() === 'mermaid') {
        const chart = lines.slice(start + 1, i).join('\n');
        outputs.push({ id: `${source.key}:diagram:${diagramIndex++}`, kind: 'diagram', title: heading || 'Diagram', markdown: `\`\`\`mermaid\n${chart}\n\`\`\``, complete: i < lines.length, source });
      }
      continue;
    }
    if (i + 1 >= lines.length || !lines[i].includes('|')) continue;
    const headers = splitTableRow(lines[i]), separator = splitTableRow(lines[i + 1]);
    if (separator.length !== headers.length || !separator.every(cell => /^:?-{3,}:?$/.test(cell))) continue;
    const start = i, rows = [];
    i += 2;
    while (i < lines.length && lines[i].trim() && lines[i].includes('|')) {
      const cells = splitTableRow(lines[i]);
      rows.push(headers.map((_, index) => cells[index] ?? ''));
      i++;
    }
    outputs.push({ id: `${source.key}:table:${tableIndex++}`, kind: 'table', title: heading || `Answer table ${tableIndex}`, markdown: lines.slice(start, i).join('\n'), headers, rows, complete: source.state !== 'streaming', source });
    i--;
  }
  if (text.length > 900 || outputs.length || /^#{1,6}\s/m.test(text)) {
    outputs.unshift({ id: `${source.key}:report`, kind: 'report', title: text.match(/^#{1,6}\s+(.+)$/m)?.[1] || 'Answer report', markdown: text, complete: source.state !== 'streaming', source });
  }
  return outputs;
}

/** UTF-8 CSV; every textual cell is quoted, formula-like text is prefixed with an apostrophe.
 * Markdown table cells stay text, including numeric-looking values: no type/provenance is inferred.
 */
export function answerTableCsv(output) {
  if (output.kind !== 'table' || !output.complete || output.source.state === 'streaming') throw new Error('Wait for the answer table to finish.');
  const cell = value => {
    const text = String(value ?? '');
    const safe = /^[\s\u0000-\u001f]*[=+\-@]/u.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  return '\ufeff' + [output.headers, ...output.rows].map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
