'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';

/** Hosted "New project": a "+" that opens a one-line name field (Enter creates, Escape cancels). */
export function ProjectCreate({
  disabled,
  onCreate,
}: {
  disabled: boolean;
  onCreate: (title: string) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false),
    [title, setTitle] = useState('');
  const close = () => {
    setOpen(false);
    setTitle('');
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
        if (event.key === 'Enter' && title.trim()) {
          event.preventDefault();
          void onCreate(title).then((ok) => ok && close());
        }
      }}
    />
  );
}
