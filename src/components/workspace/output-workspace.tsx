'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowUpRight, Download, FileText, GitBranch, Table2, X } from 'lucide-react';
import { MessageResponse } from '../ai-elements/message';
import { MessageActions } from '../vendor/affectui/message-actions-clean';
import { answerOutputs, answerTableCsv, type AnswerOutput, type AnswerSource } from '@/lib/answer-outputs.mjs';
import { FEEDBACK_REASON_LABELS, feedbackBody, type FeedbackKind } from '@/lib/answer-feedback.mjs';
import { answerPreview, isCompactProse, validateAnswerPresentation, type AnswerPresentation } from '@/lib/answer-presentation.mjs';
export type { AnswerPresentation } from '@/lib/answer-presentation.mjs';
import styles from './output-workspace.module.css';

import type { OutputWorkspaceProps, OutputWorkspaceValue, WorkScope } from '@/lib/work-area-contract';
export type { OutputWorkspaceProps, OutputWorkspaceValue } from '@/lib/work-area-contract';

const Context = createContext<OutputWorkspaceValue | null>(null);
const icons = { report: FileText, table: Table2, diagram: GitBranch };
type OutputRecord = {scope: WorkScope; sources: Record<string, AnswerOutput[]>; activeId: string | null};

export function OutputWorkspaceProvider({ children, scopeKey, scopeInput, onOpen, onClose, onOpenReport, answerFeedback }: OutputWorkspaceProps) {
  if (scopeKey !== scopeInput.key) throw new Error('Output workspace scope keys must agree.');
  const [stored, setRecord] = useState<OutputRecord>(() => ({scope: {...scopeInput, epoch: 1}, sources: {}, activeId: null}));
  let record = stored;
  if (stored.scope.key !== scopeKey) {
    record = {scope: {...scopeInput, epoch: stored.scope.epoch + 1}, sources: {}, activeId: null};
    setRecord(record);
  }
  const live = useRef(record); live.current = record;
  const scope = record.scope;
  const trigger = useRef<{scope: WorkScope; element: HTMLElement | null} | null>(null);
  const current = useCallback(() => live.current.scope.key === scope.key && live.current.scope.epoch === scope.epoch, [scope.key, scope.epoch]);
  const register = useCallback((key: string, outputs: AnswerOutput[]) => {
    if (!current()) return;
    const accepted = outputs.filter(output => scope.taskId ? output.source.taskId === scope.taskId : !output.source.taskId);
    setRecord(previous => {
      if (previous.scope.key !== scope.key || previous.scope.epoch !== scope.epoch) return previous;
      const sources = {...previous.sources};
      if (accepted.length) sources[key] = accepted; else delete sources[key];
      const activeId = Object.values(sources).flat().some(output => output.id === previous.activeId) ? previous.activeId : null;
      return {...previous, sources, activeId};
    });
  }, [current, scope]);
  const outputs = useMemo(() => Object.values(record.sources).flat().sort((a, b) => a.source.conversationIndex - b.source.conversationIndex), [record.sources]);
  const activeOutput = outputs.find(output => output.id === record.activeId) ?? null;
  const openOutput = useCallback((output: AnswerOutput | string, opener?: HTMLElement | null) => {
    if (!current()) return;
    const id = typeof output === 'string' ? output : output.id;
    const registered = Object.values(live.current.sources).flat().find(item => item.id === id);
    if (!registered || (typeof output !== 'string' && (registered.markdown !== output.markdown || registered.source.state !== output.source.state || registered.source.taskId !== output.source.taskId || registered.source.conversationIndex !== output.source.conversationIndex))) return;
    const focused = opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (focused && !focused.closest('[aria-label="Answer output"]')) trigger.current = {scope, element: focused};
    onOpen?.();
    setRecord(previous => current() ? {...previous, activeId: id} : previous);
  }, [current, scope, onOpen]);
  const dismissOutput = useCallback(() => {
    if (!current()) return;
    setRecord(previous => current() ? {...previous, activeId: null} : previous); onClose?.();
  }, [current, onClose]);
  const closeOutput = useCallback(() => {
    if (!current()) return;
    dismissOutput();
    requestAnimationFrame(() => {
      if (!current()) return;
      const saved = trigger.current, opener = saved?.scope.key === scope.key && saved.scope.epoch === scope.epoch ? saved.element : null;
      if (opener?.isConnected && opener.getClientRects().length && getComputedStyle(opener).visibility !== 'hidden') opener.focus();
      else document.querySelector<HTMLElement>('[data-output-focus-fallback]')?.focus();
    });
  }, [current, scope, dismissOutput]);
  const openSavedReport = useMemo<OutputWorkspaceValue['openSavedReport']>(() => onOpenReport ? (revision, opener) => { if (current()) onOpenReport(revision, opener ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null)); } : undefined, [onOpenReport, current]);
  const value = useMemo<OutputWorkspaceValue>(() => ({scope, outputs, activeOutput, openOutput, closeOutput, dismissOutput, register, answerFeedback, openSavedReport}), [scope, outputs, activeOutput, openOutput, closeOutput, dismissOutput, register, answerFeedback, openSavedReport]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useOutputWorkspace(): OutputWorkspaceValue {
  const context = useContext(Context);
  if (!context) throw new Error('OutputWorkspaceProvider is required.');
  return context;
}

/** Answer projection, never an authoritative schedule or a native-model action. */
export function AnswerContent({ text, source, presentation, turnId, answerHash, onPresentation }: { text: string; source: AnswerSource; presentation?: unknown; turnId?: string; answerHash?: string; onPresentation?: (presentation: AnswerPresentation | null) => void }) {
  const context = useContext(Context);
  const { key, taskId, conversationIndex, answerNumber, state } = source;
  const outputs = useMemo(() => answerOutputs(text, { key, taskId, conversationIndex, answerNumber, state }), [text, key, taskId, conversationIndex, answerNumber, state]);
  const register = context?.register;
  const scopeEpoch = context?.scope.epoch;
  const scopeKey = context?.scope.key;
  const [verified, setVerified] = useState<{input: unknown; text: string; taskId?: string; turnId?: string; state: AnswerSource['state']; scopeKey?: string; scopeEpoch?: number; value: AnswerPresentation} | null>(null);
  useEffect(() => {
    let current = true;
    onPresentation?.(null);
    void validateAnswerPresentation(presentation, {taskId, turnId, text, state}).then(value => {
      if (!current) return;
      setVerified(value ? {input: presentation, text, taskId, turnId, state, scopeKey, scopeEpoch, value} : null);
      if (value) onPresentation?.(value);
    });
    return () => { current = false; };
  }, [presentation, taskId, turnId, text, state, scopeKey, scopeEpoch, onPresentation]);
  const valid = verified && verified.input === presentation && verified.text === text && verified.taskId === taskId && verified.turnId === turnId && verified.state === state && verified.scopeKey === scopeKey && verified.scopeEpoch === scopeEpoch ? verified.value : null;
  const preview = answerPreview(text);
  const listLines = text.trim().split(/\r?\n/).filter(line => line.trim());
  const compactList = text.length <= 720 && listLines.length > 0 && listLines.length <= 3 &&
    listLines.every(line => /^\s*(?:[-*+]\s|\d+[.)]\s)\S/.test(line) && !/[|<>]|`{3,}|~{3,}/.test(line));
  const inlineComplete = state === 'saved' && (isCompactProse(text) || compactList);
  const visibleOutputs = outputs.filter(output => !(inlineComplete && output.kind === 'report'));
  const readyTables = outputs.filter(output => output.kind === 'table' && output.complete);
  // Rating needs a proven saved answer in this task, a handler, and the owner's votes (for defaultVote).
  const feedback = context?.answerFeedback;
  const votes = feedback?.votes ?? null;
  const rateable = Boolean(feedback && votes && turnId && answerHash && taskId && state === 'saved' && context?.scope.taskId === taskId);
  const sending = useRef<Promise<void>>(Promise.resolve());
  // A failed save remounts the bar, so it shows the last saved vote instead of the unsaved thumb.
  const [unsaved, setUnsaved] = useState(0);
  // The bar reports a thumb and then its reason as two calls; queue them so the reason lands last.
  const rate = (kind: FeedbackKind | null, reason?: string) => {
    const body = taskId ? feedbackBody({ turnId, answerHash, kind, reason }) : null;
    if (!feedback || !taskId || !body) return;
    sending.current = sending.current.then(() => feedback.save(taskId, body))
      .then(saved => { if (!saved) setUnsaved(count => count + 1); });
  };
  useEffect(() => { register?.(key, outputs); }, [key, outputs, register]);
  useEffect(() => () => { register?.(key, []); }, [key, register]);
  return <>
    {state === 'streaming' || inlineComplete ? <div className={styles.answerText}><MessageResponse isAnimating={state === 'streaming'} tableScopeKey={`${scopeKey}:${scopeEpoch}:${key}`}>{text}</MessageResponse></div> : valid ? <p className={styles.answerText}>{valid.summary}</p> : <div className={styles.answerText}>
      {preview.shortened && preview.text && <span className={styles.previewLabel}>Preview</span>}
      {preview.text ? <p>{preview.text}</p> : state === 'saved' && readyTables.length ? <p>{readyTables.length === 1 ? `Table ready · ${readyTables[0].rows?.length ?? 0} rows` : `${readyTables.length} tables ready to review`}</p> : text.trim() ? <p>Open the full answer to view its contents.</p> : null}
    </div>}
    {text !== '' && <MessageActions key={JSON.stringify([context?.scope.key, context?.scope.epoch, key, rateable, unsaved])} text={text} disabled={state === 'streaming'} actions={rateable ? ['copy', 'feedback'] : ['copy']} quiet={false} label="Full answer actions" copySuccessLabel="Copied full answer."
      {...(rateable && turnId ? { reasons: FEEDBACK_REASON_LABELS, defaultVote: votes?.[turnId] ?? null, onFeedback: rate } : {})}/>}
    {context && visibleOutputs.length > 0 && <div className={styles.links} aria-label="Open answer outputs">
      {visibleOutputs.map(output => {
        const Icon = icons[output.kind];
        return <button key={output.id} type="button" onClick={() => context.openOutput(output)} aria-label={`Open ${output.title} beside chat`}>
          <Icon size={14} aria-hidden="true" /><span>{output.title}</span><ArrowUpRight size={13} aria-hidden="true" />
        </button>;
      })}
    </div>}
  </>;
}

export function OutputPanel() {
  const { scope, activeOutput: output, outputs, openOutput, closeOutput } = useOutputWorkspace();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const feedbackRequest = useRef(0);
  const [feedback, setFeedback] = useState('');
  const feedbackScope = useRef('');
  const feedbackText = useRef(output?.markdown);
  const feedbackKey = JSON.stringify([scope?.key, scope?.epoch, output?.id, output?.source.key, output?.source.taskId, output?.source.conversationIndex, output?.source.state]);
  if (feedbackScope.current !== feedbackKey || feedbackText.current !== output?.markdown) {
    feedbackScope.current = feedbackKey; feedbackText.current = output?.markdown; feedbackRequest.current++; if (feedback) setFeedback('');
  }
  useEffect(() => {
    feedbackRequest.current++;
    setFeedback(''); titleRef.current?.focus();
    return () => { feedbackRequest.current++; };
  }, [feedbackKey]);
  if (!output) return null;
  const streaming = output.source.state === 'streaming';
  const Icon = icons[output.kind];
  const download = () => {
    try {
      const blob = new Blob([answerTableCsv(output)], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url;
      const answerNumber = output.source.answerNumber;
      const displayNumber = Number.isSafeInteger(answerNumber) && answerNumber! > 0 ? answerNumber : output.source.conversationIndex + 1;
      const tableSuffix = output.id.split(':').at(-1) ?? '';
      const tableIndex = /^\d+$/.test(tableSuffix) ? Number(tableSuffix) : NaN;
      const tableNumber = Number.isSafeInteger(tableIndex) && tableIndex >= 0 && tableIndex < Number.MAX_SAFE_INTEGER ? tableIndex + 1 : 1;
      link.download = `answer-${displayNumber}-table-${tableNumber}.csv`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFeedback('CSV downloaded. Includes every row in this answer table.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'CSV could not be downloaded. Try again.'); }
  };
  return <section className={styles.panel} aria-label="Answer output" onKeyDown={event => {
    if (event.key === 'Escape' && !event.defaultPrevented && !(event.target instanceof HTMLSelectElement) && !(event.target instanceof Element && event.target.closest('[role="dialog"]'))) { event.preventDefault(); closeOutput(); }
  }}>
    <header className={styles.header}>
      <div><Icon size={17} aria-hidden="true" /><h2 ref={titleRef} tabIndex={-1}>{output.title}</h2></div>
      <button type="button" className={styles.iconButton} aria-label="Close preview" onClick={closeOutput}><X size={17} /></button>
    </header>
    <div className={styles.toolbar}>
      <label><span className="sr-only">Open answer output</span><select value={output.id} onChange={event => openOutput(event.target.value)}>
        {outputs.map(item => <option key={item.id} value={item.id}>Answer {item.source.answerNumber ?? item.source.conversationIndex + 1} · {item.title} ({item.kind})</option>)}
      </select></label>
      {output.kind === 'table' && <button type="button" disabled={streaming || !output.complete} onClick={download}><Download size={14} />Export table CSV</button>}
      <MessageActions key={feedbackKey} text={output.markdown} disabled={streaming} actions={['copy']} quiet={false}
        label="Output actions" copySuccessLabel="Copied Markdown." copyFailureLabel="Clipboard unavailable. Select the output text to copy it."
        onCopy={async () => {
          const copiedText = output.markdown, copiedIdentity = feedbackKey;
          if (streaming || feedbackScope.current !== copiedIdentity || feedbackText.current !== copiedText) throw Error('This output changed. Copy the current output instead.');
          const request = ++feedbackRequest.current;
          const current = () => request === feedbackRequest.current && feedbackScope.current === copiedIdentity && feedbackText.current === copiedText;
          try {
            if (!navigator.clipboard?.writeText) throw Error('Clipboard unavailable');
            await navigator.clipboard.writeText(copiedText);
            if (current()) setFeedback('Copied Markdown.');
          } catch (error) {
            if (current()) setFeedback('Clipboard unavailable. Select the output text to copy it.');
            throw error;
          }
        }}
      />
    </div>
    <div className={styles.provenance}>
      <span>Answer {output.source.answerNumber ?? output.source.conversationIndex + 1} · {streaming ? 'Updating' : output.source.state === 'partial' ? 'Partial answer' : 'Saved answer'} · Read only</span>
      {output.kind === 'table' && <span>{output.rows?.length ?? 0} rows · CSV exports this answer table</span>}
      <details><summary>Source details</summary><p>{output.source.taskId ? `Task ${output.source.taskId}, answer ${output.source.conversationIndex + 1}.` : 'Current conversation answer.'} This view uses the answer text. Model quantities, source revision and full schedule coverage are not established by this view.</p></details>
      {feedback && <p role="status">{feedback}</p>}
    </div>
    <div className={styles.body}>
      <MessageResponse key={JSON.stringify([scope?.key, scope?.epoch, output.id])} tableScopeKey={JSON.stringify([scope?.key, scope?.epoch, output.id])} isAnimating={streaming} tableMaxHeight="min(64dvh, 720px)">{output.markdown}</MessageResponse>
    </div>
  </section>;
}
