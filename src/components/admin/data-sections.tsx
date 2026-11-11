'use client';
import { useState } from 'react';
import { Download, ExternalLink, Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Select } from '@/components/ui/input';
import { Field, PageHeader } from './form';
import { adminCall, ResultState, useAdminResource, type Result } from './use-admin';
import { CORPORA } from '@/lib/admin-config.mjs';

const when = (iso?: string) => { const d = iso ? new Date(iso) : null; return d && !Number.isNaN(+d) ? d.toLocaleString() : iso || '-'; };
const Table = ({ head, children }: { head: string[]; children: React.ReactNode }) => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full min-w-[32rem] text-left text-sm">
      <thead className="border-b bg-card text-xs text-muted-foreground"><tr>{head.map(h => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}</tr></thead>
      <tbody className="divide-y">{children}</tbody>
    </table>
  </div>
);

type Overview = { health: string; imageVersion: string; counts: { tasks: number; owners: number; activeRuns: number; runsToday: number }; usdToday: number };

export function OverviewSection() {
  const { result, load, data } = useAdminResource<Overview>('admin/overview');
  const cards: [string, React.ReactNode][] = data ? [
    ['Health', <Badge key="h" variant={/^(ok|healthy|up)$/i.test(data.health) ? 'default' : 'destructive'}>{data.health}</Badge>],
    ['Image version', <span key="i" className="font-mono text-base">{data.imageVersion}</span>],
    ['Tasks', data.counts.tasks], ['Owners', data.counts.owners], ['Active runs', data.counts.activeRuns], ['Runs today', data.counts.runsToday],
    ['Spend today', `$${Number(data.usdToday).toFixed(2)}`],
  ] : [];
  return (
    <>
      <PageHeader title="Overview" description="Live counts from the hosted backend." />
      <ResultState result={result} onRetry={() => void load()} />
      {data && (
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value]) => (
            <Card key={label} className="gap-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="text-2xl font-semibold tabular-nums">{value}</dd></Card>
          ))}
        </dl>
      )}
    </>
  );
}

type Source = { id: string; url: string; title: string; corpus: string; status: 'indexing' | 'ready' | 'failed'; chunks: number; updatedAt: string; error?: string };
const statusVariant = { ready: 'default', indexing: 'secondary', failed: 'destructive' } as const;

export function KnowledgeSection() {
  const { result, load, data } = useAdminResource<Source[]>('admin/knowledge/sources', rows => (rows.some(r => r.status === 'indexing') ? 4000 : 0));
  const [form, setForm] = useState({ url: '', title: '', corpus: 'other' });
  const [busy, setBusy] = useState<string | null>(null);
  const [action, setAction] = useState<Result<unknown> | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const run = async (key: string, path: string, method: string, body?: unknown) => {
    setBusy(key); const r = await adminCall<unknown>(path, { method, body }); setBusy(null); setAction(r.ok ? null : r); setConfirm(null);
    if (r.ok) await load();
    return r.ok;
  };
  const urlOk = /^https:\/\/[^\s]{4,}$/.test(form.url.trim());
  return (
    <>
      <PageHeader title="Knowledge" description="Public HTML pages the agent can search and cite (title, link and a short excerpt only). HTTPS only; PDFs are not supported yet." />
      <div className="grid gap-6">
        <Card>
          <CardHeader><CardTitle>Add a source</CardTitle><CardDescription>The page is fetched, split and embedded in the background.</CardDescription></CardHeader>
          <form className="grid gap-4 sm:grid-cols-[2fr_1.5fr_1fr_auto] sm:items-end" noValidate onSubmit={async e => {
            e.preventDefault(); if (!urlOk) return;
            if (await run('add', 'admin/knowledge/sources', 'POST', { url: form.url.trim(), corpus: form.corpus, ...(form.title.trim() && { title: form.title.trim() }) })) setForm({ url: '', title: '', corpus: form.corpus });
          }}>
            <Field label="URL" error={form.url && !urlOk ? 'Enter an https:// URL.' : undefined}>{p => <Input {...p} type="url" required placeholder="https://" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />}</Field>
            <Field label="Title (optional)">{p => <Input {...p} maxLength={120} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />}</Field>
            <Field label="Corpus">{p => <Select {...p} value={form.corpus} onChange={e => setForm({ ...form, corpus: e.target.value })}>{CORPORA.map(c => <option key={c}>{c}</option>)}</Select>}</Field>
            <Button type="submit" disabled={!urlOk || busy === 'add'}>{busy === 'add' ? <Loader2 className="animate-spin" /> : <Plus />} Add</Button>
          </form>
        </Card>
        <ResultState result={action} />
        <ResultState result={result} onRetry={() => void load()} />
        {data && (data.length === 0 ? <p className="text-sm text-muted-foreground">No sources yet.</p> : (
          <Table head={['Source', 'Corpus', 'Status', 'Chunks', 'Updated', 'Actions']}>
            {data.map(s => (
              <tr key={s.id}>
                <td className="max-w-64 px-3 py-2"><a href={s.url} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1 font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring"><span className="truncate">{s.title || s.url}</span><ExternalLink className="size-3 shrink-0" aria-hidden /></a><span className="block truncate text-xs text-muted-foreground">{s.url}</span>{s.error && <span className="block text-xs text-destructive">{s.error}</span>}</td>
                <td className="px-3 py-2">{s.corpus}</td>
                <td className="px-3 py-2"><Badge variant={statusVariant[s.status] ?? 'outline'}>{s.status === 'indexing' && <Loader2 className="animate-spin" aria-hidden />}{s.status}</Badge></td>
                <td className="px-3 py-2 tabular-nums">{s.chunks}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{when(s.updatedAt)}</td>
                <td className="px-3 py-2"><div className="flex gap-1">
                  <Button variant="ghost" size="icon" aria-label={`Reindex ${s.title || s.url}`} disabled={busy === s.id || s.status === 'indexing'} onClick={() => void run(s.id, `admin/knowledge/sources/${s.id}/reindex`, 'POST')}><RefreshCw /></Button>
                  {confirm === s.id
                    ? <Button variant="destructive" size="sm" disabled={busy === s.id} onClick={() => void run(s.id, `admin/knowledge/sources/${s.id}`, 'DELETE')} onBlur={() => setConfirm(null)} autoFocus>Confirm delete</Button>
                    : <Button variant="ghost" size="icon" aria-label={`Delete ${s.title || s.url}`} onClick={() => setConfirm(s.id)}><Trash2 /></Button>}
                </div></td>
              </tr>
            ))}
          </Table>
        ))}
      </div>
    </>
  );
}

type Release = { version: string; file: string; checksumUrl: string; sha256: string; bytes: number; unsigned: boolean; builtAt: string; sourceCommit: string; revit: string; capabilities: string[] };

export function PluginSection({ release }: { release: Release }) {
  const rows: [string, React.ReactNode][] = [
    ['Version', <span key="v" className="font-mono">{release.version}</span>],
    ['Built', when(release.builtAt)],
    ['Size', `${(release.bytes / 1048576).toFixed(1)} MB`],
    ['SHA-256', <code key="s" className="block font-mono text-xs break-all">{release.sha256}</code>],
    ['Checksum file', <a key="c" className="underline" href={release.checksumUrl}>{release.checksumUrl.split('/').pop()}</a>],
    ['Revit', release.revit],
    ['Source commit', <code key="g" className="font-mono text-xs">{release.sourceCommit.slice(0, 12)}</code>],
    ['Capabilities', <span key="k" className="flex flex-wrap gap-1.5">{release.capabilities.map(c => <Badge key={c} variant="outline">{c}</Badge>)}</span>],
  ];
  return (
    <>
      <PageHeader title="Plugin" description="Current Revit plugin release published to users (from public/downloads/release.json in this deployment)." />
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild><a href={release.file}><Download /> Download installer</a></Button>
          {release.unsigned && <Badge variant="secondary">unsigned</Badge>}
        </div>
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[9rem_1fr]">
          {rows.map(([k, v]) => <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="min-w-0">{v}</dd></div>)}
        </dl>
      </Card>
    </>
  );
}

export function AuditSection() {
  const { result, load, data } = useAdminResource<{ at: string; by: string; summary: string }[]>('admin/audit');
  return (
    <>
      <PageHeader title="Audit log" description="The last 100 admin changes." />
      <ResultState result={result} onRetry={() => void load()} />
      {data && (data.length === 0 ? <p className="text-sm text-muted-foreground">No changes recorded yet.</p> : (
        <Table head={['When', 'By', 'Change']}>
          {data.map((r, i) => <tr key={i}><td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">{when(r.at)}</td><td className="px-3 py-2">{r.by}</td><td className="px-3 py-2">{r.summary}</td></tr>)}
        </Table>
      ))}
    </>
  );
}
