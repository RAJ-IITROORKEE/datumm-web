// Browser-only: turns a chosen image or PDF page into one bounded JPEG data URL (and the PDF
// page's text). Nothing is uploaded or stored here. pdfjs-dist loads only when a PDF is chosen.
import {REDLINE_LIMITS, checkFile, clipText, fitEdge, pageCheck} from './redlines.mjs';

export type RedlineSource = {
  name: string;
  /** 1 for an image. */
  pageCount: number;
  render: (page: number) => Promise<{image: string; pageText: string}>;
  close: () => void;
};

export class RedlineFileError extends Error {}
const refuse = (text: string) => new RedlineFileError(text);
const UNREADABLE = 'The browser could not read that file.';

// A data URL is 4 characters per 3 decoded bytes; the server accepts 2.5 MB decoded.
const decodedBytes = (url: string) => Math.floor(((url.length - url.indexOf(',') - 1) * 3) / 4);

function whiteCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) throw refuse(UNREADABLE);
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  return {canvas, context};
}

/** Redraws the source on white, smaller each time, until the JPEG fits the server's limit. */
function toJpeg(source: CanvasImageSource, width: number, height: number) {
  for (const [scale, quality] of [[1, 0.9], [1, 0.8], [0.85, 0.75], [0.7, 0.7], [0.55, 0.7]]) {
    const {canvas, context} = whiteCanvas(width * scale, height * scale);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', quality);
    canvas.width = canvas.height = 0;
    if (decodedBytes(url) <= REDLINE_LIMITS.maxImageBytes) return url;
  }
  throw refuse('That page is too detailed to send. Try a smaller file.');
}

async function openImage(file: File): Promise<RedlineSource> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw refuse(UNREADABLE);
  }
  const size = fitEdge(bitmap.width, bitmap.height);
  return {
    name: file.name,
    pageCount: 1,
    render: async () => ({image: toJpeg(bitmap, size.width, size.height), pageText: ''}),
    close: () => bitmap.close(),
  };
}

let pdfjsReady: Promise<typeof import('pdfjs-dist')> | null = null;

/** One worker for the whole session, created on first use; webpack bundles it from the package. */
function loadPdfjs() {
  pdfjsReady ??= import('pdfjs-dist').then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerPort = new Worker(
      new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url),
      {type: 'module'},
    );
    return pdfjs;
  }).catch((failure) => {
    pdfjsReady = null;
    throw failure;
  });
  return pdfjsReady;
}

type TextPart = {str?: string};
type Note = {contentsObj?: {str?: string}; contents?: string};

async function openPdf(file: File): Promise<RedlineSource> {
  const pdfjs = await loadPdfjs();
  const data = new Uint8Array(await file.arrayBuffer());
  if (String.fromCharCode(...data.subarray(0, 5)) !== '%PDF-') throw refuse(UNREADABLE);
  // 6.4.299 has no eval path, so it ignores this option; it stays to state the intent.
  const params = {data, isEvalSupported: false, useSystemFonts: true};
  const loading = pdfjs.getDocument(params as Parameters<typeof pdfjs.getDocument>[0]);
  let pdf;
  try {
    pdf = await loading.promise;
  } catch (failure) {
    void loading.destroy();
    const locked = (failure as {name?: string})?.name === 'PasswordException';
    throw refuse(locked ? 'That PDF is password protected.' : UNREADABLE);
  }
  const count = pdf.numPages;
  if (count > REDLINE_LIMITS.maxPages) {
    void loading.destroy();
    throw refuse(`Use a PDF of at most ${REDLINE_LIMITS.maxPages} pages.`);
  }
  return {
    name: file.name,
    pageCount: count,
    render: async (number) => {
      const checked = pageCheck(number, count);
      if (!checked.ok) throw refuse(checked.error);
      const page = await pdf.getPage(number);
      const base = page.getViewport({scale: 1});
      const size = fitEdge(base.width, base.height, REDLINE_LIMITS.maxEdgePx, true);
      const {canvas, context} = whiteCanvas(size.width, size.height);
      const viewport = page.getViewport({scale: size.scale});
      // ENABLE draws annotations that carry an appearance; redlines are often annotations.
      await page.render({
        canvas, canvasContext: context, viewport, annotationMode: pdfjs.AnnotationMode.ENABLE,
      }).promise;
      const parts: string[] = [];
      const content = await page.getTextContent();
      for (const item of content.items as TextPart[]) if (item.str) parts.push(item.str);
      // Typed notes on a markup are annotation contents, not page text.
      for (const note of (await page.getAnnotations()) as Note[]) {
        const words = note.contentsObj?.str ?? note.contents;
        if (words) parts.push(words);
      }
      const image = toJpeg(canvas, canvas.width, canvas.height);
      canvas.width = canvas.height = 0;
      page.cleanup();
      return {image, pageText: clipText(parts.join(' '))};
    },
    close: () => void loading.destroy(),
  };
}

/** Validates the file, then opens it. Throws RedlineFileError with a plain message. */
export async function openRedlineFile(file: File): Promise<RedlineSource> {
  const checked = checkFile(file);
  if (!checked.ok) throw refuse(checked.error);
  return checked.kind === 'pdf' ? openPdf(file) : openImage(file);
}
