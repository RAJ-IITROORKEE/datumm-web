'use client';

import { Check, CircleDashed, CircleHelp, X } from 'lucide-react';
import { todoSummary, type TodoItem } from '@/lib/agent-todos.mjs';
import styles from './plan-dock.module.css';

/** Contextual recorded checklist beside its answer; never inferred from tool activity. */
export function PlanDock({ items, title = 'Plan', note }: { items: TodoItem[]; title?: string; note?: string }) {
  const { done, total } = todoSummary(items);
  if (!total) return null;
  return (
    <section className={styles.plan} aria-label={title}>
      <div className={styles.heading}><span>{title}</span><small>{done} of {total}</small></div>
      {note && <p className={styles.note}>{note}</p>}
        <ol className={styles.list}>
          {items.map((item) => (
            <li key={item.id} data-status={item.status}>
              {item.status === 'done' ? <Check size={14} aria-hidden="true" /> : item.status === 'failed' ? <X size={14} aria-hidden="true" /> : ['unconfirmed', 'unknown'].includes(item.status) ? <CircleHelp size={14} aria-hidden="true" /> : <CircleDashed size={14} aria-hidden="true" />}
              <span>{item.title}</span>
              <small className={['unconfirmed', 'failed', 'stopped', 'partial', 'unknown'].includes(item.status) ? styles.state : 'sr-only'}>{item.status === 'unconfirmed' ? 'Outcome unconfirmed' : item.status === 'done' ? 'Completed' : item.status === 'partial' ? 'Partially complete' : item.status}</small>
            </li>
          ))}
        </ol>
    </section>
  );
}
