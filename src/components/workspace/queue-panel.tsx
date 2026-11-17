'use client';

import {useRef} from 'react';
import {ArrowUp, MoreHorizontal, X} from 'lucide-react';
import {DropdownMenu as MenuPrimitive} from 'radix-ui';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {dropdownMenuClasses} from '@/components/vendor/affectui/dropdown-menu-clean';
import {PromptContent} from '../prompt-content';

export type QueueRow = {id: string; mode: string; prompt: string};

type Props<T extends QueueRow> = {
  rows: T[];
  max: number;
  /** Why the rows are not running by themselves, or null while they will run in order. */
  pausedText?: string | null;
  notice?: string;
  stopping?: boolean;
  busy?: boolean;
  /** Edit needs an empty box, so the caller says when it cannot work. */
  editDisabled?: boolean;
  onSendNow?(row: T): void;
  onEdit(row: T): void;
  onRemove(row: T): void;
  onResume?(): void;
  /** Where focus goes when Remove leaves no next row. */
  focusComposer?(): void;
};

const modeLabel = (mode: string) => (mode === 'plan' ? 'Plan' : 'Ask');

/** One panel for both queues: the desktop server queue (10) and the browser queue (3). */
export function QueuePanel<T extends QueueRow>(props: Props<T>) {
  const {rows, max, pausedText, notice, stopping, busy, editDisabled, onSendNow, onResume} = props;
  const list = useRef<HTMLOListElement>(null);
  if (!rows.length && !notice) return null;
  // The next row's buttons keep their DOM nodes (keyed rows), so they can take focus right away.
  const focusAfterRemove = (index: number) => {
    const next = list.current?.children[index + 1];
    const target = [...(next?.querySelectorAll('button') ?? [])]
      .find(button => !button.disabled && button.offsetParent !== null);
    if (target) target.focus(); else props.focusComposer?.();
  };
  const sendDisabled = busy || stopping;
  return (
    <div className="prompt-queue" role="region" aria-label="Queued prompts">
      <div className="section-caption">
        QUEUED · {rows.length}/{max}{' '}
        <span role="status">
          {stopping ? 'Stopping…' : pausedText ?? 'Runs after the current turn'}
        </span>
      </div>
      <ol ref={list}>
        {rows.map((row, index) => {
          const send = () => onSendNow?.(row);
          const edit = () => props.onEdit(row);
          const remove = () => { focusAfterRemove(index); props.onRemove(row); };
          return (
            <li key={row.id}>
              <span>
                <strong>{modeLabel(row.mode)}</strong> <PromptContent text={row.prompt} />
              </span>
              <span className="queue-actions">
                {onSendNow && (
                  <button type="button" disabled={sendDisabled} onClick={send}
                    aria-label={`Send now, stopping the current turn: ${row.prompt}`}
                    title="Stop the current turn and send this next">
                    <ArrowUp size={14} aria-hidden="true" />
                  </button>
                )}
                <button type="button" disabled={busy || editDisabled} onClick={edit}
                  aria-label={`Edit queued prompt: ${row.prompt}`}>Edit</button>
                <button type="button" disabled={busy} onClick={remove}
                  aria-label={`Remove queued prompt: ${row.prompt}`}>
                  <X size={14} aria-hidden="true" />
                </button>
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="queue-menu-trigger"
                    aria-label={`Actions for queued prompt: ${row.prompt}`}>
                    <MoreHorizontal size={16} aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" aria-label="Queued prompt actions">
                  {onSendNow && (
                    <MenuPrimitive.Item className={dropdownMenuClasses.item} disabled={sendDisabled}
                      onSelect={send}>Send now</MenuPrimitive.Item>
                  )}
                  <MenuPrimitive.Item className={dropdownMenuClasses.item}
                    disabled={busy || editDisabled} onSelect={edit}>Edit</MenuPrimitive.Item>
                  <MenuPrimitive.Item className={dropdownMenuClasses.item} disabled={busy}
                    onSelect={remove}>Remove</MenuPrimitive.Item>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ol>
      {notice && <p className="queue-notice" role="status">{notice}</p>}
      {onResume && (
        <Button variant="secondary" disabled={busy} onClick={onResume}>Resume queue</Button>
      )}
    </div>
  );
}
