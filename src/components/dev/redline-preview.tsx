'use client';

import {useRef, useState} from 'react';
import type {DrawingVersion} from '../plan-canvas';
import {PlanEditPanel, type PlanEditControls} from '../workspace/plan-edit-panel';
import type {PlanEditNotice} from '../workspace/use-plan-edit';
import {refusalMessage, successMessage, type PlanEdit} from '@/lib/plan-edits.mjs';
import {appliedMessage, parseRedlines, partialMessage} from '@/lib/redlines.mjs';
import type {RedlineSource} from '@/lib/redline-file';

const scenarios = {
  ready: 'Ready list (high, medium, low)',
  unclear: 'Some marks are unclear',
  error: 'Apply fails part-way (second change)',
  pdf: 'Multi-page PDF (page picker)',
} as const;
type Scenario = keyof typeof scenarios;

const room = (key: string, name: string, rect: number[]) =>
  ({key, name, rect, areaMm2: (rect[2] - rect[0]) * (rect[3] - rect[1])});
const graph: DrawingVersion['graph'] = {
  schemaVersion: 3,
  provenance: {source: 'deterministic'},
  site: {widthMm: 9000, depthMm: 7000},
  wallThicknessMm: 200,
  wallHeightMm: 3000,
  rooms: [
    room('bed2', 'Bedroom 2', [0, 0, 4500, 3500]),
    room('hall', 'Hall', [4500, 0, 9000, 3500]),
  ],
  walls: [{key: 'mid', start: [4500, 0], end: [4500, 3500], roomKeys: ['bed2', 'hall']}],
  openings: [{
    key: 'door-1', wallKey: 'mid', kind: 'door', offsetMm: 300, widthMm: 800,
    heightMm: 2100, sillMm: 0,
  }],
};
const drawingAt = (version: number): DrawingVersion => ({
  planId: 'fixture-redlines', version, fingerprint: `fixture-redline-v${version}`, svg: '', graph,
});

const door: PlanEdit = {
  kind: 'opening',
  opening: {
    kind: 'update', openingKey: 'door-1', wallKey: 'mid', offsetMm: 300, widthMm: 900,
    heightMm: 2100, sillMm: 0,
  },
};
const ready = (id: string, mark: string, confidence: string, summary: string, edit: PlanEdit) =>
  ({id, mark, confidence, status: 'ready', summary, edit});
const unclear = (id: string, mark: string, summary: string, reason: string) =>
  ({id, mark, confidence: 'low', status: 'unclear', summary, edit: null, reason});

const readyItems = () => [
  ready('r1', 'widen door 900', 'high', 'Widen the Bedroom 2 door to 900 mm', door),
  ready('r2', 'Bed 2 → Study', 'medium', 'Rename Bedroom 2 to Study',
    {kind: 'rename', roomKey: 'bed2', name: 'Study'}),
  ready('r3', 'wall ↑ ?', 'low',
    'Move the wall between Bedroom 2 and Hall by 300 mm, making Hall larger and Bedroom 2 smaller',
    {kind: 'move-wall', wallKey: 'mid', offsetMm: 300}),
];
const itemsFor = (scenario: Scenario) => scenario !== 'unclear' ? readyItems() : [
  readyItems()[0],
  unclear('r2', '?? move', 'The mark near the hall',
    'The mark does not say which wall moves or by how much.'),
  unclear('r3', '12 m²', 'A room size note',
    'Resizing a room by area is not supported. Name a wall move.'),
];

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
// A 1 x 1 JPEG: the fixture never draws or sends a real page.
const PIXEL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////'
  + '////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAA'
  + 'AAAAAAAAAP/aAAgBAQABPxA=';
const bar = {
  display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', padding: '8px 16px',
  borderBottom: '1px solid var(--separator)',
} as const;

/** Local stand-in for the server and for the file reader: nothing is sent anywhere. */
export function RedlinePreview() {
  const [version, setVersion] = useState(1);
  const [scenario, setScenario] = useState<Scenario>('ready');
  const [notice, setNotice] = useState<PlanEditNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('Nothing read yet.');
  const lock = useRef(false);
  const drawing = drawingAt(version);

  const open = async (file: File): Promise<RedlineSource> => {
    await pause(300);
    return {
      name: file.name,
      pageCount: scenario === 'pdf' ? 6 : 1,
      render: async () => ({image: PIXEL, pageText: 'WIDEN DOOR 900'}),
      close: () => undefined,
    };
  };
  const readRedlines: PlanEditControls['readRedlines'] = async (current, source) => {
    await pause(700);
    setSent(`Sent version ${current.version} with a ${source.image.length}-character image.`);
    const parsed = parseRedlines({
      schema: 'datumm.redlines.v1', planId: current.planId, version: current.version,
      fingerprint: current.fingerprint, model: 'fixture-vision', items: itemsFor(scenario),
    }, current);
    if (!parsed) throw new Error('Fixture answer is not valid.');
    return parsed;
  };
  const applyMany: PlanEditControls['applyMany'] = async (edits) => {
    if (lock.current || !edits.length) return {applied: 0, error: ''};
    lock.current = true;
    setBusy(true);
    setNotice(null);
    let applied = 0;
    let error = '';
    for (let index = 0; index < edits.length; index++) {
      await pause(500);
      if (scenario === 'error' && index === 1) {
        error = refusalMessage({status: 422, message: 'Choose a shared interior wall.'});
        break;
      }
      applied++;
    }
    const next = version + applied;
    if (applied) setVersion(next);
    if (error) {
      error = partialMessage(applied, edits.length, next, error);
      setNotice({tone: 'error', text: error});
    } else {
      const saved = {planId: drawing.planId, version: next, fingerprint: '', changes: {}};
      const text = edits.length > 1 ? appliedMessage(applied, next) : successMessage(saved, graph);
      setNotice({tone: 'ok', text, back: version});
    }
    setBusy(false);
    lock.current = false;
    return {applied, error};
  };
  const edit: PlanEditControls = {
    visible: true, reason: '', earlierOf: 0, busy, notice, applyMany, readRedlines,
    apply: async () => undefined, open: async () => undefined, dismiss: () => setNotice(null),
  };
  return (
    <div style={{display: 'flex', flexDirection: 'column', minHeight: 'calc(100dvh - 64px)'}}>
      <div style={bar}>
        <strong>Redline intake fixture</strong>
        <span>Mocked server and file reader · nothing is sent · Version {version}</span>
        <label>Mocked answer{' '}
          <select
            aria-label="Mocked redline scenario" value={scenario}
            onChange={(event) => setScenario(event.target.value as Scenario)}
          >
            {(Object.keys(scenarios) as Scenario[]).map((key) => (
              <option key={key} value={key}>{scenarios[key]}</option>
            ))}
          </select>
        </label>
        <button onClick={() => { setVersion(1); setNotice(null); setSent('Nothing read yet.'); }}>
          Reset
        </button>
        <span role="status">{sent} Choose any file; its content is ignored here.</span>
      </div>
      <aside
        className="desktop-workspace" aria-label="Fixture edit panel"
        style={{width: 'min(100%, 380px)', padding: 16}}
      >
        <PlanEditPanel drawing={drawing} selected="" edit={edit} redlines />
      </aside>
    </div>
  );
}
