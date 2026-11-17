'use client';
import { useId, useMemo } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  MODE_LABELS, RISK_LABELS, effectiveModes, groupToolRows, lockKind, modeDisabled, parseToolCatalog,
  toggleToolMode, type ToolRow, type ToolsMap,
} from '@/lib/admin-tools.mjs';
import { MODES } from '@/lib/admin-config.mjs';
import { ConfigPage, SettingsGroup, useSharedAdminConfig } from './form';
import styles from './tools-section.module.css';

const LOCK_NOTE = {
  required: 'Always on',
  device: 'Always asks: every Revit change needs your approval of the exact proposal, in every approval mode.',
};

function ToolRowView({ row, tools, onChange, error }: {
  row: ToolRow; tools: ToolsMap | undefined; onChange: (row: ToolRow, mode: (typeof MODES)[number], on: boolean) => void; error?: string;
}) {
  const id = useId();
  const lock = lockKind(row), modes = effectiveModes(row, tools);
  return (
    <div className={styles.row} role="group" aria-labelledby={`${id}-name`} aria-describedby={`${id}-desc`}>
      <div className={styles.copy}>
        <div className={styles.title}>
          <h3 id={`${id}-name`}>{row.label}</h3>
          <Badge variant={row.risk === 'device' ? 'destructive' : row.risk === 'external' ? 'outline' : 'secondary'}>
            {RISK_LABELS[row.risk]}
          </Badge>
        </div>
        <p id={`${id}-desc`}>{row.description}</p>
        {row.runsOn && <p className={styles.meta}>Runs on {row.runsOn}</p>}
        {row.id === 'web_search' && <p className={styles.meta}>The master switch is on the <Link href="/admin/web-search">Web search</Link> page.</p>}
        {error && <p className={styles.error} role="alert">{error}</p>}
      </div>
      {lock
        ? <p className={styles.lock}><Lock aria-hidden />{LOCK_NOTE[lock]}</p>
        : <ul className={styles.switches} aria-label={`${row.label} modes`}>
          {MODES.map(mode => (
            <li key={mode}>
              <label htmlFor={`${id}-${mode}`}>{MODE_LABELS[mode]}</label>
              <Switch id={`${id}-${mode}`} checked={modes.includes(mode)} disabled={modeDisabled(row, mode)}
                aria-label={`${row.label} in ${MODE_LABELS[mode]}`}
                onCheckedChange={on => onChange(row, mode, on)} />
            </li>
          ))}
        </ul>}
    </div>
  );
}

export function ToolsSection() {
  const shared = useSharedAdminConfig();
  const rows = useMemo(() => parseToolCatalog((shared.base as { toolCatalog?: unknown } | null)?.toolCatalog), [shared.base]);
  return (
    <ConfigPage title="Tools" description="Choose which tools the agent may use in Ask, Plan and Build. A switch can only narrow what a tool allows; it never gives the agent a new ability.">
      {({ draft, update, errors }) => {
        const change = (row: ToolRow, mode: (typeof MODES)[number], on: boolean) => {
          const next = toggleToolMode(draft.tools, row, mode, on);
          // An untouched config must stay without a `tools` key, or it would count as a change.
          update({ tools: Object.keys(next).length || shared.base?.config.tools ? next : undefined });
        };
        if (!rows.length) return <p role="status" className={styles.empty}>The service did not report a tool catalog, so there is nothing to switch here.</p>;
        return <>{groupToolRows(rows).map(group => (
          <SettingsGroup key={group.id} title={group.label}>
            {group.rows.map(row => <ToolRowView key={row.id} row={row} tools={draft.tools} onChange={change} error={errors[`tools.${row.id}`]} />)}
          </SettingsGroup>
        ))}</>;
      }}
    </ConfigPage>
  );
}
