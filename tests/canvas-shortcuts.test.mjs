import test from 'node:test';
import assert from 'node:assert/strict';
import { CANVAS_SHORTCUTS, canvasShortcutAction, canvasShortcutTip } from '../src/lib/canvas-shortcuts.mjs';

const press = (key, extra = {}) => canvasShortcutAction({ key, target: { tagName: 'DIV' }, ...extra });

test('each canvas key maps to one action, in either letter case', () => {
  const expected = { v: 'select', h: 'pan', m: 'measure', c: 'comment', f: 'fit', 2: 'view2d', 3: 'view3d', '?': 'help', Escape: 'closeHelp' };
  for (const [key, action] of Object.entries(expected)) assert.equal(press(key), action);
  assert.equal(press('V'), 'select');
  assert.equal(press('F'), 'fit');
  assert.equal(new Set(CANVAS_SHORTCUTS.map((row) => row.key)).size, CANVAS_SHORTCUTS.length);
});

test('unmapped keys, modifiers, repeats and IME composition return null', () => {
  assert.equal(press('x'), null);
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey']) assert.equal(press('c', { [modifier]: true }), null);
  assert.equal(press('v', { repeat: true }), null);
  assert.equal(press('v', { isComposing: true }), null);
  assert.equal(press('?', { shiftKey: true }), 'help', 'Shift is how ? is typed');
});

test('typing targets never trigger shortcuts', () => {
  for (const tagName of ['INPUT', 'input', 'TEXTAREA', 'SELECT']) assert.equal(canvasShortcutAction({ key: 'v', target: { tagName } }), null);
  assert.equal(canvasShortcutAction({ key: 'v', target: { tagName: 'DIV', isContentEditable: true } }), null);
  assert.equal(canvasShortcutAction({ key: 'v', target: { tagName: 'SPAN', closest: () => ({}) } }), null);
  assert.equal(canvasShortcutAction({ key: 'v', target: { tagName: 'SPAN', closest: () => null } }), 'select');
  assert.equal(canvasShortcutAction({ key: 'v' }), 'select', 'no target is not an editable target');
});

test('tooltips name the shortcut', () => {
  assert.equal(canvasShortcutTip('select'), 'Select · V');
  assert.equal(canvasShortcutTip('closeHelp'), 'Close this list · Esc');
  assert.equal(canvasShortcutTip('nope'), '');
});
