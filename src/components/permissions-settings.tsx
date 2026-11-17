'use client';

import { useEffect, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { ResultState, useAdminClient, type Result } from './admin/use-admin';
import {
  ALWAYS_ASKS, APPROVAL_CARDS, parsePermissions, permissionsBody, type ApprovalMode,
} from '@/lib/permissions.mjs';
import styles from './permissions-settings.module.css';

export function PermissionsSettings() {
  const client = useAdminClient();
  const [mode, setMode] = useState<ApprovalMode | null>(null);
  const [failure, setFailure] = useState<Result<unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = useRef(false);

  useEffect(() => {
    let live = true;
    void client<unknown>('me/permissions').then(result => {
      if (!live) return;
      if (result.ok) setMode(parsePermissions(result.data).approvalMode); else setFailure(result);
    });
    return () => { live = false; };
  }, [client]);

  const choose = async (next: ApprovalMode) => {
    const body = permissionsBody(next);
    if (!body || busy.current || next === mode) return;
    busy.current = true; setSaving(true); setFailure(null);
    const result = await client<unknown>('me/permissions', { method: 'PUT', body });
    if (result.ok) setMode(parsePermissions(result.data).approvalMode); else setFailure(result);
    busy.current = false; setSaving(false);
  };

  if (mode === null) return <ResultState result={failure} />;
  return (
    <section className={styles.panel} aria-busy={saving}>
      {failure && <ResultState result={failure} />}
      {/* Not disabled while saving: that would drop keyboard focus; `busy` ignores extra changes. */}
      <fieldset className={styles.modes}>
        <legend>When DATUMM wants to act</legend>
        {APPROVAL_CARDS.map(card => (
          <label key={card.id} className={styles.card}>
            <input type="radio" name="approval-mode" value={card.id} checked={mode === card.id}
              onChange={() => void choose(card.id)} />
            <span><strong>{card.title}{card.id === 'ask' && <small>Default</small>}</strong>{card.description}</span>
          </label>
        ))}
      </fieldset>
      <section aria-labelledby="always-asks" className={styles.always}>
        <h2 id="always-asks"><ShieldCheck size={15} aria-hidden />Always asks</h2>
        <ul>{ALWAYS_ASKS.map(item => <li key={item.title}><strong>{item.title}</strong><span>{item.description}</span></li>)}</ul>
      </section>
      <p role="status" className="sr-only">{saving ? 'Saving…' : ''}</p>
    </section>
  );
}
