import test from 'node:test';
import assert from 'node:assert/strict';
import {readWorkspaceLayout,effectiveWorkspaceLayout,workspaceScene,storedWorkspaceLayout,resizeWorkspaceLayout} from '../src/lib/workspace-layout.mjs';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';
const store=values=>({getItem:key=>values[key]??null});
test('versioned navigation/chat records take precedence; legacy right migrates as chat width',()=>{
 assert.deepEqual(readWorkspaceLayout(store({})),{version:2,navigationWidth:224,chatWidth:380});
 assert.deepEqual(readWorkspaceLayout(store({'datumm-panel-widths':JSON.stringify({left:242,right:316})})),{version:2,navigationWidth:224,chatWidth:380});
 assert.deepEqual(readWorkspaceLayout(store({'datumm-panel-widths':JSON.stringify({left:900,right:1})})),{version:2,navigationWidth:360,chatWidth:320});
 assert.deepEqual(readWorkspaceLayout(store({'datumm-workspace-layout-v2':JSON.stringify({version:2,navigationWidth:300,chatWidth:500}),'datumm-panel-widths':JSON.stringify({left:180,right:320})})),{version:2,navigationWidth:300,chatWidth:500});
 assert.equal(readWorkspaceLayout({getItem(){throw Error('denied');}}).navigationWidth,224);
});
test('old factory width migrates while custom and newly saved widths survive',()=>{
 const key='datumm-workspace-layout-v2';
 const read=record=>readWorkspaceLayout(store({[key]:JSON.stringify(record)}));
 assert.deepEqual(read({version:2,navigationWidth:272,chatWidth:500}),{version:2,navigationWidth:224,chatWidth:500});
 assert.equal(read({version:2,navigationWidth:248,chatWidth:380,navigationDefaultRevision:1}).navigationWidth,224);
 assert.equal(read({version:2,navigationWidth:272,chatWidth:380,navigationDefaultRevision:1}).navigationWidth,272);
 for(const width of [256,300]) assert.equal(read({version:2,navigationWidth:width,chatWidth:380}).navigationWidth,width);
 const saved=storedWorkspaceLayout({version:2,navigationWidth:272,chatWidth:380});
 assert.equal(saved.navigationDefaultRevision,2);
 assert.equal(read(saved).navigationWidth,272);
 assert.equal(read(storedWorkspaceLayout({version:2,navigationWidth:248,chatWidth:380})).navigationWidth,248);
 assert.deepEqual(read({version:2,navigationWidth:900,chatWidth:1,navigationDefaultRevision:1}),{version:2,navigationWidth:360,chatWidth:320});
 assert.equal(effectiveWorkspaceLayout({navigationWidth:248,chatWidth:380},1440).navigationTotalWidth,248);
});
test('temporary viewport clamping leaves preferences untouched and Design no narrower than chat',()=>{
 const saved={version:2,navigationWidth:360,chatWidth:620};
 for(const viewport of [1440,1280,1180]){const effective=effectiveWorkspaceLayout(saved,viewport);assert.equal(effective.navigationTotalWidth,effective.navigationWidth);assert.equal(effective.chatMaxWidth,Math.min(620,Math.floor((viewport-effective.navigationTotalWidth-16)/2)));assert.ok(effective.chatWidth<=effective.chatMaxWidth);assert.ok(effective.chatWidth>=320);}
 assert.equal(saved.chatWidth,620);assert.equal(effectiveWorkspaceLayout(saved,390).split,false);
 assert.equal(effectiveWorkspaceLayout(saved,1440,false).navigationWidth,52);
 assert.equal(effectiveWorkspaceLayout(saved,1440,false).navigationTotalWidth,52);
});
test('navigation width clamps to 220-360',()=>{
 const key='datumm-workspace-layout-v2';
 const read=width=>readWorkspaceLayout(store({[key]:JSON.stringify({version:2,navigationWidth:width,chatWidth:380,navigationDefaultRevision:2})})).navigationWidth;
 assert.deepEqual([read(180),read(440),read(224),read(300)],[220,360,224,300]);
 assert.equal(effectiveWorkspaceLayout({navigationWidth:440,chatWidth:380},1440).navigationWidth,360);
});
test('resizing one side stores only that side; viewport clamping never reaches storage',()=>{
 const saved={version:2,navigationWidth:224,chatWidth:620};
 assert.ok(effectiveWorkspaceLayout({...saved,navigationWidth:360},1280).chatWidth<620);
 assert.deepEqual(resizeWorkspaceLayout(saved,'left',360),{version:2,navigationWidth:360,chatWidth:620});
 assert.deepEqual(resizeWorkspaceLayout(saved,'right',400),{version:2,navigationWidth:224,chatWidth:400});
 assert.deepEqual(resizeWorkspaceLayout(saved,'left',900),{version:2,navigationWidth:360,chatWidth:620});
 assert.deepEqual(resizeWorkspaceLayout(saved,'right',1),{version:2,navigationWidth:224,chatWidth:320});
});
test('only an authoritative ID leaves centered Home; selected ID precedes snapshot',()=>{
 assert.equal(workspaceScene('',undefined,false),'home');assert.equal(workspaceScene('',undefined,true),'submitting');
 assert.equal(workspaceScene('task-b','task-a',false),'task-loading');assert.equal(workspaceScene('task-b',undefined,true),'task-loading');
 assert.equal(workspaceScene('task-b','task-b',false),'task');
});

test('chat and work area divider supports pointer capture, keyboard and reset',()=>{
 const exports={};
 runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/panel-resize.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
 }).outputText,{exports,require:name=>name==='react'?{useRef:value=>({current:value})}:jsxRuntime});
 const values=[],captured=[];
 const divider=exports.PanelResize({side:'right',direction:'forward',width:380,onChange:value=>values.push(value),label:'chat and work area'});
 assert.equal(divider.props['aria-label'],'Resize chat and work area panel');
 const target={setPointerCapture:id=>captured.push(['set',id]),hasPointerCapture:()=>true,releasePointerCapture:id=>captured.push(['release',id])};
 divider.props.onPointerDown({button:0,clientX:400,pointerId:1,currentTarget:target,preventDefault(){}});
 divider.props.onPointerMove({clientX:450});
 divider.props.onPointerUp({pointerId:1,currentTarget:target});
 divider.props.onPointerMove({clientX:500});
 divider.props.onKeyDown({key:'ArrowLeft',preventDefault(){}});
 divider.props.onKeyDown({key:'End',preventDefault(){}});
 divider.props.onDoubleClick();
 assert.deepEqual(values,[430,364,620,380]);
 assert.deepEqual(captured,[['set',1],['release',1]]);
 const limited=exports.PanelResize({side:'right',direction:'forward',width:420,maxWidth:462,onChange:value=>values.push(value)});
 assert.equal(limited.props['aria-valuemax'],462);
 limited.props.onKeyDown({key:'End',preventDefault(){}});
 limited.props.onPointerDown({button:0,clientX:400,pointerId:2,currentTarget:target,preventDefault(){}});
 limited.props.onPointerMove({clientX:600});
 assert.deepEqual(values.slice(-2),[462,462]);
 const bounded=exports.PanelResize({side:'right',width:320,maxWidth:100,onChange() {}});
 assert.equal(bounded.props['aria-valuemax'],320);
});


test('the remaining chat divider stops resizing after pointer cancellation or lost capture',()=>{
 const exports={};
 runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/panel-resize.tsx',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},
 }).outputText,{exports,require:name=>name==='react'?{useRef:value=>({current:value})}:jsxRuntime});
 const values=[],target={setPointerCapture(){}};
 const divider=exports.PanelResize({side:'right',direction:'forward',width:380,onChange:value=>values.push(value)});
 divider.props.onPointerDown({button:0,clientX:400,pointerId:1,currentTarget:target,preventDefault(){}});
 divider.props.onPointerMove({clientX:450});divider.props.onPointerCancel();divider.props.onPointerMove({clientX:500});
 assert.deepEqual(values,[430]);
 divider.props.onPointerDown({button:0,clientX:400,pointerId:2,currentTarget:target,preventDefault(){}});
 divider.props.onLostPointerCapture();divider.props.onPointerMove({clientX:500});assert.deepEqual(values,[430]);
});
