'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { shareToken, shareUrl } from '@/lib/share.mjs';
import { api, notSupported } from './use-workspace-state';

/** Native titlebar entry; the web entry lives in the saved chat menu. */
export function ShareButton({ taskId }: { taskId?: string }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const opener = useRef<HTMLButtonElement | null>(null);
  if (!taskId || !supported) return null;
  return <>
    <button ref={opener} type="button" className="desktop-panel-toggle share-button" aria-label="Share chat" title="Share chat" onClick={() => setOpen(true)}><Share2 size={16} /><span>Share</span></button>
    {open && <ShareDialog taskId={taskId} opener={opener} onClose={() => setOpen(false)} onUnsupported={() => { setSupported(false); setOpen(false); }} />}
  </>;
}

/** Mounted once per task/open generation; mutations and clipboard feedback die with that owner. */
export function ShareDialog({taskId, title, opener, onClose, onUnsupported}: {
  taskId: string;
  title?: string;
  opener: RefObject<HTMLElement | null>;
  onClose: () => void;
  onUnsupported: () => void;
}) {
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const lifetime = useRef(0);
  const unavailable = useRef(onUnsupported); unavailable.current = onUnsupported;
  const path = `tasks/${taskId}/share`;
  useEffect(() => {
    const generation = ++lifetime.current;
    setToken(null); setError(''); setCopied(false);
    setBusy(true);
    api<{ token?: string | null }>(path).then(
      (body) => { if (lifetime.current === generation) setToken(shareToken(body)); },
      (failure) => { if (lifetime.current !== generation) return; if (notSupported(failure)) unavailable.current(); else setError('Could not check sharing. Try again.'); },
    ).finally(() => { if (lifetime.current === generation) setBusy(false); });
    return () => { lifetime.current++; };
  }, [taskId, path]);
  const change = async (method: 'POST' | 'DELETE') => {
    if (busy) return;
    const generation = lifetime.current;
    setBusy(true); setError(''); setCopied(false);
    try {
      const body = await api<{ token?: string }>(path, method);
      if (lifetime.current !== generation) return;
      setToken(method === 'POST' ? shareToken(body) : null);
    } catch { if (lifetime.current === generation) setError(method === 'POST' ? 'Could not create the link.' : 'Could not stop sharing.'); }
    if (lifetime.current === generation) setBusy(false);
  };
  const url = token ? shareUrl(window.location.origin, token) : '';
  const copy = async () => {
    const generation = lifetime.current;
    try { await navigator.clipboard.writeText(url); if (lifetime.current === generation) setCopied(true); } catch { if (lifetime.current === generation) setError('Copy failed. Select the link and copy it manually.'); }
  };
  return (
      <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
        <DialogContent onCloseAutoFocus={event => {
          event.preventDefault();
          const candidates = [opener.current, ...document.querySelectorAll<HTMLElement>('[aria-label="Open workspace navigation"], [aria-label="Expand navigation"], [aria-label="Show sidebar"]')];
          candidates.find(element => element?.isConnected && element.getClientRects().length > 0 && !element.closest('[inert], [aria-hidden="true"]'))?.focus();
        }}>
          <DialogHeader>
            <DialogTitle>Share this chat</DialogTitle>
            <DialogDescription>{title ? `Share “${title}”. ` : ''}Anyone with the link can read this conversation, its steps, sources and plan. They cannot edit it or see your project.</DialogDescription>
          </DialogHeader>
          {token ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Input className="w-full min-w-0 basis-full" readOnly value={url} aria-label="Share link" onFocus={(event) => event.currentTarget.select()} />
              <Button type="button" variant="secondary" onClick={() => void copy()}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void change('DELETE')}>Stop sharing</Button>
            </div>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void change('POST')}>{busy ? 'Loading…' : 'Create link'}</Button>
          )}
          <p className="sr-only" role="status" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</p>
          {error && <p role="alert" className="break-words text-[13px] leading-5 text-destructive">{error}</p>}
        </DialogContent>
      </Dialog>
  );
}
