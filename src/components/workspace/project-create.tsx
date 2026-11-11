'use client';

import { useRef, useState } from 'react';
import { Plus } from 'lucide-react';

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
    busy = useRef(false);
  const close = () => {
    setOpen(false);
    setTitle('');
  };
  const create = () => {
    const name = title.trim();
    if (!name || busy.current) return;
    busy.current = true;
    close();
    void onCreate(name)
      .then((ok) => {
        if (!ok) {
          setTitle(name);
          setOpen(true);
        }
      })
      .finally(() => {
        busy.current = false;
      });
  };
  if (!open)
    return (
      <button
        className="icon-button"
        aria-label="New project"
        title="New project"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Plus size={15} />
      </button>
    );
  return (
    <input
      autoFocus
      className="history-rename project-new"
      aria-label="New project name"
      placeholder="Project name"
      maxLength={120}
      value={title}
      onChange={(event) => setTitle(event.target.value)}
      onBlur={close}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          close();
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          create();
        }
      }}
    />
  );
}
