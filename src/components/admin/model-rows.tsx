'use client';
import { Fragment, type MouseEvent } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  canEnable, daysFor, priceLabel, rowStatusLabel, servedNote, testLabel,
  type ModelRow, type ModelTotals, type UsageDay,
} from '@/lib/admin-models.mjs';
import { formatCount, formatDuration, formatUsd } from '@/lib/admin-traces.mjs';
import { Table } from './data-sections';
import { TestAction } from './model-test-dialog';
import styles from './models-section.module.css';

const when = (iso: string | null | undefined) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(+date) ? date.toLocaleString() : null;
};
const USAGE_HEAD = [
  'Day', 'Role', 'Calls', 'Failed', 'Tokens in · out', 'Reasoning', 'Cost', 'Time',
];

function Daily({ days }: { days: UsageDay[] }) {
  return (
    <Table caption="Daily usage" head={USAGE_HEAD}>
      {days.map(day => (
        <tr key={`${day.day}:${day.role}`}>
          <td>{day.day}</td><td>{day.role ?? '—'}</td>
          <td>{formatCount(day.calls)}</td><td>{formatCount(day.failed)}</td>
          <td>{formatCount(day.inputTokens)} · {formatCount(day.outputTokens)}</td>
          <td>{formatCount(day.reasoningTokens)}</td>
          <td>{day.usd === null ? '—' : formatUsd(day.usd)}</td>
          <td>{day.p50Ms === null ? '—' : `${formatDuration(day.p50Ms)} median`}
            {day.p95Ms === null ? '' : ` · ${formatDuration(day.p95Ms)} slowest 5%`}</td>
        </tr>
      ))}
    </Table>
  );
}

export type RowActions = {
  enabled: string[]; defaultId: string; catalogError: boolean; period: string;
  totals: Map<string, ModelTotals>; days: UsageDay[];
  onToggle: (row: ModelRow, on: boolean, trigger: HTMLElement) => void;
  onDefault: (row: ModelRow) => void; onTested: () => void;
};
export const HEAD = (period: string) => [
  'Model', 'Status', 'Price per 1M tokens', 'Last test', `Calls (${period})`,
  `Cost (${period})`, 'Actions',
];

function Row({ row, ...a }: { row: ModelRow } & RowActions) {
  const on = a.enabled.includes(row.id), isDefault = a.defaultId === row.id;
  const block = on ? null : canEnable(row);
  const totals = a.totals.get(row.id);
  const days = daysFor(a.days, row.id);
  const tested = when(row.latestTest?.at);
  const why = `model-why-${row.id.replace(/[^A-Za-z0-9_-]/g, '_')}`;
  // Saved state: the stored list when there is one, otherwise the served list.
  const unsaved = on !== (row.listed || row.enabled) || isDefault !== row.isDefault;
  const notServed = servedNote(row);
  const toggle = (event: MouseEvent<HTMLButtonElement>) =>
    a.onToggle(row, !on, event.currentTarget);
  return (
    <Fragment>
      <tr>
        <td className={styles.modelCell}><code>{row.id}</code>
          {row.contextLength !== null && (
            <span>{formatCount(row.contextLength)} token context</span>
          )}
        </td>
        <td>
          <Badge variant={row.status === 'failed' ? 'destructive' : 'outline'}>
            {rowStatusLabel(row)}
          </Badge>
          {notServed && <span className={styles.note}>{notServed}</span>}
          {isDefault && <> <Badge variant="secondary">Default</Badge></>}
          {unsaved && <span className={styles.note}>Unsaved change</span>}
        </td>
        <td>{priceLabel(row, a.catalogError)}</td>
        <td>{testLabel(row.latestTest)}
          {tested && <span className={styles.note}>{tested}</span>}</td>
        <td className={styles.numeric}>{totals ? formatCount(totals.calls) : '0'}</td>
        <td className={styles.numeric}>{totals ? formatUsd(totals.usd) : '—'}</td>
        <td>
          <div className={styles.actions}>
            <TestAction modelId={row.id} onTested={a.onTested} />
            <Button type="button" variant="outline" size="sm" disabled={Boolean(block)}
              aria-label={`${on ? 'Disable' : 'Enable'} ${row.id}`}
              aria-describedby={block ? why : undefined} onClick={toggle}>
              {on ? 'Disable' : 'Enable'}
            </Button>
            <Button type="button" variant="ghost" size="sm" disabled={isDefault || !on}
              aria-label={`Make ${row.id} the default`} onClick={() => a.onDefault(row)}>
              Make default
            </Button>
          </div>
          {block && <span id={why} className={styles.note}>{block}</span>}
        </td>
      </tr>
      {days.length > 0 && (
        <tr className={styles.usageRow}>
          <td colSpan={7}>
            <details>
              <summary>Daily usage · {a.period} · {formatCount(days.length)} rows</summary>
              <Daily days={days} />
            </details>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export function ModelRows({ rows, ...actions }: { rows: ModelRow[] } & RowActions) {
  return <>{rows.map(row => <Row key={row.id} row={row} {...actions} />)}</>;
}
