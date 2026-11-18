'use client';

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronRight } from 'lucide-react';
import { initialExpanded, nodeMeta, parseRunSteps, treeKey, treeRows, visibleRows, type RunSteps } from '@/lib/run-steps.mjs';
import { api } from './use-workspace-state';
import styles from './run-steps.module.css';

export type RunStepsState = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: RunSteps };

/** Steps of every run of one task. Fetches only while `open`, and again when `refreshKey` changes. */
export function useRunSteps(open: boolean, taskId: string, refreshKey: string): RunStepsState {
  const [state, setState] = useState<RunStepsState>({ status: 'loading' });
  useEffect(() => {
    if (!open) return;
    let live = true;
    api<unknown>(`tasks/${encodeURIComponent(taskId)}/steps`)
      .then(body => {
        const data = parseRunSteps(body);
        if (live) setState(data ? { status: 'ready', data } : { status: 'error' });
      })
      .catch(() => { if (live) setState({ status: 'error' }); });
    return () => { live = false; };
  }, [open, taskId, refreshKey]);
  return state;
}

const time = (iso: string | null) => iso && Number.isFinite(Date.parse(iso)) ? new Date(iso).toLocaleTimeString() : '';

/** Collapsible, keyboard-navigable tree of recorded steps. Labels and numbers only; no prompt or answer text. */
export function RunStepsView({ state }: { state: RunStepsState }) {
  if (state.status === 'loading') return <p className={styles.note} role="status">Loading run steps…</p>;
  if (state.status === 'error') return <p className={styles.note} role="alert">Run steps could not be loaded. Try again shortly.</p>;
  if (!state.data.runs.some(run => run.children.length)) return <p className={styles.note}>No steps were recorded for this task.</p>;
  return <Tree data={state.data} />;
}

function Tree({ data }: { data: RunSteps }) {
  const rows = useMemo(() => treeRows(data.runs), [data]);
  const [expanded, setExpanded] = useState(() => initialExpanded(data.runs));
  const [focused, setFocused] = useState(rows[0]?.id ?? '');
  const refs = useRef(new Map<string, HTMLDivElement>());
  // New data (a refresh or another task) restarts from its own default; the old positions may not exist.
  const [seen, setSeen] = useState(data);
  if (seen !== data) { setSeen(data); setExpanded(initialExpanded(data.runs)); setFocused(rows[0]?.id ?? ''); }
  const visible = visibleRows(rows, expanded);
  const current = visible.some(row => row.id === focused) ? focused : visible[0]?.id;
  const toggle = (id: string, open: boolean) => setExpanded(previous => {
    const next = new Set(previous);
    if (open) next.add(id); else next.delete(id);
    return next;
  });
  const move = (id: string) => { setFocused(id); refs.current.get(id)?.focus(); };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, id: string) => {
    const action = treeKey(visible, id, event.key, expanded);
    if (!action) return;
    event.preventDefault();
    if ('focus' in action) move(action.focus); else toggle(...action.toggle);
  };

  return <div role="tree" aria-label="Run steps" className={styles.tree}>
    {visible.map(row => {
      const open = expanded.has(row.id);
      const meta = row.node.kind === 'run'
        ? [time(row.node.startedAt), row.node.runStatus?.replaceAll('_', ' '), row.node.truncated ? 'Showing the first steps only' : '']
          .filter(Boolean).join(' · ')
        : nodeMeta(row.node);
      return <div key={row.id} role="treeitem" className={styles.row} data-kind={row.node.kind} data-status={row.node.status}
        aria-level={row.level} aria-setsize={row.size} aria-posinset={row.position}
        aria-expanded={row.hasChildren ? open : undefined} tabIndex={row.id === current ? 0 : -1}
        style={{ paddingInlineStart: 6 + (row.level - 1) * 16 }}
        ref={element => { if (element) refs.current.set(row.id, element); else refs.current.delete(row.id); }}
        onFocus={event => { if (event.target === event.currentTarget) setFocused(row.id); }}
        onKeyDown={event => { if (event.target === event.currentTarget) onKeyDown(event, row.id); }}>
        {/* Not a button: a treeitem's children are presentational and the keyboard is handled on the row. */}
        <span className={styles.chevron} data-open={open} data-leaf={!row.hasChildren} aria-hidden="true"
          onClick={() => row.hasChildren && toggle(row.id, !open)}><ChevronRight size={13} /></span>
        <span className={styles.text}><span className={styles.label}>{row.node.label}</span>
          {meta && <small className={styles.meta}>{meta}</small>}</span>
      </div>;
    })}
  </div>;
}
