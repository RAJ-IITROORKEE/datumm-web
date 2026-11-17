'use client';

import { useRef, useState } from 'react';
import { ModelPicker, type ReasoningEffort } from '../model-picker';
import { PanelResize } from '../panel-resize';
import { ContextMeter } from '../workspace/context-meter';
import { ChatRow } from '../workspace/chat-row';
import type { Run } from '../workspace/use-workspace-state';
import { groupChatsByDate } from '@/lib/sidebar-history.mjs';
import { parseModelInfo } from '@/lib/model-display.mjs';
import styles from '../workspace/sidebar.module.css';

const MODELS = ['anthropic/claude-sonnet-5', 'anthropic/claude-haiku-5', 'openai/gpt-6-luna',
  'openai/gpt-6-mini', 'google/gemini-4-flash', 'google/gemini-4-pro'];
// Synthetic prices; the last model has no facts to show a partial list.
const INFO = parseModelInfo({
  'anthropic/claude-sonnet-5':
    { promptPerM: '3', completionPerM: '15', contextLength: 200000, imageInput: true },
  'anthropic/claude-haiku-5': { promptPerM: '0.8', completionPerM: '4', contextLength: 200000 },
  'openai/gpt-6-luna':
    { promptPerM: '2.5', completionPerM: '10', contextLength: 1000000, imageInput: true },
  'openai/gpt-6-mini': { promptPerM: '0.15', completionPerM: '0.6', contextLength: 128000 },
  'google/gemini-4-flash': { promptPerM: '0.1', completionPerM: '0.4', contextLength: 1000000 },
}, MODELS);

const usage = (used: number, capacity: number | null, state = 'completed') => ({
  rootTaskId: 'fixture-task',
  context: {
    modelCapacityTokens: capacity, estimatedInputTokens: used, lastProviderCallState: state,
    lastProviderInputTokens: Math.round(used * 0.9),
    lastProviderOutputTokens: used - Math.round(used * 0.9),
    lastProviderReportedUsd: '0.0213',
  },
  cumulative: { modelCalls: 7 },
});
const METERS: [string, ReturnType<typeof usage>][] = [
  ['30% (neutral)', usage(60000, 200000)],
  ['75% (warning)', usage(150000, 200000)],
  ['95% (danger)', usage(190000, 200000)],
  ['Running, estimate', usage(40000, 200000, 'running')],
  ['Window unknown', usage(42000, null)],
];

const day = 86400000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();
type Extra = Record<string, unknown>;
const chat = (id: string, title: string, created: string | undefined, extra: Extra = {}) => ({
  id, title, created_at: created, status: 'completed', mode: 'plan', model: 'x', data: {}, ...extra,
}) as unknown as Run;
const committed = { operationId: 'op', outcomeReceipt: { status: 'committed' } };
const CHATS = [
  chat('a', 'Working chat with a long title that must truncate before the chip', ago(0),
    { status: 'running' }),
  chat('b', 'Needs an answer', ago(0),
    { status: 'needs_input', data: { agent_question: { id: 'q' } } }),
  chat('c', 'Failed chat', ago(1), { status: 'failed' }),
  chat('r', 'Revit commit, verification incomplete', ago(1), { data: { native_build: committed } }),
  chat('d', 'Completed yesterday', ago(1.2)),
  chat('e', 'Three days ago', ago(3)),
  chat('f', 'Last month', ago(30)),
  chat('g', 'Invalid date', 'not-a-date'),
];

export function ComposerSidebarPreview() {
  const [model, setModel] = useState(MODELS[0]);
  const [effort, setEffort] = useState<ReasoningEffort>('high');
  const [withInfo, setWithInfo] = useState(true);
  const [width, setWidth] = useState(224);
  const trigger = useRef<HTMLElement | null>(null);
  const row = (item: Run) => (
    <ChatRow key={item.id} item={item} selected={item.id === 'd'} busy={false}
      unread={item.id === 'e'} dialogTrigger={trigger} onSelect={() => {}} onHistory={() => {}}
      onDelete={() => {}} onProjects={() => {}} />
  );
  return (
    <div style={{ display: 'grid', gap: 24, padding: 16 }}>
      <section aria-label="Model picker and meters">
        <h2>Composer</h2>
        <label style={{ display: 'block', marginBottom: 8 }}>
          <input type="checkbox" checked={withInfo}
            onChange={(event) => setWithInfo(event.target.checked)} />
          {' '}Service reports modelInfo (prices and context)
        </label>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end',
          gap: 8, maxWidth: 520, padding: 8, border: '1px solid var(--line)', borderRadius: 10,
        }}>
          <ModelPicker model={model} models={MODELS} defaultModel="anthropic/claude-sonnet-5"
            modelInfo={withInfo ? INFO : undefined} reasoningEffort={effort}
            onModelChange={setModel} onReasoningEffortChange={setEffort} />
        </div>
        <h3>Context meter</h3>
        {METERS.map(([name, value]) => (
          <div key={name}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0' }}>
            <span style={{ width: 150 }}>{name}</span>
            <ContextMeter usage={value} taskId="fixture-task" onOpenActivity={() => {}}
              running={value.context.lastProviderCallState === 'running'} />
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 150 }}>No reading (hidden)</span>
          <ContextMeter usage={undefined} taskId="fixture-task" />
        </div>
      </section>
      <section aria-label="Sidebar chats">
        <h2>Sidebar</h2>
        <p>Drag the handle or focus it and use arrow keys, Home and End (220 to 360 px).</p>
        <div className="sidebar"
          style={{ position: 'relative', width, height: 420, overflow: 'auto' }}>
          <div className={styles.history} role="region" aria-label="Fixture chats" tabIndex={0}>
            {groupChatsByDate(CHATS).map((group) => (
              <div key={group.label} className={styles.dateGroup}>
                <h3 className={styles.dateHeading}>{group.label}</h3>
                {group.items.map(row)}
              </div>
            ))}
          </div>
          <PanelResize side="left" label="navigation" width={width} onChange={setWidth} />
        </div>
      </section>
    </div>
  );
}
