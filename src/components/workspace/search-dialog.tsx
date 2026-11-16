'use client';

import { useEffect, useId, useRef, useState, type RefObject } from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { ArrowUpRight, Folder, MessageSquare, Search, X } from 'lucide-react';
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog';
import { IconButton } from '@/components/vendor/affectui/icon-button-clean';
import { nextSearchIndex, sidebarSearchResults } from '@/lib/sidebar-history.mjs';
import type { ProjectRow, Run } from './use-workspace-state';
import styles from './search-dialog.module.css';

export type SearchResult = ReturnType<typeof sidebarSearchResults>[number];
export type SearchNavigation = { id: string; title: string; disabled?: boolean; onSelect: () => void };

export function SearchDialog({ open, onOpenChange, query, onQueryChange, chats, projects, navigation,
  loading, error, busy, opener, onActivate }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  onQueryChange: (query: string) => void;
  chats: Run[];
  projects: ProjectRow[];
  navigation: SearchNavigation[];
  loading: boolean;
  error: string;
  busy: boolean;
  opener: RefObject<HTMLElement | null>;
  onActivate: (result: SearchResult) => void;
}) {
  const id = useId(), input = useRef<HTMLInputElement>(null), list = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const pending = useRef<SearchResult | null>(null);
  const results = sidebarSearchResults(chats, projects, navigation, query);
  const selected = Math.min(index, results.length - 1);
  useEffect(() => { setIndex(0); }, [query, open]);
  useEffect(() => {
    list.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [selected, query]);
  const activate = (result: SearchResult | undefined) => {
    if (!result || busy && result.kind !== 'navigation') return;
    pending.current = result;
    onOpenChange(false);
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className={styles.overlay} />
        <DialogPrimitive.Content className={styles.panel}
          onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }}
          onCloseAutoFocus={event => {
            event.preventDefault();
            const result = pending.current;
            pending.current = null;
            if (result) onActivate(result);
            else {
              const target = opener.current;
              if (target?.isConnected && target.getClientRects().length && !target.closest('[hidden],[inert]')) target.focus();
              else Array.from(document.querySelectorAll<HTMLButtonElement>('[aria-label="Open workspace navigation"], [aria-label="Show sidebar"], [aria-label="Expand navigation"], [aria-label="DATUMM workspace menu"]')).find(element=>element.getClientRects().length>0&&!element.closest('[hidden],[inert]'))?.focus();
            }
          }}>
          <DialogTitle className={styles.srOnly}>Search</DialogTitle>
          <DialogDescription className={styles.srOnly}>Search loaded chats and projects, or go to a workspace view.</DialogDescription>
          <div className={styles.searchRow}>
            <Search size={17} aria-hidden="true" />
            <input ref={input} role="combobox" aria-label="Search loaded chats and projects" aria-autocomplete="list"
              aria-expanded="true" aria-controls={`${id}-results`}
              aria-activedescendant={selected >= 0 ? `${id}-result-${selected}` : undefined}
              value={query} placeholder="Search chats, projects and actions…"
              onChange={event => onQueryChange(event.target.value)}
              onKeyDown={event => {
                if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  setIndex(nextSearchIndex(selected, results.length, event.key));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  activate(results[selected]);
                }
              }} />
            {query && <IconButton label="Clear search" size="sm" icon={<X size={14} />}
              onClick={() => { onQueryChange(''); input.current?.focus(); }} />}
          </div>
          <div ref={list} id={`${id}-results`} className={styles.results} role="listbox" aria-label="Search results" aria-busy={loading}>
            {loading && <p className={styles.notice} role="status">Loading chat history…</p>}
            {error && <p className={styles.notice} role="status">History could not refresh. Search covers records already loaded. Retry the connection in the workspace.</p>}
            {results.map((result, position) => (
              <div key={`${result.kind}:${result.id}`}>
                {(position === 0 || results[position - 1].kind !== result.kind) &&
                  <div className={styles.group}>{result.kind === 'chat' ? 'Chats' : result.kind === 'project' ? 'Projects' : 'Navigation'}</div>}
                <button type="button" role="option" tabIndex={-1} id={`${id}-result-${position}`}
                  aria-selected={selected === position} disabled={busy && result.kind !== 'navigation'} className={styles.option}
                  onMouseDown={event => event.preventDefault()} onMouseMove={() => setIndex(position)} onClick={() => activate(result)}>
                  {result.kind === 'chat' ? <MessageSquare size={15} /> : result.kind === 'project' ? <Folder size={15} /> : <ArrowUpRight size={15} />}
                  <span className={styles.title} title={result.title} dir="auto">{result.title}</span>
                  <span className={styles.detail} title={result.detail}>{result.detail}</span>
                </button>
              </div>
            ))}
            {!loading && !results.length && <p className={styles.notice} role="status">
              {query.trim() ? 'No matching loaded chats, projects or actions.' : 'No saved chats or projects are loaded yet.'}
            </p>}
          </div>
          <footer className={styles.footer}><span>Searches loaded records</span><span>↑ ↓ navigate <kbd>Enter</kbd> open <kbd>Esc</kbd> close</span></footer>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}
