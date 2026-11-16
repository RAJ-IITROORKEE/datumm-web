import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
import {safeDrawingSegment} from '../src/lib/drawing-export-identity.mjs';
import * as geometry from '../src/lib/plan-geometry.mjs';

function load(globals={}) {
 const exports={};
 runInNewContext(ts.transpileModule(readFileSync(new URL('../src/components/plan-drawing.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText,{
  exports,Blob,Uint8Array,...globals,
  require(name){return name==='react/jsx-runtime'?jsx:name==='@/lib/plan-geometry.mjs'?geometry:{};}
 });
 return exports;
}
const graph={site:{widthMm:6000,depthMm:4000},wallThicknessMm:200,rooms:[{key:'room',name:'Office',rect:[0,0,6000,4000],areaMm2:24000000}],walls:[{key:'wall',start:[0,0],end:[6000,0]}],openings:[]};

test('working and sheet share exact geometry, dimensions and portable white defaults',()=>{
 const {PlanDrawing}=load();
 const markup=surface=>renderToStaticMarkup(React.createElement(PlanDrawing,{graph,mode:'hidden',surface,label:'Measured concept'}));
 const working=markup('drafting'),sheet=markup('sheet'),standalone=markup(undefined);
 assert.equal(working.replace('data-surface="drafting"','data-surface="sheet"'),sheet);
 assert.equal(standalone,sheet);
 assert.ok(sheet.includes('6000')&&sheet.includes('4000')&&sheet.includes('24.0 m²'));
 assert.match(sheet, /24\.0 m²<\/text><text[^>]*>incl\. walls<\/text>/);
 assert.ok(sheet.includes('var(--pd-paper,#fff)')&&sheet.includes('var(--pd-ink,#000)'));
});

test('actual sheet export isolates live palette and viewport style without changing the source SVG',async()=>{
 const urls=new Map(),revoked=[],downloads=[],raster=[];let next=0,serialized;
 class Svg {
  constructor(attributes){this.attributes={...attributes};}
  getAttribute(key){return this.attributes[key]??null;}
  setAttribute(key,value){this.attributes[key]=value;}
  removeAttribute(key){delete this.attributes[key];}
  cloneNode(){return new Svg(this.attributes);}
 }
 const live=new Svg({class:'pd live',style:'--pd-paper:#191d22;--pd-ink:#fff;transform:translate(90px,40px) scale(3)',viewBox:'-500 -400 7000 5000','data-surface':'drafting','data-style':'hidden'});
 const original={...live.attributes};
 const {exportPlanSheet}=load({
  URL:{createObjectURL(blob){const key=`blob:${++next}`;urls.set(key,blob);return key;},revokeObjectURL(url){revoked.push(url);}},
  XMLSerializer:class {serializeToString(svg){serialized=svg.attributes;return JSON.stringify(svg.attributes);}},
  Image:class {async decode(){this.decoded=true;}},
  document:{createElement(kind){
   if(kind==='a'){const link={click(){downloads.push({name:link.download,url:link.href});}};return link;}
   assert.equal(kind,'canvas');return {getContext(){return {set fillStyle(value){raster.push(value);},fillRect(...args){raster.push(args);},drawImage(source,...args){assert.equal(source.decoded,true);raster.push(args);}};},toBlob(callback,type){callback(new Blob(['image'],{type}));}};
  }}
 });
 await exportPlanSheet(live,'png','concept-v1');
 assert.deepEqual(live.attributes,original);
 assert.equal(serialized.style,undefined);
 assert.equal(serialized.class,'pd');assert.equal(serialized['data-surface'],'sheet');
 assert.equal(serialized.viewBox,original.viewBox);assert.equal(serialized['data-style'],'hidden');
 assert.equal(serialized.width,'2400');assert.equal(serialized.height,'1714');
 assert.equal(raster[0],'#fff');assert.deepEqual(raster[1],[0,0,2400,1714]);
 assert.equal(downloads[0].name,'concept-v1.png');assert.equal(urls.size,2);assert.equal(revoked.length,2);
});


test('sheet shows the captured drawing name and version within its existing bounds',()=>{
 const {PlanDrawing}=load();
 const markup=renderToStaticMarkup(React.createElement(PlanDrawing,{graph,mode:'hidden',sheetTitle:'Concept 2 · Version 3',sheetPlanId:'plan-b'}));
 assert.match(markup,/>Concept 2 · Version 3<\/text>/);
 assert.match(markup,/>Drawing reference: plan-b<\/text>/);
});

test('an obsolete export does not trigger a download after rendering finishes',async()=>{
 let finishDecode; const downloads=[];
 const live={getAttribute:()=>'-500 -400 7000 5000',cloneNode:()=>({removeAttribute(){},setAttribute(){}})};
 const {exportPlanSheet}=load({
  URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}, XMLSerializer:class {serializeToString(){return '<svg/>';}},
  Image:class {decode(){return new Promise(resolve=>{finishDecode=resolve;});}},
  document:{createElement(kind){if(kind==='a')return {click(){downloads.push(true);}};return {getContext:()=>({fillRect(){},drawImage(){}}),toBlob:callback=>callback(new Blob(['image']))};}}
 });
 let current=true; const pending=exportPlanSheet(live,'png','old',()=>current);
 current=false; finishDecode(); await pending;
 assert.deepEqual(downloads,[]);
});


test('a bounded nonstandard identifier is labeled as a drawing reference',()=>{
 const {PlanDrawing}=load();
 const id='x'.repeat(100), reference=safeDrawingSegment(id,'unknown');
 const markup=renderToStaticMarkup(React.createElement(PlanDrawing,{graph,mode:'hidden',sheetTitle:'Saved drawing · Version 1',sheetPlanId:reference}));
 assert.equal(reference.length,80);
 assert.ok(markup.includes(`Drawing reference: ${reference}`));
 assert.ok(!markup.includes(`Plan ID: ${reference}`));
});
