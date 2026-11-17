import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
import * as settingsNavigation from '../src/components/settings-navigation.mjs';
import { filterSettingsSections, modelIdentity, settingsSections } from '../src/components/settings-navigation.mjs';

test('settings search retains actual section order and filters by all entered terms', () => {
  assert.deepEqual(filterSettingsSections('  '), settingsSections);
  assert.deepEqual(filterSettingsSections(' PERSONAL ').map(item => item.id), ['account', 'general', 'appearance', 'permissions', 'data']);
  assert.deepEqual(filterSettingsSections('workspace model').map(item => item.id), ['models']);
  assert.deepEqual(filterSettingsSections('sign in security').map(item => item.id), ['account']);
  assert.deepEqual(filterSettingsSections('model security'), []);
  assert.deepEqual(filterSettingsSections('team invitations'), []);
});

test('settings groups contain only the supported individual sections', () => {
  assert.deepEqual(settingsSections.map(item => [item.id, item.group]), [
    ['account', 'Personal'], ['general', 'Personal'], ['appearance', 'Personal'], ['permissions', 'Personal'], ['data', 'Personal'],
    ['models', 'Workspace'], ['revit', 'Workspace'], ['usage', 'Workspace'], ['billing', 'Workspace'], ['capabilities', 'Workspace'],
  ]);
});

test('Data & privacy is a Personal section that search finds by retention, delete and privacy', () => {
  assert.ok(settingsSections.some(item => item.id === 'data' && item.group === 'Personal'));
  for (const term of ['retention', 'delete', 'privacy']) assert.ok(filterSettingsSections(term).some(item => item.id === 'data'), term);
});

test('the Data page states the verified retention facts and adds no actions', () => {
  const exports = {};
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/data-settings.tsx', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports, require: name => name === 'react/jsx-runtime' ? jsxRuntime : { default: {} } });
  const walk = node => (React.isValidElement(node) ? [node, ...React.Children.toArray(node.props.children).flatMap(walk)] : []);
  const nodes = walk(exports.DataSettings());
  const copy = nodes.flatMap(n => React.Children.toArray(n.props.children).filter(c => typeof c === 'string')).join(' ');
  assert.deepEqual(nodes.filter(n => n.type === 'h2').map(n => n.props.children),
    ['What we keep', 'How long', 'Share links', 'Deleting or exporting a chat', 'Revit']);
  assert.match(copy, /180 days/);
  assert.match(copy, /30 days/);
  assert.match(copy, /never changes your Revit model without your exact approval/);
  assert.equal(nodes.filter(n => n.type === 'button' || n.type === 'a').length, 0);
});

test('model identity preserves reported names and never guesses a provider', () => {
  assert.deepEqual(modelIdentity('openai/gpt-5.1'), { provider: 'openai', name: 'gpt-5.1' });
  assert.deepEqual(modelIdentity('hosted/vendor/model'), { provider: 'hosted', name: 'vendor/model' });
  for (const name of ['gpt-5.1', '/unnamed', 'provider/', '']) assert.deepEqual(modelIdentity(name), { provider: null, name });
});

test('Settings focuses on open, honors named destinations once and preserves later navigation', () => {
  const slots=[],dependencies=[],effects=[],focused=[];
  let cursor=0,effectCursor=0;
  const hooks={...React,useId:()=> 'settings-navigation',useRef:initial=>{
    const slot=cursor++;return slots[slot]??={current:initial};
  },useState:initial=>{
    const slot=cursor++;if(!(slot in slots))slots[slot]=initial;
    return [slots[slot],next=>{slots[slot]=typeof next==='function'?next(slots[slot]):next;}];
  },useLayoutEffect:(effect,next)=>{
    const slot=effectCursor++,previous=dependencies[slot];
    if(!previous||next.some((value,index)=>!Object.is(value,previous[index])))effects.push(effect);
    dependencies[slot]=next;
  }};
  const exports={};
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/desktop-settings.tsx',import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
  }).outputText,{exports,require(name){
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return jsxRuntime;
    if(name==='./settings-navigation.mjs')return settingsNavigation;
    if(name.endsWith('.module.css'))return {default:{}};
    if(name==='./ui/button')return {Button:'button'};
    return new Proxy({},{get:()=>()=>null});
  }});
  function attachRefs(tree){
    if(!React.isValidElement(tree))return;
    if(tree.props.ref)tree.props.ref.current={scrollTop:90,focus:()=>focused.push(tree.type)};
    React.Children.forEach(tree.props.children,attachRefs);
  }
  function render(open,sectionRequest){
    cursor=0;effectCursor=0;
    const tree=exports.DesktopSettings({open,sectionRequest,onOpenChange(){}});
    attachRefs(tree);
    effects.splice(0).forEach(effect=>effect());
    return tree;
  }
  render(false);
  assert.deepEqual(focused,[]);
  render(true);
  assert.deepEqual(focused,['h1'],'Keyboard entry lands on the current section heading');
  render(false);render(true);
  assert.deepEqual(focused,['h1','h1'],'Reopening the same section restores a usable focus target');
  const all=tree=>React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(all)]:[];
  const words=tree=>React.isValidElement(tree)?React.Children.toArray(tree.props.children).map(words).join(' '):String(tree??'');
  const title=tree=>all(tree).find(node=>node.type==='h1').props.children;
  const request={id:'capabilities',revision:1};render(true,request);
  let tree=render(true,request);assert.equal(title(tree),'Capabilities');
  all(tree).find(node=>node.type==='button'&&words(node).trim()==='Models').props.onClick();
  tree=render(true,request);assert.equal(title(tree),'Models');
  render(false,request);tree=render(true,request);assert.equal(title(tree),'Models','Consumed destination does not override subsequent user navigation');
  const next={id:'capabilities',revision:2};render(true,next);assert.equal(title(render(true,next)),'Capabilities');
  const invalid={id:'unknown',revision:3};render(true,invalid);assert.equal(title(render(true,invalid)),'Capabilities');
});

test('pricing has one shared details disclosure while paid plans stay unavailable', () => {
  const slots=[];let cursor=0;
  const exports={};
  const hooks={...React,useId:()=> 'plan-details',useState(initial){const index=cursor++;if(!(index in slots))slots[index]=initial;return [slots[index],next=>{slots[index]=typeof next==='function'?next(slots[index]):next;}];}};
  runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/billing/pricing-plans.tsx',import.meta.url),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
  }).outputText,{exports,require(name){
    if(name==='react')return hooks;
    if(name==='react/jsx-runtime')return jsxRuntime;
    if(name.endsWith('.module.css'))return {default:{}};
    if(name==='next/link')return {default:'a'};
    return new Proxy({},{get:()=>()=>null});
  }});
  const all=tree=>React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(all)]:[];
  const words=tree=>React.isValidElement(tree)?React.Children.toArray(tree.props.children).map(words).join(' '):String(tree??'');
  const render=(embedded=false)=>{cursor=0;return exports.PricingPlans({embedded});};
  let tree=render(),nodes=all(tree);
  const panels=()=>nodes.filter(node=>node.props.id?.startsWith('plan-details-'));
  const toggle=()=>nodes.find(node=>node.type==='button'&&typeof node.props['aria-expanded']==='boolean');
  assert.equal(panels().length,3);
  assert.equal(panels().every(node=>node.props.hidden===false),true);
  assert.equal(toggle().props['aria-controls'],'plan-details-Free plan-details-Pro plan-details-Max');
  toggle().props.onClick();nodes=all(render());
  assert.equal(panels().every(node=>node.props.hidden===true),true);
  assert.equal(toggle().props['aria-expanded'],false);
  toggle().props.onClick();nodes=all(render());
  assert.equal(panels().every(node=>node.props.hidden===false),true);
  assert.equal(nodes.filter(node=>node.type==='button'&&node.props.disabled===true).length,2);
  assert.match(words(tree),/Free/);assert.match(words(tree),/20/);assert.match(words(tree),/99/);
  assert.doesNotMatch(words(tree),/yearly|annual|checkout now/i);
  assert.match(words(render(true)),/Your current plan/);
  assert.equal(nodes.find(node=>node.props.href==='/').props.children[0],'Start with Free');
});

test('profile editor stays mounted and inaccessible across section changes and Settings close',()=>{
 const slots=[];let cursor=0;const hooks={...React,useId:()=> 'nav',useLayoutEffect:()=>{},useRef:value=>{const i=cursor++;return slots[i]??={current:value};},useState:initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;}];}};
 const exports={};
 runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/desktop-settings.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require(name){
  if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsxRuntime;if(name==='./settings-navigation.mjs')return settingsNavigation;
  if(name==='./onboarding/account-onboarding')return {AccountProfileEditor:'profile-editor'};
  if(name==='@clerk/nextjs')return {Show:'clerk-show',SignInButton:'sign-in',UserButton:'user-button'};
  if(name.endsWith('.module.css'))return {default:{}};if(name==='./ui/button')return {Button:'button'};
  return new Proxy({},{get:()=>()=>null});
 }});
 const all=tree=>React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(all)]:[];
 const render=open=>{cursor=0;return exports.DesktopSettings({open,onOpenChange(){},authConfigured:true});};
 let tree=render(true);assert.equal(all(tree).some(node=>node.type==='profile-editor'),false);
 all(tree).find(node=>node.type==='button'&&node.props.children?.[1]?.props?.children==='Profile & account').props.onClick();
 tree=render(true);const editor=all(tree).find(node=>node.type==='profile-editor');assert.ok(editor);
 all(tree).find(node=>node.type==='button'&&node.props.children?.[1]?.props?.children==='Preferences').props.onClick();
 tree=render(true);assert.ok(all(tree).find(node=>node.type==='profile-editor'));
 const profile=all(tree).find(node=>node.props.className==='provider-section'&&node.props.hidden===true);
 assert.ok(profile);assert.equal(profile.props.inert,true);
 tree=render(false);assert.equal(tree.props.hidden,true);assert.equal(tree.props.inert,true);assert.ok(all(tree).find(node=>node.type==='profile-editor'));
 tree=render(true);assert.ok(all(tree).find(node=>node.type==='profile-editor'));
});
