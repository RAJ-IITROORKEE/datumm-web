import test from 'node:test';
import assert from 'node:assert/strict';
import {renderPreviewRaster} from '../src/lib/preview-raster.mjs';

// @lat: [[contracts#Hosted contract tests#Native preview encoding]]
test('native preview imports render the bundled font and encode PNG and JPEG',async()=>{
  const svg=Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect width="160" height="80" fill="white"/><text x="8" y="42" font-family="Lato" font-size="20">DATUMM</text></svg>');
  const png=await renderPreviewRaster(svg,'png'),jpeg=await renderPreviewRaster(svg,'jpeg');
  assert.deepEqual([...png.subarray(0,8)],[137,80,78,71,13,10,26,10]);
  assert.deepEqual([...jpeg.subarray(0,2)],[255,216]);
  assert.ok(png.length>100&&jpeg.length>100);
});
