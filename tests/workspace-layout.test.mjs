import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const source=readFileSync(new URL('../src/components/workspace.tsx',import.meta.url),'utf8');
const ast=ts.createSourceFile('workspace.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),expressions={};
function visit(node){
 if(ts.isVariableDeclaration(node)&&node.initializer)expressions[node.name.getText(ast)]=node.initializer.getText(ast);
 ts.forEachChild(node,visit);
}
visit(ast);

test('conversation content cannot open a studio without renderable geometry',()=>{
 assert.ok(expressions.hasRenderablePlan,'Workspace must derive studio readiness from geometry');
 const ready=new Function('activeDrawing','previewSvg','hasContent','executing',`return ${expressions.hasRenderablePlan}`);
 for(const active of [false,true])assert.equal(ready(null,null,true,active),false);
 assert.equal(ready({graph:{}},null,false,false),true);
 assert.equal(ready(null,'<svg/>',false,false),true);
});

test('review focuses the sole primary conversation before a plan exists',()=>{
 for(const hasRenderablePlan of [false,true]){
  const seen={},box={hasRenderablePlan,desktopLayout:true,setStudioView:value=>seen.view=value,setRight:value=>seen.right=value,setTab:value=>seen.tab=value,
   requestAnimationFrame:callback=>callback(),reviewScroll:{current:{stopScroll:()=>{}}},document:{querySelector:selector=>({scrollIntoView:()=>seen.selector=selector})}};
  vm.runInNewContext(ts.transpileModule(`globalThis.focus=${expressions.focusReview}`,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,box);
  box.focus('[aria-label="Validated design preview"]');
  assert.equal(seen.right,hasRenderablePlan);
  assert.equal(seen.tab,hasRenderablePlan?'assistant':'preview');
  assert.equal(seen.selector,hasRenderablePlan?'[aria-label="Validated design preview"]':'.conversation');
 }
});
