'use client';

import {useMemo, useState} from 'react';
import {PlanDrawing} from '../plan-drawing';
import type {DrawingVersion} from '../plan-canvas';
import {RevitPanel, type RevitCall} from '../workspace/revit-panel';

// Synthetic Revit checks: every call below is answered here, nothing reaches a service or Revit.
const scenarios = {
  problems: 'Health with problems (no warnings field)',
  warnings: 'Revit warnings',
  unavailable: 'Warnings need add-in update',
  delta: 'Changes after a second check',
  compare: 'Compare with the DATUMM plan',
  partial: 'Partial coverage',
  image: 'Plan image',
  stale: 'Stale revision refused',
  offline: 'Offline',
} as const;
type Scenario = keyof typeof scenarios;

const graph: DrawingVersion['graph'] = {
  site: {widthMm: 9000, depthMm: 7000}, wallThicknessMm: 200, wallHeightMm: 3000, openings: [],
  rooms: [
    {key: 'living', name: 'Living', areaMm2: 24000000, rect: [0, 0, 6000, 4000]},
    {key: 'bed', name: 'Bedroom', areaMm2: 18000000, rect: [0, 4000, 6000, 7000]},
    {key: 'bath', name: 'Bathroom', areaMm2: 9000000, rect: [6000, 4000, 9000, 7000]},
  ],
  walls: [
    {key: 's', start: [0, 0], end: [9000, 0]}, {key: 'e', start: [9000, 0], end: [9000, 7000]},
    {key: 'n', start: [9000, 7000], end: [0, 7000]}, {key: 'w', start: [0, 7000], end: [0, 0]},
  ],
};

const limitations = ['Revit warnings and room boundaries need the DATUMM add-in update.'];
const base = {
  schema: 'datumm.model-health.v1', documentId: 'fixture-document', revision: 12,
  title: 'Synthetic house', counts: {rooms: 6, levels: 2, views: 9}, limitations,
};
const checks = [
  {code: 'rooms.unplaced', severity: 'warn', message: 'Two rooms are not placed in the model.', count: 2, elementIds: ['r-1', 'r-2']},
  {code: 'rooms.no-name', severity: 'warn', message: 'One room has no name.', count: 1, elementIds: ['r-3']},
  {code: 'rooms.duplicate-number', severity: 'warn', message: 'Rooms 101 and 101 share a number.', count: 2, elementIds: ['r-4', 'r-5']},
  {code: 'levels.no-rooms', severity: 'info', message: 'Level 2 has no rooms yet.', count: 1, elementIds: []},
];
const warning = (key: string, description: string, elementIds: number[]) =>
  ({key, failureDefinitionId: 'fixture-failure', severity: 'Warning', description, elementIds});
const overlap = 'Highlighted walls overlap.';
const open = 'Room is not in a properly enclosed region.';
const firstWarnings = [warning('w1', overlap, [101, 102]), warning('w2', overlap, [103]), warning('w3', open, [201])];
// The second check of the "delta" scenario: w1 is fixed, w4 and w5 are new.
const secondWarnings = [firstWarnings[1], firstWarnings[2], warning('w4', open, [202]), warning('w5', 'Duplicate mark values.', [301])];
const warningsOf = (items: ReturnType<typeof warning>[]) => ({coverage: 'complete', total: items.length, items});
const warningChecks = (items: ReturnType<typeof warning>[]) => [...new Set(items.map(item => item.description))].map(message =>
  ({code: 'REVIT_WARNING', severity: 'warn', message, count: items.filter(item => item.description === message).length, elementIds: []}));

const healthFor = (scenario: Scenario, check: number) => {
  if (scenario === 'partial') return {...base, coverage: 'partial', checks: checks.slice(0, 1), limitations: [...limitations, 'Only the first 500 rooms were read.']};
  const items = scenario === 'delta' && check > 1 ? secondWarnings : firstWarnings;
  if (scenario === 'warnings' || scenario === 'compare' || scenario === 'delta') {
    return {...base, revision: scenario === 'delta' ? 12 + check - 1 : 12, coverage: 'complete',
      checks: [...checks, ...warningChecks(items)], limitations: [], warnings: warningsOf(items)};
  }
  if (scenario === 'unavailable') return {...base, coverage: 'complete', checks, warnings: {coverage: 'unavailable'}};
  return {...base, coverage: 'complete', checks};
};

const compareResult = {
  schema: 'datumm.plan-model-compare.v1', documentId: 'fixture-document', revision: 12,
  planId: 'fixture-plan', version: 1,
  matched: [
    {name: 'Living', planAreaM2: 24, revitAreaM2: 25.1, differencePct: 4.6, revitElementId: 401},
    {name: 'Bedroom', planAreaM2: 18, revitAreaM2: 14.4, differencePct: -20, revitElementId: 402},
  ],
  onlyInPlan: ['Bathroom'], onlyInRevit: [{name: 'Store', elementId: 403}],
  limitations: ['Rooms are matched by name and area only; boundary geometry needs the DATUMM add-in update.'],
};

// A real PNG drawn in the browser, because the panel accepts only a PNG it can verify.
function planPng() {
  const canvas = document.createElement('canvas');
  canvas.width = 800; canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 800, 600);
  ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
  for (const rect of [[40, 40, 480, 300], [40, 340, 480, 220], [520, 340, 240, 220]]) ctx.strokeRect(rect[0], rect[1], rect[2], rect[3]);
  return canvas.toDataURL('image/png').split(',')[1];
}

const fail = (status: number, message: string) => Object.assign(new Error(message), {status});
const delay = () => new Promise(resolve => setTimeout(resolve, 300));

const callFor = (scenario: Scenario): RevitCall => {
  let checked = 0;
  return (async (path: string, _method?: string, body?: unknown) => {
    await delay();
    if (path.endsWith('/health')) {
      if (scenario === 'offline') throw fail(503, 'DEVICE_OFFLINE: connect the Windows connector.');
      return healthFor(scenario, ++checked);
    }
    if (path.endsWith('/compare-plan')) {
      if (scenario === 'offline') throw fail(503, 'DEVICE_OFFLINE: connect the Windows connector.');
      return compareResult;
    }
    const request = body as {name: string; arguments: Record<string, unknown>};
    if (request.name === 'list_revit_sessions') return [{sessionId: 'fixture-session'}];
    if (request.name === 'show_model_elements') {
      if (scenario === 'stale') throw fail(409, 'STALE_REVISION: Document or revision changed; inspect the target again.');
      return {ok: true, data: {action: 'select', modelChanged: false}};
    }
    if (request.name === 'get_model_views') {
      return {ok: true, data: {kind: 'plans', total: 2, nextOffset: null, plans: [
        {id: 'v-1', name: 'Level 1', viewType: 'FloorPlan', levelId: 'l-1', scale: 100, cropActive: false},
        {id: 'v-2', name: 'Level 2', viewType: 'FloorPlan', levelId: 'l-2', scale: 100, cropActive: false},
      ]}};
    }
    return {ok: true, data: {
      documentId: 'fixture-document', revision: 12, viewId: request.arguments.viewId, viewName: 'Level 1',
      viewType: 'FloorPlan', scale: 100, width: 800, height: 600, contentType: 'image/png', base64: planPng(),
    }};
  }) as RevitCall;
};

export function RevitPreview() {
  const [scenario, setScenario] = useState<Scenario>('problems');
  const call = useMemo(() => callFor(scenario), [scenario]);
  return <div style={{display: 'grid', gap: 16, padding: 16}}>
    <div style={{display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center'}}>
      <strong>Revit checks fixture</strong><span>Synthetic answers · no service or Revit call</span>
      {(Object.keys(scenarios) as Scenario[]).map(key =>
        <button key={key} aria-pressed={scenario === key} onClick={() => setScenario(key)}>{scenarios[key]}</button>)}
    </div>
    <aside aria-label="Fixture Revit tab" style={{width: 'min(420px,100%)', padding: 16, border: '1px solid var(--separator)', borderRadius: 8}}>
      <RevitPanel key={scenario} deviceId="fixture-device" online call={call}
        planRef={{planId: 'fixture-plan', version: 1}}
        plan={<PlanDrawing graph={graph} mode="presentation" compact label="Synthetic DATUMM plan"/>}/>
    </aside>
    <p>Presses: pick "Check the model", then "Select in Revit"; in "Changes after a second check" press "Check again" for the change line; "Compare with the DATUMM plan" has its own button; for the plan image use "Validate in Revit", then "Show the plan".</p>
  </div>;
}
