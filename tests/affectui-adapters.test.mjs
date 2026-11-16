import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ts from 'typescript';
import * as config from '../src/lib/admin-config.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url), h = React.createElement;
// Compile actual adapters and licensed source. Keep installed React/Radix dependencies unchanged.
function modules({ react = React, globals = {}, overrides = {} } = {}) {
  const cache = new Map();
  function load(path) {
    const absolute = resolve(root, path);
    if (cache.has(absolute)) return cache.get(absolute);
    const exports = {}; cache.set(absolute, exports);
    const code = ts.transpileModule(readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(code, { exports, console, setTimeout, clearTimeout, ...globals, require(name) {
      if (Object.hasOwn(overrides, name)) return overrides[name];
      if (name === 'react') return react;
      if (name.endsWith('.module.css')) return { default: {} };
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? resolve(root, 'src', name.slice(2)) : resolve(dirname(absolute), name);
        return load([base, base + '.tsx', base + '.ts'].find(existsSync));
      }
      return require(name);
    } }, { filename: absolute });
    return exports;
  }
  return load;
}
const load = modules(), ui = name => load('src/components/ui/' + name + '.tsx'), vendor = name => load('src/components/vendor/affectui/' + name + '-clean.tsx');
function elements(tree) {
  const result = [];
  function visit(node) { if (!React.isValidElement(node)) return; result.push(node); React.Children.forEach(node.props.children, visit); }
  visit(tree); return result;
}
const find = (tree, predicate) => elements(tree).find(predicate);
const native = tree => find(tree, node => typeof node.type === 'string' && node.type !== 'style');
const markup = (Component, props) => renderToStaticMarkup(h(Component, props)).replace(/<style[\s\S]*?<\/style>/g, '');
// Persistent hook/effect harness follows the repository's existing actual-component VM tests.
function hookHarness() {
  const slots = [], effects = []; let cursor = 0;
  const changed = (before, after) => !after || !before || after.some((value, i) => !Object.is(value, before[i]));
  const effect = (setup, deps) => { const i = cursor++, previous = slots[i]; if (changed(previous?.deps, deps)) { const next = slots[i] = { deps }; effects.push(() => { previous?.cleanup?.(); next.cleanup = setup(); }); } };
  const react = { ...React,
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; },
    useMemo(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
    useEffect: effect, useLayoutEffect: effect,
  };
  return { react, render(fn, props) { cursor = 0; return fn(props); }, flush() { effects.splice(0).forEach(fn => fn()); }, unmount() { slots.forEach(slot => slot?.cleanup?.()); } };
}
function motionEnvironment() {
  const listeners = new Set(), observers = new Set(), timers = new Map(); let nextTimer = 0;
  const document = { documentElement: { dataset: {} }, activeElement: null };
  const media = { matches: false, addEventListener(type, fn) { assert.equal(type, 'change'); listeners.add(fn); }, removeEventListener(type, fn) { listeners.delete(fn); } };
  class MutationObserver { constructor(fn) { this.fn = fn; } observe(node, options) { assert.equal(node, document.documentElement); assert.deepEqual(Array.from(options.attributeFilter), ['data-motion']); observers.add(this); } disconnect() { observers.delete(this); } }
  const setTimer = fn => { const id = ++nextTimer; timers.set(id, fn); return id; }, clearTimer = id => timers.delete(id);
  return { document, media, listeners, observers, timers,
    globals: { document, window: { matchMedia: () => media, setTimeout: setTimer }, MutationObserver, setTimeout: setTimer, clearTimeout: clearTimer, requestAnimationFrame: setTimer, cancelAnimationFrame: clearTimer, ResizeObserver: class { observe() {} disconnect() {} }, getComputedStyle: () => ({ paddingLeft: '10', paddingRight: '10' }) },
    app(value) { document.documentElement.dataset.motion = value; [...observers].forEach(observer => observer.fn()); },
    os(value) { media.matches = value; [...listeners].forEach(fn => fn()); },
  };
}

test('six Button variants and eight sizes preserve one native submit control, public attributes and arbitrary children', () => {
  const { Button, buttonVariants } = ui('button');
  const variants = { default: 'primary', destructive: 'destructive', outline: 'secondary', secondary: 'secondary', ghost: 'ghost', link: 'ghost' };
  const sizes = { default: 'md', xs: 'sm', sm: 'sm', lg: 'lg', icon: 'md', 'icon-xs': 'sm', 'icon-sm': 'sm', 'icon-lg': 'lg' };
  for (const [variant, mappedVariant] of Object.entries(variants)) for (const [size, mappedSize] of Object.entries(sizes)) {
    const html = markup(Button, { variant, size, children: [h('svg', { key: 'icon', 'aria-hidden': true }), ' Save'] });
    assert.equal((html.match(/<button/g) || []).length, 1); assert.match(html, /type="submit"/);
    assert.match(html, new RegExp('data-variant="' + variant + '"')); assert.match(html, new RegExp('data-size="' + size + '"'));
    assert.match(html, new RegExp('aui-button-' + mappedVariant)); assert.match(html, new RegExp('aui-button-' + mappedSize));
    assert.match(html, /<svg[^>]*><\/svg> Save/); assert.match(buttonVariants({ variant, size, className: 'caller' }), /caller/);
  }
  for (const variant of [null, undefined]) for (const size of [null, undefined]) assert.match(markup(Button, { variant, size, children: 'Save' }), /data-variant="default" data-size="default"/);
  assert.match(markup(Button, { type: undefined, children: 'Save' }), /type="submit"/);
  const explicit = markup(Button, { type: 'reset', disabled: true, form: 'settings', name: 'action', value: 'save', children: 'Save' });
  for (const attribute of ['type="reset"', 'disabled=""', 'form="settings"', 'name="action"', 'value="save"']) assert.ok(explicit.includes(attribute));
});

test('Button and Badge use real Radix Slot child-first event merging and React19 composed cleanup refs', () => {
  for (const [name, exportName] of [['button', 'Button'], ['badge', 'Badge']]) {
    const Component = ui(name)[exportName], order = [], refs = [], cleanups = [], original = { currentTarget: {} }; let captured;
    const Capture = props => { captured = props; return h('a', props); };
    const html = markup(Component, { asChild: true, variant: 'outline', className: 'wrapper', ref: node => { refs.push(['wrapper', node]); return () => cleanups.push('wrapper'); }, onClick: event => { order.push('wrapper'); assert.equal(event, original); },
      children: h(Capture, { href: '/download', className: 'child', ref: node => { refs.push(['child', node]); return () => cleanups.push('child'); }, onClick: event => { order.push('child'); assert.equal(event, original); }, children: 'Download' }),
    });
    assert.equal((html.match(/<a /g) || []).length, 1); assert.doesNotMatch(html, /<button|<span/);
    assert.equal(captured.href, '/download'); assert.equal(captured.type, undefined); assert.match(captured.className, /wrapper child/);
    captured.onClick(original); assert.deepEqual(order, ['child', 'wrapper']);
    const anchor = { focus() {} }, cleanup = captured.ref(anchor);
    assert.deepEqual(refs, [['wrapper', anchor], ['child', anchor]]); cleanup(); assert.deepEqual(cleanups, ['wrapper', 'child']);
  }
  for (const Component of [ui('button').Button, ui('badge').Badge]) for (const children of [null, 'text', [h('a', { key: 1 }), h('a', { key: 2 })]]) assert.throws(() => markup(Component, { asChild: true, children }), /single React element/);
});

test('native fields preserve zero/empty/false/null/undefined, native event identity, all native props and control refs', () => {
  const { Input, Textarea, Select } = ui('input');
  for (const [Wrapper, source, exportName, tag] of [[Input, 'text-field', 'NativeTextField', 'input'], [Textarea, 'text-area', 'NativeTextArea', 'textarea'], [Select, 'select', 'NativeSelect', 'select']]) for (const value of [undefined, '', 0, false, null]) {
    const ref = React.createRef(), original = { target: { value }, nativeEvent: { isComposing: true } }; let received;
    const props = { value, ref, onChange: event => received = event, onKeyDown: event => received = event, id: 'field', name: 'field', form: 'settings', disabled: true, required: true, 'aria-invalid': true, 'aria-describedby': 'error', size: 5, style: { width: 123 }, className: 'caller' };
    const wrapper = Wrapper(props), node = native(wrapper.type(wrapper.props));
    assert.equal(wrapper.type, vendor(source)[exportName]); assert.equal(node.type, tag);
    for (const key of Object.keys(props)) if (key !== 'className') assert.equal(node.props[key], props[key], tag + ' ' + key);
    assert.match(node.props.className, /caller/); node.props.onChange(original); assert.equal(received, original); node.props.onKeyDown(original); assert.equal(received, original);
    const field = { focus() {} }; node.props.ref.current = field; assert.equal(ref.current, field);
  }
  const input = markup(Input, { type: 'number', value: 0, onChange() {}, min: 0, max: 10, step: 'any', size: 6 });
  assert.match(input, /value="0"/); assert.match(input, /size="6"/); assert.match(input, /step="any"/);
  const textarea = markup(Textarea, { rows: 8, value: '', onChange() {} }); assert.match(textarea, /rows="8"/); assert.match(textarea, /<textarea[^>]*><\/textarea>/);
});

test('Select keeps empty/Unicode options, optgroups, multiple/defaultValue and native reset/ref ownership', () => {
  const { Select } = ui('input');
  const options = [h('option', { key: 'default', value: '' }, 'Server default'), h('optgroup', { key: 'unicode', label: 'Models' }, h('option', { value: '模型/α' }, 'Unicode'), h('option', { value: 'off', disabled: true }, 'Unavailable'))];
  const scalar = markup(Select, { value: '', onChange() {}, children: options });
  assert.match(scalar, /<option value="" selected="">Server default/); assert.match(scalar, /<optgroup label="Models">/); assert.match(scalar, /<option value="off" disabled="">/);
  const html = markup(Select, { multiple: true, size: 4, defaultValue: ['模型/α', ''], name: 'models', children: options });
  assert.match(html, /<select[^>]*multiple=""[^>]*size="4"/); assert.equal((html.match(/selected=""/g) || []).length, 2); assert.doesNotMatch(html, /<button|type="hidden"|role="listbox"/);
  const ref = React.createRef(), defaultValue = ['模型/α'], wrapper = Select({ multiple: true, defaultValue, ref, children: options }), node = native(wrapper.type(wrapper.props));
  assert.equal(node.props.ref, ref); assert.equal(node.props.defaultValue, defaultValue); assert.equal(node.props.value, undefined); assert.equal(node.props.children, options);
});

test('Badge keeps all six distinctions and text without inferred status; Card keeps direct native children and refs', () => {
  const { Badge, badgeVariants } = ui('badge');
  for (const variant of ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link']) {
    const html = markup(Badge, { variant, children: 'off' }); assert.match(html, new RegExp('aui-badge-' + variant)); assert.match(badgeVariants({ variant, className: 'caller' }), /caller/);
    assert.match(html, /data-size="md"/); assert.match(html, />off<\/span>/); assert.doesNotMatch(html, /ui-bdgc__dot|role="status"/);
  }
  const { Card, CardHeader, CardTitle, CardDescription } = ui('card');
  const header = CardHeader({ children: [h(CardTitle, { key: 1 }, 'Settings'), h(CardDescription, { key: 2 }, 'Description')] });
  assert.equal(native(header).props.children.length, 2);
  const html = markup(Card, { children: header }); assert.match(html, /<h2[^>]*>Settings<\/h2>/); assert.match(html, /<p[^>]*>Description<\/p>/); assert.doesNotMatch(html, /ui-crdc__titles|data-interactive|tabindex|role="button"/);
  for (const Component of [Card, CardHeader, CardTitle, CardDescription]) { const ref = React.createRef(), tree = Component({ ref, children: 'Text' }); assert.equal(Component === Card ? tree.props.ref : native(tree).props.ref, ref); }
});

test('Separator/ButtonGroup preserve orientation, decorative semantics, native refs and Slot', () => {
  const { Separator } = ui('separator'), { ButtonGroup, ButtonGroupText, ButtonGroupSeparator, buttonGroupVariants } = ui('button-group');
  assert.match(markup(Separator, {}), /role="none"/); assert.match(markup(Separator, { orientation: 'vertical', decorative: false }), /data-orientation="vertical"[^>]*role="separator"[^>]*aria-orientation="vertical"/);
  const ref = React.createRef(), tree = Separator({ ref, orientation: 'vertical' }); assert.equal(native(tree.type(tree.props)).props.ref, ref);
  assert.match(markup(ButtonGroup, { orientation: 'vertical', children: h(ButtonGroupSeparator) }), /role="group"[^>]*data-orientation="vertical"/);
  assert.match(markup(ButtonGroupText, { asChild: true, children: h('span', {}, 'Count') }), /<span[^>]*>Count<\/span>/); assert.match(buttonGroupVariants({ orientation: 'vertical' }), /flex-col/);
});

test('compound wrappers retain real Radix owners/refs/callbacks, default offsets, forceMount and a single controller', () => {
  const radix = require('radix-ui'), dialog = ui('dialog'), menu = ui('dropdown-menu'), tooltip = ui('tooltip'), sheet = ui('sheet');
  const ref = React.createRef(), callbacks = { onOpenAutoFocus() {}, onCloseAutoFocus() {}, onEscapeKeyDown() {}, onInteractOutside() {}, onPointerDownOutside() {} };
  for (const [Component, Owner, Portal, visual, offset] of [[dialog.DialogContent, radix.Dialog.Content, radix.Dialog.Portal, 'aui-dialog-content'], [menu.DropdownMenuContent, radix.DropdownMenu.Content, radix.DropdownMenu.Portal, 'aui-menu-content', 6], [tooltip.TooltipContent, radix.Tooltip.Content, radix.Tooltip.Portal, 'aui-tooltip-content', 0], [sheet.SheetContent, radix.Dialog.Content, radix.Dialog.Portal, 'aui-dialog-content']]) {
    const tree = Component({ ...callbacks, ref, forceMount: true, className: 'caller', children: 'Panel' }), nodes = elements(tree), content = nodes.find(node => node.type === Owner);
    assert.ok(content); assert.match(content.props.className, new RegExp(visual)); assert.match(content.props.className, /caller/);
    for (const [key, value] of Object.entries({ ...callbacks, ref, forceMount: true })) assert.equal(content.props[key], value);
    if (offset !== undefined) assert.equal(content.props.sideOffset, offset);
    assert.equal(nodes.find(node => node.type === Portal || node.type === dialog.DialogPortal).props.forceMount, true);
    assert.equal(nodes.filter(node => node.type === Owner).length, 1);
    assert.ok(nodes.every(node => node.type !== vendor('dialog').Dialog && node.type !== vendor('dropdown-menu').DropdownMenu && node.type !== vendor('tooltip').Tooltip));
  }
  assert.equal(elements(dialog.DialogContent({})).filter(node => node.type === radix.Dialog.Close).length, 1);
  assert.equal(elements(dialog.DialogContent({ showCloseButton: false })).filter(node => node.type === radix.Dialog.Close).length, 0);
  assert.equal(elements(dialog.DialogFooter({})).filter(node => node.type === radix.Dialog.Close).length, 0);
  assert.equal(find(dialog.DialogFooter({ showCloseButton: true }), node => node.type === radix.Dialog.Close).props.asChild, true);
  assert.equal(tooltip.TooltipProvider({}).props.delayDuration, 0); assert.equal(tooltip.TooltipProvider({ delayDuration: 250 }).props.delayDuration, 250);
  const openChange = () => {}, radioChange = () => {};
  assert.equal(dialog.Dialog({ open: false, modal: false, onOpenChange: openChange }).props.onOpenChange, openChange);
  assert.equal(menu.DropdownMenuRadioGroup({ value: '', onValueChange: radioChange }).props.onValueChange, radioChange);
  const item = menu.DropdownMenuRadioItem({ value: '模型/α', disabled: true, textValue: 'Unicode', ref, children: 'Unicode' });
  assert.equal(item.type, radix.DropdownMenu.RadioItem); assert.equal(item.props.value, '模型/α'); assert.equal(item.props.disabled, true); assert.equal(item.props.ref, ref); assert.equal(elements(item).filter(node => node.type === radix.DropdownMenu.ItemIndicator).length, 1);
  const tip = tooltip.TooltipContent({ sideOffset: 12, children: 'Help' }); assert.equal(find(tip, node => node.type === radix.Tooltip.Content).props.sideOffset, 12); assert.equal(elements(tip).filter(node => node.type === radix.Tooltip.Arrow).length, 1);
  assert.equal(sheet.Sheet, radix.Dialog.Root); assert.equal(sheet.SheetClose, radix.Dialog.Close);
});

test('menu and tooltip portals receive one slottable content element, with styles outside the installed Radix slot', () => {
  const radix=require('radix-ui');
  for(const [Component,Portal,Content] of [[ui('dropdown-menu').DropdownMenuContent,radix.DropdownMenu.Portal,radix.DropdownMenu.Content],[ui('tooltip').TooltipContent,radix.Tooltip.Portal,radix.Tooltip.Content]]){
    const tree=Component({children:'Visible content'}),portal=find(tree,node=>node.type===Portal);
    assert.equal(React.Children.only(portal.props.children).type,Content,'Installed Radix Portal uses Primitive.div asChild and rejects style/content siblings');
  }
});

test('Switch preserves Radix false/name/value/ref/callback and native form participation', () => {
  const { Switch } = ui('switch'), radix = require('radix-ui'), ref = React.createRef(), changes = [], onCheckedChange = value => changes.push(value);
  const tree = Switch({ checked: false, defaultChecked: false, onCheckedChange, ref, name: 'search', value: 'yes', disabled: true, id: 'ws-enabled' }), owner = find(tree, node => node.type === radix.Switch.Root);
  for (const [key, value] of Object.entries({ checked: false, defaultChecked: false, onCheckedChange, ref, name: 'search', value: 'yes', disabled: true })) assert.equal(owner.props[key], value);
  const html = markup('form', { children: [h('label', { key: 1, htmlFor: 'ws-enabled' }, 'Web search'), h(Switch, { key: 2, id: 'ws-enabled', checked: false, onCheckedChange, name: 'search', value: 'yes' })] });
  assert.equal((html.match(/role="switch"/g) || []).length, 1); assert.match(html, /aria-checked="false"/); assert.match(html, /name="search"/); assert.match(html, /type="checkbox"/); assert.deepEqual(changes, []);
});

test('actual AgentSection/ConfigPage/ChipList production owners render the adopted native fields, form and false switch', () => {
  const draft = config.emptyConfig(); draft.runUsdLimit = 0; draft.defaultModel = ''; draft.webSearch.enabled = false;
  const callerLoad = modules({ overrides: { '@/lib/admin-config.mjs': config, 'next/navigation': { usePathname: () => '/admin/agent', useRouter: () => ({ push() {}, refresh() {} }) }, './use-admin': { useAdminClient:()=>async()=>({ok:true,data:null}), useAdminConfig: () => ({ draft, base: { revision: 2, effective: {} }, errors: {}, result: null, dirty: true, saving: false, reload() {}, update() {}, save() {} }), ResultState: () => null, useAdminResource: () => ({ data: null }) } } });
  const { AgentSection, WebSearchSection } = callerLoad('src/components/admin/config-sections.tsx');
  const { AdminShell } = callerLoad('src/components/admin/admin-shell.tsx');
  const html = markup(AdminShell, { email: 'preview@example.invalid', children: h(AgentSection) });
  assert.match(html, /<form/); assert.match(html, /type="submit"[^>]*>.*Save changes/s); assert.match(html, /aui-native-input/); assert.match(html, /aui-native-select/); assert.match(html, /type="number"[^>]*min="0"[^>]*max="10"[^>]*step="0.01"[^>]*value="0"/); assert.match(html, /<option value="" selected="">Server default/); assert.match(html, /type="button"[^>]*>.*Add/s);
  const search = markup(AdminShell, { email: 'preview@example.invalid', activePath: '/admin/web-search', children: h(WebSearchSection) }); assert.match(search, /id="ws-enabled"/); assert.match(search, /aria-checked="false"/);
});

test('Button native ref composition supports callback cleanup, legacy callback and object reset; events stay original', () => {
  for (const mode of ['cleanup', 'callback', 'object']) {
    const hooks = hookHarness(), env = motionEnvironment(), local = modules({ react: hooks.react, globals: env.globals }), { Button } = local('src/components/ui/button.tsx'), calls = [];
    const ref = mode === 'object' ? { current: null } : node => { calls.push(node); if (mode === 'cleanup') return () => calls.push('cleaned'); };
    const event = { currentTarget: {} }; let received;
    const wrapper = Button({ ref, onClick: value => received = value, children: 'Save' }), node = native(hooks.render(wrapper.type, wrapper.props)), button = { getBoundingClientRect: () => ({ width: 50 }) }, cleanup = node.props.ref(button);
    if (mode === 'object') assert.equal(ref.current, button); else assert.equal(calls[0], button);
    hooks.flush(); node.props.onClick(event); assert.equal(received, event); cleanup(); hooks.unmount();
    if (mode === 'object') assert.equal(ref.current, null); else assert.equal(calls[1], mode === 'cleanup' ? 'cleaned' : null);
    assert.equal(env.listeners.size, 0); assert.equal(env.observers.size, 0);
  }
});

test('Button morph obeys OS/app reduction and cancels active animations on preference changes/unmount', () => {
  for (const reduction of ['app', 'os', 'none']) {
    const hooks = hookHarness(), env = motionEnvironment(), local = modules({ react: hooks.react, globals: env.globals });
    if (reduction === 'app') env.document.documentElement.dataset.motion = 'reduce'; if (reduction === 'os') env.media.matches = true;
    const { Button } = local('src/components/ui/button.tsx'); let width = 50; const animations = [];
    const button = { getBoundingClientRect: () => ({ width }), animate() { const animation = { cancelled: 0, cancel() { this.cancelled++; } }; animations.push(animation); return animation; } };
    const render = children => { const wrapper = Button({ children }); return native(hooks.render(wrapper.type, wrapper.props)); };
    const cleanup = render('Save').props.ref(button); hooks.flush(); width = 100; render('Saving changes'); hooks.flush();
    assert.equal(animations.length, reduction === 'none' ? 1 : 0);
    if (reduction === 'none') {
      env.app('reduce'); assert.equal(animations[0].cancelled, 1); env.app('normal'); width = 120; render('Saved changes'); hooks.flush();
      assert.equal(animations.length, 2); env.os(true); assert.equal(animations[1].cancelled, 1); env.os(false); width = 140; render('All changes saved'); hooks.flush();
      assert.equal(animations.length, 3); hooks.unmount(); assert.equal(animations[2].cancelled, 1);
    } else hooks.unmount();
    cleanup(); assert.equal(env.listeners.size, 0); assert.equal(env.observers.size, 0);
  }
});

test('SegmentedControl explicitly reveals instantly for OS/app reduction and interrupts an active smooth reveal', () => {
  for (const reduction of ['app', 'os', 'none']) {
    const hooks = hookHarness(), env = motionEnvironment(), local = modules({ react: hooks.react, globals: env.globals });
    if (reduction === 'app') env.document.documentElement.dataset.motion = 'reduce'; if (reduction === 'os') env.media.matches = true;
    const { SegmentedControl } = local('src/components/vendor/affectui/segmented-control-clean.tsx'), options = [{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }], scrolls = []; let value = 'light';
    const style = () => ({ setProperty() {} }), buttons = options.map((option, i) => ({ value: option.value, style: style(), firstElementChild: { offsetWidth: 50 }, offsetWidth: 70, offsetLeft: i * 70, focus() {} }));
    const nodes = { root: { toggleAttribute() {}, setAttribute() {}, removeAttribute() {} }, scroller: { scrollWidth: 240, clientWidth: 100, scrollLeft: 20, style: style(), scrollTo(options) { scrolls.push({ ...options }); } }, track: { clientWidth: 240, offsetLeft: 0, style: style(), querySelectorAll: () => buttons, querySelector: () => buttons.find(button => button.value === value), contains: () => false }, pill: { style: style(), dataset: {}, offsetWidth: 70 } };
    function render(next) {
      value = next; const tree = hooks.render(SegmentedControl, { options, value, variant: 'tray', kind: 'radio' });
      for (const node of elements(tree)) { const { ref, className } = node.props; if (ref && className) { const key = className.includes('ui-segc__scroll') ? 'scroller' : className === 'ui-segc__track' ? 'track' : className === 'ui-segc__pill' ? 'pill' : className.split(' ').includes('ui-segc') ? 'root' : null; if (key) ref.current = nodes[key]; } }
      hooks.flush();
    }
    render('light'); render('dark'); assert.equal(scrolls.at(-1).behavior, reduction === 'none' ? 'smooth' : 'instant');
    if (reduction === 'none') { env.app('reduce'); assert.deepEqual(scrolls.slice(-2).map(scroll => scroll.behavior), ['instant', 'instant']); assert.equal(scrolls.at(-2).left, nodes.scroller.scrollLeft); assert.equal(env.timers.size, 1); }
    hooks.unmount(); assert.equal(env.listeners.size, 0); assert.equal(env.observers.size, 0); assert.equal(env.timers.size, 0);
  }
});
