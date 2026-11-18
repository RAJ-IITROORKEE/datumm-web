'use client';
import {useEffect, useRef, useState, type ChangeEvent} from 'react';
import {FileUp} from 'lucide-react';
import type {PlanEdit} from '@/lib/plan-edits.mjs';
import {
  REDLINE_ACCEPT, applyQueue, defaultTicks, pageCheck, readFailureMessage,
  type RedlineResult,
} from '@/lib/redlines.mjs';
import {openRedlineFile, RedlineFileError, type RedlineSource} from '@/lib/redline-file';
import type {DrawingVersion} from '../plan-canvas';
import {Button} from '../ui/button';
import {RedlineList} from './redline-list';
import styles from './redline-panel.module.css';

type Phase = 'idle' | 'opening' | 'reading' | 'applying';
type Props = {
  drawing: DrawingVersion;
  /** The plan cannot be edited right now, or another edit is running. */
  off: boolean;
  read: (
    drawing: DrawingVersion, source: {image: string; pageText?: string},
  ) => Promise<RedlineResult>;
  apply: (edits: PlanEdit[]) => Promise<{applied: number; error: string}>;
  /** Replaced by the development fixture; the real one needs the browser's canvas and pdfjs. */
  open?: (file: File) => Promise<RedlineSource>;
};
const STATUS = {
  opening: 'Opening the file…',
  reading: 'Reading the markup…',
  applying: 'Applying the changes…',
};
type Failure = {status?: number; message?: string};

/** Read a marked-up image or PDF page, list the changes the model saw, apply the ticked ones. */
export function RedlinePanel({drawing, off, read, apply, open = openRedlineFile}: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [source, setSource] = useState<RedlineSource | null>(null);
  const [page, setPage] = useState('1');
  const [result, setResult] = useState<RedlineResult | null>(null);
  const [ticked, setTicked] = useState<string[]>([]);
  const [applied, setApplied] = useState<string[]>([]);
  const [problem, setProblem] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const held = useRef<RedlineSource | null>(null);
  const live = useRef(true);
  const latest = useRef(0);

  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      held.current?.close();
    };
  }, []);

  const release = () => {
    held.current?.close();
    held.current = null;
    setSource(null);
  };
  const current = (token: number) => live.current && token === latest.current;

  async function readPage(from: RedlineSource, number: number, token: number) {
    setPhase('reading');
    setProblem('');
    setResult(null);
    setApplied([]);
    try {
      const found = await read(drawing, await from.render(number));
      if (!current(token)) return;
      setResult(found);
      setTicked(defaultTicks(found.items));
      if (from.pageCount === 1) release();
    } catch (failure) {
      if (!current(token)) return;
      const own = failure instanceof RedlineFileError;
      setProblem(own ? failure.message : readFailureMessage(failure as Failure));
    } finally {
      if (current(token)) setPhase('idle');
    }
  }

  async function choose(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const token = ++latest.current;
    release();
    setResult(null);
    setProblem('');
    setPhase('opening');
    try {
      const next = await open(file);
      if (!current(token)) return next.close();
      held.current = next;
      setSource(next);
      setPage('1');
      if (next.pageCount === 1) await readPage(next, 1, token);
      else setPhase('idle');
    } catch (failure) {
      if (!current(token)) return;
      const own = failure instanceof RedlineFileError;
      setProblem(own ? failure.message : 'The browser could not read that file.');
      setPhase('idle');
    }
  }

  function readChosenPage() {
    const number = Number(page);
    const checked = pageCheck(number, source?.pageCount ?? 1);
    if (!checked.ok) return setProblem(checked.error);
    if (source) void readPage(source, number, ++latest.current);
  }

  const queue = result ? applyQueue(result.items, ticked, applied) : [];
  async function applyTicked() {
    setPhase('applying');
    const outcome = await apply(queue.map((item) => item.edit as PlanEdit));
    if (!live.current) return;
    const done = queue.slice(0, outcome.applied).map((item) => item.id);
    setApplied((rows) => [...rows, ...done]);
    setPhase('idle');
  }

  const working = phase !== 'idle';
  // A plan edited some other way after the read no longer matches the keys the model was given.
  const stale = Boolean(result) && drawing.version !== result!.version && applied.length === 0;
  const toggle = (id: string) => setTicked((rows) => (
    rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id]
  ));

  return (
    <section className={styles.root} aria-label="Read a marked-up plan" aria-busy={working}>
      <div className={styles.label}>Marked-up plan</div>
      <p className={styles.muted}>
        Pick a photo, export or PDF of this plan with your markup. The page is sent to a model that
        lists the changes it sees. The file is not saved.
      </p>
      <input
        ref={input} type="file" hidden accept={REDLINE_ACCEPT} onChange={choose}
        aria-label="Marked-up plan file: image or PDF, up to 20 MB"
      />
      <Button variant="secondary" size="sm" type="button" disabled={off || working}
        onClick={() => input.current?.click()}>
        <FileUp size={14} aria-hidden="true" />Read a marked-up plan
      </Button>
      {phase !== 'idle' && (
        <p className={styles.muted} role="status">{STATUS[phase]}</p>
      )}
      {problem && <p className={styles.problem} role="alert">{problem}</p>}
      {source && source.pageCount > 1 && (
        <form
          className={styles.pages}
          onSubmit={(event) => { event.preventDefault(); readChosenPage(); }}
        >
          <p className={styles.muted}>
            {source.name} has {source.pageCount} pages. Choose the page with your markup.
          </p>
          <label className={styles.field}>
            Page · 1 to {source.pageCount}
            <input
              type="number" min={1} max={source.pageCount} step={1} inputMode="numeric"
              value={page} disabled={off || working}
              onChange={(event) => setPage(event.target.value)}
            />
          </label>
          <Button type="submit" size="sm" disabled={off || working}>Read page {page || '…'}</Button>
        </form>
      )}
      {stale && (
        <p className={styles.problem} role="alert">
          The plan changed after this was read. Read the markup again before applying.
        </p>
      )}
      {result && (
        <RedlineList
          items={result.items} ticked={ticked} applied={applied} queued={queue.length}
          off={off || working || stale} onToggle={toggle} onApply={() => void applyTicked()}
        />
      )}
    </section>
  );
}
