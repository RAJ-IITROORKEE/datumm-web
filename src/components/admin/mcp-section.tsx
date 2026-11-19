'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { parseAuditRows } from '@/lib/admin-history.mjs';
import {
  MCP_AUDIT_PATH, MCP_LIST_PATH, auditRowsFor, createBody, mcpFailure, modeCounts, parseMcpList,
  parseMcpServer, serverPath, toolModeBody, toolPath, unavailableCopy, updateBody, versionBody,
  type McpAction, type McpFailure, type McpForm, type McpServer, type ToolMode,
} from '@/lib/admin-mcp.mjs';
import { featureState } from '@/lib/capabilities.mjs';
import { useCapabilities } from './capabilities-context';
import { McpSection } from './config-sections';
import { McpDetail, StatusBadge } from './mcp-detail';
import { McpEditorDialog } from './mcp-editor-dialog';
import { PageHeader } from './form';
import { useNarrow } from './skills-section';
import { ResultState, useAdminClient, useAdminResource, type Result } from './use-admin';
import styles from './mcp-section.module.css';

const DESCRIPTION = 'Outside tool servers the agent can call in admin chats. Everything a server '
  + 'sends back is treated as untrusted. A server must pass a test before it can be turned on.';

/** The registry when the service has its server key; an explanation when it does not. */
export function McpRoute() {
  const caps = useCapabilities();
  if (!caps) return <p role="status">Loading…</p>;
  const state = featureState(caps, 'mcpRegistry');
  if (state === 'on') return <McpRegistry />;
  if (state === 'unknown') return <McpSection />; // an older service: today's stored list
  const copy = unavailableCopy(caps.reasons.mcpRegistry);
  return <>
    <PageHeader title="MCP servers" description={DESCRIPTION} />
    <div role="status" className={styles.unavailable}>
      <h2>MCP servers are not available</h2>
      <p>{copy.lead}</p><p>{copy.detail}</p>
    </div>
  </>;
}

export function McpRegistry() {
  const client = useAdminClient();
  const narrow = useNarrow();
  const list = useAdminResource<unknown>(MCP_LIST_PATH);
  const audit = useAdminResource<unknown>(MCP_AUDIT_PATH);
  const parsed = useMemo(() => parseMcpList(list.data), [list.data]);
  const [servers, setServers] = useState<McpServer[] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [editor, setEditor] = useState<'new' | 'edit' | null>(null);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState('');
  const [notice, setNotice] = useState('');
  const busyRef = useRef(false);
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => { if (parsed) setServers(parsed.servers); }, [parsed]);

  const current = servers?.find(s => s.id === selected) ?? null;
  const rows = useMemo(() => {
    const all = audit.result?.ok ? parseAuditRows(audit.data) : null;
    return all && current ? auditRowsFor(all, current.id) : null;
  }, [audit.result, audit.data, current]);
  const log = !audit.result ? 'loading' : rows ?? 'error';
  const remember = () => { opener.current = document.activeElement as HTMLElement | null; };
  const restoreFocus = () => setTimeout(() => opener.current?.focus(), 0);
  const replace = (next: McpServer) => setServers(all => (all?.some(s => s.id === next.id)
    ? all.map(s => (s.id === next.id ? next : s)) : [...(all ?? []), next]));

  /** One request at a time. Returns the failure, or null when it worked. */
  const call = async (key: string, action: McpAction, path: string | null,
    init: { method: string; body?: unknown }, done: (data: unknown) => string | null) => {
    if (busyRef.current || !path) return null;
    busyRef.current = true; setBusy(key); setProblem(''); setNotice('');
    try {
      const result: Result<unknown> = await client<unknown>(path, init);
      if (result.ok) {
        const text = done(result.data);
        if (text === null) { setProblem('The service answered in a format this page does not understand.'); return null; }
        setNotice(text); void audit.load();
        return null;
      }
      const failure = mcpFailure(result, action);
      setProblem(failure.message);
      if (failure.stale) void list.load();
      return failure;
    } finally { busyRef.current = false; setBusy(null); }
  };
  const view = (data: unknown, say: (s: McpServer) => string) => {
    const next = parseMcpServer(data);
    if (!next) return null;
    replace(next); return say(next);
  };

  const submit = async (form: McpForm): Promise<McpFailure | null> => {
    const adding = editor === 'new';
    if (!adding && !current) return null;
    const failure = await call('save', adding ? 'create' : 'update',
      adding ? MCP_LIST_PATH : serverPath(current!.id),
      { method: adding ? 'POST' : 'PUT', body: adding ? createBody(form) : updateBody(form, current!) },
      data => view(data, s => `${adding ? 'Added' : 'Saved'} ${s.name}.${adding ? ' Run Test connection next.' : ''}`));
    if (failure) return failure;
    if (adding) setSelected(form.id);
    setEditor(null); restoreFocus();
    return null;
  };
  const test = () => current && call('test', 'test', serverPath(current.id, 'test'), { method: 'POST' },
    data => view(data, s => (s.lastTest?.ok
      ? `Test passed. ${s.lastTest.toolCount} tools found. New tools start as Never.`
      : `Test failed${s.lastTest?.error ? `: ${s.lastTest.error}` : '.'}`)));
  const power = (on: boolean) => current && call(on ? 'enable' : 'disable', on ? 'enable' : 'disable',
    serverPath(current.id, on ? 'enable' : 'disable'), { method: 'POST', body: versionBody(current) },
    data => view(data, s => `${s.name} is ${s.enabled ? 'on' : 'off'}.`));
  const mode = (tool: string, next: ToolMode) => current && call(`tool:${tool}`, 'tool',
    toolPath(current.id, tool), { method: 'PUT', body: toolModeBody(current, next) },
    data => view(data, () => `${tool} is set to ${next}.`));
  const remove = async () => {
    if (!current) return;
    const id = current.id, name = current.name;
    await call('remove', 'remove', serverPath(id), { method: 'DELETE' }, () => {
      setServers(all => all?.filter(s => s.id !== id) ?? null); setSelected(null);
      return `Removed ${name}.`;
    });
    setRemoving(false); restoreFocus();
  };

  const detail = current && (
    <McpDetail server={current} busy={busy} log={log} onTest={() => void test()}
      onPower={on => void power(on)} onMode={(tool, next) => void mode(tool, next)}
      onEdit={() => { remember(); setEditor('edit'); }}
      onRemove={() => { remember(); setRemoving(true); }} />
  );
  const full = (servers?.length ?? 0) >= (parsed?.maxServers ?? 20);
  return <>
    <PageHeader title="MCP servers" description={DESCRIPTION} actions={
      <Button type="button" disabled={!parsed || full}
        onClick={() => { remember(); setEditor('new'); }}><Plus aria-hidden /> Add server</Button>} />
    <ResultState result={list.result?.ok && !parsed
      ? { ok: false, reason: 'error', message: 'The service returned the server list in a format this page does not understand.' }
      : list.result} onRetry={() => void list.load()} />
    {parsed && !parsed.secretsAvailable && (
      <p role="status" className={styles.hint}>{unavailableCopy(parsed.reason).lead} Servers without a key still work.</p>
    )}
    <p role="status" className={styles.count}>
      {problem ? '' : notice || (servers ? `${servers.length} of ${parsed?.maxServers ?? 20} servers` : '')}
    </p>
    {problem && <p role="alert" className={styles.error}>{problem}</p>}
    {servers && (
      <div className={`${styles.layout} ${current && !narrow ? '' : styles.single}`}>
        {servers.length === 0
          ? <p className={styles.empty}>No MCP servers yet. Add one, test it, then choose which tools the agent may use.</p>
          : <ul className={styles.list} aria-label="MCP servers">
            {servers.map(s => (
              <li key={s.id}>
                <Card className={styles.row} data-selected={s.id === selected}>
                  <button type="button" className={styles.open} aria-current={s.id === selected ? 'true' : undefined}
                    onClick={() => setSelected(s.id)}>
                    <span className={styles.name}>{s.name} <span className={styles.mono}>{s.id}</span></span>
                    <span className={styles.url}>{s.url}</span>
                  </button>
                  <span className={styles.meta}>{s.tools.length ? `${s.tools.length - modeCounts(s).never} of ${s.tools.length} tools usable` : 'No tools yet'}</span>
                  <StatusBadge server={s} />
                </Card>
              </li>
            ))}
          </ul>}
        {current && !narrow && <aside aria-label="Server details"><Card className={styles.detail}>{detail}</Card></aside>}
      </div>
    )}
    {current && narrow && (
      <Sheet open onOpenChange={open => { if (!open) { setSelected(null); restoreFocus(); } }}>
        <SheetContent className="admin-root admin-skill-sheet">
          <SheetTitle className="sr-only">Server details</SheetTitle>
          <SheetDescription className="sr-only">Test, tools and changes for {current.id}.</SheetDescription>
          <SheetClose asChild><Button type="button" variant="ghost" size="sm">Close</Button></SheetClose>
          {detail}
        </SheetContent>
      </Sheet>
    )}
    {editor && (editor === 'new' || current) && (
      <McpEditorDialog key={editor === 'new' ? 'new' : current!.id} server={editor === 'edit' ? current : null}
        ids={servers?.map(s => s.id) ?? []} secretsAvailable={parsed?.secretsAvailable ?? false}
        onSubmit={submit} onClose={() => { setEditor(null); restoreFocus(); }} />
    )}
    <Dialog open={removing} onOpenChange={open => { if (!open && !busy) { setRemoving(false); restoreFocus(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {current?.name}?</DialogTitle>
          <DialogDescription>
            The agent loses its tools and the saved key is deleted. This cannot be undone; the audit log keeps a record.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={Boolean(busy)} onClick={() => setRemoving(false)}>Cancel</Button>
          <Button type="button" variant="destructive" disabled={Boolean(busy)} onClick={() => void remove()}>Remove server</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
