import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';
import {shareToken,shareUrl,sharedView,svgDataUri,validToken} from '../src/lib/share.mjs';

function shareHarness() {
 const slots=[],pending=[],requests=[],clipboard=[],unsupported=[];let cursor=0,changed=false;
 const hooks={useRef(initial){const i=cursor++;return slots[i]??={current:initial};},useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return[slots[i],next=>{slots[i]=typeof next==='function'?next(slots[i]):next;changed=true;}];},useEffect(setup,deps){const i=cursor++,old=slots[i];if(!old||deps.some((value,j)=>!Object.is(value,old.deps[j])))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:setup()};});}};
 const exports={};const code=ts.transpileModule(readFileSync(new URL('../src/components/workspace/share-dialog.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 runInNewContext(code,{exports,window:{location:{origin:'https://datumm.test'}},navigator:{clipboard:{writeText:value=>new Promise(resolve=>clipboard.push({value,resolve}))}},require(name){if(name==='react')return hooks;if(name==='react/jsx-runtime')return jsx;if(name==='@/lib/share.mjs')return{shareToken,shareUrl};if(name==='./use-workspace-state')return{api:(path,method='GET')=>new Promise((resolve,reject)=>requests.push({path,method,resolve,reject})),notSupported:failure=>failure.unsupported===true};return new Proxy({},{get:(_,key)=>String(key)});}});
 return{requests,clipboard,unsupported,render(taskId){let tree,count=0;do{cursor=0;changed=false;tree=exports.ShareDialog({taskId,opener:{current:null},onClose(){},onUnsupported:()=>unsupported.push(taskId)});pending.splice(0).forEach(fn=>fn());if(++count>10)throw Error('render loop');}while(changed);return tree;},unmount(){slots.forEach(slot=>slot?.cleanup?.());}};
}
const shareNodes=tree=>React.isValidElement(tree)?[tree,...React.Children.toArray(tree.props.children).flatMap(shareNodes)]:[];
const shareText=tree=>typeof tree==='string'?tree:React.isValidElement(tree)?React.Children.toArray(tree.props.children).map(shareText).join(''):'';
const shareClick=(tree,label)=>shareNodes(tree).find(node=>node.type==='Button'&&shareText(node).trim()===label||node.props?.['aria-label']===label).props.onClick();
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('actual parent keys task-owned sharing by account/task scope epoch',()=>{
 const source=readFileSync(new URL('../src/components/workspace.tsx',import.meta.url),'utf8');
 const ast=ts.createSourceFile('workspace.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let expression;
 function visit(node){if(ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==='ShareButton')expression=node.attributes.properties.find(attr=>attr.name?.getText(ast)==='key').initializer.expression;ts.forEachChild(node,visit);}visit(ast);assert.ok(expression);
 const exports={};runInNewContext(ts.transpileModule(`exports.key=scope=>${expression.getText(ast)}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{exports});
 assert.notEqual(exports.key({key:'account-A-task-A',epoch:1}),exports.key({key:'account-A-task-B',epoch:2}));
 assert.notEqual(exports.key({key:'account-A-task-A',epoch:1}),exports.key({key:'account-A-task-A',epoch:3}));
 assert.notEqual(exports.key({key:'account-A-task-A',epoch:1}),exports.key({key:'account-B-task-A',epoch:1}));
});

test('web header keeps context and the chat/work area divider remains draggable',()=>{
 const source=readFileSync(new URL('../src/components/workspace.tsx',import.meta.url),'utf8');
 const start=source.indexOf('<header className="studio-artifact-header">');
 const header=source.slice(start,source.indexOf('</header>',start));
 assert.doesNotMatch(header,/ShareButton|studio-status|studio-connection|studio-review-primary/);
 assert.match(source,/<PanelResize side="right" label="chat and work area"/);
 const sidebar=readFileSync(new URL('../src/components/workspace/sidebar.tsx',import.meta.url),'utf8');
 assert.doesNotMatch(sidebar,/PanelResize/);
});

test('scope-keyed share mounts isolate late A1 creation from B2 and fresh A3',async()=>{
 const a1=shareHarness();let tree=a1.render('A');a1.requests.shift().resolve({token:null});await settle();tree=a1.render('A');shareClick(tree,'Create link');const pending=a1.requests.shift();assert.equal(pending.path,'tasks/A/share');assert.equal(pending.method,'POST');
 a1.unmount();const b2=shareHarness();b2.render('B');b2.unmount();const a3=shareHarness();tree=a3.render('A');a3.requests.shift().resolve({token:null});await settle();
 pending.resolve({token:'public-link-for-A-12345'});await settle();tree=a3.render('A');assert.equal(shareNodes(tree).some(node=>node.props['aria-label']==='Share link'),false);
});

test('scope-keyed share mounts isolate pending clipboard and unsupported state',async()=>{
 const a=shareHarness();let tree=a.render('A');a.requests.shift().resolve({token:'public-link-for-A-12345'});await settle();tree=a.render('A');shareClick(tree,'Copy');const pending=a.clipboard.shift();a.unmount();
 const b=shareHarness();tree=b.render('B');pending.resolve();await settle();tree=b.render('B');assert.doesNotMatch(shareText(tree),/Copied|Link copied/);
 b.requests.shift().reject({unsupported:true});await settle();assert.deepEqual(b.unsupported,['B']);b.unmount();
 const c=shareHarness();assert.ok(c.render('C'));assert.deepEqual(c.unsupported,[]);
});

// @lat: [[contracts#Hosted contract tests#Share helpers]]
test('share link, token and data URI',()=>{
 assert.equal(shareUrl('https://x.app','abc_DEF-1234'),'https://x.app/share/abc_DEF-1234');
 assert.equal(shareToken({token:null}),null);
 assert.equal(shareToken({token:'abc_DEF-1234'}),'abc_DEF-1234');
 assert.equal(validToken('../etc'),false);
 assert.ok(svgDataUri('<svg a="b"/>').startsWith('data:image/svg+xml;charset=utf-8,%3Csvg'));
});

test('shared payload is normalised and unsafe parts dropped',()=>{
 const view=sharedView({title:' ',messages:[{role:'user',text:'hi',at:'t'},{role:'x',text:''},{role:'assistant',text:'yo'}],steps:[{title:'A',status:'done'},{}],sources:[{title:'ok',url:'https://a.b'},{title:'bad',url:'javascript:alert(1)'}],plan:{svg:'<div/>'}});
 assert.equal(view.title,'Shared chat');
 assert.deepEqual(view.messages.map(m=>m.role),['user','assistant']);
 assert.equal(view.steps.length,1);
 assert.deepEqual(view.sources.map(s=>s.url),['https://a.b']);
 assert.equal(view.svg,null);
 assert.equal(sharedView({plan:{svg:'<svg viewBox="0 0 1 1"/>'}}).svg,'<svg viewBox="0 0 1 1"/>');
 assert.equal(sharedView(null),null);
});


test('share checks finish before mutation; create, copy and stop stay bound to the menu task',async()=>{
 const h=shareHarness();let tree=h.render('other-task');
 const loading=shareNodes(tree).find(node=>node.type==='Button');assert.equal(loading.props.disabled,true);loading.props.onClick();assert.equal(h.requests.length,1);
 const check=h.requests.shift();assert.equal(check.path,'tasks/other-task/share');check.resolve({token:null});await settle();tree=h.render('other-task');
 shareClick(tree,'Create link');let request=h.requests.shift();assert.equal(request.path,'tasks/other-task/share');assert.equal(request.method,'POST');request.resolve({token:'public-other-task-12345'});await settle();tree=h.render('other-task');
 assert.equal(shareNodes(tree).find(node=>node.props['aria-label']==='Share link').props.value,'https://datumm.test/share/public-other-task-12345');
 shareClick(tree,'Copy');const clipboard=h.clipboard.shift();assert.equal(clipboard.value,'https://datumm.test/share/public-other-task-12345');clipboard.resolve();await settle();tree=h.render('other-task');assert.match(shareText(tree),/Copied/);
 shareClick(tree,'Stop sharing');request=h.requests.shift();assert.equal(request.method,'DELETE');assert.equal(request.path,'tasks/other-task/share');request.reject(new Error('offline'));await settle();tree=h.render('other-task');assert.match(shareText(tree),/Could not stop sharing/);assert.ok(shareNodes(tree).find(node=>node.props['aria-label']==='Share link'));
 shareClick(tree,'Stop sharing');h.requests.shift().resolve({});await settle();tree=h.render('other-task');assert.equal(shareNodes(tree).some(node=>node.props['aria-label']==='Share link'),false);
});

test('obsolete GET and clipboard errors cannot close or add errors to a replacement owner',async()=>{
 const h=shareHarness();h.render('a');const check=h.requests.shift();h.unmount();check.reject({unsupported:true});await settle();assert.deepEqual(h.unsupported,[]);
 const next=shareHarness();let tree=next.render('b');next.requests.shift().resolve({token:'public-other-task-12345'});await settle();tree=next.render('b');shareClick(tree,'Copy');const clipboard=next.clipboard.shift();next.unmount();clipboard.resolve();await settle();tree=next.render('b');assert.doesNotMatch(shareText(tree),/Copied/);
});
