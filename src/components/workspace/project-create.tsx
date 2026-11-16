'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './sidebar.module.css';

/** Hosted "New project": a "+" that opens a full-width name field below the label (Enter creates at once and reopens with the text if that fails, Escape cancels). */
export function ProjectCreate({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (title: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState(''),
    [pending, setPending] = useState(false),
    trigger = useRef<HTMLButtonElement>(null),
    busy = useRef(false);
  const close = () => {
    setOpen(false);
    setTitle('');
  };
  const create = () => {
    const name = title.trim();
    if (!name || busy.current) return;
    busy.current = true;
    setPending(true);
    close();
    void onCreate(name)
      .then((ok) => {
        if (!ok) {
          setTitle(name);
          setOpen(true);
        }
      })
      .catch(() => { setTitle(name); setOpen(true); })
      .finally(() => {
        busy.current = false;
        setPending(false);
      });
  };
  if (!open)
    return (
      <button
        type="button"
        ref={trigger}
        className={styles.smallButton}
        aria-label="New project"
        title="New project"
        disabled={disabled || pending}
        onClick={() => setOpen(true)}
      >
        <Plus size={15} strokeWidth={1.9} />
      </button>
    );
  return (
    <input
      autoFocus
      className={cn(styles.rename, styles.newProject)}
      aria-label="New project name"
      placeholder="Project name"
      maxLength={120}
      disabled={disabled || pending}
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={close}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
          requestAnimationFrame(() => trigger.current?.focus());
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          create();
        }
      }}
    />
  );
}
