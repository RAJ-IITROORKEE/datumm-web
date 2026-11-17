'use client';

import { useId } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';
import { Button } from '@/components/ui/button';
import { PopoverStyles, popoverClasses } from '../vendor/affectui/popover-clean';
import {
  formatTokens, meterReading, meterTone, ringDash, usageBelongsTo,
} from '@/lib/context-meter.mjs';
import styles from './context-meter.module.css';

const RADIUS = 6;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Ring plus card for the latest model call; renders nothing without a trustworthy reading. */
export function ContextMeter({ usage, taskId, running = false, onOpenActivity }: {
  usage: unknown;
  taskId: string | undefined;
  /** The task is queued or running; an estimate on a settled task is not "busy". */
  running?: boolean;
  onOpenActivity?: () => void;
}) {
  const cardId = useId();
  const reading = taskId && usageBelongsTo(usage, taskId) ? meterReading(usage) : null;
  if (!reading) return null;
  const { used, max, percent, estimated } = reading;
  const tone = meterTone(percent);
  const dash = ringDash(percent, CIRCUMFERENCE);
  const approx = estimated ? '~' : '';
  const text = max ? `${approx}${formatTokens(used)} / ${formatTokens(max)}`
    : `${approx}${formatTokens(used)} tokens`;
  const label = `Context used, latest model call${estimated ? ' (estimated)' : ''}: ` +
    `${formatTokens(used)}${max ? ` of ${formatTokens(max)}` : ''} tokens` +
    `${percent === null ? '' : `, ${Math.round(percent)}% used`}`;
  const tokens = (value: number | null) => value === null ? null : formatTokens(value);
  const row = (name: string, value: string | null, fallback = 'Unavailable') => (
    <div className={styles.row}><dt>{name}</dt><dd>{value ?? fallback}</dd></div>
  );
  return (
    <PopoverPrimitive.Root>
      <PopoverStyles />
      <PopoverPrimitive.Trigger asChild>
        <Button type="button" variant="ghost" size="sm" className={styles.trigger}
          aria-label={label} aria-controls={cardId} aria-busy={(estimated && running) || undefined}
          data-tone={tone}>
          {max !== null && (
            <svg className={styles.ring} width="16" height="16" viewBox="0 0 16 16"
              aria-hidden="true">
              <circle className={styles.track} cx="8" cy="8" r={RADIUS} />
              <circle className={styles.arc} cx="8" cy="8" r={RADIUS} transform="rotate(-90 8 8)"
                strokeDasharray={`${dash.dash} ${dash.gap}`} />
            </svg>
          )}
          <span className={max !== null ? styles.text : undefined}>{text}</span>
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content id={cardId} className={`${popoverClasses.content} ${styles.card}`}
          align="end" side="top" sideOffset={10} aria-label="Context used, latest model call">
          <h3 className={styles.title}>Context used, latest model call</h3>
          <p className={styles.summary}>
            {estimated ? 'Estimated ' : ''}{formatTokens(used)} tokens
            {max ? ` of ${formatTokens(max)} (${Math.round(percent ?? 0)}%)` : ''}
          </p>
          <dl className={styles.rows}>
            {row('Input', tokens(reading.input), 'Not reported yet')}
            {row('Output', tokens(reading.output), 'Not reported yet')}
            {row('Cost', reading.usd === null ? null : `$${reading.usd.toFixed(4)}`)}
            {row('Model calls in this chat', reading.calls === null ? null : String(reading.calls))}
            {row('Model window', max === null ? null : `${formatTokens(max)} tokens`,
              'Model window unavailable')}
          </dl>
          <p className={styles.note}>
            This shows the latest model call only. Totals for the chat are in{' '}
            {onOpenActivity
              ? (
                <button type="button" className={styles.link} onClick={onOpenActivity}>
                  Activity
                </button>
              )
              : 'Activity'}.
          </p>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
