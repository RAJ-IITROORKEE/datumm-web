'use client';
import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  feedbackLabel, formatCount, formatDuration, formatTokens, formatUsd, outcomeLabel,
  phasePacketItems, phaseTimeItems, signalLabel, stepsSummary, type PhaseItem, type TraceRow,
} from '@/lib/admin-traces.mjs';
import styles from './traces-section.module.css';

export const TRACE_HEAD = [
  'When', 'Owner', 'Mode and model', 'Outcome', 'Time', 'Tokens', 'Cost', 'Signals', 'Rating',
];
export type PickKey = 'mode' | 'model' | 'owner';
type Pick = (key: PickKey, value: string) => void;
// The backend's mode filter accepts only these; any other stored mode is shown, not offered.
const FILTER_MODES = ['ask', 'plan', 'build'];
const CALL_HEAD = ['Role', 'Model', 'Status', 'Finish', 'Tokens', 'Time', 'Cost', 'Failure'];

const when = (iso: string | null) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(+date) ? date.toLocaleString() : 'Not supplied';
};

function PickButton({ kind, value, label, onPick }: {
  kind: PickKey; value: string; label: string; onPick: Pick;
}) {
  return (
    <button type="button" className={styles.pick} aria-label={`Filter by ${kind} ${value}`}
      onClick={() => onPick(kind, value)}>
      {label}
    </button>
  );
}

function PhaseList({ title, items, note }: {
  title: string; items: PhaseItem[]; note?: string;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3>{title}</h3>
      <dl className={styles.phases}>
        {items.map(item => (
          <Fragment key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></Fragment>
        ))}
      </dl>
      {note && <p className={styles.note}>{note}</p>}
    </div>
  );
}

function Details({ row }: { row: TraceRow }) {
  const { calls, tools, specialists } = row;
  const time = phaseTimeItems(row.phases);
  const packet = phasePacketItems(row.phases);
  return (
    <details className={styles.detail}>
      <summary>
        Steps, calls and tools · {formatCount(calls.length)}
        {' '}{calls.length === 1 ? 'call' : 'calls'}
        {' '}· {formatCount(tools.length)} {tools.length === 1 ? 'tool' : 'tools'}
      </summary>
      <div className={styles.detailBody}>
        <p className={styles.note}>
          {stepsSummary(row.steps)} · model time {formatDuration(row.modelMs)}
          {row.tokens.reasoning > 0 && ` · ${formatCount(row.tokens.reasoning)} reasoning tokens`}
          {row.recoveryAction && ` · recovery ${row.recoveryAction}`}
        </p>
        {row.route?.lane === 'short' && <p className={styles.note}>Answered directly</p>}
        <PhaseList title="Time" items={time}
          note="Parts can overlap, so they may add up to more than the total." />
        <PhaseList title="Packet" items={packet} />
        {calls.length > 0 && (
          <div className={styles.innerScroll}>
            <table className={styles.inner}>
              <caption className="sr-only">Model calls</caption>
              <thead>
                <tr>{CALL_HEAD.map(h => <th key={h} scope="col">{h}</th>)}</tr>
              </thead>
              <tbody>
                {calls.map((call, index) => (
                  <tr key={index}>
                    <td>{call.role ?? '—'}</td><td>{call.modelId ?? '—'}</td>
                    <td>{call.status ?? '—'}</td><td>{call.finishReason ?? '—'}</td>
                    <td>{formatTokens({ input: call.inputTokens, output: call.outputTokens })}</td>
                    <td>{formatDuration(call.durationMs)}</td><td>{formatUsd(call.usd)}</td>
                    <td>{call.failureCode ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {row.callsTruncated && (
          <p className={styles.note}>Only the first calls of this turn are listed.</p>
        )}
        {tools.length > 0 && (
          <div>
            <h3>Tools</h3>
            <ul>{tools.map(tool => (
              <li key={tool.name}>
                {tool.name} · {tool.calls} {tool.calls === 1 ? 'call' : 'calls'}
                {tool.failed > 0 && `, ${tool.failed} failed`}
              </li>
            ))}</ul>
          </div>
        )}
        {specialists.length > 0 && (
          <div>
            <h3>Specialists</h3>
            <ul>{specialists.map((item, index) => (
              <li key={index}>
                {item.role} · {item.outcome ?? 'unknown'} · {formatDuration(item.durationMs)}
              </li>
            ))}</ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function TraceRows({ rows, onPick }: { rows: TraceRow[]; onPick: Pick }) {
  return <>{rows.map(row => {
    const served = row.servedModels.filter(model => model !== row.requestedModel);
    return (
      <Fragment key={row.traceId}>
        <tr>
          <td>{when(row.at)}</td>
          <td>{row.ownerHash ? (
            <PickButton kind="owner" value={row.ownerHash} label={row.ownerHash.slice(0, 8)}
              onPick={onPick} />
          ) : '—'}</td>
          <td>
            <div className={styles.stack}>
              {row.mode && FILTER_MODES.includes(row.mode)
                ? <PickButton kind="mode" value={row.mode} label={row.mode} onPick={onPick} />
                : row.mode ?? '—'}
              {row.requestedModel && (
                <PickButton kind="model" value={row.requestedModel} label={row.requestedModel}
                  onPick={onPick} />
              )}
              {served.length > 0 && (
                <span className={styles.muted}>Served: {served.join(', ')}</span>
              )}
            </div>
          </td>
          <td>
            <div className={styles.stack}>
              <Badge variant={row.outcome === 'failed' ? 'destructive' : 'outline'}>
                {outcomeLabel(row.outcome)}
              </Badge>
              {row.failureCode && <span className={styles.muted}>{row.failureCode}</span>}
            </div>
          </td>
          <td>{formatDuration(row.durationMs)}</td>
          <td>{formatTokens(row.tokens)}</td>
          <td>{formatUsd(row.usd)}</td>
          <td>
            <div className={styles.badges}>
              {row.signals.length ? row.signals.map(signal => (
                <Badge key={signal} variant="outline">{signalLabel(signal)}</Badge>
              )) : '—'}
            </div>
          </td>
          <td>{feedbackLabel(row.feedback)}</td>
        </tr>
        <tr className={styles.detailRow}>
          <td colSpan={TRACE_HEAD.length}><Details row={row} /></td>
        </tr>
      </Fragment>
    );
  })}</>;
}
