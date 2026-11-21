'use client';

import {useEffect, useState} from 'react';
import {ArrowDownToLine} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {createWebHost} from '@/lib/host/web.mjs';
import {parseProjectSource, sourceExactPath, type SourceReference, type SourceLocator} from '@/lib/project-sources.mjs';
import styles from './project-files.module.css';

type View = {text:string;line?:number} | {image:string;pages:number;page:number};
const host = createWebHost();

export function ProjectSourcePreview({reference, locator}: {reference:SourceReference;locator?:SourceLocator}) {
  const initialPage = locator?.kind === 'page' ? locator.page : 1;
  const [page, setPage] = useState(initialPage);
  const [view, setView] = useState<{request:string;value?:View;error?:string}>();
  const exactPath = sourceExactPath(reference);
  const content = sourceExactPath(reference,true);
  const request = JSON.stringify([exactPath,page,locator?.kind === 'text' ? locator.line : null]);
  const result = view?.request === request ? view : undefined;

  useEffect(() => {
    if (!exactPath || !content) return;
    const controller = new AbortController();
    const {signal} = controller;
    async function load() {
      const response = await host.tasks.request(exactPath!,{signal,redirect:'error'});
      const source = response.ok && parseProjectSource(await response.json(),reference.projectId,reference);
      if (!source) throw Error('Unavailable');
      const file = await host.tasks.request(content!,{signal,redirect:'error'});
      if (!file.ok || file.headers.get('content-type')?.split(';')[0].trim() !== source.mediaType) throw Error('Unavailable');
      const bytes = await file.arrayBuffer();
      if (bytes.byteLength !== source.sizeBytes || signal.aborted) throw Error('Unexpected file size');
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      if (Array.from(digest, byte => byte.toString(16).padStart(2,'0')).join('') !== source.sha256) throw Error('Unexpected file hash');
      let value: View;
      if (source.mediaType.startsWith('text/')) {
        const decoded = new TextDecoder('utf-8',{fatal:true}).decode(bytes);
        const lines = decoded.split(/\r\n|\r|\n/);
        const line = locator?.kind === 'text' ? locator.line : undefined;
        if (line && line > lines.length) throw Error('Unavailable text locator');
        const start = line ? Math.max(0,line-6) : 0;
        value = {text:lines.slice(start,start+100).join('\n').slice(0,16_000),line};
      } else {
        const {openRedlineFile} = await import('@/lib/redline-file');
        if (signal.aborted) return;
        const preview = await openRedlineFile(
          new File([bytes],source.filename,{type:source.mediaType}), {limitPdfPages:false},
        );
        try {
          if (signal.aborted) return;
          if (page > preview.pageCount) throw Error('Unavailable page locator');
          const {image} = await preview.render(page);
          value = {image,pages:preview.pageCount,page};
        } finally { preview.close(); }
      }
      if (!signal.aborted) setView({request,value});
    }
    void load().catch(() => {
      if (!signal.aborted) setView({request,error:'This exact revision or preview is unavailable.'});
    });
    return () => controller.abort();
  },[exactPath,content,request,page,reference,locator]);

  if (!content) return null;
  const shown = result?.value;
  return <section className={styles.preview} aria-label={'Preview of ' + reference.filename}>
    <header><strong dir="auto">{reference.filename}</strong><span>Revision {reference.version}</span></header>
    {!result && <p role="status">Loading revision…</p>}
    {result?.error && <p role="alert">{result.error}</p>}
    {shown && 'text' in shown && <>
      {shown.line && <p>Text excerpt around line {shown.line}</p>}
      <pre tabIndex={0} aria-label="Specification excerpt">{shown.text}</pre>
    </>}
    {shown && 'image' in shown && <>
      {/* The existing bounded renderer returns a JPEG data URL, never a raw uploaded document. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={shown.image} alt={reference.filename +
        (locator?.kind === 'page' || reference.mediaType === 'application/pdf' ? ' page ' + shown.page : '')}/>
      {shown.pages > 1 && <nav className={styles.toolbar} aria-label="File pages">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page-1)}>Previous page</Button>
        <span>Page {page} of {shown.pages}</span>
        <Button type="button" variant="outline" size="sm" disabled={page >= shown.pages} onClick={() => setPage(page+1)}>Next page</Button>
      </nav>}
    </>}
    <Button variant="ghost" size="sm" asChild><a href={host.tasks.url(content)} download><ArrowDownToLine aria-hidden="true" />Download revision {reference.version}</a></Button>
  </section>;
}
