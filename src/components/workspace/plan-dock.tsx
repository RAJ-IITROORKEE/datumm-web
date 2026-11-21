'use client';

import { Check, CircleDashed, CircleHelp, X } from 'lucide-react';
import { todoSummary, type TodoItem } from '@/lib/agent-todos.mjs';
import styles from './plan-dock.module.css';

/** Contextual recorded checklist beside its answer; never inferred from tool activity. */
export function PlanDock({ items, title = 'Plan', note }: { items: TodoItem[]; title?: string; note?: string }) {
  const { done, total, optional } = todoSummary(items);
  if (!items.length) return null;
  const progress = total ? `${done} of ${total}${optional ? ' required' : ''}` : `${optional} optional`;
  return (
    <section className={styles.plan} aria-label={title}>
      <div className={styles.heading}><span>{title}</span><small>{progress}</small></div>
      {note && <p className={styles.note}>{note}</p>}
        <ol className={styles.list}>
          {items.map((item) => (
            <li key={item.id} data-status={item.status}>
              {item.status === 'done' ? <Check size={14} aria-hidden="true" /> : item.status === 'failed' ? <X size={14} aria-hidden="true" /> : ['unconfirmed', 'unknown'].includes(item.status) ? <CircleHelp size={14} aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />}
              <span>{item.title}{item.required === false && ' (optional)'}</span>
              <small className={['unconfirmed', 'failed', 'stopped', 'partial', 'skipped', 'unknown'].includes(item.status) ? styles.state : 'sr-only'}>{item.status === 'unconfirmed' ? 'Outcome unconfirmed' : item.status === 'done' ? 'Completed' : item.status === 'partial' ? 'Partially complete' : item.status === 'skipped' ? 'Skipped' : item.status}</small>
            </li>
          ))}
        </ol>
    </section>
  );
}
