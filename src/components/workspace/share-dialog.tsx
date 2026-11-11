'use client';

import { useEffect, useState } from 'react';
import { Check, Copy, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { shareToken, shareUrl } from '@/lib/share.mjs';
import { api, notSupported } from './use-workspace-state';

/** Share button for the chat header: create, copy and stop a public read-only link. Hidden while the backend has no share route. */
export function ShareButton({ taskId }: { taskId?: string }) {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const path = `tasks/${taskId}/share`;
  useEffect(() => {
    setToken(null); setError(''); setCopied(false);
    if (!open || !taskId) return;
    let live = true;
    api<{ token?: string | null }>(path).then(
      (body) => live && setToken(shareToken(body)),
      (failure) => { if (!live) return; if (notSupported(failure)) { setSupported(false); setOpen(false); } else setError('Could not check sharing. Try again.'); },
    );
    return () => { live = false; };
  }, [open, taskId, path]);
  if (!taskId || !supported) return null;
  const change = async (method: 'POST' | 'DELETE') => {
    setBusy(true); setError(''); setCopied(false);
    try {
      const body = await api<{ token?: string }>(path, method);
      setToken(method === 'POST' ? shareToken(body) : null);
    } catch { setError(method === 'POST' ? 'Could not create the link.' : 'Could not stop sharing.'); }
    setBusy(false);
  };
  const url = token ? shareUrl(window.location.origin, token) : '';
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); } catch { setError('Copy failed. Select the link and copy it manually.'); }
  };
  return (
    <>
      <button type="button" className="desktop-panel-toggle share-button" aria-label="Share chat" title="Share chat" onClick={() => setOpen(true)}><Share2 size={16} /><span>Share</span></button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="share-dialog">
          <DialogHeader>
            <DialogTitle>Share this chat</DialogTitle>
            <DialogDescription>Anyone with the link can read this conversation, its steps, sources and plan. They cannot edit it or see your project.</DialogDescription>
          </DialogHeader>
          {token ? (
            <div className="share-link">
              <input readOnly value={url} aria-label="Share link" onFocus={(event) => event.currentTarget.select()} />
              <Button type="button" variant="secondary" onClick={() => void copy()}>{copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />} {copied ? 'Copied' : 'Copy'}</Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => void change('DELETE')}>Stop sharing</Button>
            </div>
          ) : (
            <Button type="button" disabled={busy} onClick={() => void change('POST')}>{busy ? 'Creating…' : 'Create link'}</Button>
          )}
          <p className="sr-only" role="status" aria-live="polite">{copied ? 'Link copied to clipboard' : ''}</p>
          {error && <p role="alert" className="share-error">{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
