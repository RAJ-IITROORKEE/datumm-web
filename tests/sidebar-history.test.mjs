import test from 'node:test';
import assert from 'node:assert/strict';
import {chatChip,filterSidebarChats,groupChatsByDate,pinnedChats,recentChats} from '../src/lib/sidebar-history.mjs';

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

test('date groups use local midnight, keep order, hide empty groups and send bad dates to Older',()=>{
  const now=new Date(2026,10,17,0,30);
  const at=(...parts)=>new Date(...parts).toISOString();
  const chats=[{id:'a',created_at:at(2026,10,17,0,10)},{id:'b',created_at:at(2026,10,16,23,50)},
    {id:'c',created_at:at(2026,10,10,0,0)},{id:'d',created_at:at(2026,10,9,23,59)},{id:'e',created_at:'nonsense'},
    {id:'f'},{id:'g',created_at:at(2026,10,17,0,5)}];
  const groups=groupChatsByDate(chats,now);
  assert.deepEqual(groups.map(g=>[g.label,g.items.map(i=>i.id)]),
    [['Today',['a','g']],['Yesterday',['b']],['Previous 7 days',['c']],['Older',['d','e','f']]]);
  assert.deepEqual(groupChatsByDate([{id:'x',created_at:at(2026,10,17,5)}],now).map(g=>g.label),['Today']);
  assert.deepEqual(groupChatsByDate([],now),[]);
});

test('date groups follow calendar days across a DST change',()=>{
  const zone=process.env.TZ;
  process.env.TZ='America/New_York';// 8 March 2026 is a 23-hour day there
  try{
    const now=new Date(2026,2,9,12);
    const at=(...parts)=>new Date(...parts).toISOString();
    const chats=[{id:'y0',created_at:at(2026,2,8,0,0)},{id:'s',created_at:at(2026,2,7,23,59)},
      {id:'w0',created_at:at(2026,2,2,0,0)},{id:'o',created_at:at(2026,2,1,23,59)}];
    assert.deepEqual(groupChatsByDate(chats,now).map(g=>[g.label,g.items.map(i=>i.id)]),
      [['Yesterday',['y0']],['Previous 7 days',['s','w0']],['Older',['o']]]);
  }finally{
    if(zone===undefined)delete process.env.TZ;else process.env.TZ=zone;
  }
});

const flow=(kind,label='')=>({kind,label});
const task=(status,data={},modelOutcome)=>({status,data,modelOutcome});
test('chat chips: Working for running, Needs attention for answers and failures',()=>{
  assert.equal(chatChip(task('running'),flow('in_progress','Working'),false),'Working');
  assert.equal(chatChip(task('queued'),flow('in_progress','Queued'),false),'Working');
  assert.equal(chatChip(task('needs_input'),flow('needs_input','Waiting for your input'),true),'Needs attention');
  assert.equal(chatChip(task('failed'),flow('needs_input','Stopped at a saved checkpoint'),false),'Needs attention');
  assert.equal(chatChip(task('interrupted'),flow('needs_input','x'),false),'Needs attention');
  assert.equal(chatChip(task('running'),flow('needs_input','Waiting for your input'),true),'Needs attention');
  assert.equal(chatChip(task('completed'),flow('needs_input','Turn settled'),false),null);
  assert.equal(chatChip(task('completed'),flow('ready_review','Design ready'),false),null);
});

test('chat chips: every Revit check state needs attention, verified builds do not',()=>{
  const chip=(data,outcome)=>chatChip(task('completed',data,outcome),flow('needs_input','any label'),false);
  const build=extra=>({native_build:{operationId:'op-1',feedback:{verified:true},...extra}});
  for(const state of ['failed','rolled_back'])assert.equal(chip(build({state})),'Needs attention',state);
  for(const status of ['stale','partial','committed','unknown'])
    assert.equal(chip(build({outcomeReceipt:{status}})),'Needs attention',status);
  assert.equal(chip(build({feedback:{verified:false}})),'Needs attention','unverified feedback');
  assert.equal(chip({},{state:'unknown',verified:false}),'Needs attention','unknown outcome');
  assert.equal(chip(build({outcomeReceipt:{status:'verified'}})),null);
  assert.equal(chip(build()),null);
  assert.equal(chip({},{state:'committed_verified',verified:true}),null);
  assert.equal(chip({native_build:{state:'preview'}}),null);
});
