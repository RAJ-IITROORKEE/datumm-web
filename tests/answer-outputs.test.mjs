import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { jsx, jsxs } from 'react/jsx-runtime';
import ts from 'typescript';
import { answerOutputs, answerTableCsv } from '../src/lib/answer-outputs.mjs';
import { processRows, processStatus, settledStatus, activityStateLabel } from '../src/lib/process-activity.mjs';

const source = { key: 'task-1:answer:0', taskId: 'task-1', conversationIndex: 0, state: 'saved' };
test('answer extraction keeps tables and diagrams bound to their actual answer, not the current model', () => {
  const text = '# Room review\n\n| Room | Area (m²) |\n|---|---:|\n| Café \\| Hall | 23 |\n\n```mermaid\nflowchart LR\n A --> B\n```\n\n```text\n| fake | table |\n|---|---|\n```';
  const outputs = answerOutputs(text, source);
  assert.deepEqual(outputs.map(row => row.kind), ['report', 'table', 'diagram']);
  assert.deepEqual(outputs[1].rows, [['Café | Hall', '23']]);
  assert.deepEqual(outputs[1].headers, ['Room', 'Area (m²)']);
  assert.equal(outputs[1].source, source);
  assert.equal(outputs[2].complete, true);
  const next = answerOutputs(text.replace('23', '24'), { ...source, key: 'task-1:answer:1', conversationIndex: 1 });
  assert.notEqual(next[1].id, outputs[1].id);
  assert.equal(outputs[1].rows[0][1], '23');
});

test('an incomplete diagram remains readable and streaming answer tables cannot export', () => {
  const output = answerOutputs('```mermaid\nflowchart LR\n A -->', { ...source, state: 'streaming' })[1];
  assert.equal(output.complete, false);
  assert.match(output.markdown, /A -->/);
  const table = answerOutputs('| A | B |\n|---|---|\n| 1 | 2 |', { ...source, state: 'streaming' })[1];
  assert.throws(() => answerTableCsv(table), /finish/);
  assert.deepEqual(answerOutputs('Brief answer.', source), []);
});

function parseCsv(csv) {
  const rows = []; let row = [], cell = '', quoted = false;
  for (let i = 1; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"' && quoted && csv[i + 1] === '"') { cell += '"'; i++; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ',') { row.push(cell); cell = ''; }
    else if (!quoted && char === '\r' && csv[i + 1] === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; i++; }
    else cell += char;
  }
  return rows;
}

test('CSV exports every answer-table row with UTF-8, quotes, multiline text and neutralized textual formulas', () => {
  const values = ['Café, pantry', 'He said "review"', 'line one\nline two', '=HYPERLINK("bad")', ' \t+SUM(A1)', '@cmd', '-12', '', '12.5'];
  const rows = Array.from({ length: 1200 }, (_, i) => [String(i), values[i % values.length]]);
  const output = { id: 'x', kind: 'table', headers: ['ID', 'Quantity text (m²)'], rows, complete: true, source };
  const parsed = parseCsv(answerTableCsv(output));
  assert.equal(parsed.length, 1201);
  assert.deepEqual(parsed[0], output.headers);
  assert.deepEqual(parsed.slice(1, 10).map(row => row[1]), values.map(value => /^[\s\u0000-\u001f]*[=+\-@]/u.test(value) ? `'${value}` : value));
  assert.equal(parsed.at(-1)[0], '1199');
  assert.equal(output.rows[3][1], '=HYPERLINK("bad")');
});

test('same-name concurrent tools close by real call identity; legacy ambiguity does not fabricate completion', () => {
  const events = [
    { index: 0, eventId: 'a', stage: 'tool_running', detail: 'Reading rooms', callId: 'call-a' },
    { index: 1, eventId: 'b', stage: 'tool_running', detail: 'Reading rooms', callId: 'call-b' },
    { index: 2, eventId: 'c', stage: 'tool_completed', detail: 'rooms', callId: 'call-b' },
  ];
  assert.deepEqual(processRows([...events, events[2]], true, false).map(row => row.status), ['running', 'done']);
  const legacy = events.map(({ callId, ...event }) => event);
  assert.deepEqual(processRows(legacy, false, false).map(row => row.status), ['unconfirmed', 'unconfirmed', 'done']);
  assert.equal(processStatus('blocked'), 'blocked');
  assert.equal(processStatus('partial'), 'partial');
  assert.equal(processStatus('cancelled'), 'cancelled');
  assert.equal(settledStatus('running', true, true), 'waiting');
  assert.equal(activityStateLabel('cancelled', false, false), 'Stopped');
});

test('unchanged answer text settles renderer controls and preserves caller image restrictions', () => {
  const code = readFileSync(new URL('../src/components/ai-elements/message.tsx', import.meta.url), 'utf8');
  const exports = {}, Streamdown = () => null;
  const context = { exports, require(name) {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return { jsx, jsxs };
    if (name === 'streamdown') return { Streamdown };
    if (name === '@streamdown/mermaid') return { createMermaidPlugin: options => options };
    if (name === '@/lib/utils') return { cn: (...values) => values.filter(Boolean).join(' ') };
    return {};
  } };
  runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const Response = exports.MessageResponse;
  assert.equal(Response.compare, null, 'React default shallow comparison must observe isAnimating and policy props');
  const pending = Response.type({ children: '| A | B |', isAnimating: true, disallowedElements: ['img'] });
  const complete = Response.type({ children: '| A | B |', isAnimating: false, disallowedElements: ['img'] });
  assert.equal(pending.props.controls, false);
  assert.equal(complete.props.isAnimating, false);
  assert.equal(complete.props.controls.table.fullscreen, true);
  assert.equal(complete.props.tableMaxHeight, 360);
  assert.equal(complete.props.disallowedElements[0], 'img');
  assert.equal(complete.props.mermaid.config.securityLevel, 'strict');
  assert.equal(complete.props.skipHtml, true);
});

test('recorded AgentActivity returns its expandable content in both compact and expanded modes', () => {
  const code = readFileSync(new URL('../src/components/agent-activity.tsx', import.meta.url), 'utf8');
  const exports = {}, context = { exports, require(name) {
    if (name === 'react/jsx-runtime') return { jsx, jsxs, Fragment: React.Fragment };
    if (name === '@/lib/process-activity.mjs') return { activityStateLabel };
    return new Proxy({}, { get: (_, key) => key === 'toolStatus' ? value => value : () => null });
  } };
  runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const props = { mode: 'ask', model: 'actual-model', events: [{ index: 0, stage: 'tool_completed', detail: 'rooms', at: '2026-11-12T08:00:00Z' }] };
  assert.equal(React.isValidElement(exports.AgentActivity({ ...props, compact: false })), true);
  assert.equal(React.isValidElement(exports.AgentActivity({ ...props, compact: true })), true);
});

test('replacing an output with another work surface does not schedule return focus', () => {
  const code = readFileSync(new URL('../src/components/workspace/output-workspace.tsx', import.meta.url), 'utf8');
  let focusFrames = 0, closed = 0;
  const hooks = { ...React, useState: value => [value, () => {}], useRef: value => ({ current: value }),
    useCallback: callback => callback, useMemo: callback => callback() };
  const exports = {}, context = { exports, requestAnimationFrame: () => { focusFrames++; }, require(name) {
    if (name === 'react') return hooks;
    if (name === 'react/jsx-runtime') return { jsx, jsxs };
    return {};
  } };
  runInNewContext(ts.transpileModule(code, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  const state = exports.OutputWorkspaceProvider({ children: null, onClose: () => { closed++; } });
  const provider = state.type(state.props);
  provider.props.value.dismissOutput();
  assert.equal(closed, 1);
  assert.equal(focusFrames, 0, 'A replacement surface owns its own focus');
  provider.props.value.closeOutput();
  assert.equal(closed, 2);
  assert.equal(focusFrames, 1, 'An ordinary close still restores the original opener');
});
