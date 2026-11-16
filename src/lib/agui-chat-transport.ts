import { EventType, PROTOCOL_VERSION, type RunAgentInput } from '@ag-ui/core';
import { EventSchema } from '@ag-ui/core/schemas';
import type { ChatTransport, UIMessage, UIMessageChunk } from 'ai';
import { chatStartFailure, serviceErrorMessage } from './chat-start';

/** The display-state envelope travels as the one AG-UI context entry, never as a command prop. */
// The adapter validates it strictly; the builder in agui/frontend-context.mjs only produces valid envelopes.
function contextEntries(envelope: unknown): RunAgentInput['context'] {
  return envelope === undefined || envelope === null ? [] : [{ description: 'datumm.frontend.v1', value: JSON.stringify(envelope) }];
}

/** Adapts AG-UI transport to the existing chat view; task snapshots remain authoritative. */
export class AguiChatTransport implements ChatTransport<UIMessage> {
  private generation = 0;
  constructor(private readonly endpoint:'/api/agui'|'/api/dev/agui-replay'='/api/agui') {}
  async sendMessages({ messages, body, abortSignal, trigger }: Parameters<ChatTransport<UIMessage>['sendMessages']>[0]): Promise<ReadableStream<UIMessageChunk>> {
    if (trigger !== 'submit-message') throw new Error('Regeneration is not supported; start a new request.');
    const latest = messages.filter(message => message.role === 'user').at(-1);
    if (!latest) throw new Error('A user message is required.');
    const content = latest.parts.filter(part => part.type === 'text').map(part => part.text).join('\n');
    const { clientSubmissionId, frontendContext, ...forwardedProps } = (body ?? {}) as Record<string, unknown>;
    if (typeof clientSubmissionId !== 'string' || !clientSubmissionId) throw new Error('Missing request identity.');
    const input: RunAgentInput = {
      threadId: typeof forwardedProps.taskId === 'string' ? forwardedProps.taskId : crypto.randomUUID(),
      runId: crypto.randomUUID(), protocolVersion: PROTOCOL_VERSION,
      messages: [{ id: latest.id, role: 'user', content }], tools: [], context: contextEntries(frontendContext), forwardedProps,
    };
    return this.request(input, clientSubmissionId, abortSignal);
  }

  async resumeQuestion(props: Record<string, unknown>, questionId: string, version: number, payload: unknown, clientSubmissionId: string, signal?: AbortSignal): Promise<ReadableStream<UIMessageChunk>> {
    if (typeof props.taskId !== 'string' || !clientSubmissionId) throw new Error('Missing task or request identity.');
    const input: RunAgentInput = { threadId: props.taskId, runId: crypto.randomUUID(), protocolVersion: PROTOCOL_VERSION,
      messages: [], tools: [], context: [], forwardedProps: props,
      resume: [{ interruptId: `${questionId}:${version}`, status: 'resolved', payload }] };
    try { return await this.request(input, clientSubmissionId, signal); }
    catch (failure) {
      const error=failure instanceof Error?failure:new Error('The answer could not be sent.');
      const status=(error as Error&{status?:number}).status, contentType=(error as Error&{contentType?:string}).contentType;
      const message=chatStartFailure(error)?.message ?? serviceErrorMessage(error.message,status,contentType);
      throw Object.assign(new Error(message),{status});
    }
  }

  private async request(input: RunAgentInput, clientSubmissionId: string, abortSignal?: AbortSignal): Promise<ReadableStream<UIMessageChunk>> {
    const forwardedProps = input.forwardedProps as Record<string, unknown>;
    const generation = ++this.generation;
    const current = () => this.generation === generation;
    const response = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' }, body: JSON.stringify(input), signal: abortSignal });
    if (!current()) { await response.body?.cancel(); return new ReadableStream({ start(controller) { controller.close(); } }); }
    if (!response.ok) throw Object.assign(new Error(await response.text() || 'The request could not be completed. Check the saved task before retrying.'), {status: response.status,contentType:response.headers.get('content-type')??''});
    if (!response.body) throw new Error('The stream is unavailable. Check the saved task before retrying.');
    if (!/^text\/event-stream(?:\s*;|\s*$)/i.test(response.headers.get('content-type') ?? '')) {
      await response.body.cancel();
      throw new Error('The activity stream was unavailable. Check the saved task before retrying.');
    }
    const reader = response.body.getReader();
    async function* chunks(): AsyncGenerator<UIMessageChunk> {
        const decoder = new TextDecoder();
        let buffer = '', started = false, finished = false, admittedTask = '', textId = '';
        const packet = (frame: string): UIMessageChunk[] => {
          const output: UIMessageChunk[] = [];
          const emit = (value: UIMessageChunk) => output.push(value);
          const data = frame.split(/\r\n|\r|\n/).filter(line => line === 'data' || line.startsWith('data:')).map(line => line === 'data' ? '' : line.slice(5).replace(/^ /, '')).join('\n');
          if (!data) return output;
          const raw = JSON.parse(data);
          if (raw?.type === EventType.RUN_FINISHED && raw.outcome !== undefined && (!raw.outcome || !['success', 'interrupt', 'cancelled'].includes(raw.outcome.type))) throw new Error('Unknown run outcome. Check the saved task.');
          const parsed = EventSchema.safeParse(raw);
          if (!parsed.success) throw new Error('Invalid activity stream. Check the saved task before retrying.');
          const event = parsed.data;
          if (finished) throw new Error('Activity arrived after the run ended.');
          if (event.type === EventType.RUN_ERROR) throw Object.assign(new Error(event.message), { code: event.code });
          if (event.type === EventType.RUN_STARTED) {
            if (started || event.runId !== input.runId || event.threadId !== input.threadId || event.protocolVersion !== PROTOCOL_VERSION) throw new Error('The activity stream did not match this request.');
            started = true; emit({ type: 'start', messageId: event.runId }); return output;
          }
          if (!started) throw new Error('Activity arrived before the run started.');
          if (event.type === EventType.ACTIVITY_SNAPSHOT && event.activityType === 'datumm.task') {
            const { taskId, event: record } = event.content;
            if (typeof taskId !== 'string' || !/^[a-zA-Z0-9-]{1,128}$/.test(taskId) || (admittedTask && admittedTask !== taskId) || (typeof forwardedProps.taskId === 'string' && forwardedProps.taskId !== taskId)) throw new Error('The activity stream did not match the saved task.');
            if (!admittedTask) { admittedTask = taskId; emit({ type: 'data-run', data: { id: taskId, clientSubmissionId }, transient: true }); }
            if (record !== null && record !== undefined) {
              if (typeof record !== 'object' || typeof record.stage !== 'string' || (record.taskId && record.taskId !== taskId) || (record.stage === 'snapshot' ? record.run?.id !== taskId : !Number.isSafeInteger(record.index) || record.index < 0 || typeof record.detail !== 'string')) throw new Error('Invalid saved task activity.');
              emit({ type: 'data-progress', data: { clientSubmissionId, record }, transient: true });
            }
            return output;
          }
          if (event.type === EventType.TEXT_MESSAGE_START) {
            if (!admittedTask || textId || (event.role && event.role !== 'assistant')) throw new Error('Invalid answer stream.');
            textId = event.messageId; emit({ type: 'text-start', id: textId }); return output;
          }
          if (event.type === EventType.TEXT_MESSAGE_CONTENT) {
            if (!textId || event.messageId !== textId) throw new Error('Invalid answer stream.');
            emit({ type: 'text-delta', id: textId, delta: event.delta }); return output;
          }
          if (event.type === EventType.TEXT_MESSAGE_END) {
            if (!textId || event.messageId !== textId) throw new Error('Invalid answer stream.');
            emit({ type: 'text-end', id: textId }); textId = ''; return output;
          }
          if (event.type === EventType.RUN_FINISHED) {
            if (!admittedTask || textId || event.runId !== input.runId || event.threadId !== input.threadId) throw new Error('The activity stream ended without a confirmed task.');
            finished = true; emit({ type: 'finish' });
          }
          return output;
        };
        let completed = false;
        try {
          while (true) {
            const { value, done } = await reader.read();
            if (!current()) return;
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let match: RegExpExecArray | null;
            while ((match = /\r\n\r\n|\n\n|\r\r/.exec(buffer))) {
              const frame = buffer.slice(0, match.index); buffer = buffer.slice(match.index + match[0].length);
              for (const value of packet(frame)) { if (!current()) return; yield value; }
            }
            if (buffer.length > 8 * 1024 * 1024) throw new Error('Activity response is too large. Check the saved task.');
          }
          buffer += decoder.decode();
          if (buffer.trim() || !finished) throw new Error('The stream disconnected. Check the saved task before retrying.');
          completed = true;
        } finally {
          if (!completed) { try { await reader.cancel(); } catch {} }
          reader.releaseLock();
        }
    }
    const iterator = chunks();
    return new ReadableStream<UIMessageChunk>({
      async pull(controller) {
        try { const next = await iterator.next(); if (next.done) controller.close(); else controller.enqueue(next.value); }
        catch (error) { controller.error(error); }
      },
      async cancel() { try { await reader.cancel(); } finally { await iterator.return(undefined); } },
    });
  }

  async reconnectToStream(): Promise<null> { return null; }
}
