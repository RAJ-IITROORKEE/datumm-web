'use client';
import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, Loader2, Plus, Save, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ResultState, useAdminConfig } from './use-admin';
import type { AdminConfig } from '@/lib/admin-config.mjs';

export function PageHeader({ title, description }: { title: string; description?: string }) {
  return <div className="mb-6"><h1 className="text-xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>}</div>;
}

/** Label + control + hint + error wired together for screen readers. `children` receives the props to spread on the control. */
export function Field({ label, hint, error, children, className }: { label: string; hint?: string; error?: string; className?: string; children: (p: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => ReactNode }) {
  const id = useId(), note = `${id}-note`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium">{label}</label>
      {children({ id, 'aria-describedby': hint || error ? note : undefined, 'aria-invalid': error ? true : undefined })}
      {(error || hint) && <p id={note} className={`mt-1 text-xs ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{error || hint}</p>}
    </div>
  );
}

/** Chips with remove buttons and an add field (Enter or button). */
export function ChipList({ label, values, onChange, max, normalize = (v: string) => v.trim(), placeholder, error, hint }: { label: string; values: string[]; onChange: (v: string[]) => void; max: number; normalize?: (v: string) => string; placeholder?: string; error?: string; hint?: string }) {
  const [text, setText] = useState('');
  const add = () => { const v = normalize(text); if (v && !values.includes(v) && values.length < max) onChange([...values, v]); setText(''); };
  return (
    <Field label={label} error={error} hint={hint ?? `${values.length} of ${max}`}>
      {p => (
        <>
          <ul className="mb-2 flex flex-wrap gap-1.5" aria-label={label}>
            {values.map(v => (
              <li key={v}><Badge variant="secondary" className="max-w-full gap-1 py-1 pr-1"><span className="truncate">{v}</span>
                <button type="button" aria-label={`Remove ${v}`} className="rounded-full p-0.5 hover:bg-background focus-visible:ring-2 focus-visible:ring-ring" onClick={() => onChange(values.filter(x => x !== v))}><X /></button></Badge></li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Input {...p} value={text} placeholder={placeholder} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }} />
            <Button type="button" variant="outline" onClick={add} disabled={!text.trim() || values.length >= max}><Plus /> Add</Button>
          </div>
        </>
      )}
    </Field>
  );
}

/** Collapsible list row used by Skills and MCP servers. */
export function ItemCard({ title, subtitle, badges, open, onToggle, onRemove, children }: { title: string; subtitle: string; badges?: ReactNode; open: boolean; onToggle: () => void; onRemove: () => void; children: ReactNode }) {
  const id = useId();
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 p-2">
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-2 text-left hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} aria-hidden />
          <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{title}</span><span className="block truncate text-xs text-muted-foreground">{subtitle}</span></span>
          <span className="hidden shrink-0 gap-1.5 sm:flex">{badges}</span>
        </button>
        <Button type="button" variant="ghost" size="icon" aria-label={`Delete ${title}`} onClick={onRemove}><Trash2 /></Button>
      </div>
      {open && <div id={id} className="grid gap-4 border-t p-4">{children}</div>}
    </div>
  );
}

/** Loads the config and wraps a section in dirty-aware save controls. */
export function ConfigPage({ title, description, children }: { title: string; description: string; children: (c: { draft: AdminConfig; update: (p: Partial<AdminConfig>) => void; errors: Record<string, string>; effective: Record<string, unknown> }) => ReactNode }) {
  const c = useAdminConfig();
  const count = Object.keys(c.errors).length;
  return (
    <>
      <PageHeader title={title} description={description} />
      <ResultState result={c.result} onRetry={c.reload} />
      {c.draft && c.base && (
        <form className="grid gap-6 pb-24" onSubmit={e => { e.preventDefault(); void c.save(); }} noValidate>
          {c.saveResult && !c.saveResult.ok && c.saveResult.reason === 'stale'
            ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-[var(--trace-thought)]/40 bg-card p-4 text-sm"><span className="flex-1">The config was saved by someone else. Reload to see their version (your edits here will be discarded).</span><Button type="button" variant="outline" size="sm" onClick={c.reload}>Reload</Button></div>
            : <ResultState result={c.saveResult} />}
          {children({ draft: c.draft, update: c.update, errors: c.errors, effective: c.base.effective })}
          <div className="fixed right-0 bottom-0 z-30 border-t bg-card/95 px-4 py-3 backdrop-blur" style={{ left: 'var(--admin-sidebar, 0px)' }}>
            <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-3">
              <p role="status" className="min-w-0 flex-1 text-xs text-muted-foreground">
                {count ? <span className="text-destructive">{count} field{count > 1 ? 's' : ''} need attention.</span> : c.saving ? 'Saving…' : c.saved && !c.dirty ? 'Saved.' : c.dirty ? 'Unsaved changes.' : `Revision ${c.base.revision}${c.base.updatedBy ? ` by ${c.base.updatedBy}` : ''}.`}
              </p>
              <Button type="button" variant="ghost" disabled={!c.dirty || c.saving} onClick={c.reload}>Discard</Button>
              <Button type="submit" disabled={!c.dirty || c.saving || count > 0}>{c.saving ? <Loader2 className="animate-spin" /> : <Save />} Save changes</Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
