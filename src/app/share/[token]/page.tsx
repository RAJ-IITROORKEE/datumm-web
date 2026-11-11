import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Check, Circle, X } from 'lucide-react';
import { MessageResponse } from '@/components/ai-elements/message';
import { sharedView, svgDataUri, validToken } from '@/lib/share.mjs';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Shared chat · DATUMM', robots: { index: false, follow: false } };

/** Public backend read; no sign-in and no user token, same origin rule as the service proxy. */
async function load(token: string) {
  if (!validToken(token)) return null;
  const base = new URL(process.env.ORCHESTRATOR_URL ?? '');
  if (base.protocol !== 'https:' || base.username || base.password || base.pathname !== '/' || base.search || base.hash) return null;
  const response = await fetch(`${base.origin}/v2/shared/${encodeURIComponent(token)}`, { cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(15000) }).catch(() => null);
  return response?.ok ? sharedView(await response.json().catch(() => null)) : null;
}

const when = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en', { dateStyle: 'medium' }); };

export default async function SharedChat({ params }: { params: Promise<{ token: string }> }) {
  const view = await load((await params).token);
  if (!view) notFound();
  return (
    <main className="share-page">
      <header>
        <h1>{view.title}</h1>
        {when(view.createdAt) && <small>Shared {when(view.createdAt)} · read-only</small>}
      </header>
      <section aria-label="Conversation" className="share-thread">
        {view.messages.map((message, index) => (
          <article key={index} data-role={message.role}>
            <strong>{message.role === 'user' ? 'You' : 'DATUMM'}</strong>
            {/* No remote images on a public page: they would act as tracking pixels for viewers. */}
            <MessageResponse disallowedElements={['img']}>{message.text}</MessageResponse>
          </article>
        ))}
      </section>
      {view.svg && (
        <section aria-label="Plan">
          <h2>Plan</h2>
          <img className="share-plan" src={svgDataUri(view.svg)} alt="Floor plan drawing from this chat" />
        </section>
      )}
      {view.steps.length > 0 && (
        <section aria-label="Steps">
          <h2>Steps</h2>
          <ul className="share-list">
            {view.steps.map((step, index) => (
              <li key={index}>{step.status === 'completed' || step.status === 'done' ? <Check size={14} aria-hidden="true" /> : step.status === 'failed' ? <X size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}<span>{step.title}</span><span className="sr-only">{step.status}</span></li>
            ))}
          </ul>
        </section>
      )}
      {view.sources.length > 0 && (
        <section aria-label="Sources">
          <h2>Sources</h2>
          <ul className="share-list">
            {view.sources.map((source, index) => <li key={index}><a href={source.url} target="_blank" rel="noopener noreferrer nofollow">{source.title}</a></li>)}
          </ul>
        </section>
      )}
      <footer>Made with <a href="/">DATUMM</a></footer>
    </main>
  );
}
