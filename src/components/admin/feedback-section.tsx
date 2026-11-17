'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Loader2, RefreshCw, Search, ThumbsDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import {
  DEFAULT_VOTE, FEEDBACK_VOTES, casePath, caseJson, feedbackPath, parseFeedbackPage,
  type FeedbackFilters, type FeedbackRow,
} from '@/lib/admin-feedback.mjs';
import { TRACE_REASONS, feedbackFilterLabel, formatCount, reasonLabel } from '@/lib/admin-traces.mjs';
import { EmptyState, Table } from './data-sections';
import { Field, PageHeader } from './form';
import { Chips } from './traces-section';
import { ResultState, useAdminClient, useAdminResource, type Result } from './use-admin';
import styles from './traces-section.module.css';

const HEAD = ['When', 'Rating', 'Reason', 'Model', 'Owner', 'Eval case'];
const DESCRIPTION = 'Ratings people gave to saved answers, newest first. This list holds no '
  + 'questions or answers; "Copy as eval case" fetches one case and puts it on your clipboard only.';
const UNREADABLE = {
  ok: false as const, reason: 'error' as const,
  message: 'The service returned feedback in a format this page does not understand.',
};
const when = (iso: string | null) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(+date) ? date.toLocaleString() : 'Not supplied';
};

type More = { path: string; rows: FeedbackRow[]; next: string | null };
type Copied = { message: string; manual?: string };

export function FeedbackSection() {
  const client = useAdminClient();
  const [filters, setFilters] = useState<FeedbackFilters>({ vote: DEFAULT_VOTE });
  const path = feedbackPath(filters);
  const { result, load, data: raw } = useAdminResource<unknown>(path);
  const page = useMemo(() => parseFeedbackPage(raw), [raw]);
  const [more, setMore] = useState<More | null>(null);
  const [moreResult, setMoreResult] = useState<Result<unknown> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [copied, setCopied] = useState<Copied>({ message: '' });
  const [copying, setCopying] = useState<string | null>(null);
  const live = useRef(path);
  live.current = path;
  const generation = useRef(0); // Refresh bumps it so a stale next page never lands on the new first page
  useEffect(() => { setMore(null); setMoreResult(null); setLoadingMore(false); }, [path]);
  const extra = more?.path === path ? more : null;
  const rows = page ? [...page.rows, ...(extra?.rows ?? [])] : [];
  const next = extra ? extra.next : page?.nextBefore ?? null;
  const filtered = filters.vote !== DEFAULT_VOTE || Boolean(filters.reason);
  const set = (patch: FeedbackFilters) => setFilters(current => ({ ...current, ...patch }));
  const refresh = () => {
    generation.current++;
    setMore(null); setMoreResult(null); setLoadingMore(false);
    void load();
  };

  const loadMore = async () => {
    if (!next || loadingMore) return;
    const from = path, started = generation.current;
    setLoadingMore(true); setMoreResult(null);
    const response = await client<unknown>(feedbackPath({ ...filters, before: next }));
    if (live.current !== from || generation.current !== started) return;
    setLoadingMore(false);
    const parsed = response.ok ? parseFeedbackPage(response.data) : null;
    if (!parsed) {
      setMoreResult(response.ok
        ? { ok: false, reason: 'error', message: 'The next page could not be read.' } : response);
      return;
    }
    setMore(current => {
      const kept = current?.path === from ? current.rows : [];
      const seen = new Set([...(page?.rows ?? []), ...kept].map(row => row.id));
      return { path: from, rows: [...kept, ...parsed.rows.filter(row => !seen.has(row.id))],
        next: parsed.nextBefore };
    });
  };

  const copyCase = async (row: FeedbackRow) => {
    const target = casePath(row.id);
    if (!target || copying) return;
    setCopying(row.id); setCopied({ message: 'Fetching the eval case…' });
    const response = await client<unknown>(target);
    const json = response.ok ? caseJson(response.data) : null;
    if (!json) {
      setCopied({ message: response.ok
        ? 'The eval case could not be read.' : `Could not fetch the eval case. ${response.message}` });
    } else {
      try {
        await navigator.clipboard.writeText(json);
        setCopied({ message: 'Eval case copied to the clipboard.' });
      } catch {
        setCopied({ message: 'Copy failed. Select the case below and copy it manually.', manual: json });
      }
    }
    setCopying(null);
  };
  const unreadable = result?.ok && !page ? UNREADABLE : null;

  return <>
    <PageHeader title="Feedback" description={DESCRIPTION} actions={(
      <Button variant="outline" size="sm" onClick={refresh}><RefreshCw aria-hidden />Refresh</Button>
    )} />
    <section className={styles.filters} aria-label="Feedback filters">
      <Chips label="Rating" value={filters.vote}
        onChange={vote => set({ vote, ...(vote === 'up' ? { reason: undefined } : {}) })}
        options={FEEDBACK_VOTES.map(value => ({ value, label: feedbackFilterLabel(value) }))} />
      <div className={styles.filterRow}>
        <Field label="Reason">{p => (
          <Select {...p} className={styles.select} value={filters.reason ?? ''}
            disabled={filters.vote === 'up'}
            onChange={event => set({ reason: event.target.value || undefined })}>
            <option value="">Any reason</option>
            {TRACE_REASONS.map(reason => <option key={reason} value={reason}>{reasonLabel(reason)}</option>)}
          </Select>)}
        </Field>
      </div>
    </section>
    <ResultState result={unreadable ?? result} onRetry={refresh} />
    {page && <>
      {rows.length === 0
        ? <EmptyState icon={filtered ? Search : ThumbsDown}
          title={filtered ? 'No matching ratings' : 'No thumbs-down ratings'}>
          {filtered ? 'Clear a filter to see more.' : 'Ratings appear here after people rate saved answers.'}
        </EmptyState>
        : <Table caption="Answer feedback" head={HEAD}>
          {rows.map(row => (
            <tr key={row.id}>
              <td>{when(row.createdAt)}</td>
              <td><Badge variant={row.vote === 'down' ? 'destructive' : 'outline'}>
                {feedbackFilterLabel(row.vote)}</Badge></td>
              <td>{row.reason ? reasonLabel(row.reason) : '—'}</td>
              <td>{row.model ?? '—'}</td>
              <td>{row.ownerHash ? row.ownerHash.slice(0, 8) : '—'}</td>
              <td>
                <Button variant="outline" size="sm" disabled={copying !== null}
                  aria-label={`Copy as eval case, rated ${feedbackFilterLabel(row.vote)} ${when(row.createdAt)}`}
                  onClick={() => void copyCase(row)}>
                  {copying === row.id ? <Loader2 className="animate-spin" aria-hidden /> : <Copy aria-hidden />}
                  Copy as eval case
                </Button>
              </td>
            </tr>
          ))}
        </Table>}
      <div className={styles.more}>
        <span className={styles.note}>{rows.length > 0 && `Showing ${formatCount(rows.length)} ratings`}</span>
        {next && (
          <Button variant="outline" size="sm" disabled={loadingMore} onClick={() => void loadMore()}>
            {loadingMore && <Loader2 className="animate-spin" aria-hidden />}Load more
          </Button>
        )}
      </div>
      {moreResult && <ResultState result={moreResult} />}
    </>}
    <p role="status" aria-live="polite" className={styles.note}>{copied.message}</p>
    {copied.manual && (
      <textarea readOnly aria-label="Eval case JSON" rows={10} value={copied.manual}
        onFocus={event => event.currentTarget.select()} style={{ width: '100%', fontFamily: 'monospace' }} />
    )}
  </>;
}
