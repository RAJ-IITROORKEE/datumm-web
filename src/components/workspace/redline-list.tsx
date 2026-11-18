'use client';
import {Check} from 'lucide-react';
import {applyLabel, canTick, confidenceLabel, type RedlineItem} from '@/lib/redlines.mjs';
import {Badge} from '../ui/badge';
import {Button} from '../ui/button';
import styles from './redline-panel.module.css';

type Props = {
  items: RedlineItem[];
  ticked: string[];
  applied: string[];
  /** The ticked items still to apply. */
  queued: number;
  off: boolean;
  onToggle: (id: string) => void;
  onApply: () => void;
};

/** The changes the model read, to tick and apply. The mark is shown as plain text only. */
export function RedlineList({items, ticked, applied, queued, off, onToggle, onApply}: Props) {
  if (!items.length) {
    return <p className={styles.muted} role="status">No changes were found on this page.</p>;
  }
  return (
    <>
      <p className={styles.muted}>
        Read from your markup by a model. Check each change before applying.
      </p>
      <ul className={styles.list} aria-label="Changes read from the markup">
        {items.map((item) => {
          const done = applied.includes(item.id);
          const tickable = canTick(item) && !done;
          return (
            <li key={item.id} className={styles.item} data-status={done ? 'applied' : item.status}>
              <input
                id={`redline-${item.id}`}
                type="checkbox"
                checked={done || ticked.includes(item.id)}
                disabled={off || !tickable}
                aria-describedby={`redline-note-${item.id}`}
                onChange={() => onToggle(item.id)}
              />
              <div className={styles.body}>
                <label htmlFor={`redline-${item.id}`} className={styles.summary}>
                  {item.summary}
                </label>
                <p id={`redline-note-${item.id}`} className={styles.note}>
                  Marked: “{item.mark}”
                  {item.status === 'unclear' && ` · Not applied: ${item.reason}`}
                </p>
                <span className={styles.tags}>
                  <Badge variant="secondary">{confidenceLabel(item.confidence)}</Badge>
                  {done && (
                    <Badge variant="outline"><Check size={12} aria-hidden="true" />Applied</Badge>
                  )}
                  {item.status === 'unclear' && <Badge variant="outline">Cannot be applied</Badge>}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <Button size="sm" disabled={off || queued === 0} onClick={onApply}>
        {applyLabel(queued)}
      </Button>
    </>
  );
}
