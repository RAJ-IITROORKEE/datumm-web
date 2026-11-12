import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReviewReport, reportTableCsv, MAX_REPORT_BYTES, MAX_REPORT_ROWS } from '../src/lib/review-report.mjs';

// Synthetic payload using apps/domain-api/unified_reports.py::report_dataset schema 1.
const fixture = () => ({ schemaVersion: 1, runId: 'synthetic-execution', documentId: 'synthetic-document', revision: 12,
  planVersion: 3, sourceKind: 'measured', source: 'Measured native Revit host quantities', scope: 'document', status: 'completed',
  coverage: 'partial', limitations: ['Only retained contiguous evidence pages are included.'], summary: 'Synthetic quantity review.',
  boqRows: [{ recordType: 'quantity', category: 'Walls', count: 2, centerlineLengthMm: 6500, centerlineLengthKnownCount: 2, nativeAreaM2: null }],
  elements: [{ id: 'element-1', category: 'Walls', name: 'Café, "north"\nwall', heightMm: -12, hostId: null }],
  artifacts: [{ format: 'csv', available: true, runId: 'synthetic-execution', documentId: 'synthetic-document', revision: 12,
    planVersion: 3, sourceKind: 'measured', downloadPath: 'https://untrusted.invalid/private' }] });

test('retained measured rows preserve typed quantities, missing values and genuine model provenance', () => {
  const report = parseReviewReport(JSON.stringify(fixture()));
  assert.equal(report.modelRevision, 12);
  assert.equal(report.coverage, 'partial');
  assert.equal(report.boq.rows[0].count, 2);
  assert.equal(report.boq.rows[0].nativeAreaM2, null);
  assert.equal(report.elements.rows[0].id, 'element-1');
  assert.deepEqual(report.limitations, fixture().limitations);
  assert.equal('downloadPath' in report.artifacts[0], false, 'Service paths never become arbitrary browser links');
  assert.equal('artifactRevision' in report, false);
  const proposed = parseReviewReport({ schemaVersion: 1, runId: 'synthetic-plan', sourceKind: 'proposed', boqRows: [{ recordType: 'room', name: 'Study', count: 1, unit: 'm2', value: 12.5 }] });
  assert.equal(proposed.documentId, null);
  assert.equal(proposed.modelRevision, null);
  assert.equal(proposed.coverage, null);
  assert.equal(proposed.boq.rows[0].value, 12.5);
});

test('unsupported versions, mistyped quantities, malformed records and foreign artifact bindings fail closed', () => {
  for (const change of [{ schemaVersion: 2 }, { sourceKind: 'estimated' }, { revision: '12' }, { boqRows: [{ count: '2' }] },
    { elements: [null] }, { limitations: [42] }, { artifacts: [{ ...fixture().artifacts[0], runId: 'different-run' }] }]) {
    assert.throws(() => parseReviewReport({ ...fixture(), ...change }), /unsupported/);
  }
  assert.throws(() => parseReviewReport('not JSON'), /unsupported/);
  assert.throws(() => parseReviewReport({ ...fixture(), boqRows: [{ count: Infinity }] }), /unsupported/);
  for (const mismatch of [{ documentId: 'different-model' }, { revision: 13 }, { planVersion: 4 }, { sourceKind: 'verified' }]) {
    assert.throws(() => parseReviewReport({ ...fixture(), artifacts: [{ ...fixture().artifacts[0], ...mismatch }] }), /unsupported/);
  }
  const nativeView = { ...fixture().artifacts[0], format: 'native-png', revision: 11, planVersion: null, sourceKind: 'native-view' };
  const concept = { ...fixture().artifacts[0], format: 'concept', revision: null, planVersion: 2, sourceKind: 'illustrative' };
  assert.equal(parseReviewReport({ ...fixture(), artifacts: [nativeView, concept] }).artifacts.length, 2,
    'Native views and illustrations retain their distinct source bindings');
});

test('size and row limits reject rather than silently omitting rows from export', () => {
  assert.throws(() => parseReviewReport(' '.repeat(MAX_REPORT_BYTES + 1)), /2 MB/);
  assert.throws(() => parseReviewReport({ ...fixture(), boqRows: Array.from({ length: MAX_REPORT_ROWS + 1 }, () => ({})), elements: [] }), /10,000/);
});

test('typed CSV preserves negative numbers, unknown quantities, Unicode and escaped multiline text, neutralizes textual formulas', () => {
  const data = fixture();
  data.elements[0].name = ' \t=HYPERLINK("bad")';
  const report = parseReviewReport(data);
  const csv = reportTableCsv(report, 'elements');
  assert.match(csv, /^\ufeff"Run ID","Document ID","Model revision"/);
  assert.ok(csv.includes('"synthetic-execution","synthetic-document",12,3,"measured"'));
  assert.ok(csv.includes('"\' \t=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes(',-12,'), 'Typed negative measurements remain numeric');
  assert.ok(csv.endsWith('\r\n'));
  const escaped = reportTableCsv(parseReviewReport(fixture()), 'elements');
  assert.ok(escaped.includes('"Café, ""north""\nwall"'));
  assert.equal(report.elements.rows[0].name, data.elements[0].name);
  const rows = fixture();
  rows.elements = Array.from({ length: 1200 }, (_, i) => ({ id: String(i), name: '-12' }));
  assert.ok(reportTableCsv(parseReviewReport(rows), 'elements').includes('"1199"'));
  assert.ok(reportTableCsv(parseReviewReport(rows), 'elements').includes('"\'-12"'));
});
