'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Cpu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/input';
import {
  DEFAULT_MODEL_PERIOD, MODEL_PERIODS, currentDefault, disableBlock, enabledIds,
  modelTotals, modelsPath, nextModels, noneServed, parseModels, parseUsage, statusCounts, sumUsd,
  usagePath,
  type ModelRow,
} from '@/lib/admin-models.mjs';
import { formatCount, formatUsd } from '@/lib/admin-traces.mjs';
import { EmptyState, Table } from './data-sections';
import { ConfigPage, Field, useSharedAdminConfig } from './form';
import { HEAD, ModelRows } from './model-rows';
import { ResultState, useAdminResource, type Result } from './use-admin';
import data from './data-sections.module.css';
import styles from './models-section.module.css';

const DESCRIPTION = 'Test a model, then enable it and choose the default. Enabling, disabling and '
  + 'the default are saved with the rest of the agent configuration, and the server refuses a '
  + 'model that has not passed a test.';
const PERIODS: Record<string, string> = { '7d': '7 days', '30d': '30 days' };
const UNREADABLE = (what: string): Result<unknown> => ({
  ok: false, reason: 'error',
  message: `The service returned ${what} in a format this page does not understand.`,
});
const stat = (label: string, value: string) => (
  <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
);

type Draft = { models: string[]; defaultModel: string };
function Models({ draft, update, error }: {
  draft: Draft; update: (patch: Partial<Draft>) => void; error?: string;
}) {
  const shared = useSharedAdminConfig();
  const [period, setPeriod] = useState<string>(DEFAULT_MODEL_PERIOD);
  const registry = useAdminResource<unknown>(modelsPath());
  const usageResource = useAdminResource<unknown>(usagePath({ period }));
  const parsed = useMemo(() => parseModels(registry.data), [registry.data]);
  const usage = useMemo(() => parseUsage(usageResource.data), [usageResource.data]);
  const totals = useMemo(() => modelTotals(usage?.days ?? []), [usage]);
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<string | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const revision = shared.base?.revision;
  const seen = useRef(revision);
  const { load } = registry;
  // A save changes which models are enabled on the server, so the rows are read again.
  useEffect(() => {
    if (seen.current !== revision) { seen.current = revision; void load(); }
  }, [revision, load]);

  const rows = parsed?.rows ?? [];
  const enabled = enabledIds(draft.models, rows);
  const defaultId = currentDefault(draft.defaultModel, rows);
  const counts = statusCounts(rows);
  const apply = (id: string, on: boolean) => update({ models: nextModels(draft, rows, id, on) });
  const toggle = (row: ModelRow, on: boolean, from: HTMLElement) => {
    trigger.current = from; setNotice('');
    if (on) { apply(row.id, true); return; }
    const block = disableBlock(draft, rows, row.id);
    if (block) setNotice(`${row.id} is the default model. ${block}`); else setConfirm(row.id);
  };
  const usageStatus = usageResource.result && !usageResource.result.ok ? usageResource.result
    : usageResource.result?.ok && !usage ? UNREADABLE('usage') : null;

  return <>
    <div className={styles.toolbar}>
      <Field label="Usage period">{p => (
        <Select {...p} className={styles.select} value={period}
          onChange={event => setPeriod(event.target.value)}>
          {MODEL_PERIODS.map(value => <option key={value} value={value}>{PERIODS[value]}</option>)}
        </Select>)}
      </Field>
      {parsed?.catalogAt && (
        <p className={styles.note}>
          Prices from the catalog at {new Date(parsed.catalogAt).toLocaleString()}
        </p>
      )}
    </div>
    <ResultState result={registry.result?.ok && !parsed ? UNREADABLE('models') : registry.result}
      onRetry={() => void load()} />
    {parsed && <>
      <section className={`${data.group} ${styles.strip}`} aria-labelledby="admin-model-stats">
        <div className={data.groupHeading}>
          <h2 id="admin-model-stats">Summary</h2>
          <p>{usage?.truncated
            ? `Usage covers the newest ${formatCount(usage.scanned)} runs of this period; older `
              + 'runs were not counted.'
            : 'Models by status, and reported cost for the chosen period.'}</p>
        </div>
        <dl className={data.counts}>{[
          stat('Enabled', formatCount(counts.enabled)), stat('Ready', formatCount(counts.ready)),
          stat('Failed', formatCount(counts.failed)),
          stat(`Usage · ${PERIODS[period]}`,
            usage ? formatUsd(sumUsd(usage.days.map(day => day.usd))) : '—'),
        ]}</dl>
      </section>
      <p role="alert" className={styles.inlineError}>{notice || error || ''}</p>
      {noneServed(rows) && (
        <p role="status" className={styles.banner}>
          No models are enabled. Test a model, then enable it.
        </p>
      )}
      {rows.length === 0
        ? <EmptyState icon={Cpu} title="No models yet">
          Models appear here once the server lists an allowlist or a test has been run.
        </EmptyState>
        : <Table caption="Models" head={HEAD(PERIODS[period])}>
          <ModelRows rows={rows} enabled={enabled} defaultId={defaultId} period={PERIODS[period]}
            catalogError={parsed.catalogError} totals={totals} days={usage?.days ?? []}
            onToggle={toggle} onTested={() => void load()}
            onDefault={row => { setNotice(''); update({ defaultModel: row.id }); }} />
        </Table>}
      {usageStatus && (
        <ResultState result={usageStatus} onRetry={() => void usageResource.load()} />
      )}
    </>}
    <Dialog open={confirm !== null} onOpenChange={open => { if (!open) setConfirm(null); }}>
      <DialogContent className="admin-leave-dialog"
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
        <DialogHeader>
          <DialogTitle>Disable {confirm}?</DialogTitle>
          <DialogDescription>
            The next turn of chats using it will ask users to pick another model. A run that is
            already working finishes on its model. This applies when you save.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setConfirm(null)}>Cancel</Button>
          <Button type="button" onClick={() => {
            if (confirm && !disableBlock(draft, rows, confirm)) apply(confirm, false);
            setConfirm(null);
          }}>Disable model</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

export function ModelsSection() {
  return (
    <ConfigPage title="Models" description={DESCRIPTION}>
      {({ draft, update, errors }) => (
        <Models draft={draft} update={update}
          error={errors.models || errors.defaultModel} />
      )}
    </ConfigPage>
  );
}
