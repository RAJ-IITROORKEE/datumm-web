'use client';

import { useState } from 'react';
import { parseRunSteps } from '@/lib/run-steps.mjs';
import { RunStepsView, type RunStepsState } from '../workspace/run-steps';

const at = (seconds: number) => new Date(Date.parse('2026-11-18T09:00:00Z') + seconds * 1000).toISOString();
const node = (kind: string, label: string, seconds: number, extra: Record<string, unknown> = {}) => ({
  kind, label, startedAt: at(seconds), durationMs: null, status: 'succeeded', model: null, tokens: null, usd: null,
  children: [], ...extra,
});
const model = (seconds: number, children: unknown[]) => node('model', 'Model call · gpt-6-luna', seconds, {
  durationMs: 2100, model: 'openai/gpt-6-luna', tokens: { input: 5400, output: 260 }, usd: '0.012300000000', children });
// Synthetic data in the backend's v1 shape (GET tasks/{id}/steps); it carries no prompt or answer text.
const FIXTURE = parseRunSteps({ schemaVersion: 1, runs: [
  { runId: 'fixture-run-1', startedAt: at(0), status: 'completed', truncated: false, children: [
    model(1, [node('stage', 'Agent step', 3.1, { durationMs: 900, children: [
      node('tool', 'Tool · Revit read: model elements', 3.2, { durationMs: 420 })] })]),
    model(6, [node('stage', 'Agent step', 8, { durationMs: 1300, children: [
      node('tool', 'Tool · Revit read: selection', 8.1, { durationMs: 80, status: 'failed' }),
      node('stage', 'Read retry', 8.3, { status: 'partial' }),
      node('tool', 'Tool · Revit read: selection', 8.5, { durationMs: 90 })] })]),
    node('check', 'Check · Validate in Revit', 11, { durationMs: 600 }),
    node('stage', 'Specialist · layout_critic', 12, { durationMs: 5200, status: 'partial' })] },
  { runId: 'fixture-run-2', startedAt: at(120), status: 'needs_input', truncated: false, children: [
    model(121, [node('stage', 'Agent step', 123, { durationMs: 700, children: [
      node('question', 'Question asked', 123, { status: 'waiting' })] })])] },
] });

type Scenario = 'ready' | 'loading' | 'empty' | 'error';
const STATES: Record<Scenario, RunStepsState> = {
  ready: { status: 'ready', data: FIXTURE! }, loading: { status: 'loading' }, error: { status: 'error' },
  empty: { status: 'ready', data: { runs: [{ runId: 'fixture-run-0', startedAt: at(0), status: 'completed', truncated: false, children: [] }] } },
};

/** Development-only fixture for the Run steps tree. Nothing here calls the service. */
export function RunStepsPreview() {
  const [scenario, setScenario] = useState<Scenario>('ready');
  return <section style={{ padding: 16, maxWidth: 520 }}>
    <h1 style={{ fontSize: 16, margin: '0 0 8px' }}>Run steps fixture</h1>
    <label style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>State{' '}
      <select value={scenario} onChange={event => setScenario(event.currentTarget.value as Scenario)}>
        <option value="ready">Steps</option><option value="loading">Loading</option>
        <option value="empty">Empty</option><option value="error">Error</option>
      </select></label>
    <RunStepsView state={STATES[scenario]} />
  </section>;
}
