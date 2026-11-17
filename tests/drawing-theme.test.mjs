import * as drawingIdentity from '../src/lib/drawing-export-identity.mjs';
import * as viewport from '../src/lib/plan-viewport.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as geometry from '../src/lib/plan-geometry.mjs';
import * as shortcuts from '../src/lib/canvas-shortcuts.mjs';

const read = file => readFileSync(new URL('../' + file, import.meta.url), 'utf8');
const canvasCss = read('src/components/plan-canvas.module.css');
const threeCss = read('src/components/plan-three.module.css');
const drawing = {
  planId: 'drawing-a', version: 1, fingerprint: 'a'.repeat(64), svg: '',
  graph: {site: {widthMm: 6000, depthMm: 4000}, wallThicknessMm: 200, wallHeightMm: 3000,
    rooms: [{key: 'study', name: 'Study', rect: [0, 0, 6000, 4000], areaMm2: 24000000}],
    walls: [{key: 'south', start: [0, 0], end: [6000, 0]}], openings: []},
};

function harness(file = 'src/components/plan-canvas.tsx', extra = {}, globals = {}) {
  const slots = [], effects = [], frames = [], listeners = {};
  let cursor = 0;
  const slot = create => {const index = cursor++; if (!(index in slots)) slots[index] = create(); return index;};
  const hooks = {...React,
    useState(initial) {const index = slot(() => typeof initial === 'function' ? initial() : initial); return [slots[index], next => {slots[index] = typeof next === 'function' ? next(slots[index]) : next;}];},
    useRef(value) {return slots[slot(() => ({current: value}))];},
    useId() {return 'drawing-theme-test';},
    useCallback(callback) {return callback;},
    useSyncExternalStore(_subscribe, snapshot) {return snapshot();},
    useEffect(effect, deps) {
      const previous = slots[slot(() => ({deps: undefined, cleanup: undefined}))];
      if (!previous.deps || deps.some((value, index) => !Object.is(value, previous.deps[index]))) effects.push(() => {previous.cleanup?.(); previous.cleanup = effect(); previous.deps = deps;});
    },
  };
  const annotationState = {loaded: true, data: {comments: [], draft: null}};
  const document = {activeElement: null, getElementById: () => null, addEventListener(name, callback) {listeners[name] = callback;}, removeEventListener(name) {delete listeners[name];}};
  const modules = {
    react: hooks, 'react/jsx-runtime': jsxRuntime,
    'next/dynamic': {__esModule: true, default: () => 'PlanThree'},
    '@/lib/plan-geometry.mjs': geometry,
    '@/lib/drawing-export-identity.mjs': drawingIdentity,
    '@/lib/plan-viewport.mjs': viewport,
    './plan-canvas-annotations': {createCanvasAnnotationStore: () => ({load() {}, getSnapshot: () => annotationState}), EMPTY_ANNOTATIONS: annotationState.data, EMPTY_ANNOTATION_SNAPSHOT: annotationState},
    './plan-drawing': {PlanDrawing: 'PlanDrawing'},
    './ui/button': {Button: 'Button'},
    '@/lib/canvas-shortcuts.mjs': shortcuts,
    './canvas-dock': {CanvasDock: 'CanvasDock', DockButton: 'DockButton', DockSep: 'DockSep'},
    './canvas-shortcut-help': {CanvasShortcutHelp: 'CanvasShortcutHelp'},
    ...extra,
  };
  const exports = {};
  runInNewContext(ts.transpileModule(read(file), {compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022}}).outputText, {
    exports, window: {}, document,
    requestAnimationFrame(callback) {frames.push(callback); return frames.length;}, cancelAnimationFrame() {},
    getComputedStyle: () => ({visibility: 'visible'}),
    require(name) {if (name.endsWith('.module.css')) return {default: new Proxy({}, {get: (_, key) => String(key)})}; return modules[name] ?? {};},
    ...globals,
  });
  return {exports, listeners, document,
    render(name, props) {cursor = 0; return exports[name](props);},
    flush() {while (effects.length) effects.shift()(); while (frames.length) frames.shift()();},
  };
}
function elements(tree) {return React.isValidElement(tree) ? [tree, ...React.Children.toArray(tree.props.children).flatMap(elements)] : [];}
function tab(tree, view) {return elements(tree).find(node => node.props.id === `drawing-theme-test-tab-${view}`);}
function control(tree, label) {return elements(tree).find(node => node.props['aria-label'] === label);}

// Test semantic visual contracts against the actual styles instead of a second palette.
test('working and sheet palettes remain distinct while drawing chrome uses appearance roles', () => {
  const root = canvasCss.match(/\.planCanvas\s*\{([\s\S]*?)\}/)[1];
  assert.match(root, /--pd-paper:\s*#fff;/);
  assert.match(root, /--pd-ink:\s*#000;/);
  assert.match(root, /--pd-accent:\s*#0070d6;/);
  assert.match(canvasCss, /data-surface='drafting'[^}]*--pd-paper:\s*#191d22/);
  assert.match(canvasCss, /data-surface='drafting'[^}]*--pd-ink:\s*#e4eaf0/);
  for (const css of [canvasCss, threeCss]) {
    for (const role of ['panel', 'ink', 'text', 'line', 'hover', 'select', 'ui-as-focus']) assert.ok(css.includes(`var(--${role})`), `actual ${role} role is used`);
    assert.doesNotMatch(css, /trace-accent|Consolas|background:\s*#292a28/);
  }
  assert.match(canvasCss, /\.viewSurface\[hidden\]\s*\{\s*display:\s*none/);
});

test('comment hierarchy uses measured local-thread dimensions and readable controls', () => {
  assert.match(canvasCss, /--drawing-comment-panel:\s*#1c1c1e/);
  assert.match(canvasCss, /\.commentPopover\s*\{[^}]*width:\s*min\(420px,[^}]*border-radius:\s*10px/);
  assert.match(canvasCss, /\.commentTop\s*\{[^}]*padding:\s*10px 10px 10px 16px/);
  assert.match(canvasCss, /\.commentBody\s*\{[^}]*gap:\s*16px;[^}]*padding:\s*16px 16px 12px/);
  assert.match(canvasCss, /\.commentTop button\s*\{[^}]*width:\s*28px;[^}]*height:\s*28px;[^}]*border-radius:\s*6px/);
  assert.match(canvasCss, /\.commentText\s*\{[^}]*font-size:\s*13px;[^}]*line-height:\s*20px/);
});

test('same exact drawing retains both view surfaces and each view owns its Fit action', () => {
  const h = harness();
  const render = () => h.render('PlanCanvas', {drawing});
  let tree = render(); h.flush();
  const originalSheetRef = elements(tree).find(node => node.type === 'PlanDrawing' && node.props.svgRef).props.svgRef;
  control(tree, 'Zoom in').props.onClick();
  tab(tree, '3d').props.onClick(); tree = render(); h.flush();
  let three = elements(tree).find(node => node.type === 'PlanThree');
  assert.ok(three);
  const captureRef = three.props.captureRef, initialFit = three.props.fitRequest;
  control(tree, 'Fit drawing to view').props.onClick(); tree = render();
  assert.equal(elements(tree).find(node => node.type === 'PlanThree').props.fitRequest, initialFit + 1);
  tab(tree, '2d').props.onClick(); tree = render(); h.flush();
  three = elements(tree).find(node => node.type === 'PlanThree');
  assert.equal(three.props.captureRef, captureRef, 'same mounted 3D capture and camera');
  assert.equal(elements(tree).find(node => node.type === 'div' && node.props.hidden && elements(node).some(child => child.type === 'PlanThree')).props.hidden, true);
  assert.equal(elements(tree).find(node => node.type === 'PlanDrawing' && node.props.svgRef).props.svgRef, originalSheetRef);
  assert.ok(elements(tree).some(node => node.type === 'output' && React.Children.toArray(node.props.children).join('') === '125%'));
  control(tree, 'Fit drawing to view').props.onClick(); tree = render();
  assert.equal(elements(tree).find(node => node.type === 'PlanThree').props.fitRequest, initialFit + 1, '2D fit leaves 3D orbit unchanged');
  tab(tree, '3d').props.onClick(); tree = render();
  assert.equal(elements(tree).find(node => node.type === 'PlanThree').props.captureRef, captureRef);
  const replacement = {...drawing, planId: 'drawing-b'};
  h.render('PlanCanvas', {drawing: replacement}); h.flush(); tree = h.render('PlanCanvas', {drawing: replacement});
  assert.equal(elements(tree).some(node => node.type === 'PlanThree'), false, 'same fingerprint on a different plan still resets the renderer');
  assert.equal(tab(tree, '2d').props['aria-selected'], true);
});

test('native Select Escape stays owned by the picker; properties Escape restores its own summary', () => {
  const h = harness();
  let tree = h.render('PlanCanvas', {drawing}); h.flush();
  const properties = elements(tree).find(node => node.type === 'details' && node.props.className === 'selectionProperties');
  let prevented = 0, stopped = 0, focused = 0;
  const native = {key: 'Escape', target: {tagName: 'SELECT'}, preventDefault() {prevented++;}, stopPropagation() {stopped++;}, currentTarget: {open: true, querySelector: () => ({focus() {focused++;}})}};
  properties.props.onKeyDown(native);
  assert.equal(prevented + stopped + focused, 0);
  assert.equal(native.currentTarget.open, true);
  properties.props.onKeyDown({...native, target: {tagName: 'SUMMARY'}});
  assert.equal(prevented, 1); assert.equal(stopped, 1); assert.equal(focused, 1);
  const closed={...native,target:{tagName:'SUMMARY'},currentTarget:{...native.currentTarget,open:false}};
  properties.props.onKeyDown(closed);
  assert.equal(prevented,1,'Closed properties lets Escape reach Focus drawing');
  assert.equal(stopped,1);
  elements(tree).find(node => node.props['aria-controls'] === 'drawing-theme-test-display').props.onClick();
  tree = h.render('PlanCanvas', {drawing}); h.flush();
  h.listeners.keydown(native);
  assert.equal(prevented, 1, 'document-level display popup handler also defers to native Select');
});

test('controlled primary drawing style matches the selected export owner and retains standalone defaults',()=>{
 const h=harness();let tree=h.render('PlanCanvas',{drawing,viewStyle:'presentation'});
 assert.equal(elements(tree).find(node=>node.type==='PlanDrawing'&&node.props.svgRef).props.mode,'presentation');
 tree=h.render('PlanCanvas',{drawing,viewStyle:'linework'});
 assert.equal(elements(tree).find(node=>node.type==='PlanDrawing'&&node.props.svgRef).props.mode,'hidden');
 const parent=read('src/components/workspace.tsx'),ast=ts.createSourceFile('workspace.tsx',parent,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let selectedStyle;
 function visit(node){if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='PlanCanvas')selectedStyle=node.attributes.properties.find(attribute=>attribute.name?.getText(ast)==='viewStyle')?.initializer.expression.getText(ast);ts.forEachChild(node,visit);}visit(ast);
 assert.equal(selectedStyle,'w.drawingStyle');
});

test('Display owns Escape before inner Properties, then Properties owns the next Escape',()=>{
 const h=harness();let tree=h.render('PlanCanvas',{drawing});h.flush();
 elements(tree).find(node=>node.props['aria-controls']==='drawing-theme-test-display').props.onClick();tree=h.render('PlanCanvas',{drawing});h.flush();
 const inspector=read('src/components/workspace/inspector.tsx'),ast=ts.createSourceFile('inspector.tsx',inspector,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let handler;
 function visit(node){if(!handler&&ts.isJsxAttribute(node)&&node.name.getText(ast)==='onKeyDown')handler=node.initializer.expression;ts.forEachChild(node,visit);}visit(ast);assert.ok(handler);
 let closed=0;const document={querySelectorAll:()=>elements(tree).some(node=>node.props.role==='dialog')?[{getClientRects:()=>[{}]}]:[]};const exports={};
 runInNewContext(ts.transpileModule(`exports.handler=${handler.getText(ast)}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{exports,document,HTMLElement:class{},propertiesOpen:true,actions:{closeProperties(){closed++;}},preview:{kind:'drawing'}});
 const event={key:'Escape',target:null,defaultPrevented:false,preventDefault(){this.defaultPrevented=true;},stopPropagation(){}};
 exports.handler(event);assert.equal(closed,0);assert.equal(event.defaultPrevented,false);
 h.listeners.keydown(event);tree=h.render('PlanCanvas',{drawing});assert.equal(elements(tree).some(node=>node.props.role==='dialog'),false);assert.equal(event.defaultPrevented,true);
 exports.handler({...event,defaultPrevented:false});assert.equal(closed,1);
});

test('3D materials use a dark neutral environment without theme-driven camera rebuilding', () => {
  const source = read('src/components/plan-three.tsx');
  assert.match(source, /#191d22/);
  assert.doesNotMatch(source, /getComputedStyle|MutationObserver|themeTick/);
  assert.match(source, /\},\[fingerprint,retry\]\)/, 'scene and camera only rebuild for a replacement or deliberate retry');
});

test('readonly drawing exposes selection/pan/measure but no annotation mutation or second composer', () => {
  const h = harness();
  const tree = h.render('PlanCanvas', {drawing, readOnly: true});
  for (const label of ['Select element', 'Pan drawing', 'Measure distance']) assert.ok(control(tree, label));
  assert.equal(control(tree, 'Add comment'), undefined);
  assert.equal(elements(tree).some(node => node.type === 'form'), false);
});

test('annotation property drafts reset on exact drawing replacement and only prepare an identity-bound request', () => {
  const h = harness('src/components/studio-properties.tsx');
  const requests = [];
  const props = {drawing, selected: 'study', onSelect() {}, onRequest: value => requests.push(value)};
  let tree = h.render('StudioProperties', props);
  const facts = elements(tree).find(node => node.type === 'dl');
  const factText = node => React.isValidElement(node) ? React.Children.toArray(node.props.children).map(factText).join(' ') : node == null ? '' : String(node);
  assert.match(factText(facts), /Area incl\. walls\s+24\.0/);
  assert.match(factText(facts), /Est\. clear width\s+5,800/);
  control(tree, 'Annotation room label').props.onChange({target: {value: 'Old plan room label'}});
  tree = h.render('StudioProperties', props);
  assert.equal(control(tree, 'Annotation room label').props.value, 'Old plan room label');
  const replacement = {...drawing, version: 2, fingerprint: 'b'.repeat(64)};
  h.render('StudioProperties', {...props, drawing: replacement});
  tree = h.render('StudioProperties', {...props, drawing: replacement});
  assert.equal(control(tree, 'Annotation room label').props.value, 'Study');
  elements(tree).find(node => node.type === 'form').props.onSubmit({preventDefault() {}});
  assert.equal(requests.length, 1);
  assert.match(requests[0], /version: 2;/);
  assert.ok(requests[0].includes(replacement.fingerprint));
  assert.doesNotMatch(requests[0], /Old plan room label/);
  assert.match(requests[0], /proposal request, not approval to change Revit/);
});

test('2D surface selection and keyboard, wheel, and touch navigation update the shared world transform', () => {
 let wheel;
 const h = harness('src/components/plan-canvas.tsx', {}, {ResizeObserver: class { constructor(fn){this.fn=fn;} observe(){this.fn([{contentRect:{width:800,height:600}}]);} disconnect(){} }});
 let tree=h.render('PlanCanvas',{drawing});
 const region=elements(tree).find(node=>node.props['aria-label']==='Plan drawing');
 const dom={addEventListener(name,fn){if(name==='wheel')wheel=fn;},removeEventListener(){},getBoundingClientRect(){return {left:0,top:0,width:800,height:600};},hasPointerCapture(){return false;},setPointerCapture(){},releasePointerCapture(){}};
 region.props.ref.current=dom;h.flush();tree=h.render('PlanCanvas',{drawing});
 assert.equal(elements(tree).find(node=>node.props['aria-label']==='Plan drawing').props['data-surface'],'drafting');
 control(tree,'Zoom in').props.onClick();tree=h.render('PlanCanvas',{drawing});
 assert.equal(elements(tree).find(node=>node.type==='output').props.children[0],125);
 let prevented=false;wheel({deltaY:-100,clientX:600,clientY:200,preventDefault(){prevented=true;}});assert.ok(prevented);
 tree=h.render('PlanCanvas',{drawing});const region2=elements(tree).find(node=>node.props['aria-label']==='Plan drawing');
 const key={key:'ArrowRight',target:dom,currentTarget:dom,preventDefault(){}};region2.props.onKeyDown(key);
 tree=h.render('PlanCanvas',{drawing});let layers=elements(tree).find(node=>node.props.className==='drawingLayers');assert.notEqual(layers.props.style.transform,'translate(0px, 0px) scale(1)');
 const event=(id,x,y)=>({pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:y,currentTarget:dom,preventDefault(){}});
 region2.props.onPointerDown(event(1,200,200));region2.props.onPointerDown(event(2,300,200));region2.props.onPointerMove(event(2,360,200));region2.props.onPointerUp(event(1,200,200));region2.props.onPointerUp(event(2,360,200));
 tree=h.render('PlanCanvas',{drawing});assert.ok(Number(elements(tree).find(node=>node.type==='output').props.children[0])>125);
 control(tree,'Fit drawing to view').props.onClick();tree=h.render('PlanCanvas',{drawing});assert.equal(elements(tree).find(node=>node.type==='output').props.children[0],100);
 let activeRegion=elements(tree).find(node=>node.props['aria-label']==='Plan drawing');
 activeRegion.props.onPointerDown(event(3,100,100));activeRegion.props.onPointerMove(event(3,140,130));activeRegion.props.onPointerUp(event(3,140,130));
 tree=h.render('PlanCanvas',{drawing});assert.match(elements(tree).find(node=>node.props.className==='drawingLayers').props.style.transform,/translate\(40px, 30px\)/);
 activeRegion=elements(tree).find(node=>node.props['aria-label']==='Plan drawing');
 const middle=(x,y)=>({pointerId:4,pointerType:'mouse',button:1,clientX:x,clientY:y,currentTarget:dom,preventDefault(){}});
 activeRegion.props.onPointerDown(middle(100,100));activeRegion.props.onPointerMove(middle(125,100));activeRegion.props.onPointerUp(middle(125,100));
 tree=h.render('PlanCanvas',{drawing});assert.match(elements(tree).find(node=>node.props.className==='drawingLayers').props.style.transform,/translate\(65px, 30px\)/);
 elements(tree).find(node=>node.props['aria-controls']==='drawing-theme-test-display').props.onClick();tree=h.render('PlanCanvas',{drawing});
 elements(tree).find(node=>node.type==='button'&&React.Children.toArray(node.props.children).includes('Sheet')).props.onClick();tree=h.render('PlanCanvas',{drawing});
 assert.equal(elements(tree).find(node=>node.type==='PlanDrawing'&&node.props.svgRef).props.surface,'sheet');
});

test('normal pinch release preserves remaining touch; unexpected capture loss aborts it', () => {
 const h=harness('src/components/plan-canvas.tsx',{}, {ResizeObserver:class{constructor(fn){this.fn=fn;} observe(){this.fn([{contentRect:{width:800,height:600}}]);} disconnect(){}}});
 let tree=h.render('PlanCanvas',{drawing});let region=control(tree,'Plan drawing');
 const dom={addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),hasPointerCapture:()=>true,setPointerCapture(){},releasePointerCapture(){}};
 region.props.ref.current=dom;h.flush();tree=h.render('PlanCanvas',{drawing});region=control(tree,'Plan drawing');
 const touch=(id,x)=>({pointerId:id,pointerType:'touch',button:0,clientX:x,clientY:100,currentTarget:dom,preventDefault(){}});
 region.props.onPointerDown(touch(1,100));region.props.onPointerDown(touch(2,200));
 region.props.onPointerUp(touch(1,100));region.props.onLostPointerCapture(touch(1,100));
 region.props.onPointerMove(touch(2,240));tree=h.render('PlanCanvas',{drawing});
 const transform=()=>elements(tree).find(node=>node.props.className==='drawingLayers').props.style.transform;
 assert.match(transform(),/translate\(40px, 0px\)/);
 region.props.onLostPointerCapture(touch(2,240));region.props.onPointerMove(touch(2,300));tree=h.render('PlanCanvas',{drawing});
 assert.match(transform(),/translate\(40px, 0px\)/);
});

test('hidden zero-size observations preserve the 2D pan; a real resize reclamps it', () => {
 let notify;
 const h=harness('src/components/plan-canvas.tsx',{}, {ResizeObserver:class{constructor(fn){notify=fn;} observe(){notify([{contentRect:{width:800,height:600}}]);} disconnect(){}}});
 let tree=h.render('PlanCanvas',{drawing});const region=control(tree,'Plan drawing');
 const dom={addEventListener(){},removeEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:800,height:600}),hasPointerCapture:()=>false,setPointerCapture(){},releasePointerCapture(){}};
 region.props.ref.current=dom;h.flush();tree=h.render('PlanCanvas',{drawing});h.flush();
 const key={key:'ArrowLeft',target:dom,currentTarget:dom,preventDefault(){}};
 for(let i=0;i<4;i++)control(tree,'Plan drawing').props.onKeyDown(key);
 tree=h.render('PlanCanvas',{drawing});const transform=()=>elements(tree).find(node=>node.props.className==='drawingLayers').props.style.transform;
 assert.match(transform(),/translate\(320px, 0px\)/);
 notify([{contentRect:{width:0,height:0}}]);tree=h.render('PlanCanvas',{drawing});h.flush();tree=h.render('PlanCanvas',{drawing});
 assert.match(transform(),/translate\(320px, 0px\)/);
 notify([{contentRect:{width:200,height:160}}]);tree=h.render('PlanCanvas',{drawing});h.flush();tree=h.render('PlanCanvas',{drawing});
 const x=Number(transform().match(/translate\(([-.\d]+)px/)[1]);assert.ok(x>0&&x<200,`reclamped x ${x}`);
});

test('navigation help is a hidden drawing description; the dock buttons keep 32px and 44px targets',()=>{
 const h=harness();const tree=h.render('PlanCanvas',{drawing});
 const description=elements(tree).find(node=>node.type==='p'&&node.props.id==='drawing-theme-test-navigation-help');
 assert.equal(control(tree,'Plan drawing').props['aria-describedby'],description.props.id);
 assert.match(React.Children.toArray(description.props.children).join(''),/arrow keys pan/);
 assert.equal(elements(tree).some(node=>node.type==='details'&&node.props.className==='navigationHelp'),false);
 const dockCss=read('src/components/canvas-dock.module.css');
 assert.match(dockCss,/\.btn\s*\{[^}]*min-width:\s*32px;\s*height:\s*32px/);
 assert.match(dockCss,/pointer:\s*coarse\)\s*\{\s*\.btn\s*\{[^}]*min-width:\s*44px;\s*height:\s*44px/);
 assert.match(canvasCss,/\.surfaceControls button\s*\{[^}]*min-height:\s*44px/);
});

test('one dock holds every tool, view, zoom, display and help action once, with pressed state and shortcut tips',()=>{
 const h=harness();let tree=h.render('PlanCanvas',{drawing});
 const dock=elements(tree).find(node=>node.type==='CanvasDock');
 const buttons=elements(dock).filter(node=>node.type==='DockButton');
 const names=buttons.map(node=>node.props['aria-label']);
 assert.deepEqual(names,['Select element','Pan drawing','Measure distance','Add comment','All comments, 0 open','2D floor plan','3D cutaway','Zoom out','Zoom in','Fit drawing to view','Display options','Keyboard shortcuts']);
 assert.equal(new Set(names).size,names.length);
 for(const node of buttons)assert.ok(node.props.tip,node.props['aria-label']+' has a tooltip');
 assert.equal(control(tree,'Select element').props['aria-pressed'],true);
 assert.equal(control(tree,'Pan drawing').props.tip,'Pan · H');
 for(const old of ['Home view','Canvas tools'])assert.equal(control(tree,old),undefined,old+' is merged into the dock');
 control(tree,'Pan drawing').props.onClick();tree=h.render('PlanCanvas',{drawing});
 assert.equal(control(tree,'Pan drawing').props['aria-pressed'],true);assert.equal(control(tree,'Select element').props['aria-pressed'],false);
 assert.match(elements(tree).find(node=>node.props.role==='status').props.children,/Pan tool/);
 tab(tree,'3d').props.onClick();tree=h.render('PlanCanvas',{drawing});h.flush();
 assert.equal(control(tree,'Measure distance'),undefined,'measure is 2D only');
 control(tree,'Zoom in').props.onClick();tree=h.render('PlanCanvas',{drawing});h.flush();
 const three=elements(tree).find(node=>node.type==='PlanThree');
 assert.deepEqual({delta:three.props.zoomRequest.delta,id:three.props.zoomRequest.id},{delta:.25,id:1},'the dock drives 3D zoom');
 control(tree,'Zoom out').props.onClick();tree=h.render('PlanCanvas',{drawing});
 {const request=elements(tree).find(node=>node.type==='PlanThree').props.zoomRequest;assert.equal(request.id,2);assert.equal(request.delta,-.25);}
 assert.ok(control(tree,'Fit drawing to view'));
 assert.equal(elements(tree).find(node=>node.props.className==='dockRail').props['data-view'],'3d');
});

test('shortcuts act only inside the canvas region and never while typing or from the help dialog',()=>{
 const h=harness();let tree=h.render('PlanCanvas',{drawing});
 const panel=()=>elements(tree).find(node=>node.props.role==='tabpanel');
 const inside={contains:()=>true},outside={contains:()=>false};
 const key=(name,extra={})=>{let prevented=false;panel().props.onKeyDown({key:name,target:{tagName:'DIV'},currentTarget:inside,preventDefault(){prevented=true;},...extra});tree=h.render('PlanCanvas',{drawing});return prevented;};
 assert.equal(key('h'),true);assert.equal(control(tree,'Pan drawing').props['aria-pressed'],true);
 assert.equal(key('m'),true);assert.equal(control(tree,'Measure distance').props['aria-pressed'],true);
 assert.equal(key('c'),true);assert.equal(control(tree,'Add comment').props['aria-pressed'],true);
 assert.equal(key('v'),true);assert.equal(control(tree,'Select element').props['aria-pressed'],true);
 assert.equal(key('h',{target:{tagName:'TEXTAREA'}}),false);assert.equal(control(tree,'Pan drawing').props['aria-pressed'],false);
 assert.equal(key('h',{ctrlKey:true}),false);
 assert.equal(key('h',{currentTarget:{contains:()=>false}}),false,'portalled dialog keys are ignored');
 assert.equal(elements(tree).find(node=>node.type==='CanvasShortcutHelp').props.open,false);
 assert.equal(key('?'),true);assert.equal(elements(tree).find(node=>node.type==='CanvasShortcutHelp').props.open,true);
 elements(tree).find(node=>node.type==='CanvasShortcutHelp').props.onOpenChange(false);tree=h.render('PlanCanvas',{drawing});
 assert.equal(elements(tree).find(node=>node.type==='CanvasShortcutHelp').props.open,false);
 assert.equal(key('3'),true);assert.equal(tab(tree,'3d').props['aria-selected'],true);
 assert.equal(key('2'),true);assert.equal(tab(tree,'2d').props['aria-selected'],true);
 assert.equal(key('f'),true);
});

test('geometry properties keep room metrics visible and technical identity in a closed source disclosure',()=>{
 const h=harness();const tree=h.render('PlanCanvas',{drawing});
 const properties=elements(tree).find(node=>node.type==='section'&&node.props['aria-label']==='Selected geometry properties');
 const disclosure=elements(properties).find(node=>node.type==='details'&&node.props.className==='geometrySource');
 assert.ok(disclosure);assert.equal(disclosure.props.open,undefined);
 const renderedText=node=>React.isValidElement(node)?React.Children.toArray(node.props.children).map(renderedText).join(' '):node==null?'':String(node);
 const visibleText=node=>React.isValidElement(node)?node.type==='details'&&node.props.className==='geometrySource'?'':React.Children.toArray(node.props.children).map(visibleText).join(' '):node==null?'':String(node);
 const visible=visibleText(properties),source=renderedText(disclosure);
 assert.match(visible,/AREA INCL\. WALLS/);assert.match(visible,/EST\. CLEAR WIDTH/);assert.match(visible,/EST\. CLEAR DEPTH/);assert.match(visible,/Version\s+1/);
 assert.doesNotMatch(visible,/drawing-a|a{64}/);assert.match(source,/drawing-a/);assert.match(source,/a{64}/);
});


test('non-rectangular rooms withhold clear dimensions in both properties surfaces',()=>{
 const polygon={...drawing.graph.rooms[0],boundary:[[0,0],[6000,0],[6000,2000],[3000,2000],[3000,4000],[0,4000]]};
 const shape={...drawing,graph:{...drawing.graph,rooms:[polygon]}};
 const renderedText=node=>React.isValidElement(node)?React.Children.toArray(node.props.children).map(renderedText).join(' '):node==null?'':String(node);
 const canvas=harness().render('PlanCanvas',{drawing:shape});
 const properties=elements(canvas).find(node=>node.type==='section'&&node.props['aria-label']==='Selected geometry properties');
 assert.match(renderedText(properties),/EST\. CLEAR WIDTH[^]*Unavailable/);
 assert.match(renderedText(properties),/EST\. CLEAR DEPTH[^]*Unavailable/);
 const studio=harness('src/components/studio-properties.tsx').render('StudioProperties',{drawing:shape,selected:'study',onSelect(){},onRequest(){}});
 const facts=renderedText(elements(studio).find(node=>node.type==='dl'));
 assert.match(facts,/Est\. clear width\s+Unavailable/);assert.match(facts,/Est\. clear depth\s+Unavailable/);
 assert.doesNotMatch(facts,/5,800|3,800/);
});

test('clear estimates require four ordered rectangle corners matching the room rect',()=>{
 const rect=[0,0,6000,4000],estimate=room=>geometry.rectangularClearDimensions({rect,...room},200);
 assert.deepEqual(estimate({}),{widthMm:5800,depthMm:3800});
 assert.deepEqual(estimate({boundary:[[0,0],[6000,0],[6000,4000],[0,4000],[0,0]]}),{widthMm:5800,depthMm:3800});
 for(const boundary of [[],[[0,0],[6000,0],[5000,4000],[0,4000]],[[0,0],[6000,4000],[6000,0],[0,4000]],[[0,0],[6000,0],[6000,2000],[3000,2000],[3000,4000],[0,4000]]]) assert.equal(estimate({boundary}),null);
});
