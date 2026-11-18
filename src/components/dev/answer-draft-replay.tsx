'use client';

import { useEffect, useRef, useState } from 'react';
import { AguiChatTransport } from '@/lib/agui-chat-transport';
import { answerView, REPLACE_PART, type MessagePart } from '@/lib/agui/answer-draft.mjs';
import { DraftAnswer } from '../workspace/answer-draft';
import { Button } from '../ui/button';

export type DraftRecording = {
  id: string; title: string; taskVersion: number;
  commandReceipts: { commandId: string; state: string }[];
};

const muted = { fontSize: 12, color: 'var(--muted-foreground)', margin: '0 0 4px' };

/** Development-only: plays recorded draft frames through the real adapter and client. */
export function AnswerDraftReplay({ recordings }: {
  recordings: { label: string; snapshot: DraftRecording }[];
}) {
  const [parts, setParts] = useState<MessagePart[]>([]);
  const [state, setState] = useState('Ready to replay');
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);

  const replay = async (snapshot: DraftRecording) => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setParts([]); setError(''); setState('Replaying recorded draft');
    try {
      const command = snapshot.commandReceipts.find(row => row.state === 'applied');
      if (!command) throw Error('The recording has no applied command.');
      const stream = await new AguiChatTransport('/api/dev/agui-replay').sendMessages({
        trigger: 'submit-message', chatId: 'draft-replay', messageId: undefined,
        messages: [{ id: 'draft-prompt', role: 'user',
          parts: [{ type: 'text', text: snapshot.title }] }],
        abortSignal: controller.signal,
        body: { taskId: snapshot.id, idempotencyKey: command.commandId,
          clientSubmissionId: 'draft-replay',
          expectedTaskVersion: snapshot.taskVersion, expectedPlanVersion: 0, mode: 'ask' },
      });
      // The chunks become message parts the way the AI SDK builds them (text state, replace part).
      const reader = stream.getReader();
      const built: { text?: MessagePart; replace?: MessagePart } = {};
      try {
        for (;;) {
          const next = await reader.read();
          if (next.done || active.current !== controller) break;
          const chunk = next.value as { type: string; delta?: string; data?: { text: string } };
          const text = built.text;
          if (chunk.type === 'text-start') {
            built.text = { type: 'text', text: '', state: 'streaming' };
          }
          else if (chunk.type === 'text-delta' && text) {
            built.text = { ...text, text: `${text.text}${chunk.delta}` };
          }
          else if (chunk.type === 'text-end' && text) built.text = { ...text, state: 'done' };
          else if (chunk.type === REPLACE_PART) {
            built.replace = { type: REPLACE_PART, data: chunk.data };
          }
          else continue;
          setParts([built.text, built.replace].filter((part): part is MessagePart => !!part));
        }
      } finally { reader.releaseLock(); }
      if (active.current === controller) {
        setState('Replay completed: the checked answer replaced the draft');
      }
    } catch (failure) {
      if (active.current === controller && !controller.signal.aborted) {
        setError(failure instanceof Error ? failure.message : 'Replay unavailable.');
        setState('Replay stopped');
      }
    }
  };

  const views = answerView(parts);
  return (
    <section aria-label="Recorded answer draft replay"
      style={{ marginTop: 32, borderTop: '1px solid var(--separator)', paddingTop: 20 }}>
      <h2 style={{ fontSize: 16 }}>Answer draft</h2>
      <p style={{ color: 'var(--muted-foreground)', marginBlock: 12 }}>
        Recorded draft frames go through the AG-UI adapter and client. The draft is muted and
        labelled; the checked answer then replaces it. No live provider.
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {recordings.map(row => (
          <Button key={row.snapshot.id} onClick={() => void replay(row.snapshot)}>
            {row.label}
          </Button>
        ))}
      </div>
      <p role="status" style={{ marginBlock: 12 }}>{state}</p>
      {error && <p role="alert">{error}</p>}
      {views.map((view, index) => view.draft
        ? <DraftAnswer key={index} text={view.text} />
        : (
          <div key={index}>
            <p style={muted}>Checked answer</p>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{view.text}</p>
          </div>
        ))}
    </section>
  );
}
