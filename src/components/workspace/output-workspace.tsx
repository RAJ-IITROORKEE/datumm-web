'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Check, Copy, Download, FileText, GitBranch, Table2, X } from 'lucide-react';
import { MessageResponse } from '../ai-elements/message';
import { answerOutputs, answerTableCsv, type AnswerOutput, type AnswerSource } from '@/lib/answer-outputs.mjs';
import styles from './output-workspace.module.css';

type OutputContext = {
  outputs: AnswerOutput[];
  activeOutput: AnswerOutput | null;
  openOutput: (output: AnswerOutput | string) => void;
  closeOutput: () => void;
  dismissOutput: () => void;
  register: (key: string, outputs: AnswerOutput[]) => void;
};
const Context = createContext<OutputContext | null>(null);
const icons = { report: FileText, table: Table2, diagram: GitBranch };

export function OutputWorkspaceProvider({ children, scopeKey = 'workspace', onClose }: { children: ReactNode; scopeKey?: string; onClose?: () => void }) {
  return <OutputWorkspaceState key={scopeKey} onClose={onClose}>{children}</OutputWorkspaceState>;
}

function OutputWorkspaceState({ children, onClose }: { children: ReactNode; onClose?: () => void }) {
  const [sources, setSources] = useState<Record<string, AnswerOutput[]>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const register = useCallback((key: string, outputs: AnswerOutput[]) => {
    setSources(previous => ({ ...previous, [key]: outputs }));
  }, []);
  const outputs = useMemo(() => Object.values(sources).flat().sort((a, b) => a.source.conversationIndex - b.source.conversationIndex), [sources]);
  const activeOutput = outputs.find(output => output.id === activeId) ?? null;
  const openOutput = useCallback((output: AnswerOutput | string) => {
    const focused = document.activeElement;
    // Switching an already open output must retain the original conversation opener.
    if (focused instanceof HTMLElement && !focused.closest('[aria-label="Answer output"]')) trigger.current = focused;
    setActiveId(typeof output === 'string' ? output : output.id);
  }, []);
  const closeOutput = useCallback(() => {
    setActiveId(null);
    onClose?.();
    requestAnimationFrame(() => {
      const opener = trigger.current;
      if (opener?.isConnected && opener.getClientRects().length && getComputedStyle(opener).visibility !== 'hidden') opener.focus();
      else document.querySelector<HTMLElement>('[data-output-focus-fallback]')?.focus();
    });
  }, [onClose]);
  const dismissOutput = useCallback(() => { setActiveId(null); onClose?.(); }, [onClose]);
  const value = useMemo(() => ({ outputs, activeOutput, openOutput, closeOutput, dismissOutput, register }), [outputs, activeOutput, openOutput, closeOutput, dismissOutput, register]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOutputWorkspace() {
  const context = useContext(Context);
  if (!context) throw new Error('OutputWorkspaceProvider is required.');
  return context;
}

/** Answer projection, never an authoritative schedule or a native-model action. */
export function AnswerContent({ text, source }: { text: string; source: AnswerSource }) {
  const context = useContext(Context);
  const { key, taskId, conversationIndex, state } = source;
  const outputs = useMemo(() => answerOutputs(text, { key, taskId, conversationIndex, state }), [text, key, taskId, conversationIndex, state]);
  const register = context?.register;
  useEffect(() => { register?.(key, outputs); }, [key, outputs, register]);
  useEffect(() => () => { register?.(key, []); }, [key, register]);
  return <>
    <MessageResponse isAnimating={state === 'streaming'}>{text}</MessageResponse>
    {context && outputs.length > 0 && <div className={styles.links} aria-label="Open answer outputs">
      {outputs.map(output => {
        const Icon = icons[output.kind];
        return <button key={output.id} type="button" onClick={() => context.openOutput(output)} aria-label={`Open ${output.title} beside chat`}>
          <Icon size={14} aria-hidden="true" /><span>{output.title}</span><ArrowUpRight size={13} aria-hidden="true" />
        </button>;
      })}
    </div>}
  </>;
}

export function OutputPanel() {
  const { activeOutput: output, outputs, openOutput, closeOutput } = useOutputWorkspace();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [feedback, setFeedback] = useState('');
  useEffect(() => { setFeedback(''); titleRef.current?.focus(); }, [output?.id]);
  if (!output) return null;
  const streaming = output.source.state === 'streaming';
  const Icon = icons[output.kind];
  const download = () => {
    try {
      const blob = new Blob([answerTableCsv(output)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url;
      link.download = `answer-${output.source.conversationIndex + 1}-table-${output.id.split(':').at(-1)}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback('CSV downloaded. Includes every row in this answer table.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'CSV could not be downloaded. Try again.'); }
  };
  return <section className={styles.panel} aria-label="Answer output" onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !(event.target instanceof HTMLSelectElement) && !(event.target instanceof Element && event.target.closest('[role="dialog"]'))) closeOutput();
  }}>
    <header className={styles.header}>
      <div><Icon size={17} aria-hidden="true" /><h2 ref={titleRef} tabIndex={-1}>{output.title}</h2></div>
      <button type="button" className={styles.iconButton} aria-label="Close output and return to drawing" onClick={closeOutput}><X size={17} /></button>
    </header>
    <div className={styles.toolbar}>
      <label><span className="sr-only">Open answer output</span><select value={output.id} onChange={event => openOutput(event.target.value)}>
        {outputs.map(item => <option key={item.id} value={item.id}>Answer {item.source.conversationIndex + 1} · {item.title} ({item.kind})</option>)}
      </select></label>
      {output.kind === 'table' && <button type="button" disabled={streaming || !output.complete} onClick={download}><Download size={14} />Export table CSV</button>}
      <button type="button" disabled={streaming} onClick={async () => {
        try { await navigator.clipboard.writeText(output.markdown); setFeedback('Copied Markdown.'); }
        catch { setFeedback('Clipboard unavailable. Select the output text to copy it.'); }
      }}>{feedback === 'Copied Markdown.' ? <Check size={14} /> : <Copy size={14} />}Copy</button>
    </div>
    <div className={styles.provenance}>
      <span>Answer {output.source.conversationIndex + 1} · {streaming ? 'Updating' : output.source.state === 'partial' ? 'Partial answer' : 'Saved answer'} · Read only</span>
      {output.kind === 'table' && <span>{output.rows?.length ?? 0} rows · CSV exports this answer table</span>}
      <details><summary>Source details</summary><p>{output.source.taskId ? `Task ${output.source.taskId}, answer ${output.source.conversationIndex + 1}.` : 'Current conversation answer.'} This view uses the answer text. Model quantities, source revision and full schedule coverage are not established by this view.</p></details>
      {feedback && <p role="status">{feedback}</p>}
    </div>
    <div className={styles.body}>
      <MessageResponse isAnimating={streaming} tableMaxHeight="min(64dvh, 720px)">{output.markdown}</MessageResponse>
    </div>
  </section>;
}
