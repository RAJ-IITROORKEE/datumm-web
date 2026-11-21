'use client';

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { hasPendingQuestion } from '@/lib/workflow-state';
import type { ProjectRow, Run } from './use-workspace-state';
import { ProjectFiles } from './project-files';
import styles from './project-overview.module.css';

type Props = {
  project: ProjectRow | null;
  chats: Run[];
  historyView: 'recent' | 'archived';
  busy: boolean;
  opener: React.RefObject<HTMLElement | null>;
  filesAccountKey?: string;
  onClose: () => void;
  onSelect: (chat: Run) => void;
  onNewChat: (projectId: string) => void;
};

export function ProjectOverview({ project, chats, historyView, busy, opener, onClose, onSelect, onNewChat, filesAccountKey }: Props) {
  const pending = useRef<(() => void) | null>(null);
  const [selection, setSelection] = useState<{ projectId: string | null; filter: 'all' | 'running' | 'input' }>({ projectId: project?.id ?? null, filter: 'all' });
  const projectId = project?.id ?? null;
  const filesScope = filesAccountKey && project && !project.archived_at ? JSON.stringify([filesAccountKey,project.id]) : undefined;
  const [filesView, setFilesView] = useState<string>();
  const showFiles = Boolean(filesScope && filesView === filesScope);
  useEffect(() => { setFilesView(undefined); },[filesScope]);
  const filter = selection.projectId === projectId ? selection.filter : 'all';
  useEffect(() => { setSelection({ projectId, filter: 'all' }); }, [projectId]);
  const currentChats = useRef(chats);
  currentChats.current = chats;
  const matching = project ? chats.filter(chat => chat.projectId === project.id) : [];
  const running = matching.filter(chat => ['queued', 'running'].includes(chat.status));
  const needsInput = matching.filter(hasPendingQuestion);
  const visible = filter === 'running' ? running : filter === 'input' ? needsInput : matching;
  const choose = (action: () => void) => {
    if (busy) return;
    pending.current = action;
    onClose();
  };
  return <Dialog open={Boolean(project)} onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent className={showFiles ? styles.filesPanel : styles.panel} onCloseAutoFocus={event => {
      event.preventDefault();
      const action = pending.current;
      pending.current = null;
      if (action) { action(); return; }
      const target = opener.current;
      if (target?.isConnected && target.getClientRects().length && !target.closest('[hidden],[inert]')) target.focus();
      else Array.from(document.querySelectorAll<HTMLElement>('#sidebar-projects,[aria-label="Open workspace navigation"],[aria-label="Expand navigation"],[aria-label="Show sidebar"]')).find(element => element.getClientRects().length && !element.closest('[hidden],[inert]'))?.focus();
    }}>
      <DialogHeader><DialogTitle dir="auto">{project?.title}</DialogTitle>
        <DialogDescription>{showFiles ? 'Manage files and exact revisions for this project.' :
          'Browse ' + (historyView === 'archived' ? 'archived' : 'recent') + ' chats currently loaded in this workspace.'}</DialogDescription>
      </DialogHeader>
      {filesScope && <div className={styles.filters} role="group" aria-label="Project views">
        <button type="button" className={styles.filter} aria-pressed={!showFiles} onClick={() => setFilesView(undefined)}>Chats</button>
        <button type="button" className={styles.filter} aria-pressed={showFiles} onClick={() => setFilesView(filesScope)}>Files</button>
      </div>}
      {showFiles && project ? <ProjectFiles key={filesScope} projectId={project.id} archived={Boolean(project.archived_at)}/> : <>
      <div className={styles.filters} role="group" aria-label="Filter loaded project chats">
        {([['all', 'All', matching.length], ['running', 'Running', running.length], ['input', 'Needs your input', needsInput.length]] as const).map(([value, label, count]) =>
          <button key={value} type="button" className={styles.filter} aria-pressed={filter === value} onClick={() => setSelection({ projectId, filter: value })}>{label} <span aria-label={`${count} loaded chats`}>{count}</span></button>)}
      </div>
      <div className={styles.list} aria-label="Project chats">
        {visible.length ? visible.map(chat => <button key={chat.id} type="button" className={styles.chat} disabled={busy} onClick={() => choose(() => { const current = currentChats.current.find(item => item.id === chat.id && item.projectId === project?.id); if (current) onSelect(current); })} dir="auto">{chat.title}</button>) : <p className={styles.empty}>{filter === 'all' ? `No loaded ${historyView === 'archived' ? 'archived' : 'recent'} chats in this project.` : filter === 'running' ? 'No loaded chats are running in this project.' : 'No loaded chats need your input in this project.'}</p>}
      </div>
      {project && !project.archived_at && <Button disabled={busy} onClick={() => choose(() => onNewChat(project.id))}>New chat in project</Button>}
      </>}
    </DialogContent>
  </Dialog>;
}
