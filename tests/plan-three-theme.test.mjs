import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import * as THREE from 'three';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import ts from 'typescript';

const exports3d={};
const compiled=ts.transpileModule(readFileSync(new URL('../src/components/plan-three.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
runInNewContext(compiled,{exports:exports3d,require(name){if(name==='three')return THREE;if(name.endsWith('.css'))return {default:{}};return {};}});

test('3D working palette updates actual scene materials, selection, labels and cut without moving the graph',()=>{
 const graph={site:{widthMm:6000,depthMm:4000},wallThicknessMm:200,wallHeightMm:3000,walls:[{key:'wall',start:[0,0],end:[6000,0]}],openings:[{key:'window',wallKey:'wall',kind:'window',offsetMm:1000,widthMm:1000,sillMm:900,heightMm:1200}],rooms:[{key:'room',name:'Studio',rect:[0,0,6000,4000]}]};
 const model=exports3d.createPlanScene(graph),wall=model.children.find(x=>x.userData.wallKey==='wall'),room=model.children.find(x=>x.userData.roomKey==='room'),glass=wall.children.find(x=>x instanceof THREE.Mesh),edge=wall.children.find(x=>x instanceof THREE.LineSegments);
 const before={wall:wall.position.toArray(),room:room.position.toArray(),rotation:wall.rotation.y};
 const drawn=[],context={measureText:()=>({width:132}),clearRect(){},fillRect(){drawn.push(['background',this.fillStyle]);},fillText(text){drawn.push(['text',this.fillStyle,text]);}},canvas={width:512,height:128,getContext:()=>context};
 const texture=new THREE.CanvasTexture(canvas),sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture}));sprite.userData.roomLabel='Studio';model.add(sprite);
 const grid=new THREE.GridHelper(12,20),plane=new THREE.Plane(new THREE.Vector3(0,-1,0),0);let clear;
 const options={room:'room',highlights:[],displayStyle:'hidden',showGrid:true,showLabels:true,cutMm:1500,builtCut:3000,cutPlane:plane};
 assert.equal(exports3d.paintPlanScene(model,grid,{setClearColor:color=>{clear=color.getHexString();}},graph,options),1500);
 assert.equal(clear,'191d22');assert.equal(grid.visible,true);assert.equal(edge.visible,true);assert.equal(edge.material.color.getHexString(),'d3dce3');
 assert.notEqual(room.material.emissive.getHex(),new THREE.Color('#45515a').getHex(),'Selected room is highlighted');
 assert.equal(plane.constant,1.5);assert.equal(glass.material.clippingPlanes[0],plane);wall.geometry.computeBoundingBox();assert.ok(Math.abs(wall.geometry.boundingBox.max.y-1.5)<1e-6);
 assert.deepEqual(drawn,[['background','#191d22'],['text','#f1f5f8','Studio']]);
 assert.equal(canvas.width,180,'Label background fits measured text and padding');
 assert.deepEqual({wall:wall.position.toArray(),room:room.position.toArray(),rotation:wall.rotation.y},before);
 exports3d.paintPlanScene(model,grid,null,graph,{...options,room:'',displayStyle:'wireframe',showGrid:false,showLabels:false,cutMm:0,builtCut:1500});
 assert.equal(grid.visible,false);assert.equal(sprite.visible,false);assert.equal(edge.visible,false);assert.equal(wall.material.wireframe,true);assert.equal(glass.material.clippingPlanes,null);
 wall.geometry.computeBoundingBox();assert.ok(Math.abs(wall.geometry.boundingBox.max.y-3)<1e-6);
 assert.deepEqual({wall:wall.position.toArray(),room:room.position.toArray(),rotation:wall.rotation.y},before);
});

test('orthographic room labels retain readable pixel size through zoom and viewport resize',()=>{
 const model=new THREE.Group(),label=new THREE.Sprite();label.userData.roomLabel='Studio';model.add(label);
 const camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,100);
 for(const [height,zoom] of [[600,1],[600,2],[300,.5],[1000,4]]){
  camera.zoom=zoom;exports3d.sizePlanLabels(model,camera,height);
  const pixels=label.scale.y*height*zoom/(camera.top-camera.bottom);
  assert.ok(Math.abs(pixels-36)<1e-9);assert.equal(label.scale.x/label.scale.y,4);
  assert.ok(Math.abs(pixels*44/128-12.375)<1e-9);
 }
 const previous=label.scale.clone();exports3d.sizePlanLabels(model,camera,0);assert.deepEqual(label.scale.toArray(),previous.toArray());
 const canvas={width:180,height:128},short=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(canvas)}));short.userData.roomLabel='Studio';model.add(short);
 exports3d.sizePlanLabels(model,camera,600);assert.equal(short.scale.x/short.scale.y,180/128);
 canvas.width=800;exports3d.sizePlanLabels(model,camera,600);assert.equal(short.scale.x/short.scale.y,4,'Labels remain capped at 144 CSS pixels');
});

test('orthographic fit frames asymmetric bounds with label margins while retaining camera direction',()=>{
 const bounds=new THREE.Box3(new THREE.Vector3(-2,0,-8),new THREE.Vector3(11,3,1));
 for(const [width,height] of [[320,680],[1200,600],[390,400]])for(const view of ['iso','top','front']){
  const aspect=width/height,camera=new THREE.OrthographicCamera(-8*aspect,8*aspect,8,-8,.01,200),target=new THREE.Vector3(2,0,-2);
  if(view==='top')camera.up.set(0,0,-1);
  camera.position.copy(target).add(exports3d.planCameraOffset(15,view));camera.lookAt(target);camera.updateMatrixWorld(true);
  const direction=camera.position.clone().sub(target).normalize();
  assert.equal(exports3d.fitPlanCamera(camera,target,bounds,width,height),true);camera.updateMatrixWorld(true);
  assert.ok(camera.position.clone().sub(target).normalize().distanceTo(direction)<1e-10,`${view}: viewing direction stays unchanged`);
  const limitX=Math.max(.35,1-152/width),limitY=Math.max(.35,1-60/height);
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
   const point=new THREE.Vector3(x,y,z).project(camera);
   assert.ok(Math.abs(point.x)<=limitX+1e-6,`${view} ${width}: horizontal bound ${point.x}`);
   assert.ok(Math.abs(point.y)<=limitY+1e-6,`${view} ${width}: vertical bound ${point.y}`);
  }
 }
});

test('crowded room labels prioritize selection, reveal on zoom and respect the label toggle',()=>{
 const model=new THREE.Group(),camera=new THREE.OrthographicCamera(-8,8,8,-8,.1,100);camera.position.set(0,0,20);camera.lookAt(0,0,0);camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 const add=(key,x)=>{const label=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture({width:128,height:128})}));label.position.set(x,0,0);label.userData={roomLabel:key,labelRoomKey:key};model.add(label);return label;};
 const first=add('first',0),selected=add('selected',.2),distant=add('distant',4),positions=model.children.map(label=>label.position.toArray());
 exports3d.layoutPlanLabels(model,camera,600,600,true,'selected');
 assert.equal(selected.visible,true);assert.equal(first.visible,false);assert.equal(distant.visible,true);
 camera.zoom=8;camera.updateProjectionMatrix();exports3d.layoutPlanLabels(model,camera,600,600,true,'selected');
 assert.equal(first.visible,true);assert.equal(selected.visible,true,'Zoom reveals labels without moving their anchors');
 exports3d.layoutPlanLabels(model,camera,600,600,false,'selected');assert.equal(model.children.every(label=>!label.visible),true);
 assert.deepEqual(model.children.map(label=>label.position.toArray()),positions);
});

test('WebGL context loss clears capture and a fresh renderer restores it',()=>{
 const effects=[],renderers=[],errors=[];
 class Renderer {
  constructor(){this.domElement={listeners:{},clientWidth:600,clientHeight:400,setAttribute(){},addEventListener(type,fn){this.listeners[type]=fn;},removeEventListener(type){delete this.listeners[type];},remove(){}};renderers.push(this);}
  setPixelRatio(){} render(){} dispose(){} forceContextLoss(){}
 }
 class Controls {
  constructor(){this.target=new THREE.Vector3();this.mouseButtons={};}
  update(){} saveState(){} addEventListener(){} removeEventListener(){} dispose(){}
 }
 const fakeReact={useRef:initial=>({current:initial}),useState:initial=>[initial,value=>errors.push(value)],useEffect:fn=>effects.push(fn)};
 const testExports={};runInNewContext(compiled,{exports:testExports,devicePixelRatio:1,ResizeObserver:class{observe(){} disconnect(){}},document:{createElement:()=>({getContext:()=>null})},requestAnimationFrame:()=>1,cancelAnimationFrame(){},require(name){if(name==='three')return {...THREE,WebGLRenderer:Renderer};if(name==='react')return fakeReact;if(name==='react/jsx-runtime')return jsx;if(name.includes('OrbitControls'))return {OrbitControls:Controls};if(name.endsWith('.css'))return {default:{}};return {};}});
 const captureRef={current:null},graph={site:{widthMm:6000,depthMm:4000},wallThicknessMm:200,wallHeightMm:3000,walls:[{key:'w',start:[0,0],end:[6000,0]}],rooms:[]};
 const tree=testExports.PlanThree({graph,fingerprint:'a',room:'',onSelect(){},displayStyle:'edges',showGrid:false,showLabels:true,captureRef});
 const nodes=value=>React.isValidElement(value)?[value,...React.Children.toArray(value.props.children).flatMap(nodes)]:[];
 const stage=nodes(tree).find(node=>node.props.ref);stage.props.ref.current={clientWidth:600,clientHeight:400,appendChild(){}};
 const cleanup=effects[0]();assert.equal(typeof captureRef.current,'function');let prevented=false;
 renderers[0].domElement.listeners.webglcontextlost({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);assert.equal(captureRef.current,null);assert.ok(errors.some(value=>typeof value==='string'&&value.includes('context was lost')));
 cleanup();const retryCleanup=effects[0]();assert.equal(typeof captureRef.current,'function');retryCleanup();assert.equal(captureRef.current,null);
});
