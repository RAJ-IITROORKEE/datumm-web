/** Projection of unified_reports.py schema 1. Model revisions are not report revisions. */
export const MAX_REPORT_BYTES = 2 * 1024 * 1024;
export const MAX_REPORT_ROWS = 10000;
const MAX_CELL_LENGTH = 12000;
const sources = new Set(['proposed', 'measured', 'verified', 'unavailable']);
const reportFormats = new Set(['report-json', 'csv', 'elements-csv', 'xlsx', 'md', 'docx', 'pdf']);
const numeric = new Set(['count', 'centerlineLengthMm', 'centerlineLengthKnownCount', 'nativeAreaM2', 'nativeAreaKnownCount', 'nativeVolumeM3', 'nativeVolumeKnownCount', 'value', 'areaM2', 'heightMm', 'sillMm']);
const boqColumns = [
  ['recordType', 'Record type'], ['category', 'Category'], ['levelId', 'Level ID'],
  ['typeName', 'Type'], ['typeId', 'Type ID'], ['elementId', 'Element ID'],
  ['name', 'Name'], ['count', 'Count'], ['centerlineLengthMm', 'Centerline mm'],
  ['centerlineLengthKnownCount', 'Length known count'], ['nativeAreaM2', 'Native area m²'],
  ['nativeAreaKnownCount', 'Area known count'], ['nativeVolumeM3', 'Native volume m³'],
  ['nativeVolumeKnownCount', 'Volume known count'], ['unit', 'Unit'], ['value', 'Value'],
];
const elementColumns = [
  ['id', 'Element ID'], ['category', 'Category'], ['name', 'Name'], ['typeId', 'Type ID'],
  ['levelId', 'Level ID'], ['roomNumber', 'Room number'], ['centerlineLengthMm', 'Centerline mm'],
  ['areaM2', 'Area m²'], ['heightMm', 'Height mm'], ['sillMm', 'Sill mm'], ['hostId', 'Host ID'],
  ['fromRoomId', 'From room ID'], ['toRoomId', 'To room ID'], ['createdPhaseId', 'Created phase ID'],
  ['demolishedPhaseId', 'Demolished phase ID'],
];
function invalid() { throw new Error('The service returned an unsupported report dataset.'); }
function record(value) { return value !== null && typeof value === 'object' && !Array.isArray(value); }
function text(value, required = false) {
  if (value == null && !required) return null;
  if (typeof value !== 'string' || value.length > MAX_CELL_LENGTH || (required && !value.trim())) invalid();
  return value;
}
function revision(value) {
  if (value == null) return null;
  if (!Number.isSafeInteger(value) || value < 0) invalid();
  return value;
}
function array(value) { if (value == null) return []; if (!Array.isArray(value)) invalid(); return value; }
function table(rows, definitions) {
  return { columns: definitions.map(([key, label]) => ({ key, label })), rows: rows.map(row => {
    if (!record(row)) invalid();
    return Object.fromEntries(definitions.map(([key]) => {
      const value = row[key];
      if (value == null) return [key, null];
      if (numeric.has(key)) { if (typeof value !== 'number' || !Number.isFinite(value)) invalid(); }
      else text(value);
      return [key, value];
    }));
  }) };
}

/** Reject excessive data rather than silently truncating a supposedly complete schedule. */
export function parseReviewReport(payload) {
  let serialized;
  try { serialized = typeof payload === 'string' ? payload : JSON.stringify(payload, (_, value) => {
    if (typeof value === 'number' && !Number.isFinite(value)) invalid();
    return value;
  }); } catch { invalid(); }
  if (typeof serialized !== 'string') invalid();
  if (new TextEncoder().encode(serialized).byteLength > MAX_REPORT_BYTES) throw new Error('This report exceeds the 2 MB review limit. Download the service report instead.');
  let data;
  try { data = JSON.parse(serialized); } catch { invalid(); }
  if (!record(data) || data.schemaVersion !== 1 || !sources.has(data.sourceKind)) invalid();
  const boqRows = array(data.boqRows), elements = array(data.elements);
  if (boqRows.length + elements.length > MAX_REPORT_ROWS) throw new Error('This report exceeds the 10,000 row review limit. Download the service report instead.');
  const limitations = array(data.limitations);
  const artifacts = array(data.artifacts);
  if (limitations.length > 100 || artifacts.length > 40) invalid();
  const runId = text(data.runId, true), documentId = text(data.documentId);
  const modelRevision = revision(data.revision), planVersion = revision(data.planVersion);
  return {
    schemaVersion: 1, runId, documentId, modelRevision,
    planVersion, sourceKind: data.sourceKind, source: text(data.source),
    scope: text(data.scope), status: text(data.status), coverage: text(data.coverage), summary: text(data.summary),
    limitations: limitations.map(item => text(item, true)),
    boq: table(boqRows, boqColumns), elements: table(elements, elementColumns),
    artifacts: artifacts.map(item => {
      if (!record(item) || typeof item.available !== 'boolean' || item.runId !== runId) invalid();
      const artifact = { format: text(item.format, true), available: item.available, runId,
        documentId: text(item.documentId), revision: revision(item.revision), planVersion: revision(item.planVersion),
        sourceKind: text(item.sourceKind) };
      // Image/illustration bindings intentionally differ; report formats share the dataset binding.
      if (reportFormats.has(artifact.format) && (artifact.documentId !== documentId || artifact.revision !== modelRevision ||
        artifact.planVersion !== planVersion || artifact.sourceKind !== data.sourceKind)) invalid();
      return artifact;
    }),
  };
}

/** Local CSV of the validated retained rows, not the backend's full report CSV representation. */
export function reportTableCsv(report, kind = 'boq') {
  if (kind !== 'boq' && kind !== 'elements') invalid();
  const selected = report[kind];
  if (!selected || !Array.isArray(selected.rows) || selected.rows.length > MAX_REPORT_ROWS) invalid();
  const cell = value => {
    if (typeof value === 'number') { if (!Number.isFinite(value)) invalid(); return String(value); }
    const valueText = text(value) ?? '';
    const safe = /^[\s\u0000-\u001f]*[=+\-@]/u.test(valueText) ? `'${valueText}` : valueText;
    return `"${safe.replaceAll('"', '""')}"`;
  };
  const metadata = ['Run ID', 'Document ID', 'Model revision', 'Plan version', 'Source kind', 'Source', 'Scope', 'Coverage'];
  const binding = [report.runId, report.documentId, report.modelRevision, report.planVersion, report.sourceKind, report.source, report.scope, report.coverage];
  return '\ufeff' + [[...metadata, ...selected.columns.map(column => column.label)],
    ...selected.rows.map(row => [...binding, ...selected.columns.map(column => row[column.key])])]
    .map(row => row.map(cell).join(',')).join('\r\n') + '\r\n';
}
