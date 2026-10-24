import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';

// @lat: [[contracts#Hosted contract tests#Browser sidebar history]]
test('Studio history shows hosted project chats without desktop project groups',()=>{
  const source=ts.createSourceFile('workspace.tsx',readFileSync(new URL('../src/components/workspace.tsx',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  let normalChat;const filters=[];
  const visit=node=>{
    if(ts.isVariableDeclaration(node)&&node.name.getText(source)==='normalChat')normalChat=node;
    if(ts.isCallExpression(node)&&ts.isPropertyAccessExpression(node.expression)&&node.expression.expression.getText(source)==='filteredChats'&&node.expression.name.text==='filter')filters.push(node);
    ts.forEachChild(node,visit);
  };
  visit(source);
  assert.ok(normalChat);
  const recent=filters.find(node=>node.arguments[0].getText(source).includes('normalChat'));
  const pinned=filters.find(node=>node.arguments[0].getText(source)==='item=>item.pinned_at');
  assert.ok(recent);assert.ok(pinned);
  const script=ts.transpileModule(`const ${normalChat.getText(source)}; recent=${recent.getText(source)}; pinned=${pinned.getText(source)};`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const filteredChats=[{id:'newest',projectId:'inbox'},{id:'project-chat',projectId:'project'},{id:'pinned-chat',projectId:'project',pinned_at:'2026-10-24'},{id:'legacy'}];
  for(const desktopAvailable of [false,true]){
    const context={filteredChats,desktopLayout:true,desktopAvailable,defaultProject:desktopAvailable?{id:'inbox'}:undefined};
    runInNewContext(script,context);
    assert.deepEqual(Array.from(context.recent,row=>row.id),desktopAvailable?['newest','legacy']:['newest','project-chat','legacy']);
    assert.deepEqual(Array.from(context.pinned,row=>row.id),['pinned-chat']);
  }
});
