'use client';
import {type RefObject,useEffect,useRef,useState} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {House,Scan} from 'lucide-react';
import {arcOf,roomCentre,wallLength} from '@/lib/plan-geometry.mjs';
import {curvedWallPositions,placeOpening,roomOutline,sampleArc} from '@/lib/plan-3d-geometry.mjs';
import type {PlanGraph} from './plan-canvas';
import {Button} from './ui/button';
import styles from './plan-three.module.css';

type Opening=NonNullable<PlanGraph['openings']>[number];
/**
 * Wall solid in its own frame (x along the wall, y up), cut flat at `height` metres.
 * Openings that reach the cut split the wall or notch its top, so the cut face is a real cap with real edges.
 */
export function wallGeometry(length:number,thickness:number,height:number,openings:Opening[]){
 const scale=.001,spans=openings.map(o=>({a:o.offsetMm*scale,b:(o.offsetMm+o.widthMm)*scale,sill:o.sillMm*scale,top:Math.min((o.sillMm+o.heightMm)*scale,height)})).filter(o=>o.sill<height);
 const through=spans.filter(o=>o.sill===0&&o.top>=height),shapes:THREE.Shape[]=[];
 [0,...through.map(o=>o.b)].forEach((start,index)=>{
  const end=through[index]?.a??length;if(end-start<=1e-6)return;
  const inside=spans.filter(o=>o.a>=start&&o.b<=end&&!through.includes(o)),shape=new THREE.Shape();shape.moveTo(start,0);
  for(const o of inside.filter(o=>o.sill===0)){shape.lineTo(o.a,0);shape.lineTo(o.a,o.top);shape.lineTo(o.b,o.top);shape.lineTo(o.b,0);}
  shape.lineTo(end,0);shape.lineTo(end,height);
  for(const o of inside.filter(o=>o.sill>0&&o.top>=height).reverse()){shape.lineTo(o.b,height);shape.lineTo(o.b,o.sill);shape.lineTo(o.a,o.sill);shape.lineTo(o.a,height);}
  shape.lineTo(start,height);shape.closePath();
  for(const o of inside.filter(o=>o.sill>0&&o.top<height)){const hole=new THREE.Path();hole.moveTo(o.a,o.sill);hole.lineTo(o.a,o.top);hole.lineTo(o.b,o.top);hole.lineTo(o.b,o.sill);hole.closePath();shape.holes.push(hole);}
  shapes.push(shape);
 });
 const geometry=new THREE.ExtrudeGeometry(shapes,{depth:thickness,bevelEnabled:false,steps:1});geometry.translate(0,0,-thickness/2);return geometry;
}

type Wall=NonNullable<PlanGraph['walls']>[number];
const SCALE=.001;
const EDGE=0x736e65;

// A bent wall cannot reuse the flat extrusion: its cap triangles would cut across the curve.
function curvedWallGeometry(wall:Wall,thicknessMm:number,heightMetres:number,openings:Opening[]){
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(curvedWallPositions(wall,{thicknessMm,heightMm:heightMetres/SCALE,openings}),3));
 geometry.scale(SCALE,SCALE,SCALE);geometry.computeVertexNormals();return geometry;
}

/** Opening box in its wall mesh's frame: wall-local on a straight wall, along the arc on a curved one. */
function openingPose(wall:Wall,curved:boolean,o:Opening){
 if(!curved)return {x:(o.offsetMm+o.widthMm/2)*SCALE,z:0,width:o.widthMm*SCALE,rotation:0};
 const placed=placeOpening(wall,o);
 return {x:placed.centre[0]*SCALE,z:-placed.centre[1]*SCALE,width:placed.chordMm*SCALE,rotation:placed.angle};
}

// Outline objects stay hidden until paintPlanScene marks their key; they are the highlight edge.
function outlineOf(geometry:THREE.BufferGeometry,key:string,data:Record<string,unknown>={},angle=1){
 const lines=new THREE.LineSegments(new THREE.EdgesGeometry(geometry,angle),new THREE.LineBasicMaterial({color:EDGE}));
 lines.userData={outlineKey:key,...data};return lines;
}

// One metre-based projection of the validated millimetre graph; family shapes are schematic, never RVT meshes.
export function createPlanScene(graph:PlanGraph){
 const group=new THREE.Group(),t=graph.wallThicknessMm*SCALE,height=(graph.wallHeightMm??3000)*SCALE,walls=graph.walls??[];
 const corners=walls.length?walls.flatMap(w=>sampleArc(w)):graph.rooms.flatMap(roomOutline),xs=corners.map(p=>p[0]),ys=corners.map(p=>p[1]);
 const bounds=xs.length?[Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]:[0,0,graph.site.widthMm,graph.site.depthMm];
 const floor=new THREE.Mesh(new THREE.BoxGeometry((bounds[2]-bounds[0])*SCALE,.1,(bounds[3]-bounds[1])*SCALE),new THREE.MeshStandardMaterial({color:0x303740,roughness:.9}));
 floor.position.set((bounds[0]+bounds[2])*SCALE/2,-.05,-(bounds[1]+bounds[3])*SCALE/2);group.add(floor);
 for(const wall of walls){
  const curved=arcOf(wall)!==null,dx=wall.end[0]-wall.start[0],dy=wall.end[1]-wall.start[1],length=wallLength(wall)*SCALE;
  const openings=(graph.openings??[]).filter(o=>o.wallKey===wall.key).sort((a,b)=>a.offsetMm-b.offsetMm);
  const build=(heightMetres:number)=>curved?curvedWallGeometry(wall,graph.wallThicknessMm,heightMetres,openings):wallGeometry(length,t,heightMetres,openings);
  const geometry=build(height),edgeAngle=curved?15:1;
  const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:0x6a747e,roughness:.85}));mesh.userData={wallKey:wall.key,openingKeys:openings.map(o=>o.key),length,openings,build,edgeAngle};
  if(!curved){mesh.position.set(wall.start[0]*SCALE,0,-wall.start[1]*SCALE);mesh.rotation.y=Math.atan2(dy,dx);}
  group.add(mesh);
  mesh.add(outlineOf(geometry,wall.key,{styleEdges:true},edgeAngle));
  for(const o of openings){
   const pose=openingPose(wall,curved,o),size=[pose.width,o.heightMm*SCALE] as const;
   const place=(object:THREE.Object3D)=>{object.position.set(pose.x,(o.sillMm+o.heightMm/2)*SCALE,pose.z);object.rotation.y=pose.rotation;mesh.add(object);};
   if(o.kind==='window'){const glass=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],.015),new THREE.MeshStandardMaterial({color:0x91c9d5,transparent:true,opacity:.35,side:THREE.DoubleSide}));glass.userData.openingKey=o.key;place(glass);}
   // An invisible solid fills the hole so doors can be picked, and its edges are the opening's outline.
   const solid=new THREE.Mesh(new THREE.BoxGeometry(size[0],size[1],t*1.02),new THREE.MeshBasicMaterial({visible:false}));solid.userData.openingKey=o.key;place(solid);
   place(outlineOf(solid.geometry,o.key,{sillMm:o.sillMm}));
  }
 }
 for(const room of graph.rooms){
  const material=new THREE.MeshStandardMaterial({color:0x45515a,roughness:1}),[x0,y0,x1,y1]=room.rect;let mesh:THREE.Mesh;
  if(room.boundary&&room.boundary.length>=3){
   mesh=new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(roomOutline(room).map(([x,y])=>new THREE.Vector2(x*SCALE,y*SCALE)))),material);
   mesh.rotation.x=-Math.PI/2;mesh.position.y=.015;
  }else{mesh=new THREE.Mesh(new THREE.BoxGeometry((x1-x0)*SCALE-t,.012,(y1-y0)*SCALE-t),material);mesh.position.set((x0+x1)*SCALE/2,.015,-(y0+y1)*SCALE/2);}
  mesh.userData.roomKey=room.key;mesh.add(outlineOf(mesh.geometry,room.key));group.add(mesh);
 }
 return group;
}

/** Free every geometry, material and texture under `root`; call when a scene is replaced. */
export function disposePlanScene(root:THREE.Object3D){
 root.traverse(object=>{
  if(object instanceof THREE.Mesh||object instanceof THREE.LineSegments||object instanceof THREE.Sprite)object.geometry.dispose();
  if('material' in object&&object.material){for(const material of Array.isArray(object.material)?object.material:[object.material]){(material as THREE.Material&{map?:THREE.Texture|null}).map?.dispose();material.dispose();}}
 });
}

export function planCameraOffset(size:number,view:boolean|'top'|'front'|'iso'='iso'){
 if(view===true||view==='top')return new THREE.Vector3(0,size*2,size*.000001);
 if(view==='front')return new THREE.Vector3(size*.000001,size*.5,size*2);
 return new THREE.Vector3(size,size,size);
}

/** Frame projected model bounds, leaving room for screen-sized room labels. */
export function fitPlanCamera(camera:THREE.OrthographicCamera,target:THREE.Vector3,bounds:THREE.Box3,width:number,height:number){
 if(bounds.isEmpty()||width<=0||height<=0)return false;
 const center=bounds.getCenter(new THREE.Vector3()),shift=center.clone().sub(target);
 camera.position.add(shift);target.copy(center);camera.updateMatrixWorld(true);
 let extentX=0,extentY=0;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
  const point=new THREE.Vector3(x,y,z).applyMatrix4(camera.matrixWorldInverse);
  extentX=Math.max(extentX,Math.abs(point.x));extentY=Math.max(extentY,Math.abs(point.y));
 }
 const usableX=Math.max(.35,1-152/width),usableY=Math.max(.35,1-60/height);
 const zoomX=(camera.right-camera.left)*.5*usableX/Math.max(extentX,1e-6),zoomY=(camera.top-camera.bottom)*.5*usableY/Math.max(extentY,1e-6);
 camera.zoom=Math.min(zoomX,zoomY,8);camera.updateProjectionMatrix();return true;
}

function planModelBounds(model:THREE.Group){
 const bounds=new THREE.Box3();model.updateMatrixWorld(true);
 model.traverse(object=>{if(object instanceof THREE.Mesh)bounds.expandByObject(object);});
 return bounds;
}

/** Keep the label texture at 36 CSS pixels tall (about 12 pixels for its 44/128 glyphs). */
export function sizePlanLabels(model:THREE.Group,camera:THREE.OrthographicCamera,viewportHeight:number){
 if(viewportHeight<=0||camera.zoom<=0)return;
 const height=36*(camera.top-camera.bottom)/camera.zoom/viewportHeight;
 model.traverse(object=>{if(object instanceof THREE.Sprite&&object.userData.roomLabel){const canvas=object.material.map?.image as HTMLCanvasElement|undefined;const aspect=canvas?.width&&canvas.height?Math.min(canvas.width/canvas.height,4):4;object.scale.set(height*aspect,height,1);}});
}

/** Hide overlapping screen-space labels; the selected room always has first choice. */
export function layoutPlanLabels(model:THREE.Group,camera:THREE.OrthographicCamera,width:number,height:number,show:boolean,selectedRoom:string){
 const labels:THREE.Sprite[]=[];model.traverse(object=>{if(object instanceof THREE.Sprite&&object.userData.roomLabel)labels.push(object);});
 labels.forEach(label=>{label.visible=false;});
 if(!show||width<=0||height<=0)return;
 sizePlanLabels(model,camera,height);model.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 labels.sort((a,b)=>Number(b.userData.labelRoomKey===selectedRoom)-Number(a.userData.labelRoomKey===selectedRoom));
 const occupied:{left:number;right:number;top:number;bottom:number}[]=[];
 for(const label of labels){
  const point=label.getWorldPosition(new THREE.Vector3()).project(camera);
  if(point.z < -1||point.z > 1)continue;
  const x=(point.x*.5+.5)*width,y=(-point.y*.5+.5)*height,pixelsPerUnit=height*camera.zoom/(camera.top-camera.bottom),w=label.scale.x*pixelsPerUnit,h=label.scale.y*pixelsPerUnit;
  const box={left:x-w/2-3,right:x+w/2+3,top:y-h/2-3,bottom:y+h/2+3};
  if(box.right<0||box.left>width||box.bottom<0||box.top>height)continue;
  if(occupied.some(other=>box.left<other.right&&box.right>other.left&&box.top<other.bottom&&box.bottom>other.top))continue;
  label.visible=true;occupied.push(box);
 }
}

type CameraView='iso'|'top'|'front'|'fit';
type DisplayStyle='shaded'|'edges'|'hidden'|'wireframe';
type PlanTool='select'|'pan'|'comment';
export type PlanElementSelection={kind:'room'|'wall'|'opening';key:string};
type PlanComment={id:string;number:number;roomKey:string;x:number;y:number;text:string;status:'open'|'resolved'};

/** Apply the working-view palette to the existing graph without rebuilding its camera or selection. */
export function paintPlanScene(model:THREE.Group,groundGrid:THREE.GridHelper|null,renderer:Pick<THREE.WebGLRenderer,'setClearColor'>|null,graph:PlanGraph,options:{room:string;highlights:string[];displayStyle:DisplayStyle;showGrid:boolean;showLabels:boolean;cutMm:number;builtCut:number;cutPlane:THREE.Plane}){
 const background=new THREE.Color('#191d22'),floor=new THREE.Color('#303740'),roomSurface=new THREE.Color('#45515a'),wall=new THREE.Color('#6a747e'),ink=new THREE.Color('#d3dce3'),accent=new THREE.Color('#4fb0fe'),hidden=options.displayStyle==='hidden';
 const full=graph.wallHeightMm??3000,cutHeight=options.cutMm>0&&options.cutMm<full?options.cutMm:full,cut=cutHeight<full;options.cutPlane.constant=cutHeight*.001;
 const paint=(mesh:THREE.Mesh,base:THREE.Color,marked:boolean)=>{const material=mesh.material as THREE.MeshStandardMaterial,color=marked?base.clone().lerp(accent,.55):base;material.color.copy(hidden?new THREE.Color(0):color);material.emissive.copy(hidden?color:new THREE.Color(0));material.wireframe=options.displayStyle==='wireframe';};
 renderer?.setClearColor(background);
 if(groundGrid){groundGrid.visible=options.showGrid;const material=groundGrid.material as THREE.LineBasicMaterial;material.color.copy(new THREE.Color('#444d56'));}
 model.traverse(object=>{
  if(object instanceof THREE.Mesh&&object.userData.roomKey)paint(object,roomSurface,object.userData.roomKey===options.room||options.highlights.includes(object.userData.roomKey));
  else if(object instanceof THREE.Mesh&&object.userData.wallKey)paint(object,hidden?floor:wall,options.highlights.includes(object.userData.wallKey)||(object.userData.openingKeys??[]).some((key:string)=>options.highlights.includes(key)));
  else if(object instanceof THREE.Mesh&&object.parent===model)paint(object,floor,false);
  if(object instanceof THREE.LineSegments){
   // Highlighted outlines show in every display style, in the accent colour, and draw over occluders.
   const key=object.userData.outlineKey as string|undefined,marked=key!==undefined&&options.highlights.includes(key)&&!(object.userData.sillMm>=cutHeight),material=object.material as THREE.LineBasicMaterial;
   object.visible=marked||(Boolean(object.userData.styleEdges)&&(options.displayStyle==='edges'||hidden));
   material.color.copy(marked?accent:ink);material.depthTest=!marked;object.renderOrder=marked?2:0;
  }
  if(object instanceof THREE.Mesh&&object.userData.wallKey&&options.builtCut!==cutHeight){
   object.geometry.dispose();object.geometry=object.userData.build(cutHeight*.001);
   const edges=object.children.find(child=>child instanceof THREE.LineSegments) as THREE.LineSegments|undefined;if(edges){edges.geometry.dispose();edges.geometry=new THREE.EdgesGeometry(object.geometry,object.userData.edgeAngle);}
  }
  if(object instanceof THREE.Mesh&&object.parent?.userData.wallKey){const material=object.material as THREE.Material;material.clippingPlanes=cut?[options.cutPlane]:null;material.needsUpdate=true;}
  if(object instanceof THREE.Sprite&&object.userData.roomLabel){
   object.visible=options.showLabels;const texture=object.material.map as THREE.CanvasTexture,canvas=texture.image as HTMLCanvasElement,context=canvas.getContext('2d');
   if(context){context.font='500 44px Inter, Arial, sans-serif';canvas.width=Math.min(512,Math.ceil(context.measureText(object.userData.roomLabel).width)+48);context.clearRect(0,0,canvas.width,canvas.height);context.globalAlpha=.94;context.fillStyle='#191d22';context.fillRect(0,0,canvas.width,canvas.height);context.globalAlpha=1;context.fillStyle='#f1f5f8';context.font='500 44px Inter, Arial, sans-serif';context.textAlign='center';context.textBaseline='middle';context.fillText(object.userData.roomLabel,canvas.width/2,canvas.height/2,canvas.width-24);texture.needsUpdate=true;}
  }
 });
 return cutHeight;
}
export function PlanThree({graph,fingerprint,room,onSelect,onSelectElement,highlights=[],displayStyle,showGrid,showLabels,tool='select',comments=[],selectedCommentId,onSelectComment,onAddComment,fitRequest,cutMm=0,captureRef}:{graph:PlanGraph;fingerprint:string;room:string;onSelect:(key:string)=>void;onSelectElement?:(element:PlanElementSelection)=>void;highlights?:string[];displayStyle:DisplayStyle;onDisplayStyleChange:(style:DisplayStyle)=>void;showGrid:boolean;onShowGridChange:(show:boolean)=>void;showLabels:boolean;onShowLabelsChange:(show:boolean)=>void;tool?:PlanTool;comments?:PlanComment[];selectedCommentId?:string;onSelectComment?:(id:string)=>void;onAddComment?:(anchor:{roomKey:string;x:number;y:number})=>void;fitRequest?:number;cutMm?:number;captureRef?:RefObject<(()=>HTMLCanvasElement)|null>}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<THREE.Group|null>(null),grid=useRef<THREE.GridHelper|null>(null),fit=useRef<(view?:CameraView)=>void>(()=>{}),select=useRef(onSelect),addComment=useRef(onAddComment),toolRef=useRef(tool),controlsRef=useRef<OrbitControls|null>(null),cameraRef=useRef<THREE.OrthographicCamera|null>(null),invalidate=useRef<()=>void>(()=>{}),commentPins=useRef(new Map<string,HTMLButtonElement>()),commentsRef=useRef(comments),labelsRef=useRef({show:showLabels,room}),zoomOutput=useRef<HTMLOutputElement>(null),rendererRef=useRef<THREE.WebGLRenderer|null>(null),cutPlane=useRef(new THREE.Plane(new THREE.Vector3(0,-1,0),0)),builtCut=useRef(0);
 const selectElement=useRef(onSelectElement);selectElement.current=onSelectElement;select.current=onSelect;addComment.current=onAddComment;toolRef.current=tool;commentsRef.current=comments;labelsRef.current={show:showLabels,room};
 const [error,setError]=useState(''),[retry,setRetry]=useState(0),[orientation,setOrientation]=useState<'iso'|'top'|'front'>('iso');
 useEffect(()=>{
  const element=host.current!;let renderer:THREE.WebGLRenderer;
  try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});}catch{setError('WebGL is unavailable. The exact 2D plan remains available.');return;}
  setError('');renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.localClippingEnabled=true;rendererRef.current=renderer;element.appendChild(renderer.domElement);
  const world=new THREE.Scene(),model=createPlanScene(graph);scene.current=model;builtCut.current=graph.wallHeightMm??3000;world.add(model,new THREE.HemisphereLight(0xffffff,0x747c86,2.8));
  const light=new THREE.DirectionalLight(0xffffff,2);light.position.set(5,12,8);world.add(light);
  const size=Math.max(graph.site.widthMm,graph.site.depthMm)*.001,center=new THREE.Vector3(graph.site.widthMm*.0005,0,-graph.site.depthMm*.0005);
  const groundGrid=new THREE.GridHelper(size*2,20,0xffffff,0xffffff);groundGrid.position.set(center.x,.025,center.z);groundGrid.visible=showGrid;grid.current=groundGrid;world.add(groundGrid);
  const camera=new THREE.OrthographicCamera(-size,size,size,-size,.01,size*20),controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.minZoom=.4;controls.maxZoom=8;controls.zoomToCursor=true;controls.target.copy(center);controlsRef.current=controls;cameraRef.current=camera;
  fit.current=(view='iso')=>{
   if(view!=='fit'){
    camera.up.set(0,1,0);if(view==='top')camera.up.set(0,0,-1);
    camera.position.copy(center).add(planCameraOffset(size,view));controls.target.copy(center);controls.update();
   }
   if(fitPlanCamera(camera,controls.target,planModelBounds(model),element.clientWidth,element.clientHeight))controls.minZoom=Math.min(.4,camera.zoom);
   controls.update();invalidate.current();
  };
  fit.current();controls.saveState();
  let initiallyFramed=false;const resize=new ResizeObserver(()=>{const w=element.clientWidth,h=element.clientHeight;if(!w||!h)return;renderer.setSize(w,h);const aspect=w/h;camera.left=-size*.8*aspect;camera.right=size*.8*aspect;camera.top=size*.8;camera.bottom=-size*.8;camera.updateProjectionMatrix();if(!initiallyFramed){initiallyFramed=true;fit.current('fit');}invalidate.current();});resize.observe(element);
  for(const value of graph.rooms){
   const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)continue;
   canvas.width=512;canvas.height=128;
   const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false})),[x0,y0,x1,y1]=value.rect;
   const [cx,cy]=value.boundary?roomCentre(value):[(x0+x1)/2,(y0+y1)/2];sprite.position.set(cx*.001,.28,-cy*.001);sprite.scale.set(Math.min(Math.max((x1-x0)*.001,.7),1.8),.36,1);sprite.userData.roomLabel=value.name.slice(0,24);sprite.userData.labelRoomKey=value.key;model.add(sprite);
  }
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),projected=new THREE.Vector3();let down:{x:number;y:number;tool:PlanTool}|null=null;
  const start=(e:PointerEvent)=>{if(e.button===0)down={x:e.clientX,y:e.clientY,tool:toolRef.current};};
  const end=(e:PointerEvent)=>{
   const origin=down;down=null;if(!origin||origin.tool==='pan'||Math.hypot(e.clientX-origin.x,e.clientY-origin.y)>4)return;
   const box=renderer.domElement.getBoundingClientRect();if(!box.width||!box.height)return;
   pointer.set((e.clientX-box.left)/box.width*2-1,-(e.clientY-box.top)/box.height*2+1);ray.setFromCamera(pointer,camera);
   const hits=ray.intersectObjects(model.children,true),isRoom=(value:THREE.Intersection)=>typeof value.object.userData.roomKey==='string';
   // Comments stay room-based; selection takes the nearest room, wall or visible opening.
   const hit=origin.tool==='comment'?hits.find(isRoom):hits.find(value=>isRoom(value)||typeof value.object.userData.wallKey==='string'||(typeof value.object.userData.openingKey==='string'&&value.point.y<=cutPlane.current.constant+1e-6));if(!hit)return;
   const data=hit.object.userData,element:PlanElementSelection=isRoom(hit)?{kind:'room',key:data.roomKey}:data.openingKey?{kind:'opening',key:data.openingKey}:{kind:'wall',key:data.wallKey},roomKey=element.key;
   if(origin.tool==='comment'){
    const value=graph.rooms.find(row=>row.key===roomKey);if(!value)return;
    addComment.current?.({roomKey,x:THREE.MathUtils.clamp(hit.point.x*1000,value.rect[0],value.rect[2]),y:THREE.MathUtils.clamp(-hit.point.z*1000,value.rect[1],value.rect[3])});
   }else{selectElement.current?.(element);if(element.kind==='room')select.current(roomKey);}
  };
  const positionPins=()=>{
   const width=renderer.domElement.clientWidth,height=renderer.domElement.clientHeight;
   for(const comment of commentsRef.current){
    const pin=commentPins.current.get(comment.id);if(!pin)continue;
    projected.set(comment.x*.001,.08,-comment.y*.001).project(camera);
    const visible=width>0&&height>0&&projected.z>=-1&&projected.z<=1&&Math.abs(projected.x)<=1&&Math.abs(projected.y)<=1;
    pin.hidden=!visible;
    if(visible){pin.style.left=`${(projected.x*.5+.5)*width}px`;pin.style.top=`${(-projected.y*.5+.5)*height}px`;}
   }
  };
  const lost=(e:Event)=>{e.preventDefault();alive=false;if(captureRef)captureRef.current=null;cancelAnimationFrame(animation);setError('3D context was lost. Your design and 2D drawing are retained.');};
  renderer.domElement.setAttribute('aria-label','Schematic 3D graph preview. Drag to orbit; scroll to zoom. Use room selection for keyboard access.');renderer.domElement.setAttribute('role','img');
  renderer.domElement.addEventListener('pointerdown',start);renderer.domElement.addEventListener('pointerup',end);renderer.domElement.addEventListener('webglcontextlost',lost);
  const layoutLabels=()=>layoutPlanLabels(model,camera,renderer.domElement.clientWidth,renderer.domElement.clientHeight,labelsRef.current.show,labelsRef.current.room);
  let animation=0,alive=true;const render=()=>{animation=0;if(!alive)return;controls.update();layoutLabels();renderer.render(world,camera);positionPins();if(zoomOutput.current)zoomOutput.current.textContent=`${Math.round(camera.zoom*100)}%`;};const requestRender=()=>{if(alive&&!animation)animation=requestAnimationFrame(render);};invalidate.current=requestRender;controls.addEventListener('change',requestRender);requestRender();
  if(captureRef)captureRef.current=()=>{layoutLabels();renderer.render(world,camera);return renderer.domElement;};
  return()=>{alive=false;if(captureRef)captureRef.current=null;rendererRef.current=null;cancelAnimationFrame(animation);invalidate.current=()=>{};resize.disconnect();controls.removeEventListener('change',requestRender);controls.dispose();controlsRef.current=null;cameraRef.current=null;renderer.domElement.removeEventListener('pointerdown',start);renderer.domElement.removeEventListener('pointerup',end);renderer.domElement.removeEventListener('webglcontextlost',lost);disposePlanScene(model);groundGrid.geometry.dispose();for(const material of Array.isArray(groundGrid.material)?groundGrid.material:[groundGrid.material])material.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();scene.current=null;grid.current=null;};
 },[fingerprint,retry]);
 useEffect(()=>{if(!controlsRef.current)return;controlsRef.current.enabled=tool!=='comment';controlsRef.current.mouseButtons.LEFT=tool==='pan'?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE;},[tool,fingerprint,retry]);
 useEffect(()=>{if(fitRequest!==undefined)fit.current('fit');},[fitRequest,fingerprint,retry]);
 useEffect(()=>{
  if(!host.current||!scene.current)return;
  builtCut.current=paintPlanScene(scene.current,grid.current,rendererRef.current,graph,{room,highlights,displayStyle,showGrid,showLabels,cutMm,builtCut:builtCut.current,cutPlane:cutPlane.current});
  invalidate.current();},[room,fingerprint,retry,highlights.join(','),displayStyle,showGrid,showLabels,comments,selectedCommentId,cutMm]);
 const cameraView=(view:'iso'|'top'|'front')=>{setOrientation(view);fit.current(view);};
 const zoomBy=(amount:number)=>{const camera=cameraRef.current,controls=controlsRef.current;if(!camera||!controls)return;camera.zoom=THREE.MathUtils.clamp(camera.zoom+amount,controls.minZoom,controls.maxZoom);camera.updateProjectionMatrix();controls.update();invalidate.current();};
 return <div className={`${styles.root} threeDView`}>
  <div className={`${styles.viewport} threeViewport`}>
   {error&&<div className={`${styles.error} threeError`} role="alert">{error} <Button variant="secondary" onClick={()=>setRetry(n=>n+1)}>Retry 3D</Button></div>}
   <div className={`${styles.stage} plan-three-stage threeStage`} ref={host}/>
   <div className={styles.provenance}>Schematic 3D · graph preview<br/>Zoom in or select a room to read crowded labels.</div>
   <div className={styles.pins} aria-label="Plan comments" hidden={Boolean(error)}>{comments.filter(comment=>comment.status==='open').map(comment=><button key={comment.id} ref={pin=>{if(pin)commentPins.current.set(comment.id,pin);else commentPins.current.delete(comment.id);}} className={styles.pin} type="button" aria-label={`Comment ${comment.number} in ${comment.roomKey}: ${comment.text}`} aria-pressed={selectedCommentId===comment.id} title={comment.text} onClick={()=>onSelectComment?.(comment.id)}>{comment.number}</button>)}</div>
   <div className={styles.orientation} role="group" aria-label="3D orientation">
    <div className={styles.triad}>
     <button className={styles.axisZ} type="button" aria-label="Top view" title="Top" aria-pressed={orientation==='top'} onClick={()=>cameraView('top')}>Z</button>
     <button className={styles.axisX} type="button" aria-label="Front view" title="Front" aria-pressed={orientation==='front'} onClick={()=>cameraView('front')}>X</button>
     <button className={styles.axisY} type="button" aria-label="Isometric view" title="Isometric" aria-pressed={orientation==='iso'} onClick={()=>cameraView('iso')}>Y</button>
    </div>
    <div className={styles.presets} role="group" aria-label="Camera presets">{(['iso','top','front'] as const).map(view=><button key={view} type="button" aria-pressed={orientation===view} onClick={()=>cameraView(view)}>{view.toUpperCase()}</button>)}</div>
   </div>
   <div className={styles.zoomControls} aria-label="3D zoom controls">
    <button type="button" aria-label="Home view" title="Home view" onClick={()=>{setOrientation('iso');fit.current('iso');}}><House aria-hidden="true"/></button>
    <button type="button" aria-label="Zoom out" title="Zoom out" onClick={()=>zoomBy(-.25)}>−</button>
    <output ref={zoomOutput} aria-live="polite">100%</output>
    <button type="button" aria-label="Zoom in" title="Zoom in" onClick={()=>zoomBy(.25)}>+</button>
    <button type="button" aria-label="Fit view" title="Fit view" onClick={()=>fit.current('fit')}><Scan aria-hidden="true"/></button>
   </div>
  </div>
 </div>;
}
