'use client';
import { useRef, useState } from 'react';
import { FlaskConical, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { formatCount, formatDuration, formatUsd } from '@/lib/admin-traces.mjs';
import {
  TEST_COST_NOTE, checkItems, parseTest, testBody, type ModelTest,
} from '@/lib/admin-models.mjs';
import { ResultState, useAdminClient, type Result } from './use-admin';
import styles from './models-section.module.css';

const UNREADABLE: Result<unknown> = {
  ok: false, reason: 'error',
  message: 'The service returned a test result this page does not understand.',
};
const MARK = { pass: 'Passed', fail: 'Failed', na: 'Not reported', info: '' } as const;

function Outcome({ test }: { test: ModelTest }) {
  const measured = [
    test.latencyMs === null ? null : `Latency ${formatDuration(test.latencyMs)}`,
    test.inputTokens === null ? null
      : `${formatCount(test.inputTokens)} in · ${formatCount(test.outputTokens ?? 0)} out`,
    test.usd === null ? null : `Cost ${formatUsd(test.usd)}`,
  ].filter(Boolean).join(' · ');
  return (
    <div className={styles.outcome}>
      <p><Badge variant={test.passed ? 'outline' : 'destructive'}>
        {test.passed ? 'Passed' : 'Failed'}
      </Badge>{test.failureCode && <span> {test.failureCode}</span>}</p>
      <ul className={styles.checks}>
        {checkItems(test).map(item => (
          <li key={item.key}><span>{item.label}</span>
            <span data-state={item.state}>{MARK[item.state]}</span></li>
        ))}
      </ul>
      {test.checks.finishReason && (
        <p className={styles.note}>Finish reason: {test.checks.finishReason}</p>
      )}
      {measured && <p className={styles.note}>{measured}</p>}
    </div>
  );
}

/** Test button and its dialog: states the cost cap, runs one test, then shows the checks. */
export function TestAction({ modelId, onTested }: { modelId: string; onTested: () => void }) {
  const client = useAdminClient();
  const trigger = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [test, setTest] = useState<ModelTest | null>(null);
  const [failure, setFailure] = useState<Result<unknown> | null>(null);

  const run = async () => {
    const body = testBody(modelId);
    if (busy.current || !body) return;
    busy.current = true; setPending(true); setFailure(null); setTest(null);
    const result = await client<unknown>('admin/models/test', { method: 'POST', body });
    busy.current = false; setPending(false);
    const parsed = result.ok ? parseTest(result.data) : null;
    if (parsed) setTest(parsed); else setFailure(result.ok ? UNREADABLE : result);
    // The row's latest test, and so its status, may have changed even for a failed test.
    if (parsed || !result.ok) onTested();
  };
  const change = (value: boolean) => {
    if (pending) return;
    setOpen(value);
    if (!value) { setTest(null); setFailure(null); }
  };

  return <>
    <Button ref={trigger} type="button" variant="outline" size="sm"
      aria-label={`Test ${modelId}`} onClick={() => setOpen(true)}>
      <FlaskConical aria-hidden />Test
    </Button>
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="admin-leave-dialog"
        onCloseAutoFocus={event => { event.preventDefault(); trigger.current?.focus(); }}>
        <DialogHeader>
          <DialogTitle>Test {modelId}?</DialogTitle>
          <DialogDescription>
            Sends one short tool-call request to the provider with the server key. The cost is
            capped: {TEST_COST_NOTE}, across all admins. No chat text is sent or stored.
          </DialogDescription>
        </DialogHeader>
        <div className={styles.dialogBody}>
          {pending && (
            <p role="status" className={styles.progress}>
              <Loader2 className="animate-spin" aria-hidden />
              Testing {modelId}. This can take up to 30 seconds.
            </p>
          )}
          {test && <Outcome test={test} />}
          {failure && <ResultState result={failure} />}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={pending}
            onClick={() => change(false)}>{test ? 'Close' : 'Cancel'}</Button>
          {!test && (
            <Button type="button" disabled={pending} onClick={() => void run()}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}Run test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
