import { Resvg } from '@resvg/resvg-js';
import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// The font is explicitly included in the route's output trace. Resolve its
// filesystem location; bundlers turn asset URLs into HTTP paths, not file URLs.
const assetPath='assets/fonts/Lato-Regular.ttf';
const fontPath = resolve(existsSync(assetPath)?assetPath:`datumm-app/${assetPath}`);

/** @param {Buffer} svg @param {'png'|'jpeg'} format */
export async function renderPreviewRaster(svg, format) {
  const png = new Resvg(svg, {
    background: '#ffffff',
    font: {
      fontFiles: [fontPath],
      loadSystemFonts: false,
      defaultFontFamily: 'Lato',
      sansSerifFamily: 'Lato',
    },
  }).render().asPng();
  return format === 'jpeg' ? sharp(png).jpeg({ quality: 90 }).toBuffer() : Buffer.from(png);
}
