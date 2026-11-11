import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceSeen,isUnread} from '../src/lib/chat-seen.mjs';

// @lat: [[contracts#Hosted contract tests#Unread chats]]
test('a chat that settles while another is open becomes unread; opening it clears that',()=>{
  let seen=advanceSeen({},[{id:'a',taskVersion:3},{id:'b',taskVersion:1}],'b');
  assert.deepEqual(seen,{a:3,b:1});
  const settled={id:'a',status:'completed',taskVersion:5};
  assert.equal(isUnread({...settled,status:'running'},seen,'b'),false);
  assert.equal(isUnread(settled,seen,'b'),true);
  assert.equal(isUnread(settled,seen,'a'),false);
  seen=advanceSeen(seen,[settled],'a');
  assert.equal(isUnread(settled,seen,'b'),false);
});

test('first sight never marks old chats unread and unchanged input keeps the same object',()=>{
  const seen={a:1};
  assert.equal(advanceSeen(seen,[{id:'a',taskVersion:1}],'z'),seen);
  assert.equal(isUnread({id:'new',status:'completed',taskVersion:9},seen,'z'),false);
});
