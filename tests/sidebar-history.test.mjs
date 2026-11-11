import test from 'node:test';
import assert from 'node:assert/strict';
import {pinnedChats,recentChats} from '../src/lib/sidebar-history.mjs';

// @lat: [[contracts#Hosted contract tests#Browser sidebar history]]
test('Studio history shows hosted project chats without desktop project groups',()=>{
  const filteredChats=[{id:'newest',projectId:'inbox'},{id:'project-chat',projectId:'project'},{id:'pinned-chat',projectId:'project',pinned_at:'2026-10-24'},{id:'legacy'}];
  for(const desktopAvailable of [false,true]){
    const defaultProject=desktopAvailable?{id:'inbox'}:undefined;
    assert.deepEqual(Array.from(recentChats(filteredChats,desktopAvailable,defaultProject),row=>row.id),desktopAvailable?['newest','legacy']:['newest','project-chat','legacy']);
    assert.deepEqual(Array.from(pinnedChats(filteredChats),row=>row.id),['pinned-chat']);
  }
});
