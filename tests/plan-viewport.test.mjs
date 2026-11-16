import test from 'node:test';
import assert from 'node:assert/strict';
import {fitViewport,panViewport,zoomViewport,boundViewport,screenToWorld,worldToScreen,fitContentSize} from '../src/lib/plan-viewport.mjs';
const size={width:800,height:600};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('zoom preserves the world point under the pointer and anchors round-trip',()=>{
 const initial={zoom:1.5,x:35,y:-20},pointer={x:525,y:220};
 const world=screenToWorld(pointer,initial,size),zoomed=zoomViewport(initial,3,pointer,size),screen=worldToScreen(world,zoomed,size);
 near(screen.x,pointer.x);near(screen.y,pointer.y);
 const inverse=screenToWorld(screen,zoomed,size);near(inverse.x,world.x);near(inverse.y,world.y);
});
test('fit resets and pan and zoom remain bounded even for extreme inputs',()=>{
 assert.deepEqual(fitViewport(),{zoom:1,x:0,y:0});
 assert.deepEqual(boundViewport({zoom:99,x:99999,y:-99999},size),{zoom:6,x:2768,y:-2068});
 assert.deepEqual(panViewport(fitViewport(),9999,-9999,size),{zoom:1,x:768,y:-568});
 assert.equal(zoomViewport(fitViewport(),0,{x:400,y:300},size).zoom,1);
});


test('bounds use the meet-fitted drawing and retain a visible margin after resize',()=>{
 const tall=fitContentSize({width:1000,height:500},[0,0,100,1000]);
 assert.deepEqual(tall,{width:1000,height:500,contentWidth:50,contentHeight:500});
 const bounded=panViewport(fitViewport(),5000,5000,tall);
 assert.equal(bounded.x,500); assert.equal(bounded.y,468);
 const narrow=fitContentSize({width:300,height:500},[0,0,100,1000]);
 const resized=boundViewport(bounded,narrow);
 assert.equal(resized.x,150); assert.equal(resized.y,468);
 const visibleRight=narrow.width/2+resized.x-narrow.contentWidth/2;
 assert.ok(visibleRight<narrow.width, 'positive drawing width remains visible');
});
