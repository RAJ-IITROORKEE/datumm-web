'use client';

import {useEffect, useRef, useState} from 'react';
import {openAgui} from '@/lib/agui/adapter.mjs';
import {applyAppearance, defaultAppearance, readAppearance} from '@/lib/appearance';
import {Workspace} from '../workspace';
import type {Run} from '../workspace/use-workspace-state';

const model = 'openai/gpt-6-luna';
const readTaskPath = /^\/api\/service\/(?:runs|tasks)\/([\w-]+)$/;

function savedTask(id: string, title: string): Run {
  const partition = id === 'fixture-a' ? 'M100 10V110' : 'M10 60H190';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" fill="white"/><path d="M10 10H190V110H10Z${partition}" fill="none" stroke="black"/></svg>`;
  return {id, title, taskVersion: 1, eventCursor: 0, status: 'completed', mode: 'plan', model,
    device_id: 'fixture-unused', conversation: [{prompt: 'Review the plan.', answer: `Saved answer for ${title}.`}],
    events: [], data: {snapshot: {svg, revision: 1, provenance: title}}};
}

function createFixture(onReads: (count: number) => void, interrupt: () => boolean) {
  const tasks = new Map([
    ['fixture-a', savedTask('fixture-a', 'Fixture studio A')],
    ['fixture-b', savedTask('fixture-b', 'Fixture studio B')],
  ]);
  let reads = 0;
  const encoder = new TextEncoder();
  const response = (value: unknown) => Response.json(value);
  const missing = () => Response.json({detail: 'This request is unavailable in the local fixture.'}, {status: 404});

  async function chat(input: unknown, signal: AbortSignal) {
    const backend = async (path: string, init?: RequestInit) => {
      const admission = path.match(/^\/v2\/tasks(?:\/([\w-]+)\/commands)?$/);
      if (admission && init?.method === 'POST') {
        const command = JSON.parse(String(init.body));
        const current = tasks.get(admission[1] ?? 'fixture-a');
        if (!current) return missing();
        const taskVersion = (current.taskVersion ?? 0) + 1, commandId = String(command.idempotencyKey);
        tasks.set(current.id, {...current, taskVersion, status: 'running', executionId: `execution-${taskVersion}`});
        return response({id: current.id, taskVersion, commandId, state: 'applied'});
      }

      const observation = path.match(/^\/v2\/tasks\/([\w-]+)\/events\?after=(\d+)$/);
      const task = observation && tasks.get(observation[1]);
      if (!observation || !task) return missing();
      const turnId = (input as {forwardedProps: {idempotencyKey: string}}).forwardedProps.idempotencyKey;
      const {id: taskId, executionId} = task;
      const cutStream = interrupt();
      let timer: ReturnType<typeof setTimeout>, sequence = Number(observation[2]);
      let tick = 0;
      return new Response(new ReadableStream({
        start(controller) {
          const frame = (record: unknown) => controller.enqueue(encoder.encode(`data: ${JSON.stringify(record)}\n\n`));
          const advance = () => {
            tick += 1;
            const done = tick === 9, stage = done ? 'completed' : 'agent_stage_progress';
            const row = {schemaVersion: 2 as const, taskId, turnId, executionId, stage,
              index: sequence, sequence: ++sequence, at: new Date().toISOString(),
              detail: done ? 'Fixture review saved.' : `Checking fixture drawing ${tick} of 8.`};
            const current = tasks.get(taskId) ?? task;
            const updated = {...current, events: [...current.events, row], eventCursor: sequence};
            tasks.set(taskId, updated);
            frame(row);
            if (done || (cutStream && tick === 4)) {
              const answer = `Completed local review for ${task.title}.`;
              const snapshot = {...updated, status: 'completed', commandReceipts: [{commandId: turnId, state: 'applied'}],
                conversation: [...(task.conversation ?? []), {prompt: 'Check the fixture drawing.', answer, turnId}],
                data: {...task.data, answer}};
              tasks.set(taskId, snapshot);
              if (!cutStream) frame({stage: 'snapshot', run: snapshot});
              controller.close();
            } else timer = setTimeout(advance, 900);
          };
          timer = setTimeout(advance, 900);
        },
        cancel() { clearTimeout(timer); },
      }), {headers: {'Content-Type': 'text/event-stream'}});
    };
    return openAgui(input, backend, async (result: Response) => result.ok ? result.json() : result, signal);
  }

  return async (request: Request) => {
    const {pathname} = new URL(request.url);
    if (pathname === '/api/agui' && request.method === 'POST') return chat(await request.json(), request.signal);
    const selected = pathname.match(readTaskPath);
    if (selected && request.method === 'GET') {
      onReads(++reads);
      return tasks.has(selected[1]) ? response(tasks.get(selected[1])) : missing();
    }
    if (request.method === 'GET') {
      if (pathname === '/api/service/config') return response({models: [model], defaultModel: model, nativeAvailable: false});
      if (pathname === '/api/service/runs') return response([...tasks.values()]);
      if (['/api/service/devices', '/api/service/projects'].includes(pathname)) return response([]);
    }
    return missing();
  };
}

export function WorkAreaPreview() {
  const [ready, setReady] = useState(false), [reads, setReads] = useState(0);
  const [interrupt, setInterrupt] = useState(false), [theme, setTheme] = useState<'dark'|'light'>('dark');
  const cutStream = useRef(false);
  useEffect(() => {
    const originalFetch = window.fetch;
    const fixture = createFixture(setReads, () => cutStream.current);
    const intercept: typeof fetch = (input, init) => {
      const path = new URL(input instanceof Request ? input.url : String(input), window.location.href);
      if (path.origin !== window.location.origin || !path.pathname.startsWith('/api/')) return originalFetch(input, init);
      return fixture(new Request(input instanceof Request ? input : path, init));
    };
    const blockServiceLinks = (event: MouseEvent) => {
      const link = event.target instanceof Element && event.target.closest<HTMLAnchorElement>('a[href]');
      if (link && link.origin === location.origin && link.pathname.startsWith('/api/service/')) event.preventDefault();
    };
    window.fetch = intercept;
    document.addEventListener('click', blockServiceLinks, true);
    document.addEventListener('auxclick', blockServiceLinks, true);
    setTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
    setReady(true);
    return () => {
      if (window.fetch === intercept) window.fetch = originalFetch;
      document.removeEventListener('click', blockServiceLinks, true);
      document.removeEventListener('auxclick', blockServiceLinks, true);
      applyAppearance(readAppearance());
    };
  }, []);
  return <>
    <nav aria-label="Work area fixture" style={{padding: 8, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap'}}>
      <strong>Local work area fixture</strong>
      <span role="status">Selected-task reads: {reads}</span>
      <span>Download links are inactive in this fixture.</span>
      <button type="button" onClick={() => {
        const mode = theme === 'dark' ? 'light' : 'dark';
        applyAppearance({...defaultAppearance, mode});
        setTheme(mode);
      }}>Switch to {theme === 'dark' ? 'light' : 'dark'} fixture theme</button>
      <label><input type="checkbox" checked={interrupt} onChange={event => {
        cutStream.current = event.target.checked;
        setInterrupt(event.target.checked);
      }}/> Interrupt the fixture stream</label>
    </nav>
    {ready && <Workspace authConfigured accountKey="work-area-fixture"/>}
  </>;
}
