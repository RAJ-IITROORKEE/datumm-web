'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';
import { Archive, Check, CircleHelp, Ellipsis, FolderOpen, Pencil, Pin, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hasPendingQuestion, workflowState } from '@/lib/workflow-state';
import type { ProjectRow, Run } from './use-workspace-state';

/** One minimal chat row: title only, status dots, inline rename and a row menu. */
export function ChatRow({
  item, selected, busy, unread, dialogTrigger, onSelect, onHistory, onDelete, onProjects,
  onRename, moveTargets, onMove,
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
}) {
  const [editing, setEditing] = useState(false),
    [title, setTitle] = useState(item.title),
    input = useRef<HTMLInputElement>(null),
    skipRestore = useRef(false),
    settled = useRef(false);
  useEffect(() => {
    if (editing) {
      settled.current = false;
      input.current?.focus();
      input.current?.select();
    }
  }, [editing]);
  // Commit once (Enter or blur); a failed rename reopens the field with what was typed.
  const commit = async () => {
    if (settled.current) return;
    settled.current = true;
    const next = title.trim();
    setEditing(false);
    if (next && next !== item.title && onRename && !(await onRename(next))) {
      setTitle(next);
      setEditing(true);
    }
  };
  const running = ['queued', 'running'].includes(item.status) && workflowState(item).kind === 'in_progress';
  return (
    <div className={cn('history-row', selected && 'selected')}>
      {editing ? (
        <input
          ref={input}
          className="history-rename"
          aria-label="Rename chat"
          value={title}
          maxLength={120}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void commit();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              settled.current = true;
              setEditing(false);
            }
          }}
        />
      ) : (
        <button className="history-item" disabled={busy} onClick={onSelect}>
          <span title={item.title}>{item.title}</span>
          {running && <span className="chat-running" role="img" aria-label="Chat running" />}
          {hasPendingQuestion(item) && (
            <CircleHelp size={12} className="chat-attention" aria-label="Chat needs your answer" />
          )}
          {['failed', 'interrupted'].includes(item.status) && (
            <span className="chat-error" role="img" aria-label="Chat failed" />
          )}
          {unread && <span className="chat-unread" role="img" aria-label="Unread result" />}
        </button>
      )}
      <DropdownMenuPrimitive.Root>
        <DropdownMenuPrimitive.Trigger asChild>
          <button
            className="icon-button task-menu-trigger"
            aria-label={`Options for ${item.title}`}
            data-run-id={item.id}
            disabled={busy}
            onClick={(event) => {
              dialogTrigger.current = event.currentTarget;
            }}
          >
            <Ellipsis size={16} />
          </button>
        </DropdownMenuPrimitive.Trigger>
        <DropdownMenuPrimitive.Portal>
          <DropdownMenuPrimitive.Content
            className="action-menu"
            align="start"
            sideOffset={5}
            onCloseAutoFocus={(event) => {
              if (skipRestore.current) {
                event.preventDefault();
                skipRestore.current = false;
              }
            }}
          >
            {onRename && (
              <DropdownMenuPrimitive.Item
                onSelect={() => {
                  skipRestore.current = true;
                  setTitle(item.title);
                  setEditing(true);
                }}
              >
                <Pencil size={14} /> Rename
              </DropdownMenuPrimitive.Item>
            )}
            {moveTargets && onMove && (
              <DropdownMenuPrimitive.Sub>
                <DropdownMenuPrimitive.SubTrigger>
                  <FolderOpen size={14} /> Move to project
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
              <Pin size={14} /> {item.pinned_at ? 'Unpin' : 'Pin chat'}
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item onSelect={() => onHistory(item.archived_at ? 'unarchive' : 'archive')}>
              <Archive size={14} /> {item.archived_at ? 'Restore chat' : 'Archive'}
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Item onSelect={onProjects}>
              <FolderOpen size={14} /> Projects &amp; local files
            </DropdownMenuPrimitive.Item>
            <DropdownMenuPrimitive.Separator />
            <DropdownMenuPrimitive.Item className="danger-item" onSelect={onDelete}>
              <Trash2 size={14} /> Delete chat
            </DropdownMenuPrimitive.Item>
          </DropdownMenuPrimitive.Content>
        </DropdownMenuPrimitive.Portal>
      </DropdownMenuPrimitive.Root>
    </div>
  );
}
