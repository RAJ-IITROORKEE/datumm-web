import {openAgui} from '@/lib/agui/adapter.mjs';
import type {Run, RunEvent} from '../workspace/use-workspace-state';

export const phaseOnePrompt = 'hi plan a 3bhk layout for revit floor plan of 20x30m';
const model = 'openai/gpt-6-luna';
const sessionKey = 'datumm-phase-one-chat-fixture';
const draft = '## 3BHK layout brief\n\nA 20 × 30 m site can accommodate a single-storey 3BHK concept.';
const partialAnswer = draft + '\n\nConfirm the street-facing side and setbacks before drafting the layout.';
const planAnswer = draft + '\n\n| Space | Suggested area |\n| --- | ---: |\n| Living room | 28 m² |\n| Primary bedroom | 16 m² |\n| Bedroom 2 | 12 m² |\n| Bedroom 3 | 12 m² |';
type Task = Run & {commandReceipts?: {commandId: string; state: string}[]};

function task(id: string, mode: 'ask'|'plan'): Task {
  return {id, title: phaseOnePrompt, mode, model, device_id: '', status: 'completed',
    taskVersion: 0, eventCursor: 0, conversation: [], events: [], data: {}};
}

// The browser session represents the fixture's backend storage. The Workspace still
// follows its normal AG-UI admission and selected-task read paths.
export function createPhaseOneChatFixture(onReads: (count: number) => void, interrupt: () => boolean) {
  const legacy = task('phase-one-legacy', 'ask');
  legacy.title = 'Historical 3BHK fixture';
  legacy.conversation = [{prompt: phaseOnePrompt, answer: partialAnswer}];
  legacy.data.answer = partialAnswer;
  const saved = JSON.parse(sessionStorage.getItem(sessionKey) ?? '[]') as Task[];
  const tasks = new Map([legacy, ...saved].map(row => [row.id, row]));
  const encoder = new TextEncoder();
  const response = (value: unknown) => Response.json(value);
  const missing = () => new Response(null, {status: 404});
  let reads = 0;

  async function chat(request: Request) {
    const input = await request.json();
    const backend = async (path: string, init?: RequestInit) => {
      if (path === '/v2/tasks?active=true') return response([]);
      const admission = path.match(/^\/v2\/tasks(?:\/([\w-]+)\/commands)?$/);
      if (admission && init?.method === 'POST') {
        const {idempotencyKey: commandId, command} = JSON.parse(String(init.body));
        const previous = admission[1] ? tasks.get(admission[1]) : undefined;
        const mode = command.mode ?? previous?.mode;
        if (command.prompt !== phaseOnePrompt || (mode !== 'ask' && mode !== 'plan')) {
          return Response.json({detail: 'Use the fixture prompt in Ask or Plan.'}, {status: 422});
        }
        const current = previous ?? task('phase-one-' + commandId, mode);
        const taskVersion = (current.taskVersion ?? 0) + 1;
        tasks.set(current.id, {...current, taskVersion, status: 'running', executionId: 'fixture-' + commandId});
        return response({id: current.id, taskVersion, commandId, state: 'applied'});
      }
      const observation = path.match(/^\/v2\/tasks\/([\w-]+)\/events\?after=(\d+)$/);
      const current = observation && tasks.get(observation[1]);
      if (!current || !current.executionId) return missing();
      const turnId: string = input.forwardedProps.idempotencyKey;
      const checksComplete = current.mode === 'plan';
      const answer = checksComplete ? planAnswer : partialAnswer;
      const identity = {schemaVersion: 2 as const, taskId: current.id, turnId, executionId: current.executionId};
      const cursor = current.eventCursor ?? 0;
      const events: RunEvent[] = [
        {stage: 'answer', detail: answer},
        {stage: 'completed', detail: 'The fixture answer was saved.'},
      ].map((row, i) => ({...identity, ...row, index: cursor + i, sequence: cursor + i + 1, at: new Date().toISOString()}));
      const steps = [{key: 'layout', title: 'Draft the concept layout', action: 'create_design', expectedResult: 'A 3BHK concept'},
        {key: 'schedule', title: 'Check the room schedule', action: 'check_design', expectedResult: 'A verified room schedule'}];
      const snapshot: Task = {...current, status: 'completed', events: [...current.events, ...events], eventCursor: cursor + events.length,
        commandReceipts: [{commandId: turnId, state: 'applied'}],
        conversation: [...(current.conversation ?? []), {prompt: phaseOnePrompt, answer, turnId}],
        data: {answer, agent_result: {status: checksComplete ? 'completed' : 'partial', answer},
          agent_task_plan: {turnId, version: 1, goal: 'Prepare a 3BHK concept', successCriteria: ['Draft and check the concept'],
            steps, progress: steps.map(({key}) => ({key, status: checksComplete ? 'completed' : 'pending'}))}}};
      const cutStream = interrupt();
      let timer: ReturnType<typeof setTimeout>;
      const stream = new ReadableStream({
        start(controller) {
          const frame = (record: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(record)}\n\n`));
          frame({stage: 'answer_draft', text: draft});
          timer = setTimeout(() => {
            tasks.set(current.id, snapshot);
            sessionStorage.setItem(sessionKey, JSON.stringify([...tasks.values()].filter(row => row.id !== legacy.id && row.status === 'completed')));
            if (!cutStream) {
              events.forEach(frame);
              frame({stage: 'snapshot', run: snapshot});
            }
            controller.close();
          }, 1700);
        },
        cancel() { clearTimeout(timer); },
      });
      return new Response(stream, {headers: {'Content-Type': 'text/event-stream'}});
    };
    return openAgui(input, backend, async (result: Response) => result.ok ? result.json() : result, request.signal);
  }

  return async (request: Request) => {
    const {pathname} = new URL(request.url);
    if (pathname === '/api/agui' && request.method === 'POST') return chat(request);
    if (request.method !== 'GET') return missing();
    const selected = pathname.match(/^\/api\/service\/(?:runs|tasks)\/([\w-]+)$/);
    if (selected) {
      onReads(++reads);
      const current = tasks.get(selected[1]);
      return current ? response(current) : missing();
    }
    if (pathname === '/api/service/config') return response({models: [model], defaultModel: model, nativeAvailable: false});
    if (pathname === '/api/service/runs') return response([...tasks.values()]);
    if (['/api/service/devices', '/api/service/projects'].includes(pathname)) return response([]);
    return missing();
  };
}
