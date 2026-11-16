import test from 'node:test';
import assert from 'node:assert/strict';
import {filterSidebarChats,pinnedChats,recentChats} from '../src/lib/sidebar-history.mjs';

// @lat: [[contracts#Hosted contract tests#Browser sidebar history]]
test('Studio history shows hosted project chats without desktop project groups',()=>{
  const filteredChats=[{id:'newest',projectId:'inbox'},{id:'project-chat',projectId:'project'},{id:'pinned-chat',projectId:'project',pinned_at:'2026-10-24'},{id:'legacy'}];
  for(const desktopAvailable of [false,true]){
    const defaultProject=desktopAvailable?{id:'inbox'}:undefined;
    assert.deepEqual(Array.from(recentChats(filteredChats,desktopAvailable,defaultProject),row=>row.id),desktopAvailable?['newest','legacy']:['newest','project-chat','legacy']);
    assert.deepEqual(Array.from(pinnedChats(filteredChats),row=>row.id),['pinned-chat']);
  }
});

test('hosted project groups keep chats of unlisted projects in Recent',()=>{
  const chats=[{id:'grouped',projectId:'p1'},{id:'orphan',projectId:'gone'},{id:'plain'}];
  assert.deepEqual(Array.from(recentChats(chats,true,undefined,new Set(['p1'])),row=>row.id),['orphan','plain']);
});

test('pinned/default/unknown project chats stay reachable exactly once',()=>{
  const chats=[{id:'pinned',projectId:'p1',pinned_at:'today'},{id:'pinned',projectId:'p1',pinned_at:'today'},
    {id:'default',projectId:'default'},{id:'orphan',projectId:'gone'},{id:'plain'}];
  assert.deepEqual(pinnedChats(chats).map(row=>row.id),['pinned']);
  assert.deepEqual(recentChats(chats,true,{id:'default'},new Set(['p1','default'])).map(row=>row.id),['default','orphan','plain']);
});

test('title/project search includes collapsed-project records and Unicode without mutating loaded records',()=>{
  const title='東京 BIM — '+ 'Long project '.repeat(30);
  const projects=[{id:'p1',title}];
  const chats=[{id:'a',projectId:'p1',title:'楼层计划'},{id:'b',title:'ENTRY plan'},{id:'c',projectId:'deleted',title:'Unlisted project'}];
  assert.deepEqual(filterSidebarChats(chats,projects,' 東京 bim ').map(row=>row.id),['a']);
  assert.deepEqual(filterSidebarChats(chats,projects,'entry').map(row=>row.id),['b']);
  assert.deepEqual(filterSidebarChats(chats,projects,'楼层').map(row=>row.id),['a']);
  assert.deepEqual(filterSidebarChats(chats,projects,'no match'),[]);
  assert.deepEqual(filterSidebarChats(chats,projects,''),chats);
  assert.equal(projects[0].title,title);
});
