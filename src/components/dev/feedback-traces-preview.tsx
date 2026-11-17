'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { TracesSection } from '../admin/traces-section';
import { FeedbackSection } from '../admin/feedback-section';
import { fixtureCase, fixtureFeedback } from './admin-feedback-fixture';
import { AdminClientProvider, type AdminClient, type Result } from '../admin/use-admin';
import { OutputWorkspaceProvider } from '../workspace/output-workspace';
import { ConversationAnswer } from '../workspace/conversation-answer';
import { feedbackFailureMessage, type FeedbackKind } from '@/lib/answer-feedback.mjs';
import { reasonLabel } from '@/lib/admin-traces.mjs';
import type { AnswerFeedback } from '@/lib/work-area-contract';
import '../../app/admin/admin.css';

const TASK = 'fixture-task';
// Turn ids are the client's request keys (crypto.randomUUID); traces show no other form.
const TURN = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b';
const EXECUTION = 'fixture-run';
const ANSWER = 'The kitchen is 12 m² and the living room is 24 m². '
  + 'Illustrative text, not a Revit measurement.';
const SCOPE = { key: JSON.stringify(['development-fixture', 'task', TASK]),
  accountKey: 'development-fixture', taskId: TASK, sourceKey: 'fixture-source' };

type Vote = { rating: FeedbackKind; reason?: string };
export type RatingStore = Record<string, Vote>;
const PERIOD_HOURS: Record<string, number> = { '24h': 24, '7d': 168, '30d': 720 };
const PAGE = 3;

const call = { role: 'planner', modelId: 'openai/gpt-6-luna', status: 'settled',
  finishReason: 'stop', inputTokens: 1200, outputTokens: 300, reasoningTokens: 0, durationMs: 3100,
  usd: '0.0123', failureCode: null };
const base = (traceId: string, ageHours: number, extra: Record<string, unknown>) => ({
  traceId, taskId: 'fixture-other', turnId: null, ageHours, ownerHash: 'b1c2d3e4f5061728',
  mode: 'ask', reasoningEffort: 'high', requestedModel: 'openai/gpt-6-luna',
  servedModels: ['openai/gpt-6-luna'], status: 'completed', outcome: 'completed', failureCode: null,
  recoveryAction: null, durationMs: 4200, modelMs: 3100,
  steps: { total: 5, succeeded: 5, failed: 0, skipped: 0, stopped: 0, retried: 0, unconfirmed: 0 },
  tools: [{ name: 'revit.query', calls: 2, failed: 0 }], specialists: [], calls: [call],
  callsTruncated: false, tokens: { input: 1200, output: 300, reasoning: 0 }, usd: '0.0123',
  signals: [] as string[], feedback: null, ...extra,
});
// Rows 1 and 2 carry phases; rows 3 and 4 omit them (older backend); row 5 is a short-path turn.
const FIXTURE_ROWS = [
  base(EXECUTION, 1, { taskId: TASK, turnId: TURN, ownerHash: 'a1b2c3d4e5f60718',
    route: { lane: 'full', rule: null, floor: null },
    phases: { admitMs: 35, startMs: 120, firstCallMs: 480, answerMs: 4100, modelMs: 3100,
      toolMs: 700, stepMs: 3900, unattributedMs: 400, maxPacketBytes: 48213,
      maxToolSchemaBytes: 9120 } }),
  base('trace-fixture-2', 5, { mode: 'plan', requestedModel: 'openai/gpt-6.1-sol',
    outcome: 'failed', status: 'failed', failureCode: 'provider_timeout', recoveryAction: 'retry',
    durationMs: 12800, signals: ['retried', 'call_unsettled'],
    steps: { total: 6, succeeded: 3, failed: 2, skipped: 0, stopped: 0, retried: 1,
      unconfirmed: 0 },
    route: { lane: 'full', rule: null, floor: null },
    phases: { admitMs: 22, startMs: 60, firstCallMs: 310, answerMs: null, modelMs: 3100,
      toolMs: 1200, stepMs: null, unattributedMs: 8500, maxPacketBytes: 61002,
      maxToolSchemaBytes: null } }),
  base('trace-fixture-3', 30, { mode: 'plan',
    servedModels: ['openai/gpt-6-luna', 'openai/gpt-6-mini'], signals: ['model_fallback'],
    durationMs: 61000 }),
  base('trace-fixture-4', 200, { outcome: 'cancelled', status: 'cancelled', ownerHash: null,
    durationMs: 900 }),
  base('trace-fixture-5', 2, { mode: 'plan', durationMs: 60, modelMs: 0, calls: [], tools: [],
    steps: { total: 0, succeeded: 0, failed: 0, skipped: 0, stopped: 0, retried: 0,
      unconfirmed: 0 },
    tokens: { input: 0, output: 0, reasoning: 0 }, usd: '0', signals: ['quick_reply'],
    route: { lane: 'short', rule: 'greeting', floor: null },
    phases: { admitMs: 14, startMs: 9, firstCallMs: null, answerMs: 52, modelMs: 0, toolMs: 0,
      stepMs: null, unattributedMs: 60, maxPacketBytes: null, maxToolSchemaBytes: null } }),
];

const percentile = (values: number[], share: number) => {
  if (!values.length) return null;
  const index = Math.min(values.length - 1, Math.ceil(values.length * share) - 1);
  return [...values].sort((a, b) => a - b)[index];
};

/** A traces response for `query`, joining the fixture answer's rating from the shared store. */
export function fixtureTraces(query: URLSearchParams, votes: RatingStore) {
  const now = Date.now();
  const has = (key: string, value: string | null) => !query.get(key) || value === query.get(key);
  const rows = FIXTURE_ROWS.map(({ ageHours, ...row }) => {
    const vote = row.traceId === EXECUTION ? votes[TURN] : undefined;
    const at = new Date(now).toISOString();
    const feedback = vote ? { rating: vote.rating, reason: vote.reason ?? null, at } : null;
    return { ...row, at: new Date(now - ageHours * 3600e3).toISOString(), _age: ageHours,
      feedback };
  }).filter(row => row._age <= (PERIOD_HOURS[query.get('period') ?? '7d'] ?? 168))
    .filter(row => has('outcome', row.outcome) && has('mode', row.mode))
    .filter(row => has('model', row.requestedModel) && has('owner', row.ownerHash))
    .filter(row => !query.get('signal') || row.signals.includes(query.get('signal') as string))
    .filter(row => {
      const f = query.get('feedback');
      return !f || (f === 'none' ? !row.feedback : row.feedback?.rating === f);
    });
  const start = Number(query.get('cursor')?.replace(/^o/, '')) || 0;
  const durations = rows.map(row => row.durationMs);
  const reasons: Record<string, number> = {};
  for (const row of rows) {
    const reason = row.feedback?.reason;
    if (reason) reasons[reason] = (reasons[reason] ?? 0) + 1;
  }
  const sum = (pick: (row: (typeof rows)[number]) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);
  const rated = (rating: string) => rows.filter(row => row.feedback?.rating === rating).length;
  return { schemaVersion: 1, from: new Date(now - 7 * 864e5).toISOString(),
    to: new Date(now).toISOString(),
    stats: { turns: rows.length, scanned: rows.length, truncated: false,
      failed: rows.filter(row => row.outcome === 'failed').length,
      p50Ms: percentile(durations, 0.5), p95Ms: percentile(durations, 0.95),
      inputTokens: sum(row => row.tokens.input), outputTokens: sum(row => row.tokens.output),
      usd: sum(row => Number(row.usd)).toFixed(4),
      feedback: { up: rated('up'), down: rated('down'), reasons } },
    rows: rows.slice(start, start + PAGE).map(({ _age, ...row }) => row),
    nextCursor: start + PAGE < rows.length ? `o${start + PAGE}` : null };
}

const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');

export function FeedbackTracesPreview() {
  const votes = useRef<RatingStore>({});
  const failNextRef = useRef(false);
  const [failNext, setFailNext] = useState(false);
  const [version, setVersion] = useState(0), [mount, setMount] = useState(0);
  const [notice, setNotice] = useState('No rating saved yet.');
  const [hash, setHash] = useState('');
  useEffect(() => {
    void crypto.subtle.digest('SHA-256', new TextEncoder().encode(ANSWER))
      .then(bytes => setHash(hex(bytes)));
  }, []);
  const snapshot = useMemo(() => Object.fromEntries(
    Object.entries(votes.current).map(([turn, vote]) => [turn, vote.rating])), [version, mount]);
  const feedback = useMemo<AnswerFeedback>(() => ({
    votes: snapshot,
    async save(_task, body) {
      await new Promise(resolve => setTimeout(resolve, 150));
      if (failNextRef.current) {
        failNextRef.current = false; setFailNext(false);
        setNotice(feedbackFailureMessage(500));
        return false;
      }
      const reason = body.reason ?? votes.current[body.turnId]?.reason;
      if (body.rating === 'cleared') delete votes.current[body.turnId];
      else votes.current[body.turnId] = { rating: body.rating, reason };
      const saved = votes.current[body.turnId];
      const label = saved && (saved.rating === 'up'
        ? 'Up' : `Down${saved.reason ? ` · ${reasonLabel(saved.reason)}` : ''}`);
      setNotice(label ? `Saved rating: ${label}.` : 'Saved rating removed.');
      setVersion(value => value + 1);
      return true;
    },
  }), [snapshot]);
  const client = useMemo<AdminClient>(() => async function <T>(path: string): Promise<Result<T>> {
    await new Promise(resolve => setTimeout(resolve, 150));
    const url = new URL(path, 'https://fixture.invalid/');
    if (url.pathname === '/admin/feedback') {
      return { ok: true, data: fixtureFeedback(url.searchParams, votes.current, TASK, TURN) as T };
    }
    if (url.pathname.startsWith('/admin/feedback/') && url.pathname.endsWith('/case')) {
      const found = fixtureCase(decodeURIComponent(url.pathname.split('/')[3]), votes.current, TASK, TURN);
      return found ? { ok: true, data: found as T }
        : { ok: false, reason: 'missing', message: 'No such feedback.' };
    }
    if (url.pathname !== '/admin/traces') {
      return { ok: false, reason: 'missing', message: 'Not in this fixture.' };
    }
    return { ok: true, data: structuredClone(fixtureTraces(url.searchParams, votes.current)) as T };
  }, []);
  const completion = hash ? { schemaVersion: 1, taskId: TASK, turnId: TURN, executionId: EXECUTION,
    answerHash: hash, status: 'completed', completionSequence: 9 } : undefined;
  const source = (key: string, state: 'saved' | 'streaming') =>
    ({ key, taskId: TASK, conversationIndex: 0, state });
  return <main style={{ padding: 16, display: 'grid', gap: 16 }}>
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
      <strong>Feedback and traces</strong>
      <span>Controlled fixture. One in-memory store; no service, agent or Revit execution.</span>
      <label><input type="checkbox" checked={failNext} onChange={event => {
        failNextRef.current = event.target.checked; setFailNext(event.target.checked);
      }} />
        {' '}Fail next save</label>
      <button type="button" onClick={() => setMount(value => value + 1)}>Remount answer</button>
    </div>
    <div style={{ display: 'grid', gap: 24, alignItems: 'start',
      gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}>
      <section aria-label="Fixture answers" style={{ minWidth: 0, display: 'grid', gap: 20 }}>
        <OutputWorkspaceProvider key={mount} scopeKey={SCOPE.key} scopeInput={SCOPE}
          answerFeedback={feedback}>
          <div><h2>Saved answer (completion proof)</h2>
            {completion && <ConversationAnswer text={ANSWER} turnId={TURN} completion={completion}
              source={source('fixture:saved', 'saved')} />}</div>
          <div><h2>Streaming answer</h2>
            <ConversationAnswer text={ANSWER} turnId="turn-0004"
              source={source('fixture:stream', 'streaming')} /></div>
          <div><h2>Saved without proof</h2>
            <ConversationAnswer text={ANSWER} turnId="turn-0005"
              source={source('fixture:unproven', 'saved')} /></div>
        </OutputWorkspaceProvider>
        <p role="status">{notice}</p>
      </section>
      <section aria-label="Fixture traces" className="admin-root"
        style={{ minWidth: 0, position: 'static', inset: 'auto', overflow: 'visible' }}>
        <AdminClientProvider key={version} client={client}><TracesSection /></AdminClientProvider>
      </section>
      <section aria-label="Fixture feedback" className="admin-root"
        style={{ minWidth: 0, position: 'static', inset: 'auto', overflow: 'visible' }}>
        <AdminClientProvider key={`feedback-${version}`} client={client}><FeedbackSection /></AdminClientProvider>
      </section>
    </div>
  </main>;
}
