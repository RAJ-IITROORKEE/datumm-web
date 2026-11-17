'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Loader2, RefreshCw, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import {
  DEFAULT_PERIOD, TRACE_FEEDBACK, TRACE_OUTCOMES, TRACE_PERIODS, TRACE_SIGNALS,
  feedbackFilterLabel, formatCount, formatDuration, formatUsd, outcomeLabel, parseTraces,
  reasonLabel, signalLabel, traceQuery, type TraceFilters, type TraceRow, type Traces,
} from '@/lib/admin-traces.mjs';
import { EmptyState, Table } from './data-sections';
import { Field, PageHeader } from './form';
import { TRACE_HEAD, TraceRows, type PickKey } from './trace-rows';
import { ResultState, useAdminClient, useAdminResource, type Result } from './use-admin';
import data from './data-sections.module.css';
import styles from './traces-section.module.css';

type Chip = { value: string; label: string };
export function Chips({ label, options, value, onChange }: {
  label: string; options: Chip[]; value?: string; onChange: (value?: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className={styles.chipGroup}>
      <span className={styles.chipLabel} aria-hidden>{label}</span>
      {options.map(option => (
        <button key={option.value} type="button" className={styles.chip}
          aria-pressed={value === option.value}
          onClick={() => onChange(value === option.value ? undefined : option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}

const PERIODS: Record<string, string> = {
  '24h': 'Last 24 hours', '7d': 'Last 7 days', '30d': 'Last 30 days',
};
const stat = (label: string, value: string) => (
  <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
);

function Stats({ traces }: { traces: Traces }) {
  const { stats } = traces;
  const reasons = Object.entries(stats.feedback.reasons).filter(([, total]) => total > 0)
    .map(([reason, total]) => `${reasonLabel(reason)} ${formatCount(total)}`);
  const ratings = `${formatCount(stats.feedback.up)} · ${formatCount(stats.feedback.down)}`;
  return (
    <section className={`${data.group} ${styles.strip}`} aria-labelledby="admin-trace-stats">
      <div className={data.groupHeading}>
        <h2 id="admin-trace-stats">Summary</h2>
        <p>
          {stats.truncated
            ? `Computed from the newest ${formatCount(stats.scanned)} runs of this period; `
              + 'older runs were not scanned.'
            : `Computed from ${formatCount(stats.scanned)} runs in this period.`}
        </p>
      </div>
      <dl className={data.counts}>{[
        stat('Turns', formatCount(stats.turns)), stat('Failed', formatCount(stats.failed)),
        stat('Median time', formatDuration(stats.p50Ms)),
        stat('Slowest 5%', formatDuration(stats.p95Ms)),
      ]}</dl>
      <dl className={data.counts}>{[
        stat('Tokens in', formatCount(stats.inputTokens)),
        stat('Tokens out', formatCount(stats.outputTokens)),
        stat('Reported cost', formatUsd(stats.usd)), stat('Ratings up · down', ratings),
      ]}</dl>
      {reasons.length > 0 && (
        <p className={styles.note} style={{ padding: '0 20px 18px' }}>
          Reasons: {reasons.join(' · ')}
        </p>
      )}
    </section>
  );
}

type More = { path: string; rows: TraceRow[]; next: string | null };
const DESCRIPTION = 'One row per hosted turn: timing, models, steps, tokens, reported cost and '
  + 'rating. Questions and answers are never recorded here.';
const UNREADABLE = {
  ok: false as const, reason: 'error' as const,
  message: 'The service returned traces in a format this page does not understand.',
};

export function TracesSection() {
  const client = useAdminClient();
  const [filters, setFilters] = useState<TraceFilters>({ period: DEFAULT_PERIOD });
  const path = `admin/traces${traceQuery(filters)}`;
  const { result, load, data: raw } = useAdminResource<unknown>(path);
  const page = useMemo(() => parseTraces(raw), [raw]);
  const [more, setMore] = useState<More | null>(null);
  const [moreResult, setMoreResult] = useState<Result<unknown> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const live = useRef(path);
  live.current = path;
  // Bumped by Refresh, so a next page requested from the old first page never lands on the new one.
  const generation = useRef(0);
  useEffect(() => { setMore(null); setMoreResult(null); setLoadingMore(false); }, [path]);
  const extra = more?.path === path ? more : null;
  const rows = page ? [...page.rows, ...(extra?.rows ?? [])] : [];
  const next = extra ? extra.next : page?.nextCursor ?? null;
  const set = (patch: TraceFilters) => setFilters(current => ({ ...current, ...patch }));
  const pick = (key: PickKey, value: string) => set({ [key]: value });
  const active = (['owner', 'mode', 'model'] as const).filter(key => filters[key]);
  const filtered = Boolean(filters.outcome || filters.feedback || filters.signal || active.length);
  const refresh = () => {
    generation.current++;
    setMore(null); setMoreResult(null); setLoadingMore(false);
    void load();
  };

  const loadMore = async () => {
    if (!next || loadingMore) return;
    const from = path, started = generation.current;
    setLoadingMore(true); setMoreResult(null);
    const query = traceQuery({ ...filters, cursor: next });
    const response = await client<unknown>(`admin/traces${query}`);
    if (live.current !== from || generation.current !== started) return;
    setLoadingMore(false);
    const parsed = response.ok ? parseTraces(response.data) : null;
    if (!parsed) {
      setMoreResult(response.ok
        ? { ok: false, reason: 'error', message: 'The next page could not be read.' } : response);
      return;
    }
    setMore(current => {
      const kept = current?.path === from ? current.rows : [];
      const seen = new Set([...(page?.rows ?? []), ...kept].map(row => row.traceId));
      const fresh = parsed.rows.filter(row => !seen.has(row.traceId));
      return { path: from, rows: [...kept, ...fresh], next: parsed.nextCursor };
    });
  };
  const unreadable = result?.ok && !page ? UNREADABLE : null;

  return <>
    <PageHeader title="Traces" description={DESCRIPTION} actions={(
      <Button variant="outline" size="sm" onClick={refresh}>
        <RefreshCw aria-hidden />Refresh
      </Button>
    )} />
    <section className={styles.filters} aria-label="Trace filters">
      <div className={styles.filterRow}>
        <Field label="Period">{p => (
          <Select {...p} className={styles.select} value={filters.period}
            onChange={event => set({ period: event.target.value })}>
            {TRACE_PERIODS.map(period => (
              <option key={period} value={period}>{PERIODS[period]}</option>
            ))}
          </Select>)}
        </Field>
        <Field label="Signal">{p => (
          <Select {...p} className={styles.select} value={filters.signal ?? ''}
            onChange={event => set({ signal: event.target.value || undefined })}>
            <option value="">Any signal</option>
            {TRACE_SIGNALS.map(signal => (
              <option key={signal} value={signal}>{signalLabel(signal)}</option>
            ))}
          </Select>)}
        </Field>
      </div>
      <Chips label="Outcome" value={filters.outcome} onChange={outcome => set({ outcome })}
        options={TRACE_OUTCOMES.map(value => ({ value, label: outcomeLabel(value) }))} />
      <Chips label="Rating" value={filters.feedback} onChange={feedback => set({ feedback })}
        options={TRACE_FEEDBACK.map(value => ({ value, label: feedbackFilterLabel(value) }))} />
      {active.length > 0 && (
        <div className={styles.chipGroup} role="group" aria-label="Active row filters">
          {active.map(key => (
            <button key={key} type="button" className={styles.chip}
              aria-label={`Remove ${key} filter ${filters[key]}`}
              onClick={() => set({ [key]: undefined })}>
              {key}: {key === 'owner' ? filters[key]?.slice(0, 8) : filters[key]}
              <X size={12} aria-hidden />
            </button>
          ))}
        </div>
      )}
    </section>
    <ResultState result={unreadable ?? result} onRetry={refresh} />
    {page && <>
      <Stats traces={page} />
      {rows.length === 0
        ? <EmptyState icon={filtered ? Search : Activity}
          title={filtered ? 'No matching turns' : 'No turns in this period'}>
          {filtered
            ? 'Clear a filter or choose a longer period.'
            : 'Turns appear here after people use the hosted workspace.'}
        </EmptyState>
        : <Table caption="Hosted turn traces" head={TRACE_HEAD}>
          <TraceRows rows={rows} onPick={pick} />
        </Table>}
      <div className={styles.more}>
        <span role="status" className={styles.note}>
          {rows.length > 0
            && `Showing ${formatCount(rows.length)} of ${formatCount(page.stats.turns)} turns`}
        </span>
        {next && (
          <Button variant="outline" size="sm" disabled={loadingMore}
            onClick={() => void loadMore()}>
            {loadingMore && <Loader2 className="animate-spin" aria-hidden />}Load more
          </Button>
        )}
      </div>
      {moreResult && <ResultState result={moreResult} />}
    </>}
  </>;
}
