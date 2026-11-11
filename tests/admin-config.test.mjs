import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyConfig,validateConfig,sameConfig,normalizeDomain} from '../src/lib/admin-config.mjs';

const skill=(over={})=>({id:'code-review',name:'Review',description:'',instructions:'Be strict.',modes:['ask'],enabled:true,...over});

// @lat: [[contracts#Hosted contract tests#Admin config validation]]
test('admin config validation mirrors the AppConfig bounds',()=>{
  assert.deepEqual(validateConfig(emptyConfig()),{});
  const bad={...emptyConfig(),models:['a'],defaultModel:'b',runUsdLimit:11,parallelChats:6,limits:{agent_tool_calls:101,bogus:1},
    webSearch:{enabled:true,includeDomains:['x'],maxResults:0},
    skills:[skill({id:'Bad Id',instructions:'x'.repeat(4001),modes:[]}),skill(),skill()],
    mcpServers:[{id:'m',name:'M',url:'http://no',enabled:false,toolAllowlist:[]}]};
  const errors=validateConfig(bad);
  for(const key of ['defaultModel','runUsdLimit','parallelChats','limits.agent_tool_calls','limits.bogus','webSearch.includeDomains','webSearch.maxResults','skills.0.id','skills.0.instructions','skills.0.modes','skills.2.id','mcpServers.0.url'])assert.ok(errors[key],key);
  assert.equal(errors['skills.1.id'],undefined);
  assert.deepEqual(validateConfig({...emptyConfig(),skills:[skill()],mcpServers:[{id:'m',name:'M',url:'https://x.io/mcp',enabled:false,toolAllowlist:['t']}],limits:{agent_tool_calls:0}}),{});
});

// @lat: [[contracts#Hosted contract tests#Admin dirty state]]
test('dirty state ignores key order and domains are normalised',()=>{
  assert.equal(sameConfig({a:1,b:{c:2,d:3}},{b:{d:3,c:2},a:1}),true);
  assert.equal(sameConfig({a:[1,2]},{a:[2,1]}),false);
  assert.equal(normalizeDomain(' HTTPS://Example.COM/path?q=1 '),'example.com');
});
