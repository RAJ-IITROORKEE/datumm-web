import assert from 'node:assert/strict';
import test from 'node:test';
import {planPdf} from '../src/lib/plan-pdf.ts';

test('a 20 x 30 m plan sheet (29,000 x 39,000 with margins) exports as one PDF page', () => {
  const pdf = new TextDecoder().decode(planPdf(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]), 1785, 2400, 29000, 39000));
  assert.match(pdf, /^%PDF-1\.4/);
  assert.match(pdf, /\/Count 1/);
  assert.throws(() => planPdf(new Uint8Array(4), 10, 10, 60001, 100), /Invalid drawing extents/);
});
