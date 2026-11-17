import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATTACHMENT_LIMITS, addAttachments, attachmentError, kindOf, markError, markReady,
  removeAttachment, validateAttachments,
} from '../src/lib/composer-attachments.mjs';
import {featureEnabled, parseCapabilities} from '../src/lib/capabilities.mjs';

const file = (name, type, size = 1000) => ({name, type, size});

test('kinds and limits', () => {
  assert.equal(kindOf(file('a.jpg', 'image/jpeg')), 'image');
  assert.equal(kindOf(file('a.png', 'image/png')), 'image');
  assert.equal(kindOf(file('a.webp', 'image/webp')), 'image');
  assert.equal(kindOf(file('a.gif', 'image/gif')), 'unsupported');
  assert.equal(kindOf(file('a.pdf', 'application/pdf')), 'unsupported');
  assert.equal(ATTACHMENT_LIMITS.maxImages, 4);
  assert.equal(ATTACHMENT_LIMITS.maxRawBytes, 1500000);
});

test('validateAttachments accepts up to four images and explains the rest', () => {
  const files = [file('1.jpg', 'image/jpeg'), file('2.pdf', 'application/pdf'),
    file('3.png', 'image/png'), file('4.png', 'image/png'), file('5.png', 'image/png'),
    file('6.png', 'image/png')];
  const result = validateAttachments([], files);
  assert.deepEqual(result.accepted.map(f => f.name), ['1.jpg', '3.png', '4.png', '5.png']);
  assert.deepEqual(result.errors.map(e => e.reason), ['unsupported', 'too_many']);
  const more = validateAttachments([{id: 'x', state: 'ready'}], [file('a.png', 'image/png')]);
  assert.equal(more.accepted.length, 1);
  const full = validateAttachments(
    Array.from({length: 4}, (_, i) => ({id: 'x' + i, state: 'ready'})),
    [file('a.png', 'image/png')]);
  assert.equal(full.accepted.length, 0);
  assert.equal(full.errors[0].reason, 'too_many');
  // A failed chip does not count against the limit.
  const room = validateAttachments(
    Array.from({length: 4}, (_, i) => ({id: 'x' + i, state: i ? 'ready' : 'error'})),
    [file('a.png', 'image/png')]);
  assert.equal(room.accepted.length, 1);
});

test('state transitions: reading, ready, error, remove', () => {
  let list = addAttachments([], [{id: 'a', name: 'site.jpg', size: 10}]);
  assert.deepEqual(list, [{id: 'a', name: 'site.jpg', size: 10, state: 'reading'}]);
  list = markReady(list, 'a', {url: 'blob:x', size: 5});
  assert.equal(list[0].state, 'ready');
  assert.equal(list[0].url, 'blob:x');
  list = markError(list, 'a', 'too_large');
  assert.equal(list[0].state, 'error');
  assert.equal(list[0].reason, 'too_large');
  assert.deepEqual(markReady(list, 'zzz', {}), list);
  assert.deepEqual(removeAttachment(list, 'a'), []);
});

test('error copy names the file and the reason', () => {
  assert.equal(attachmentError('site.jpg', 'unsupported'),
    'Couldn’t read site.jpg: only JPEG, PNG and WebP images are supported.');
  assert.match(attachmentError('a.png', 'too_large'), /too large/);
  assert.match(attachmentError('a.png', 'too_many'), /4 images/);
  assert.match(attachmentError('a.png', 'unreadable'), /Couldn’t read a\.png/);
  assert.match(attachmentError('a.png', 'weird'), /Couldn’t read a\.png/);
});

// @lat: [[contracts#Hosted contract tests#Composer attachments gate]]
test('attachments feature is off unless the backend says on', () => {
  assert.equal(featureEnabled(parseCapabilities(undefined), 'attachments'), false);
  const v1 = features => ({capabilities: {version: 1, features}});
  assert.equal(featureEnabled(parseCapabilities(v1({})), 'attachments'), false);
  assert.equal(featureEnabled(parseCapabilities(v1({attachments: false})), 'attachments'), false);
  assert.equal(featureEnabled(parseCapabilities(v1({attachments: true})), 'attachments'), true);
});
