'use client';
import { useId } from 'react';
import { Loader2, Pencil, PlugZap, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { actionLabel, type AuditRow } from '@/lib/admin-history.mjs';
import {
  MODE_NAMES, TOOL_MODES, enableBlock, hintsOf, modeCounts, serverStatus, testSummary,
  type McpServer, type ToolMode,
} from '@/lib/admin-mcp.mjs';
import styles from './mcp-section.module.css';

export const when = (iso: string | null) => {
  const date = iso ? new Date(iso) : null;
  return date && !Number.isNaN(+date) ? date.toLocaleString() : 'not supplied';
};

export function StatusBadge({ server }: { server: McpServer }) {
  const status = serverStatus(server);
  return (
    <Badge variant={status.id === 'enabled' ? 'default' : status.id === 'failed' ? 'destructive' : 'secondary'}>
      {status.label}
    </Badge>
  );
}

export function McpDetail({ server, busy, log, onTest, onPower, onMode, onEdit, onRemove }: {
  server: McpServer; busy: string | null; log: AuditRow[] | 'loading' | 'error';
  onTest: () => void; onPower: (on: boolean) => void; onMode: (tool: string, mode: ToolMode) => void;
  onEdit: () => void; onRemove: () => void;
}) {
  const base = useId();
  const block = enableBlock(server);
  const counts = modeCounts(server);
  const test = server.lastTest;
  const working = busy !== null;
  return (
    <div className={styles.body}>
      <div className={styles.head}>
        <h2>{server.name}</h2>
        <span className={styles.mono}>{server.id}</span>{' '}
        <StatusBadge server={server} />
      </div>
      <div className={styles.buttons}>
        <Button type="button" variant="outline" disabled={working} onClick={onTest}>
          {busy === 'test' ? <Loader2 className="animate-spin" aria-hidden /> : <PlugZap aria-hidden />}
          {busy === 'test' ? 'Testing…' : 'Test connection'}
        </Button>
        <Button type="button" variant="outline" disabled={working} onClick={onEdit}>
          <Pencil aria-hidden /> Edit
        </Button>
        <Button type="button" variant="outline" disabled={working} onClick={onRemove}>
          <Trash2 aria-hidden /> Remove
        </Button>
      </div>
      <dl className={styles.facts}>
        <div><dt>Address</dt><dd>{server.url}</dd></div>
        <div><dt>Header</dt><dd>{server.authHeader ?? 'None'}</dd></div>
        <div><dt>Key</dt><dd>{server.hasKey ? 'Key saved' : 'No key'}</dd></div>
        <div><dt>Last test</dt>
          <dd>{testSummary(test)}{test?.at ? ` · ${when(test.at)}` : ''}</dd></div>
        <div><dt>Tools</dt>
          <dd>{server.tools.length
            ? `${counts.allow} allowed, ${counts.ask} ask first, ${counts.never} never` : 'None yet'}</dd></div>
        <div><dt>Calls</dt>
          <dd>{server.calls}{server.lastCalledAt ? `, last ${when(server.lastCalledAt)}` : ''}</dd></div>
        <div><dt>Changed</dt>
          <dd>{when(server.updatedAt)}{server.updatedBy ? ` by ${server.updatedBy}` : ''}</dd></div>
      </dl>
      <div className={styles.switchRow}>
        <div>
          <label htmlFor={`${base}-power`}>Offer {server.name} in admin chats</label>
          <p id={`${base}-why`} className={styles.hint}>
            {block ?? 'Tools set to Never are never offered. Editing the address or key turns this off.'}
          </p>
        </div>
        <Switch id={`${base}-power`} checked={server.enabled}
          disabled={working || Boolean(block)} aria-describedby={`${base}-why`}
          onCheckedChange={onPower} />
      </div>
      <section className={styles.section} aria-labelledby={`${base}-tools`}>
        <h3 id={`${base}-tools`}>Tools</h3>
        <p className={styles.hint}>
          New or changed tools start as Never. The notes below are what the server says about
          itself; they are not checked.
        </p>
        {server.tools.length === 0
          ? <p className={styles.empty}>No tools yet. Run Test connection to list them.</p>
          : <ul className={styles.tools}>
            {server.tools.map(tool => (
              <li key={tool.name} className={styles.tool}>
                <span className={styles.toolName}>{tool.name}</span>
                {tool.description && <p>{tool.description}</p>}
                {hintsOf(tool).length > 0 && <p>{hintsOf(tool).join('. ')}.</p>}
                <fieldset className={styles.modes}>
                  <legend className={styles.sr}>When the agent wants to use {tool.name}</legend>
                  {TOOL_MODES.map(mode => (
                    <label key={mode}>
                      <input type="radio" name={`${base}-${tool.name}`} value={mode}
                        checked={tool.mode === mode}
                        onChange={() => { if (!working) onMode(tool.name, mode); }} />
                      <span>{MODE_NAMES[mode]}<span className={styles.sr}> {tool.name}</span></span>
                    </label>
                  ))}
                </fieldset>
              </li>
            ))}
          </ul>}
      </section>
      <section className={styles.section} aria-labelledby={`${base}-log`}>
        <h3 id={`${base}-log`}>Recent changes</h3>
        {log === 'loading' ? <p role="status" className={styles.hint}>Loading…</p>
          : log === 'error' ? <p role="alert" className={styles.error}>The audit rows could not be read.</p>
            : log.length === 0 ? <p className={styles.hint}>Nothing recorded for this server yet.</p>
              : <ul className={styles.log}>
                {log.map((row, index) => (
                  <li key={row.cursor ?? index}>
                    <strong>{actionLabel(row.action)}</strong> {row.summary}
                    <span>{when(row.at)}{row.by ? ` by ${row.by}` : ''}</span>
                  </li>
                ))}
              </ul>}
      </section>
    </div>
  );
}
