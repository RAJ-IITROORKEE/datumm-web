'use client';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { History, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  actionLabel, changedPaths, historyPath, parseHistory, parseHistoryDetail, restoredStatus,
  type HistoryDetail, type HistoryPage, type HistoryRow,
} from '@/lib/admin-history.mjs';
import { ChangeList } from './change-list';
import { EmptyState, Table } from './data-sections';
import { PageHeader } from './form';
import { RestoreAction } from './restore-dialog';
import { ResultState, useAdminClient, useAdminResource, type Result } from './use-admin';
import styles from './history-section.module.css';

const HEAD = ['Revision', 'When', 'By', 'Action', 'Changed'];
const DESCRIPTION = 'Every saved revision of the shared agent configuration. Restoring saves an '
  + 'earlier revision as a new one; nothing is rewritten or deleted.';
const UNREADABLE: Result<unknown> = {
  ok: false, reason: 'error',
  message: 'The service returned history in a format this page does not understand.',
};

const when = (iso: string | null) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(+date) ? date.toLocaleString() : 'Not supplied';
};

function Paths({ row }: { row: HistoryRow }) {
  if (row.action === 'baseline') return <span className={styles.note}>Starting point</span>;
  const { paths, more, truncated } = changedPaths(row.changes, row.changesTruncated);
  if (paths.length === 0) return <span className={styles.note}>No setting changed</span>;
  return (
    <div className={styles.paths}>
      {paths.map(path => <code key={path}>{path}</code>)}
      {(more > 0 || truncated) && <span>{more > 0 ? `and ${more} more` : 'and more'}</span>}
    </div>
  );
}

// The detail response carries the full snapshot (skill text, MCP URLs); parse it on arrival so
// only the allowlisted diff is ever held in state.
function useHistoryDetail(revision: number) {
  const client = useAdminClient();
  const [result, setResult] = useState<Result<HistoryDetail | null> | null>(null);
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    const next = await client<unknown>(`admin/config/history/${revision}`);
    if (id === request.current) {
      setResult(next.ok ? { ok: true, data: parseHistoryDetail(next.data) } : next);
    }
  }, [client, revision]);
  useEffect(() => {
    setResult(null); void load();
    return () => { request.current++; };
  }, [load]);
  return { result, load };
}

type Restored = (from: number, revision: number) => void;
/** Exported for tests. */
export function Detail({ row, current, onRestored, onReload }: {
  row: HistoryRow; current: number; onRestored: Restored; onReload: () => void;
}) {
  const { result, load } = useHistoryDetail(row.revision);
  const detail = result?.ok ? result.data : null;
  const seen = useRef(current);
  // A save elsewhere moves "live", so the comparison must follow it.
  useEffect(() => {
    if (seen.current !== current) { seen.current = current; void load(); }
  }, [current, load]);
  const unreadable = result?.ok && !detail ? UNREADABLE : null;
  return (
    <div className={styles.detail}>
      <ResultState result={unreadable ?? result} onRetry={() => void load()} />
      {detail && <>
        <div className={styles.badges}>
          {detail.recovered && <Badge variant="outline">Recovered snapshot</Badge>}
          {detail.redacted && <Badge variant="outline">Redacted</Badge>}
        </div>
        {detail.note && <p className={styles.note}>Note: {detail.note}</p>}
        <h3>Compared with live revision {current}</h3>
        <ChangeList changes={detail.changesFromCurrent} empty="Matches the live configuration."
          truncated={detail.changesFromCurrentTruncated} />
        <RestoreAction detail={detail} current={current} onRestored={onRestored}
          onReload={onReload} />
      </>}
    </div>
  );
}

type More = { rows: HistoryRow[]; next: number | null };
export function HistorySection() {
  const client = useAdminClient();
  const { result, load, data } = useAdminResource<unknown>(historyPath());
  const page: HistoryPage | null = useMemo(() => parseHistory(data), [data]);
  const [more, setMore] = useState<More | null>(null);
  const [moreResult, setMoreResult] = useState<Result<unknown> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState('');
  // Bumped by Reload, so an older page request never lands on a newer first page.
  const generation = useRef(0);
  const rows = page ? [...page.rows, ...(more?.rows ?? [])] : [];
  const next = more ? more.next : page?.nextBefore ?? null;

  const reload = () => {
    generation.current++;
    setMore(null); setMoreResult(null); setLoadingMore(false);
    void load();
  };
  const loadOlder = async () => {
    if (!next || loadingMore) return;
    const started = generation.current;
    setLoadingMore(true); setMoreResult(null);
    const response = await client<unknown>(historyPath({ before: next }));
    if (generation.current !== started) return;
    setLoadingMore(false);
    const parsed = response.ok ? parseHistory(response.data) : null;
    if (!parsed) { setMoreResult(response.ok ? UNREADABLE : response); return; }
    setMore(current => {
      const have = [...(page?.rows ?? []), ...(current?.rows ?? [])].map(r => r.revision);
      const fresh = parsed.rows.filter(row => !have.includes(row.revision));
      return { rows: [...(current?.rows ?? []), ...fresh], next: parsed.nextBefore };
    });
  };
  const restored: Restored = (from, revision) => {
    setStatus(restoredStatus(from, revision));
    reload();
  };
  const toggle = (revision: number) => setSelected(selected === revision ? null : revision);

  return <>
    <PageHeader title="Config history" description={DESCRIPTION} actions={(
      <Button variant="outline" size="sm" onClick={reload}>
        <RefreshCw aria-hidden />Refresh
      </Button>
    )} />
    <p role="status" aria-live="polite" className={styles.note}>{status}</p>
    <ResultState result={result?.ok && !page ? UNREADABLE : result} onRetry={reload} />
    {page && (rows.length === 0
      ? <EmptyState icon={History} title="No revisions yet">
        Revisions appear here after the configuration is saved.
      </EmptyState>
      : <Table caption="Configuration revisions" head={HEAD}>
        {rows.map(row => (
          <Fragment key={row.revision}>
            <tr className={selected === row.revision ? styles.selected : undefined}>
              <td>
                <button type="button" className={styles.pick}
                  aria-expanded={selected === row.revision}
                  aria-controls={`revision-${row.revision}`}
                  onClick={() => toggle(row.revision)}>
                  Revision {row.revision}
                </button>
                {row.revision === page.current && <> <Badge variant="outline">Live</Badge></>}
              </td>
              <td>{when(row.at)}</td>
              <td>{row.by ?? 'Unknown'}</td>
              <td>
                <Badge variant="outline">{actionLabel(row.action)}</Badge>
                {row.restoredFrom && <span className={styles.note}> from {row.restoredFrom}</span>}
              </td>
              <td><Paths row={row} /></td>
            </tr>
            {selected === row.revision && (
              <tr id={`revision-${row.revision}`} className={styles.detailRow}>
                <td colSpan={HEAD.length}>
                  <Detail row={row} current={page.current} onRestored={restored}
                    onReload={reload} />
                </td>
              </tr>
            )}
          </Fragment>
        ))}
      </Table>)}
    {page && next && (
      <div className={styles.more}>
        <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => void loadOlder()}>
          {loadingMore && <Loader2 className="animate-spin" aria-hidden />}Load older
        </Button>
      </div>
    )}
    {moreResult && <ResultState result={moreResult} />}
  </>;
}
