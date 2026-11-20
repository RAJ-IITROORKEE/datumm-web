import { drawingExportName, safeDrawingSegment } from '../src/lib/drawing-export-identity.mjs';
import * as viewport from '../src/lib/plan-viewport.mjs';
import * as shortcuts from '../src/lib/canvas-shortcuts.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import { planSheet, pointInRoom, wallLength, formatLength, rectangularClearDimensions } from '../src/lib/plan-geometry.mjs';
import { answerOutputs, answerTableCsv } from '../src/lib/answer-outputs.mjs';
import { answerPreview, isCompactProse, validateAnswerPresentation } from '../src/lib/answer-presentation.mjs';
import * as feedbackLib from '../src/lib/answer-feedback.mjs';
import * as traces from '../src/lib/admin-traces.mjs';

// Exercise component handlers and effect lifecycles without a DOM runtime or new dependencies.
function componentHarness(file, modules, globals = {}) {
  const slots = [], effects = [], pendingFrames = [];
  let cursor = 0;
  const slot = initial => { const index = cursor++; if (!(index in slots)) slots[index] = initial(); return index; };
  const hooks = { ...React,
    useState(initial) { const index = slot(() => typeof initial === 'function' ? initial() : initial); return [slots[index], next => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; },
    useRef(initial) { return slots[slot(() => ({ current: initial }))]; },
    useId() { return 'review-test'; },
    useCallback(callback) { return callback; },
    useMemo(callback) { return callback(); },
    useSyncExternalStore(_subscribe, snapshot) { return snapshot(); },
    useEffect(effect, deps) {
      const index = slot(() => ({ deps: undefined, cleanup: undefined })), previous = slots[index];
      if (!previous.deps || !deps || deps.some((value, i) => !Object.is(value, previous.deps[i]))) {
        effects.push(() => { previous.cleanup?.(); previous.cleanup = effect(); previous.deps = deps; });
      }
    },
    ...modules.react,
  };
  const exports = {}, context = { exports,
    requestAnimationFrame(callback) { pendingFrames.push(callback); return pendingFrames.length; },
    cancelAnimationFrame(handle) { pendingFrames[handle - 1] = null; },
    ...globals,
    require(name) {
      if (name === 'react') return hooks;
      if (name === 'react/jsx-runtime') return jsxRuntime;
      if (name.endsWith('.module.css')) return { default: {} };
      return modules[name] ?? {};
    },
  };
  runInNewContext(ts.transpileModule(readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return { exports, render(name, props) { cursor = 0; return exports[name](props); },
    call(name, ...args) { cursor = 0; return exports[name](...args); },
    flushEffects() { while (effects.length) effects.shift()(); },
    flushFrames() { while (pendingFrames.length) pendingFrames.shift()?.(); } };
}
function elements(tree) {
  if (!React.isValidElement(tree)) return [];
  return [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)];
}
const control = (tree, label) => elements(tree).find(node => node.props['aria-label'] === label);
const text = node => React.isValidElement(node) ? React.Children.toArray(node.props.children).map(text).join(' ') : node == null ? '' : String(node);
const drawing = {
  planId: 'plan-a', version: 1, fingerprint: 'a-1', svg: '',
  graph: { site: { widthMm: 6000, depthMm: 6000 }, wallThicknessMm: 200, wallHeightMm: 3000,
    rooms: [{ key: 'study', name: 'Study', rect: [0, 0, 6000, 6000], areaMm2: 36000000 }],
    walls: [{ key: 'south', start: [0, 0], end: [6000, 0] }], openings: [] },
};
function canvasHarness(drawingExports = {}) {
  const annotations = { loaded: true, data: { comments: [{ id: 'comment-a', number: 1, roomKey: 'study', x: 1000, y: 1000, text: 'Review this room', status: 'open' }], draft: null } };
  const document = { activeElement: null, getElementById: () => null, addEventListener() {}, removeEventListener() {} };
  const harness = componentHarness('../src/components/plan-canvas.tsx', {
    'next/dynamic': { __esModule: true, default: () => 'PlanThree' },
    '@/lib/drawing-export-identity.mjs': { drawingExportName, safeDrawingSegment },
    '@/lib/plan-geometry.mjs': { planSheet, pointInRoom, wallLength, formatLength, rectangularClearDimensions },
    '@/lib/plan-viewport.mjs': viewport,
    './plan-canvas-annotations': { createCanvasAnnotationStore: () => ({ load() {}, getSnapshot: () => annotations }), EMPTY_ANNOTATIONS: { comments: [], draft: null }, EMPTY_ANNOTATION_SNAPSHOT: annotations },
    './plan-drawing': { PlanDrawing: 'PlanDrawing', ...drawingExports },
    '@/lib/canvas-shortcuts.mjs': shortcuts,
    './canvas-dock': { CanvasDock: 'CanvasDock', DockButton: 'DockButton', DockSep: 'DockSep' },
    './canvas-shortcut-help': { CanvasShortcutHelp: 'CanvasShortcutHelp' },
  }, { window: {}, document, getComputedStyle: () => ({ visibility: 'visible' }) });
  return { ...harness, document };
}

test('changing exact drawing identity resets 3D, cut and open display before reviewing the replacement', () => {
  const h = canvasHarness();
  const render = value => h.render('PlanCanvas', { drawing: value });
  let tree = render(drawing); h.flushEffects();
  elements(tree).find(node => node.props.id === 'review-test-tab-3d').props.onClick();
  tree = render(drawing);
  elements(tree).find(node => node.props['aria-controls'] === 'review-test-display').props.onClick();
  tree = render(drawing); h.flushEffects();
  control(tree, 'Level cut height').props.onChange({ target: { value: '800' } });
  tree = render(drawing);
  assert.equal(elements(tree).find(node => node.type === 'PlanThree').props.cutMm, 800);
  const replacement = { ...drawing, version: 2, fingerprint: 'a-2', graph: { ...drawing.graph, walls: undefined, wallHeightMm: undefined } };
  render(replacement); h.flushEffects(); tree = render(replacement);
  assert.equal(elements(tree).some(node => node.type === 'PlanThree'), false);
  assert.equal(elements(tree).find(node => node.props.id === 'review-test-tab-2d').props['aria-selected'], true);
  assert.equal(control(tree, 'Display settings'), undefined);
});

test('exporting before the drawing capture is ready gives a retry message', async () => {
  const h = canvasHarness();
  let tree = h.render('PlanCanvas', { drawing }); h.flushEffects();
  elements(tree).find(node => node.props['aria-controls'] === 'review-test-display').props.onClick();
  tree = h.render('PlanCanvas', { drawing }); h.flushEffects();
  elements(tree).find(node => node.type === 'button' && text(node) === 'PNG').props.onClick();
  await Promise.resolve();
  tree = h.render('PlanCanvas', { drawing });
  assert.match(text(tree), /drawing is still loading\. Retry the export/);
});

test('Display explains the content of each drawing export', () => {
  const h=canvasHarness();
  let tree=h.render('PlanCanvas',{drawing});h.flushEffects();
  elements(tree).find(node=>node.props['aria-controls']==='review-test-display').props.onClick();
  tree=h.render('PlanCanvas',{drawing});
  assert.match(text(control(tree,'Display settings')),/White sheet includes any current measurement\. Local comments and source or highlight overlays are not included\./);
  elements(tree).find(node=>node.props.id==='review-test-tab-3d').props.onClick();
  tree=h.render('PlanCanvas',{drawing});
  assert.match(text(control(tree,'Display settings')),/Captures the current 3D view\. Local comment pins are not included\./);
});

test('finishing an older view export cannot show a success message on a replacement plan', async () => {
  let finishExport;
  const h = canvasHarness({ exportPlanSheet: () => new Promise(resolve => { finishExport = resolve; }) });
  let tree = h.render('PlanCanvas', { drawing }); h.flushEffects();
  elements(tree).find(node => node.props['aria-controls'] === 'review-test-display').props.onClick();
  tree = h.render('PlanCanvas', { drawing }); h.flushEffects();
  elements(tree).find(node => node.type === 'PlanDrawing' && node.props.svgRef).props.svgRef.current = {};
  elements(tree).find(node => node.type === 'button' && text(node) === 'PNG').props.onClick();
  const replacement = { ...drawing, version: 2, fingerprint: 'a-2' };
  h.render('PlanCanvas', { drawing: replacement }); h.flushEffects();
  finishExport(); await Promise.resolve();
  tree = h.render('PlanCanvas', { drawing: replacement });
  assert.equal(text(tree).includes('View exported as'), false);
});

test('comment list to comment to Escape restores the original opener and focuses the nonmodal panel', () => {
  const h = canvasHarness(), focused = [];
  const opener = { isConnected: true, getClientRects: () => [{}], focus: () => focused.push('opener') };
  h.document.activeElement = opener;
  let tree = h.render('PlanCanvas', { drawing }); h.flushEffects();
  control(tree, 'All comments, 1 open').props.onClick();
  tree = h.render('PlanCanvas', { drawing });
  control(tree, 'All plan comments').props.ref.current = { focus: () => focused.push('panel') };
  h.flushEffects(); h.flushFrames();
  assert.equal(focused.at(-1), 'panel');
  h.document.activeElement = { isConnected: false, focus: () => focused.push('removed-row') };
  elements(tree).find(node => node.type === 'button' && text(node).includes('Review this room')).props.onClick();
  tree = h.render('PlanCanvas', { drawing }); h.flushEffects(); h.flushFrames();
  let prevented = false, stopped = false;
  control(tree, 'Room comment').props.onKeyDown({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  h.flushFrames();
  assert.equal(focused.at(-1), 'opener');
  assert.equal(prevented && stopped, true);
});

test('late clipboard completion cannot claim that a different answer output was copied', async () => {
  let finishCopy, current;
  const copies = [];
  const h = componentHarness('../src/components/workspace/output-workspace.tsx', { react: { useContext: () => current }, '../vendor/affectui/message-actions-clean': { MessageActions: 'message-actions' } }, {
    navigator: { clipboard: { writeText(value) { copies.push(value); return new Promise(resolve => { finishCopy = resolve; }); } } },
  });
  const output = id => ({ id, kind: 'report', title: id, markdown: `# ${id}`, source: { state: 'saved', conversationIndex: 0 } });
  const first = output('first'), second = output('second');
  current = { activeOutput: first, outputs: [first, second] };
  let tree = h.render('OutputPanel'); h.flushEffects();
  const pending = elements(tree).find(node => node.type === 'message-actions').props.onCopy();
  current = { ...current, activeOutput: second };
  tree = h.render('OutputPanel'); h.flushEffects();
  finishCopy(); await pending;
  tree = h.render('OutputPanel');
  assert.deepEqual(copies, ['# first']);
  assert.equal(text(tree).includes('Copied Markdown.'), false);
  const next = elements(tree).find(node => node.type === 'message-actions').props.onCopy();
  finishCopy(); await next;
  tree = h.render('OutputPanel');
  assert.equal(text(tree).includes('Copied Markdown.'), true);
});


const copyScope=(key,epoch)=>({key,epoch,accountKey:key,taskId:'task-a',sourceKey:'draft-a'});
test('output copy invalidates same-ID text/source changes and A1 to B2 to A3 before effects flush',async()=>{
 for(const change of ['text','source','epoch']){
  let current,finish;const writes=[];
  const h=componentHarness('../src/components/workspace/output-workspace.tsx',{react:{useContext:()=>current},'../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'}},{navigator:{clipboard:{writeText(value){writes.push(value);return new Promise(resolve=>{finish=resolve;});}}}});
  const first={id:'same-id',kind:'report',title:'Report',markdown:'exact old text',complete:true,source:{key:'answer-a',taskId:'task-a',conversationIndex:0,state:'saved'}};
  current={scope:copyScope('A',1),activeOutput:first,outputs:[first]};
  let tree=h.render('OutputPanel');h.flushEffects();const old=elements(tree).find(row=>row.type==='message-actions');const pending=old.props.onCopy();
  if(change==='text')current={...current,activeOutput:{...first,markdown:'new text'}};
  if(change==='source')current={...current,activeOutput:{...first,source:{...first.source,key:'replacement-answer'}}};
  if(change==='epoch'){
   current={...current,scope:copyScope('B',2)};h.render('OutputPanel');
   current={...current,scope:copyScope('A',3)};
  }
  tree=h.render('OutputPanel');finish();await pending;tree=h.render('OutputPanel');
  assert.equal(text(tree).includes('Copied Markdown.'),false,change);assert.deepEqual(writes,['exact old text']);
  await assert.rejects(old.props.onCopy(),/output changed/);assert.equal(writes.length,1);
 }
});

test('output copy is copy-only, disabled during streaming and rethrows failure for truthful vendor feedback',async()=>{
 let current;const error=Error('Clipboard denied');
 const h=componentHarness('../src/components/workspace/output-workspace.tsx',{react:{useContext:()=>current},'../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'}},{navigator:{clipboard:{writeText:async()=>{throw error;}}}});
 const output={id:'output-a',kind:'report',title:'Report',markdown:'exact markdown',complete:false,source:{key:'answer-a',taskId:'task-a',conversationIndex:0,state:'partial'}};
 current={scope:copyScope('A',1),activeOutput:output,outputs:[output]};let tree=h.render('OutputPanel');h.flushEffects();let actions=elements(tree).find(row=>row.type==='message-actions');
 assert.deepEqual(Array.from(actions.props.actions),['copy']);assert.equal(actions.props.text,'exact markdown');assert.equal(actions.props.disabled,false);
 await assert.rejects(actions.props.onCopy(),failure=>failure===error);tree=h.render('OutputPanel');assert.match(text(tree),/Clipboard unavailable/);assert.doesNotMatch(text(tree),/Copied Markdown/);
 current={...current,activeOutput:{...output,source:{...output.source,state:'streaming'}}};tree=h.render('OutputPanel');actions=elements(tree).find(row=>row.type==='message-actions');assert.equal(actions.props.disabled,true);await assert.rejects(actions.props.onCopy(),/output changed/);
});

test('answers bind copy-only text to scope epoch/source and preserve partial or streaming provenance',()=>{
 let current;const registered=[];
 const h=componentHarness('../src/components/workspace/output-workspace.tsx',{react:{useContext:()=>current},'@/lib/answer-outputs.mjs':{answerOutputs},'@/lib/answer-presentation.mjs':{answerPreview,isCompactProse,validateAnswerPresentation},'../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'},'../ai-elements/message':{MessageResponse:'message-response'}});
 current={scope:copyScope('A',1),register:(...args)=>registered.push(args)};
 const source={key:'answer-a',taskId:'task-a',conversationIndex:0,state:'partial'};
 let tree=h.render('AnswerContent',{text:' exact answer \n',source});h.flushEffects();let actions=elements(tree).find(row=>row.type==='message-actions');
 assert.deepEqual(Array.from(actions.props.actions),['copy']);assert.equal(actions.props.text,' exact answer \n');assert.equal(actions.props.disabled,false);const firstKey=actions.key;
 current={...current,scope:copyScope('B',2)};h.render('AnswerContent',{text:'B',source:{...source,key:'answer-b'}});
 current={...current,scope:copyScope('A',3)};tree=h.render('AnswerContent',{text:'next',source:{...source,state:'streaming'}});actions=elements(tree).find(row=>row.type==='message-actions');assert.notEqual(actions.key,firstKey);assert.equal(actions.props.disabled,true);assert.equal(actions.props.text,'next');
 tree=h.render('AnswerContent',{text:'',source});assert.equal(elements(tree).some(row=>row.type==='message-actions'),false);
 assert.ok(registered.length>0);
});

test('late presentation validation cannot publish an older task or answer', async () => {
 let current={scope:copyScope('A',1),register:()=>{}}; const pending=[], published=[];
 const h=componentHarness('../src/components/workspace/output-workspace.tsx',{react:{useContext:()=>current},'@/lib/answer-outputs.mjs':{answerOutputs},'@/lib/answer-presentation.mjs':{answerPreview,isCompactProse,validateAnswerPresentation:()=>new Promise(resolve=>pending.push(resolve))},'../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'},'../ai-elements/message':{MessageResponse:'message-response'}});
 const callback=value=>published.push(value); const source={key:'a',taskId:'task-a',conversationIndex:0,state:'saved'};
 const old={summary:'Old summary'}, next={summary:'New summary'};
 h.render('AnswerContent',{text:'old',source,presentation:old,turnId:'turn-a',onPresentation:callback});h.flushEffects();
 current={...current,scope:copyScope('B',2)};
 const props={text:'new '.repeat(200),source:{...source,key:'b',taskId:'task-b'},presentation:next,turnId:'turn-b',onPresentation:callback};
 h.render('AnswerContent',props);h.flushEffects();pending[0](old);await Promise.resolve();
 assert.equal(published.includes(old),false);
 pending[1](next);await Promise.resolve();assert.equal(published.at(-1),next);
 const tree=h.render('AnswerContent',props);assert.match(text(tree),/New summary/);assert.doesNotMatch(text(tree),/Old summary/);
});

test('display answer ordinal does not change raw answer identity or source details',()=>{
 const source={key:'task:answer:3',taskId:'task',conversationIndex:3,answerNumber:2,state:'saved'};
 const output=answerOutputs('Exact answer.',source)[0];
 const current={scope:copyScope('A',1),activeOutput:output,outputs:[output]};
 const h=componentHarness('../src/components/workspace/output-workspace.tsx',{react:{useContext:()=>current},'../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'}});
 const tree=h.render('OutputPanel');
 assert.match(text(tree),/Answer\s+2/);assert.match(text(tree),/Task task, answer 4/);
 assert.equal(output.id,'task:answer:3:report');assert.equal(output.source.conversationIndex,3);assert.equal(output.markdown,'Exact answer.');
});

test('CSV filename uses displayed answer ordinal and table view changes identity with its output scope',()=>{
 const source={key:'task:answer:3',taskId:'task',conversationIndex:3,answerNumber:2,state:'saved'};
 const output=answerOutputs('| Room | Area |\n|---|---|\n| Hall | 23 |',source).find(row=>row.kind==='table');
 const current={scope:copyScope('A',1),activeOutput:output,outputs:[output]};
 let link;
 const h=componentHarness('../src/components/workspace/output-workspace.tsx',{
  react:{useContext:()=>current}, '../ai-elements/message':{MessageResponse:'message-response'},
  '@/lib/answer-outputs.mjs':{answerTableCsv}, '../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'},
 },{ Blob, URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},document:{createElement:()=>link={click(){}}},setTimeout:()=>{} });
 let tree=h.render('OutputPanel');
 const first=elements(tree).find(node=>node.type==='message-response');
 elements(tree).find(node=>node.type==='button' && text(node).includes('Export table CSV')).props.onClick();
 assert.equal(link.download,'answer-2-table-1.csv');
 current.scope=copyScope('B',2);
 tree=h.render('OutputPanel');
 const next=elements(tree).find(node=>node.type==='message-response');
 assert.notEqual(first.key,next.key);
 assert.notEqual(first.props.tableScopeKey,next.props.tableScopeKey);
 assert.equal(first.props.children,next.props.children);
});

test('two-touch and cancelled gestures suppress pin clicks; fresh taps and keyboard activation work', () => {
 const h=canvasHarness();let tree=h.render('PlanCanvas',{drawing});h.flushEffects();
 const region=control(tree,'Plan drawing');
 const dom={hasPointerCapture:()=>false,setPointerCapture(){},releasePointerCapture(){},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600})};
 const touch=(pointerId,x=100,y=100)=>({pointerId,pointerType:'touch',button:0,clientX:x,clientY:y,currentTarget:dom,preventDefault(){}});
 const pin=()=>elements(tree).find(node=>node.props['aria-label']?.startsWith('Comment 1 in'));
 region.props.onPointerDown(touch(1));region.props.onPointerDown(touch(2));region.props.onPointerUp(touch(1));region.props.onPointerUp(touch(2));
 pin().props.onClick({detail:1,stopPropagation(){}});tree=h.render('PlanCanvas',{drawing});
 assert.equal(elements(tree).some(node=>node.props['aria-label']==='Room comment'),false);
 pin().props.onKeyDown({key:'Enter',preventDefault(){},stopPropagation(){}});tree=h.render('PlanCanvas',{drawing});
 assert.ok(elements(tree).some(node=>node.props['aria-label']==='Room comment'));
 // A fresh component verifies cancel clears all pointer ownership, then a fresh tap can open the pin.
 const h2=canvasHarness();let next=h2.render('PlanCanvas',{drawing});h2.flushEffects();const r=control(next,'Plan drawing');
 r.props.onPointerDown(touch(3));r.props.onPointerDown(touch(4));r.props.onPointerCancel(touch(3));
 r.props.onPointerMove(touch(4,200,100));next=h2.render('PlanCanvas',{drawing});
 assert.match(elements(next).find(node=>node.props.className===undefined&&node.props.style?.transform)?.props.style.transform??'',/translate\(0px, 0px\) scale\(1\)/);
 r.props.onPointerDown(touch(5));r.props.onPointerUp(touch(5));
 elements(next).find(node=>node.props['aria-label']?.startsWith('Comment 1 in')).props.onClick({detail:1,stopPropagation(){}});
 next=h2.render('PlanCanvas',{drawing});assert.ok(elements(next).some(node=>node.props['aria-label']==='Room comment'));
});

test('lost capture and changing view clear old pointer ownership', () => {
 const h=canvasHarness();let tree=h.render('PlanCanvas',{drawing});h.flushEffects();
 const dom={hasPointerCapture:()=>false,setPointerCapture(){},releasePointerCapture(){}};
 const touch=(id,x)=>({pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:100,currentTarget:dom,preventDefault(){}});
 const region=control(tree,'Plan drawing');
 region.props.onPointerDown(touch(1,100));region.props.onLostPointerCapture(touch(1,100));region.props.onPointerMove(touch(1,200));
 tree=h.render('PlanCanvas',{drawing});
 const transform=()=>elements(tree).find(node=>node.props.style?.transform)?.props.style.transform;
 assert.equal(transform(),'translate(0px, 0px) scale(1)');
 control(tree,'Plan drawing').props.onPointerDown(touch(2,100));
 // Locate the 3D tab by role to avoid depending on useId's fixture string.
 const tab3d=elements(tree).find(node=>node.props.role==='tab'&&node.props.id?.endsWith('-tab-3d'));
 tab3d.props.onClick();tree=h.render('PlanCanvas',{drawing});h.flushEffects();
 control(tree,'Plan drawing').props.onPointerMove(touch(2,200));tree=h.render('PlanCanvas',{drawing});
 assert.equal(transform(),'translate(0px, 0px) scale(1)');
});


test('saved compact prose stays registered without a redundant chip; streaming renders the live answer', () => {
 const source={key:'a',taskId:'task-a',conversationIndex:0,state:'saved'};
 const answer='One. Two. Three. Four. **Important detail.**';
 const registrations=[];
 const current={scope:copyScope('A',1),register:(key,outputs)=>registrations.push({key,outputs})};
 const h=componentHarness('../src/components/workspace/output-workspace.tsx',{react:{useContext:()=>current},'@/lib/answer-outputs.mjs':{answerOutputs},'@/lib/answer-presentation.mjs':{answerPreview,isCompactProse,validateAnswerPresentation},'../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'},'../ai-elements/message':{MessageResponse:'message-response'}});
 let tree=h.render('AnswerContent',{text:answer,source});
 const formatted=elements(tree).find(row=>row.type==='message-response');
 assert.equal(formatted.props.children,answer);
 assert.equal(formatted.props.isAnimating,false);
 assert.doesNotMatch(text(tree),/Preview/);
 assert.equal(control(tree,'Open answer outputs'),undefined);
 h.flushEffects();assert.equal(registrations.at(-1).key,'a');assert.equal(registrations.at(-1).outputs[0].kind,'report');assert.equal(registrations.at(-1).outputs[0].markdown,answer);
 const shortList='- **Levels:** Set story elevations.\n- **Grids:** Locate building elements.\n- **Plan views:** Show a level from above.';
 tree=h.render('AnswerContent',{text:shortList,source});
 assert.equal(elements(tree).find(row=>row.type==='message-response').props.children,shortList);
 assert.equal(control(tree,'Open answer outputs'),undefined);
 tree=h.render('AnswerContent',{text:answer,source:{...source,state:'streaming'}});
 const streaming=elements(tree).find(row=>row.type==='message-response');assert.equal(streaming.props.children,answer);assert.equal(streaming.props.isAnimating,true);
 assert.equal(elements(tree).find(row=>row.type==='message-actions').props.disabled,true);
 h.flushEffects();assert.equal(registrations.at(-1).outputs[0].complete,false);
});

test('saved structured answers retain their full-answer and table preview controls',()=>{
 const source={key:'table',taskId:'task-a',conversationIndex:1,state:'saved'},registered=[];
 const current={scope:copyScope('A',1),register:(_key,outputs)=>registered.push(outputs),openOutput:()=>{}};
 const h=componentHarness('../src/components/workspace/output-workspace.tsx',{react:{useContext:()=>current},'@/lib/answer-outputs.mjs':{answerOutputs},'@/lib/answer-presentation.mjs':{answerPreview,isCompactProse,validateAnswerPresentation},'../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'},'../ai-elements/message':{MessageResponse:'message-response'}});
 const table='| Room | Area |\n| --- | --- |\n| Study | 12 |';
 const tree=h.render('AnswerContent',{text:table,source});h.flushEffects();
 assert.equal(elements(tree).find(row=>row.type==='message-response').props.children,table);
 assert.ok(control(tree,'Open Full answer beside chat'));assert.ok(control(tree,'Open Answer table 1 beside chat'));
 assert.deepEqual(Array.from(registered.at(-1),output=>output.kind),['report','table']);
});

test('heading-first answers remain readable after save and reload',()=>{
 const source={key:'3bhk',taskId:'task-a',conversationIndex:1,state:'saved'};
 const answer='## 3BHK concept for a 20 × 30 m site\n\n- Confirm the buildable footprint.\n- Verify room sizes.';
 const renderAnswer=()=>{
  const h=componentHarness('../src/components/workspace/output-workspace.tsx',{
   react:{useContext:()=>null},
   '@/lib/answer-outputs.mjs':{answerOutputs},
   '@/lib/answer-presentation.mjs':{answerPreview,isCompactProse,validateAnswerPresentation},
   '../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'},
   '../ai-elements/message':{MessageResponse:'message-response'},
  });
  return state=>elements(h.render('AnswerContent',{text:answer,source:{...source,state}}))
   .find(row=>row.type==='message-response');
 };
 const render=renderAnswer();
 assert.equal(render('streaming').props.isAnimating,true);
 assert.equal(render('saved').props.children,answer);
 assert.equal(renderAnswer()('saved').props.children,answer);
});

test('long answers open inline on demand and do not stay expanded on a different answer',()=>{
 const current={scope:copyScope('A',1)};
 const h=componentHarness('../src/components/workspace/output-workspace.tsx',{
  react:{useContext:()=>current},
  '@/lib/answer-outputs.mjs':{answerOutputs},
  '@/lib/answer-presentation.mjs':{answerPreview,isCompactProse,validateAnswerPresentation},
  '../vendor/affectui/message-actions-clean':{MessageActions:'message-actions'},
  '../ai-elements/message':{MessageResponse:'message-response'},
 });
 const answer='Review the site constraints. '.repeat(45);
 const render=key=>elements(h.render('AnswerContent',{
  text:answer,source:{key,taskId:'task-a',conversationIndex:1,state:'saved'},
 }));
 let nodes=render('a');
 assert.equal(nodes.find(row=>row.type==='message-response'),undefined);
 nodes.find(row=>row.type==='details').props.onToggle({currentTarget:{open:true}});
 nodes=render('a');
 assert.equal(nodes.find(row=>row.type==='message-response').props.children,answer);
 assert.equal(render('b').find(row=>row.type==='message-response'),undefined);
});


test('an A-B-A switch invalidates an in-flight export even before effects run',async()=>{
 let finishExport, stillCurrent, capturedName;
 const h=canvasHarness({exportPlanSheet:(_sheet,_format,name,guard)=>{capturedName=name;stillCurrent=guard;return new Promise(resolve=>{finishExport=resolve;});}});
 let tree=h.render('PlanCanvas',{drawing,exportLabel:'Concept 1'});h.flushEffects();
 elements(tree).find(node=>node.props['aria-controls']==='review-test-display').props.onClick();
 tree=h.render('PlanCanvas',{drawing,exportLabel:'Concept 1'});h.flushEffects();
 elements(tree).find(node=>node.type==='PlanDrawing'&&node.props.svgRef).props.svgRef.current={};
 elements(tree).find(node=>node.type==='button'&&text(node)==='PNG').props.onClick();
 assert.equal(capturedName,'datumm-Concept-1-plan-a-v1-2d');
 h.render('PlanCanvas',{drawing:{...drawing,version:2,fingerprint:'a-2'}});
 h.render('PlanCanvas',{drawing,exportLabel:'Concept 1'});
 assert.equal(stillCurrent(),false);finishExport();await Promise.resolve();
});


test('changing task ownership invalidates an export of an otherwise identical drawing',async()=>{
 let finish, guard;
 const h=canvasHarness({exportPlanSheet:(_sheet,_format,_name,isCurrent)=>{guard=isCurrent;return new Promise(resolve=>{finish=resolve;});}});
 let tree=h.render('PlanCanvas',{drawing,exportOwnerKey:'task-a'});h.flushEffects();
 elements(tree).find(node=>node.props['aria-controls']==='review-test-display').props.onClick();
 tree=h.render('PlanCanvas',{drawing,exportOwnerKey:'task-a'});h.flushEffects();
 elements(tree).find(node=>node.type==='PlanDrawing'&&node.props.svgRef).props.svgRef.current={};
 elements(tree).find(node=>node.type==='button'&&text(node)==='PNG').props.onClick();
 h.render('PlanCanvas',{drawing,exportOwnerKey:'task-b'});
 assert.equal(guard(),false);finish();await Promise.resolve();
});

// A1 answer feedback and admin traces.
const tick = () => new Promise(resolve => setImmediate(resolve));
const TURN = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b', HASH = 'a'.repeat(64);
const savedAnswer = { text: 'Saved answer.', turnId: TURN, answerHash: HASH,
  source: { key: 'a', taskId: 'task-a', conversationIndex: 0, state: 'saved' } };
function feedbackHarness(getContext) {
  return componentHarness('../src/components/workspace/output-workspace.tsx', {
    react: { useContext: () => getContext() }, '@/lib/answer-outputs.mjs': { answerOutputs },
    '@/lib/answer-presentation.mjs': { answerPreview, isCompactProse, validateAnswerPresentation },
    '@/lib/answer-feedback.mjs': feedbackLib,
    '../ai-elements/message': { MessageResponse: 'message-response' },
    '../vendor/affectui/message-actions-clean': { MessageActions: 'message-actions' },
  });
}
const feedbackContext = (answerFeedback, taskId = 'task-a') =>
  ({ scope: { ...copyScope('A', 1), taskId }, register() {}, answerFeedback });
const actionBar = tree => elements(tree).find(node => node.type === 'message-actions');

test('thumbs appear only on a proven saved answer, seeded from the loaded votes', () => {
  const store = { votes: { [TURN]: 'up' }, save: async () => true };
  let context = feedbackContext(store);
  const h = feedbackHarness(() => context);
  const bar = props => actionBar(h.render('AnswerContent', props));
  const shown = bar(savedAnswer);
  assert.deepEqual(Array.from(shown.props.actions), ['copy', 'feedback']);
  assert.equal(shown.props.defaultVote, 'up');
  assert.deepEqual(Array.from(shown.props.reasons), feedbackLib.FEEDBACK_REASON_LABELS);
  const source = state => ({ ...savedAnswer.source, state });
  const hidden = {
    streaming: [{ ...savedAnswer, source: source('streaming') }],
    partial: [{ ...savedAnswer, source: source('partial') }],
    unproven: [{ ...savedAnswer, answerHash: undefined }],
    // Without a verified completion ConversationAnswer passes neither the turn id nor the hash.
    'needs connection': [{ text: 'Revit needed.', source: source('partial') }],
    'votes not loaded': [savedAnswer, feedbackContext({ ...store, votes: null })],
    'shared view of another task': [savedAnswer, feedbackContext(store, 'task-b')],
    'replayed without a handler': [savedAnswer, feedbackContext(undefined)],
  };
  for (const [name, [props, next]] of Object.entries(hidden)) {
    context = next ?? feedbackContext(store);
    const actions = bar(props);
    assert.deepEqual(Array.from(actions.props.actions), ['copy'], name);
    assert.equal(actions.props.onFeedback, undefined, name);
    assert.equal(actions.props.defaultVote, undefined, name);
  }
  const output = answerOutputs('# Report', savedAnswer.source)[0];
  context = { ...feedbackContext(store), activeOutput: output, outputs: [output] };
  const panel = actionBar(feedbackHarness(() => context).render('OutputPanel'));
  assert.deepEqual(Array.from(panel.props.actions), ['copy']);
  assert.equal(panel.props.onFeedback, undefined);
});

test('a thumbs-down reason is saved only after the thumb itself', async () => {
  const calls = [], gates = [];
  const save = (taskId, body) => {
    calls.push([taskId, body]);
    return new Promise(done => gates.push(done));
  };
  const h = feedbackHarness(() => feedbackContext({ votes: {}, save }));
  const bar = actionBar(h.render('AnswerContent', savedAnswer));
  bar.props.onFeedback('down');
  bar.props.onFeedback('down', 'Too long');
  await tick();
  assert.deepEqual(calls, [['task-a', { turnId: TURN, answerHash: HASH, rating: 'down' }]]);
  gates[0](true); await tick();
  assert.deepEqual(calls[1],
    ['task-a', { turnId: TURN, answerHash: HASH, rating: 'down', reason: 'too_long' }]);
});

test('a failed save remounts the bar on the saved vote; a later success keeps it', async () => {
  let saved = false;
  const store = { votes: { [TURN]: 'up' }, save: async () => saved };
  const h = feedbackHarness(() => feedbackContext(store));
  let bar = actionBar(h.render('AnswerContent', savedAnswer));
  const first = bar.key;
  bar.props.onFeedback('down'); await tick();
  bar = actionBar(h.render('AnswerContent', savedAnswer));
  assert.notEqual(bar.key, first, 'the bar no longer shows the unsaved thumb');
  assert.equal(bar.props.defaultVote, 'up');
  const failed = bar.key;
  saved = true;
  bar.props.onFeedback('down'); await tick();
  assert.equal(actionBar(h.render('AnswerContent', savedAnswer)).key, failed);
});

test('a later successful save clears the failure notice, and no other notice', async () => {
  const outcomes = [];
  const api = async (_path, method) => {
    if (method !== 'POST') return [];
    if (!outcomes.shift()) throw Object.assign(Error('failed'), { status: 500 });
    return {};
  };
  const h = componentHarness('../src/components/workspace/use-answer-feedback.ts', {
    './use-workspace-state': { api }, '@/lib/answer-feedback.mjs': feedbackLib,
  });
  let notice = '';
  const announce = next => { notice = typeof next === 'function' ? next(notice) : next; };
  const hook = () => h.call('useAnswerFeedback', true, 'task-a', announce);
  hook(); h.flushEffects(); await tick();
  const body = { turnId: TURN, answerHash: HASH, rating: 'up' };
  outcomes.push(false, true);
  assert.equal(await hook().save('task-a', body), false);
  assert.match(notice, /not saved/);
  assert.equal(await hook().save('task-a', body), true);
  assert.equal(notice, '');
  assert.deepEqual({ ...hook().votes }, { [TURN]: 'up' });
  outcomes.push(false, true);
  await hook().save('task-a', body);
  notice = 'Saved task updates are unavailable.';
  await hook().save('task-a', body);
  assert.equal(notice, 'Saved task updates are unavailable.');
});

test('the mode filter is offered only for ask, plan and build', () => {
  const h = componentHarness('../src/components/admin/trace-rows.tsx', {
    '@/components/ui/badge': { Badge: 'badge' }, '@/lib/admin-traces.mjs': traces,
  });
  const { rows } = traces.parseTraces({ schemaVersion: 1,
    rows: ['other', 'ask', 'plan', 'build'].map(mode => ({ traceId: `t-${mode}`, mode })) });
  const tree = h.render('TraceRows', { rows, onPick() {} });
  const picks = elements(tree)
    .filter(node => node.type?.name === 'PickButton' && node.props.kind === 'mode');
  assert.deepEqual(picks.map(node => node.props.value), ['ask', 'plan', 'build']);
  assert.match(text(tree), /other/);
});

test('Refresh drops loaded-more rows and a next page still in flight', async () => {
  const page = (id, nextCursor) =>
    ({ schemaVersion: 1, rows: [{ traceId: id }], nextCursor, stats: {} });
  let loads = 0;
  const pending = [], first = page('r1', 'c1');
  const resource = { result: { ok: true, data: first }, data: first, load() { loads++; } };
  const icons = { Activity: 'i', Loader2: 'i', RefreshCw: 'i', Search: 'i', X: 'i' };
  const h = componentHarness('../src/components/admin/traces-section.tsx', {
    '@/lib/admin-traces.mjs': traces, 'lucide-react': icons,
    './trace-rows': { TRACE_HEAD: [], TraceRows: 'trace-rows' },
    './use-admin': { ResultState: 'result-state', useAdminResource: () => resource,
      useAdminClient: () => () => new Promise(resolve => pending.push(resolve)) },
    '@/components/ui/button': { Button: 'ui-button' },
    '@/components/ui/input': { Select: 'select' },
    './data-sections': { EmptyState: 'empty-state', Table: 'table' },
    './form': { Field: 'field', PageHeader: 'page-header' },
  });
  const render = () => h.render('TracesSection');
  const find = (tree, type) => elements(tree).filter(node => node.type === type);
  const ids = tree => Array.from(find(tree, 'trace-rows')[0].props.rows, row => row.traceId);
  const more = tree => find(tree, 'ui-button').find(node => text(node).includes('Load more'));
  const refresh = tree => find(tree, 'page-header')[0].props.actions.props.onClick();
  let tree = render(); h.flushEffects(); tree = render();
  more(tree).props.onClick();
  pending.shift()({ ok: true, data: page('r2', 'c2') }); await tick();
  tree = render();
  assert.deepEqual(ids(tree), ['r1', 'r2']);
  refresh(tree); tree = render(); h.flushEffects(); tree = render();
  assert.deepEqual(ids(tree), ['r1']);
  assert.equal(loads, 1);
  more(tree).props.onClick();
  refresh(tree);
  pending.shift()({ ok: true, data: page('r3', null) }); await tick();
  tree = render();
  assert.deepEqual(ids(tree), ['r1'], 'a page requested before Refresh never lands');
  assert.ok(more(tree), 'the cursor restarts from the refreshed first page');
});
