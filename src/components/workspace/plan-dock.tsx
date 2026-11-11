'use client';

import { useEffect, useState } from 'react';
import { Check, ChevronDown, Circle, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todoSummary, type TodoItem } from '@/lib/agent-todos.mjs';

/** Pinned checklist above the composer: the agent's steps, never tool output. */
export function PlanDock({ items }: { items: TodoItem[] }) {
  const { done, total, allDone, current } = todoSummary(items);
  const [open, setOpen] = useState(!allDone);
  useEffect(() => setOpen(!allDone), [allDone]);
  if (!total) return null;
  return (
    <section className="plan-dock" aria-label="Agent plan">
      <button type="button" className="plan-dock-header" aria-expanded={open} aria-controls="plan-dock-list" onClick={() => setOpen((value) => !value)}>
        <strong>Plan · {done} of {total}</strong>
        {!open && current && <span>{current.title}</span>}
        <ChevronDown size={14} className={cn('plan-dock-chevron', open && 'open')} aria-hidden="true" />
      </button>
      {open && (
        <ol id="plan-dock-list">
          {items.map((item) => (
            <li key={item.id} data-status={item.status}>
              {item.status === 'done' ? <Check size={14} aria-hidden="true" /> : item.status === 'running' ? <Loader2 size={14} className="spin" aria-hidden="true" /> : item.status === 'failed' ? <X size={14} aria-hidden="true" /> : <Circle size={14} aria-hidden="true" />}
              <span>{item.title}</span>
              <span className="sr-only">{item.status}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
