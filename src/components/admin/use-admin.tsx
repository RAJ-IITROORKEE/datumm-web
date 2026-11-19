'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { emptyConfig, sameConfig, validateConfig, type AdminConfig } from '@/lib/admin-config.mjs';
import styles from './admin-form.module.css';

export type Fail = 'blocked' | 'missing' | 'forbidden' | 'stale' | 'error';
// `issues` is a 422 validation list cut down to where and why; the rejected input is never kept.
export type Issue = { loc: (string | number)[]; msg: string };
export type Result<T> = { ok: true; data: T } | { ok: false; reason: Fail; message: string; issues?: Issue[] };
export type AdminClient = <T>(path: string, init?: { method?: string; body?: unknown }) => Promise<Result<T>>;

/** Admin call through the same-origin service proxy; 404 (proxy or backend), 403 and 409 get their own friendly states. */
export async function adminCall<T>(path: string, init?: { method?: string; body?: unknown }): Promise<Result<T>> {
  try {
    const response = await fetch(`/api/service/${path}`, { method: init?.method ?? 'GET', cache: 'no-store', headers: init?.body === undefined ? undefined : { 'Content-Type': 'application/json' }, body: init?.body === undefined ? undefined : JSON.stringify(init.body) });
    if (response.ok) return { ok: true, data: (response.status === 204 ? null : await response.json().catch(() => null)) as T };
    const body = await response.json().catch(() => null);
    const detail = typeof body?.detail === 'string' ? body.detail : '';
    const reason: Fail = response.status === 404 ? (body?.code === 'DATUMM_PROXY_NOT_ALLOWED' ? 'blocked' : 'missing') : response.status === 403 ? 'forbidden' : response.status === 409 ? 'stale' : 'error';
    const issues: Issue[] = Array.isArray(body?.detail) ? body.detail.slice(0, 10).filter((i: Issue) => Array.isArray(i?.loc) && typeof i?.msg === 'string').map((i: Issue) => ({ loc: i.loc.filter(p => typeof p === 'string' || typeof p === 'number'), msg: i.msg })) : [];
    return { ok: false, reason, message: detail || `Request failed (${response.status}).`, ...(issues.length ? { issues } : {}) };
  } catch {
    return { ok: false, reason: 'error', message: 'Could not reach the service. Check your connection.' };
  }
}

const AdminClientContext = createContext<AdminClient>(adminCall);
export function AdminClientProvider({ client, children }: { client: AdminClient; children: ReactNode }) {
  return <AdminClientContext.Provider value={client}>{children}</AdminClientContext.Provider>;
}
export const useAdminClient = () => useContext(AdminClientContext);

/** Loads a GET resource; `pollMs(data)` (optional) returns a refresh interval or 0 to stop. */
export function useAdminResource<T>(path: string, pollMs?: (data: T) => number, enabled = true) {
  const client = useAdminClient();
  const [result, setResult] = useState<Result<T> | null>(null);
  const owner = useMemo(() => ({ active: false, request: 0, pending: false }), [path, client, enabled]);
  const pollRef = useRef(pollMs);
  pollRef.current = pollMs;
  const load = useCallback(async () => {
    if (!owner.active) return;
    const request = ++owner.request;
    owner.pending = true;
    const next = await client<T>(path);
    if (owner.request === request) {
      owner.pending = false;
      if (owner.active) setResult(next);
    }
  }, [path, client, owner]);
  useEffect(() => {
    if (!enabled) { setResult(null); return; }
    owner.active = true;
    setResult(null);
    void load();
    return () => { owner.active = false; owner.request++; };
  }, [load, owner, enabled]);
  const data = result?.ok ? result.data : null;
  const interval = data ? pollRef.current?.(data) ?? 0 : 0;
  useEffect(() => {
    if (!interval) return;
    const timer = setInterval(() => { if (!document.hidden && !owner.pending) void load(); }, interval);
    return () => clearInterval(timer);
  }, [interval, load, owner]);
  return { result, load, data };
}

/** Friendly banner for every non-success state; renders nothing for a good result. */
export function ResultState({ result, onRetry }: { result: Result<unknown> | null; onRetry?: () => void }) {
  if (!result) return <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading…</p>;
  if (result.ok) return null;
  const copy = {
    blocked: ['Not exposed by this web build', 'This web build does not expose this admin route.'],
    missing: ['Not provided by this backend', 'This backend does not provide this admin feature.'],
    forbidden: ['Backend admin access not configured', 'The backend rejected this account. Add your Clerk user id to ADMIN_SUBJECTS on the backend.'],
    stale: ['Changed elsewhere', 'Someone else saved a newer version. Reload to continue from it.'],
    error: ['Something went wrong', result.message],
  }[result.reason];
  return (
    <div role="alert" className={styles.notice}>
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--trace-thought)]" aria-hidden />
      <div className="min-w-0 flex-1"><p className="font-medium">{copy[0]}</p><p className="text-muted-foreground">{copy[1]}</p></div>
      {onRetry && <Button type="button" variant="outline" size="sm" onClick={onRetry}><RefreshCw /> Retry</Button>}
    </div>
  );
}

export type ConfigEnvelope = { config: AdminConfig; effective: Record<string, unknown>; revision: number | string; updatedAt?: string; updatedBy?: string; toolCatalog?: unknown; builtinSkillCatalog?: unknown };

/** One editable copy of the global config: dirty state, validation and revision-checked save. */
export function useAdminConfig(enabled = true) {
  const client = useAdminClient();
  const { result, load } = useAdminResource<ConfigEnvelope>('admin/config', undefined, enabled);
  const [draft, setDraft] = useState<AdminConfig | null>(null);
  const [base, setBase] = useState<ConfigEnvelope | null>(null);
  const [saveResult, setSaveResult] = useState<Result<unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const savingRef = useRef(false);
  const owner = useMemo(() => ({ active: false, generation: 0 }), [client, enabled]);
  const currentOwner = useRef(owner);
  currentOwner.current = owner;
  useEffect(() => { owner.active = true; savingRef.current = false; setSaving(false); return () => { owner.active = false; }; }, [owner]);
  useEffect(() => {
    if (result?.ok) { setBase(result.data); setDraft({ ...emptyConfig(), ...result.data.config }); setSaveResult(null); }
  }, [result]);
  const errors = draft ? validateConfig(draft) : {};
  const dirty = Boolean(draft && base && !sameConfig(draft, { ...emptyConfig(), ...base.config }));
  const save = async () => {
    if (savingRef.current || !dirty || !draft || !base || Object.keys(errors).length) return;
    savingRef.current = true;
    const generation = owner.generation;
    setSaving(true); setSaved(false);
    const next = await client<ConfigEnvelope>('admin/config', { method: 'PUT', body: { config: draft, expectedRevision: base.revision } });
    if (!owner.active || currentOwner.current !== owner || owner.generation !== generation) return;
    savingRef.current = false;
    setSaving(false);
    if (next.ok) { setBase(next.data); setDraft({ ...emptyConfig(), ...next.data.config }); setSaveResult(null); setSaved(true); } else setSaveResult(next);
  };
  const reload = () => { if (savingRef.current) return; setSaveResult(null); setSaved(false); setBase(null); setDraft(null); void load(); };
  const discard = () => { owner.generation++; savingRef.current=false; setSaving(false); setSaved(false); setSaveResult(null); setBase(null); setDraft(null); };
  return { result, draft, base, errors, dirty, save, saving, saved, saveResult, reload, discard, update: (patch: Partial<AdminConfig>) => { if (savingRef.current) return; setSaved(false); setDraft(d => (d ? { ...d, ...patch } : d)); } };
}
