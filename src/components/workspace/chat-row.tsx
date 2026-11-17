'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { Archive, Check, Pencil, Share2, Trash2 } from 'lucide-react';
import { Ellipsis, FolderOpen, Pin } from './sidebar-icons';
import { cn } from '@/lib/utils';
import { hasPendingQuestion, workflowState } from '@/lib/workflow-state';
import { chatChip } from '@/lib/sidebar-history.mjs';
import type { ProjectRow, Run } from './use-workspace-state';
import styles from './sidebar.module.css';

/** One minimal chat row: title only, a text status chip, inline rename and a row menu. */
export function ChatRow({
  item, selected, busy, unread, dialogTrigger, onSelect, onHistory, onDelete, onProjects,
  onRename, moveTargets, onMove, onShare,
}: {
  item: Run;
  selected: boolean;
  busy: boolean;
  unread: boolean;
  dialogTrigger: RefObject<HTMLElement | null>;
  onSelect: () => void;
  onHistory: (action: 'pin' | 'unpin' | 'archive' | 'unarchive') => void;
  onDelete: () => void;
  onProjects: () => void;
  /** Present only when the backend supports renaming. */
  onRename?: (title: string) => Promise<boolean>;
  /** Present only when hosted projects are available. */
  moveTargets?: ProjectRow[];
  onMove?: (projectId: string | null) => void;
  onShare?: () => void;
}) {
  const [editing, setEditing] = useState(false),
    [title, setTitle] = useState(item.title),
    input = useRef<HTMLInputElement>(null),
    select = useRef<HTMLButtonElement>(null),
    skipRestore = useRef(false),
    pendingShare = useRef(false),
    settled = useRef(false);
  useEffect(() => {
    if (editing) {
      settled.current = false;
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  // Commit once (Enter or blur); a failed rename reopens the field with what was typed.
  const commit = async (restoreFocus = false) => {
    if (settled.current) return;
    settled.current = true;
    const next = title.trim();
    setEditing(false);
    try {
      if (next && next !== item.title && onRename && !(await onRename(next))) {
        setTitle(next);
        setEditing(true);
        return;
      }
      if (restoreFocus) select.current?.focus();
    } catch {
      setTitle(next);
      setEditing(true);
    }
  };
  const chip = chatChip(item, workflowState(item), hasPendingQuestion(item));
  return (
    <div className={cn(styles.row, selected && styles.selected)}>
      {editing ? (
        <input
          ref={input}
          className={styles.rename}
          aria-label="Rename chat"
          value={title}
          maxLength={120}
          disabled={busy}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || event.keyCode === 229) return;
            if (event.key === 'Enter') {
              event.preventDefault();
              void commit(true);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              settled.current = true;
              setEditing(false);
              requestAnimationFrame(() => select.current?.focus());
            }
          }}
        />
      ) : (
        <button type="button" ref={select} className={styles.chatButton} disabled={busy} onClick={onSelect}
          aria-current={selected ? 'page' : undefined}>
          <span title={item.title} dir="auto">{item.title}</span>
          {chip && <span className={cn(styles.chip, chip === 'Working' ? styles.chipWorking : styles.chipAttention)}>{chip}</span>}
          {unread && <span className={styles.unread} role="img" aria-label="Unread result" />}
        </button>
      )}
      <div className={styles.chatActions}>
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            type="button"
            className={cn(styles.smallButton, styles.chatMenu)}
            aria-label={`Options for ${item.title}`}
            data-run-id={item.id}
            disabled={busy}
            onClick={(event) => {
              dialogTrigger.current = event.currentTarget;
            }}
          >
            <Ellipsis size={15} strokeWidth={1.9} />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            className="action-menu"
            align="start"
            sideOffset={5}
            onCloseAutoFocus={(event) => {
              if (pendingShare.current) {
                event.preventDefault();
                pendingShare.current = false;
                onShare?.();
                return;
              }
              if (skipRestore.current) {
                event.preventDefault();
                skipRestore.current = false;
              }
            }}
          >
            {onShare && <DropdownMenuPrimitive.Item onSelect={() => { pendingShare.current = true; }}>
              <Share2 size={14} strokeWidth={1.9} /> Share
            </DropdownMenuPrimitive.Item>}
            {onRename && (
              <DropdownMenuPrimitive.Item
                onSelect={() => {
                  skipRestore.current = true;
                  setTitle(item.title);
                  setEditing(true);
                }}
              >
                <Pencil size={14} strokeWidth={1.9} /> Rename
              </DropdownMenuPrimitive.Item>
            )}
            {moveTargets && onMove && (
              <DropdownMenuPrimitive.Sub>
                <DropdownMenuPrimitive.SubTrigger>
                  <FolderOpen size={14} strokeWidth={1.9} /> Move to project
                </DropdownMenuPrimitive.SubTrigger>
                <DropdownMenuPrimitive.Portal>
                  <DropdownMenuPrimitive.SubContent className="action-menu" sideOffset={4}>
                    <DropdownMenuPrimitive.Item disabled={!item.projectId} onSelect={() => onMove(null)}>
                      {item.projectId ? <span className="menu-spacer" /> : <Check size={14} />} No project
                    </DropdownMenuPrimitive.Item>
                    {moveTargets.map((project) => (
                      <DropdownMenuPrimitive.Item
                        key={project.id}
                        disabled={item.projectId === project.id}
                        onSelect={() => onMove(project.id)}
                      >
                        {item.projectId === project.id ? <Check size={14} /> : <span className="menu-spacer" />}{' '}
                        {project.title}
                      </DropdownMenuPrimitive.Item>
                    ))}
                  </DropdownMenuPrimitive.SubContent>
                </DropdownMenuPrimitive.Portal>
              </DropdownMenuPrimitive.Sub>
            )}
            <DropdownMenuPrimitive.Item onSelect={() => onHistory(item.pinned_at ? 'unpin' : 'pin')}>
              <Pin size={14} strokeWidth={1.9} /> {item.pinned_at ? 'Unpin' : 'Pin chat'}
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item onSelect={() => onHistory(item.archived_at ? 'unarchive' : 'archive')}>
              <Archive size={14} strokeWidth={1.9} /> {item.archived_at ? 'Restore chat' : 'Archive'}
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item onSelect={onProjects}>
              <FolderOpen size={14} strokeWidth={1.9} /> Projects &amp; local files
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Separator />
            <DropdownMenuPrimitive.Item className="danger-item" onSelect={onDelete}>
              <Trash2 size={14} strokeWidth={1.9} /> Delete chat
            </DropdownMenuPrimitive.Item>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
      <button type="button" className={cn(styles.smallButton, styles.chatMenu)} disabled={busy}
        aria-label={`${item.pinned_at ? 'Unpin' : 'Pin'} ${item.title}`}
        onClick={() => onHistory(item.pinned_at ? 'unpin' : 'pin')}>
        <Pin size={14} strokeWidth={1.9} aria-hidden="true" />
      </button>
      </div>
    </div>
  );
}
