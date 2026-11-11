'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emptyConfig, sameConfig, validateConfig, type AdminConfig } from '@/lib/admin-config.mjs';

export type Fail = 'missing' | 'forbidden' | 'stale' | 'error';
export type Result<T> = { ok: true; data: T } | { ok: false; reason: Fail; message: string };

/** Admin call through the same-origin service proxy; 404, 403 and 409 get their own friendly states. */
export async function adminCall<T>(path: string, init?: { method?: string; body?: unknown }): Promise<Result<T>> {
  try {
    const response = await fetch(`/api/service/${path}`, { method: init?.method ?? 'GET', cache: 'no-store', headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: init?.body === undefined ? undefined : JSON.stringify(init.body) });
    if (response.ok) return { ok: true, data: (response.status === 204 ? null : await response.json().catch(() => null)) as T };
    const detail = await response.json().then(b => (typeof b?.detail === 'string' ? b.detail : ''), () => '');
    const reason: Fail = response.status === 404 ? 'missing' : response.status === 403 ? 'forbidden' : response.status === 409 ? 'stale' : 'error';
    return { ok: false, reason, message: detail || `Request failed (${response.status}).` };
  } catch {
    return { ok: false, reason: 'error', message: 'Could not reach the service. Check your connection.' };
  }
}

/** Loads a GET resource; `pollMs(data)` (optional) returns a refresh interval or 0 to stop. */
export function useAdminResource<T>(path: string, pollMs?: (data: T) => number) {
  const [result, setResult] = useState<Result<T> | null>(null);
  const pollRef = useRef(pollMs);
  pollRef.current = pollMs;
  const load = useCallback(async () => { setResult(await adminCall<T>(path)); }, [path]);
  useEffect(() => { void load(); }, [load]);
  const data = result?.ok ? result.data : null;
  const interval = data ? pollRef.current?.(data) ?? 0 : 0;
  useEffect(() => {
    if (!interval) return;
    const timer = setInterval(() => { if (!document.hidden) void load(); }, interval);
    return () => clearInterval(timer);
  }, [interval, load]);
  return { result, load, data };
}

/** Friendly banner for every non-success state; renders nothing for a good result. */
export function ResultState({ result, onRetry }: { result: Result<unknown> | null; onRetry?: () => void }) {
  if (!result) return <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading…</p>;
  if (result.ok) return null;
  const copy = {
    missing: ['Backend not deployed yet', 'The admin API is not available on the backend yet. Nothing here can be saved until it is deployed.'],
    forbidden: ['Backend admin access not configured', 'The backend rejected this account. Add your Clerk user id to ADMIN_SUBJECTS on the backend.'],
    stale: ['Changed elsewhere', 'Someone else saved a newer version. Reload to continue from it.'],
    error: ['Something went wrong', result.message],
  }[result.reason];
  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-lg border border-[var(--trace-thought)]/40 bg-card p-4 text-sm">
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--trace-thought)]" aria-hidden />
      <div className="min-w-0 flex-1"><p className="font-medium">{copy[0]}</p><p className="text-muted-foreground">{copy[1]}</p></div>
      {onRetry && <Button variant="outline" size="sm" onClick={onRetry}><RefreshCw /> Retry</Button>}
    </div>
  );
}

export type ConfigEnvelope = { config: AdminConfig; effective: Record<string, unknown>; revision: number | string; updatedAt?: string; updatedBy?: string };

/** One editable copy of the global config: dirty state, validation and revision-checked save. */
export function useAdminConfig() {
  const { result, load } = useAdminResource<ConfigEnvelope>('admin/config');
  const [draft, setDraft] = useState<AdminConfig | null>(null);
  const [base, setBase] = useState<ConfigEnvelope | null>(null);
  const [saveResult, setSaveResult] = useState<Result<unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (result?.ok) { setBase(result.data); setDraft({ ...emptyConfig(), ...result.data.config }); setSaveResult(null); }
  }, [result]);
  const errors = draft ? validateConfig(draft) : {};
  const dirty = Boolean(draft && base && !sameConfig(draft, { ...emptyConfig(), ...base.config }));
  const save = async () => {
    if (!draft || !base || Object.keys(errors).length) return;
    setSaving(true); setSaved(false);
    const next = await adminCall<ConfigEnvelope>('admin/config', { method: 'PUT', body: { config: draft, expectedRevision: base.revision } });
    setSaving(false);
    if (next.ok) { setBase(next.data); setDraft({ ...emptyConfig(), ...next.data.config }); setSaveResult(null); setSaved(true); } else setSaveResult(next);
  };
  const reload = () => { setSaveResult(null); setSaved(false); setBase(null); setDraft(null); void load(); };
  return { result, draft, base, errors, dirty, save, saving, saved, saveResult, reload, update: (patch: Partial<AdminConfig>) => { setSaved(false); setDraft(d => (d ? { ...d, ...patch } : d)); } };
}
