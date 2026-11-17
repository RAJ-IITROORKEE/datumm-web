'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowUp, ListPlus, Square} from 'lucide-react';
import {QueuePanel} from '../workspace/queue-panel';
import {AttachmentChipList} from '../workspace/attachment-chips';
import {RetryOnModel} from '../workspace/retry-on-model';
import {usePromptQueue} from '../workspace/use-prompt-queue';
import {acceptSuggestion} from '@/lib/display-actions.mjs';
import {alternateModel, retryableFailure} from '@/lib/model-retry.mjs';
import type {Attachment} from '@/lib/composer-attachments.mjs';

const MODELS = ['openai/gpt-6-luna', 'anthropic/claude-sonnet-5', 'google/gemini-3-pro'];
const SUGGESTION = 'Compare the two alternatives’ areas';
type Status = 'running' | 'completed' | 'failed' | 'cancelled';

function QueueScenario({paused}: {paused: boolean}) {
  const [status, setStatus] = useState<Status>('running');
  const [prompt, setPrompt] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [suggested, setSuggested] = useState(true);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [turn, setTurn] = useState(1);
  const queue = usePromptQueue({
    accountKey: 'fixture', taskId: paused ? 'fixture-paused' : 'fixture-queue', status,
    active: true, models: MODELS, model: MODELS[0], mode: 'ask', idle: true,
    lastPrompt: 'Summarise the layout',
    send: async text => {
      setLog(rows => [...rows, `Sent: ${text.replace(/\n+/g, ' / ')}`]);
      setTurn(value => value + 1);
      setStatus('running');
      return true;
    },
    // The fixture "service" takes a moment to stop, like the real worker.
    stop: async () => {
      setLog(rows => [...rows, 'Stopping the running turn…']);
      stopTimer.current = setTimeout(() => setStatus('cancelled'), 1200);
      return true;
    },
  });
  const add = useRef(queue.add);
  add.current = queue.add;
  const seeded = useRef(false);
  // The paused fixture starts with two kept prompts after a failed turn.
  useEffect(() => {
    if (!paused || seeded.current) return;
    seeded.current = true;
    setTimeout(() => add.current('Show the elevations'), 0);
    setTimeout(() => { add.current('List the room areas'); setStatus('failed'); }, 50);
  }, [paused]);
  const running = status === 'running';
  const placeholder = !prompt && suggested ? SUGGESTION : 'Ask a follow-up or describe your task…';
  const submit = () => { if (queue.add(prompt)) setPrompt(''); };
  return (
    <section aria-label={paused ? 'Paused queue' : 'Running turn'} style={{maxWidth: 640, margin: '0 auto'}}>
      <p role="status">
        Turn {turn} is <strong>{status}</strong>.{' '}
        <button type="button" onClick={() => setStatus('completed')}>Complete turn</button>{' '}
        <button type="button" onClick={() => setStatus('failed')}>Fail turn</button>{' '}
        <button type="button" onClick={() => { setStatus('running'); setLog([]); }}>Run again</button>
      </p>
      <QueuePanel rows={queue.items} max={queue.max} stopping={queue.stopping} notice={queue.notice}
        pausedText={queue.paused ? 'Paused · prompts kept' : null} editDisabled={Boolean(prompt.trim())}
        onSendNow={queue.canSendNow ? row => void queue.sendNow({id: row.id}) : undefined}
        onEdit={row => { const kept = queue.take(row.id); if (kept) setPrompt(kept.prompt); }}
        onRemove={row => queue.remove(row.id)} />
      <form className="composer" onSubmit={event => { event.preventDefault(); if (running) submit(); }}>
        <div className="composer-input">
          <textarea aria-label="Message DATUMM" rows={2} value={prompt} placeholder={placeholder}
            data-suggestion={!prompt && suggested ? '' : undefined}
            aria-describedby={!prompt && suggested ? 'fixture-suggestion-hint' : undefined}
            onChange={event => { setPrompt(event.target.value); setSuggested(false); }}
            onKeyDown={event => {
              const accepted = event.key === 'Tab' && !event.shiftKey && !event.nativeEvent.isComposing
                ? acceptSuggestion(prompt, suggested ? SUGGESTION : '') : null;
              if (accepted) { event.preventDefault(); setPrompt(accepted); setSuggested(false); return; }
              if (event.key === 'Enter' && event.altKey && running) {
                event.preventDefault();
                const next = prompt.trim() ? {text: prompt} : queue.items[0] && {id: queue.items[0].id};
                if (next && queue.canSendNow) void queue.sendNow(next, () => setPrompt(''));
                return;
              }
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }} />
          {!prompt && suggested && (
            <p className="composer-suggestion-hint" id="fixture-suggestion-hint">
              Suggested follow-up · press Tab to use it
            </p>
          )}
          <div className="composer-toolbar">
            <div className="composer-right" style={{marginLeft: 'auto'}}>
              {running && <button type="button" className="send-button" aria-label="Pause task"
                onClick={() => setStatus('cancelled')}><Square size={13} fill="currentColor" /></button>}
              {running && <button className="send-button" type="submit" disabled={!prompt.trim() || queue.full}
                aria-label="Add to queue" title={queue.full ? `Queue is full (${queue.max})` : 'Add to queue'}>
                <ListPlus size={16} aria-hidden="true" /></button>}
              {!running && <button className="send-button" type="button" disabled aria-label="Send message">
                <ArrowUp size={16} aria-hidden="true" /></button>}
            </div>
          </div>
        </div>
      </form>
      <ul aria-label="Fixture log">{log.map((row, index) => <li key={index}>{row}</li>)}</ul>
    </section>
  );
}

const FAILURES = [
  'provider_timeout', 'provider_unavailable', 'provider_schema_invalid', 'workflow_error', 'native_busy',
];

function RetryScenario() {
  const [model, setModel] = useState(MODELS[0]);
  const [sent, setSent] = useState('');
  return (
    <section aria-label="Failed turns" style={{display: 'grid', gap: 12, maxWidth: 640, margin: '0 auto'}}>
      <p>Current model: {model}. {sent && <span role="status">{sent}</span>}</p>
      {FAILURES.map(code => {
        const run = {status: 'failed', mode: 'ask', data: {failure: {code}}};
        const alternate = retryableFailure(run) ? alternateModel(MODELS, model, MODELS[0]) : null;
        return (
          <div className="error-card" role="alert" key={code}>
            Fixture failure <code>{code}</code>
            <RetryOnModel model={alternate} busy={false} onRetry={async () => {
              await new Promise(resolve => setTimeout(resolve, 600));
              setSent(`Sent the last prompt on ${alternate}.`);
              if (alternate) setModel(alternate);
            }} />
          </div>
        );
      })}
    </section>
  );
}

const CHIPS: Attachment[] = [
  {id: 'r', name: 'site-photo.jpg', size: 0, state: 'reading'},
  {id: 'k', name: 'parcel-sketch.png', size: 412000, state: 'ready'},
  {id: 'e', name: 'notes.pdf', size: 90000, state: 'error', reason: 'unsupported'},
  {id: 'l', name: 'huge-render.png', size: 9000000, state: 'error', reason: 'too_large'},
];

function ChipScenario() {
  const [items, setItems] = useState(CHIPS);
  return (
    <section aria-label="Attachment chips" style={{maxWidth: 640, margin: '0 auto'}}>
      <p>Hidden in the product until the backend reports <code>attachments</code>.</p>
      <form className="composer"><div className="composer-input">
        <div style={{padding: '8px 12px 0'}}>
          <AttachmentChipList items={items} onRemove={id => setItems(list => list.filter(row => row.id !== id))} />
        </div>
        <textarea aria-label="Message DATUMM" rows={2} placeholder="Describe your project or ask anything…" />
      </div></form>
      <button type="button" onClick={() => setItems(CHIPS)}>Reset chips</button>
    </section>
  );
}

const VIEWS = ['Running turn', 'Paused queue', 'Failed turns', 'Attachment chips'] as const;

export function ComposerExtrasPreview() {
  const [view, setView] = useState<(typeof VIEWS)[number]>('Running turn');
  return (
    <div style={{padding: 16}}>
      <div role="group" aria-label="Composer extras states" style={{display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16}}>
        {VIEWS.map(name => (
          <button key={name} type="button" aria-pressed={view === name} onClick={() => setView(name)}>{name}</button>
        ))}
      </div>
      {view === 'Running turn' && <QueueScenario key="run" paused={false} />}
      {view === 'Paused queue' && <QueueScenario key="paused" paused />}
      {view === 'Failed turns' && <RetryScenario />}
      {view === 'Attachment chips' && <ChipScenario />}
    </div>
  );
}
