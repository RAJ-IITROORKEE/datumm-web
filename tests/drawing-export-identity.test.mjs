import test from 'node:test';
import assert from 'node:assert/strict';
import {exactConceptName, safeDrawingSegment, drawingExportName} from '../src/lib/drawing-export-identity.mjs';
const a={planId:'a',version:1,fingerprint:'hash-a'}, b={planId:'b',version:2,fingerprint:'hash-b'};
test('concept naming requires the exact captured candidate',()=>{
 assert.equal(exactConceptName(b,[a,b]),'Concept 2');
 assert.equal(exactConceptName({...b,version:1},[a,b]),undefined);
 assert.equal(exactConceptName({...b,fingerprint:'old'},[a,b]),undefined);
 assert.equal(exactConceptName(b,[]),undefined);
 assert.equal(drawingExportName(b,'2d',exactConceptName(b,[a,b])),'datumm-Concept-2-b-v2-2d');
 assert.notEqual(drawingExportName(a,'2d','Concept 1'),drawingExportName({...a,planId:'other'},'2d','Concept 1'));
 assert.equal(drawingExportName(b,'3d',exactConceptName(b,[])),'datumm-drawing-b-v2-3d');
});
test('filenames are bounded, portable and retain Unicode',()=>{
 assert.equal(safeDrawingSegment('  Café / घर: plan  '),'Café-घर-plan');
 assert.equal(safeDrawingSegment('..\\/?*'), 'drawing');
 assert.equal(safeDrawingSegment('CON.txt'), 'drawing');
 const long=safeDrawingSegment('建'.repeat(100));
 assert.ok(new TextEncoder().encode(long).length<=80);
 assert.equal(long,'建'.repeat(26));
 assert.equal(safeDrawingSegment('abc\u202edef'),'abc-def');
});
