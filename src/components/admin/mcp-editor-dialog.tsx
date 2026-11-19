'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  blankForm, formFrom, resetsTools, validateForm,
  type McpFailure, type McpForm, type McpServer,
} from '@/lib/admin-mcp.mjs';
import { Field } from './form';
import styles from './mcp-section.module.css';

/** Add or edit one server. The key lives in this form only until Save is pressed. */
export function McpEditorDialog({ server, ids, secretsAvailable, onSubmit, onClose }: {
  server: McpServer | null; ids: string[]; secretsAvailable: boolean;
  onSubmit: (form: McpForm) => Promise<McpFailure | null>; onClose: () => void;
}) {
  const [form, setForm] = useState<McpForm>(server ? formFrom(server) : blankForm());
  const [shown, setShown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<McpFailure | null>(null);
  const errors = validateForm(form, { server, ids, secretsAvailable });
  const set = (patch: Partial<McpForm>) => setForm(current => ({ ...current, ...patch }));
  const show = (field: keyof McpForm) => (shown || failure) && (errors[field] ?? failure?.fields[field]);
  const submit = async () => {
    setShown(true);
    if (busy || Object.keys(errors).length) return;
    setBusy(true); setFailure(null);
    const sent = form;
    // The key leaves this component's state as it is sent; a failed save asks for it again.
    set({ key: '' });
    const failed = await onSubmit(sent);
    if (failed) { setFailure(failed); setBusy(false); }
  };
  const hasKey = Boolean(server?.hasKey);
  return (
    <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{server ? `Edit ${server.id}` : 'Add an MCP server'}</DialogTitle>
          <DialogDescription>
            An outside service the agent can call. Its tools and answers are treated as untrusted.
          </DialogDescription>
        </DialogHeader>
        <form className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void submit(); }}>
          {!server && (
            <Field label="Id" hint="Lowercase letters, digits and dashes. It cannot be changed later."
              error={show('id') || undefined}>
              {p => <Input {...p} value={form.id} maxLength={20} autoComplete="off"
                onChange={event => set({ id: event.target.value })} />}
            </Field>
          )}
          <Field label="Name" error={show('name') || undefined}>
            {p => <Input {...p} value={form.name} maxLength={120}
              onChange={event => set({ name: event.target.value })} />}
          </Field>
          <Field label="Address" hint="An https:// address, with no key, ? or # in it."
            error={show('url') || undefined}>
            {p => <Input {...p} type="url" value={form.url} maxLength={300} autoComplete="off"
              onChange={event => set({ url: event.target.value })} />}
          </Field>
          <Field label="Header name (optional)"
            hint={server ? 'For example Authorization. Clear it to remove the saved key.'
              : 'The header that carries the key, for example Authorization.'}
            error={show('authHeader') || undefined}>
            {p => <Input {...p} value={form.authHeader} maxLength={40} autoComplete="off"
              onChange={event => set({ authHeader: event.target.value })} />}
          </Field>
          <Field label="Key (optional)"
            hint={!secretsAvailable ? 'Keys cannot be saved until the server key is set up.'
              : hasKey ? 'Key saved. Leave this empty to keep it. A key is never shown again.'
                : 'It is sealed on the server and never shown again.'}
            error={show('key') || undefined}>
            {p => <Input {...p} type="password" value={form.key} maxLength={500}
              autoComplete="new-password" spellCheck={false} disabled={!secretsAvailable}
              onChange={event => set({ key: event.target.value })} />}
          </Field>
          {server && resetsTools(form, server) && (
            <p role="status" className={styles.hint}>
              Saving these changes turns the server off and clears its tools until it passes a new test.
              {!form.authHeader.trim() && server.hasKey ? ' The saved key is removed.' : ''}
            </p>
          )}
          {failure?.message && (
            <p role="alert" className={styles.error}>
              {failure.message}{failure.stale ? '' : ' Enter the key again if you set one.'}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="animate-spin" aria-hidden />}
              {server ? 'Save changes' : 'Add server'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
