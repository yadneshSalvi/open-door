"use client";

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Line, OrbitControls, RoundedBox } from "@react-three/drei";
import { Suspense, createRef, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { BufferGeometry, DoubleSide, Float32BufferAttribute, OrthographicCamera, Plane, Vector3 } from "three";
import type { Evaluation, EvaluationInput, Pose, RoomObject } from "@/engine/types";
import { fixture } from "@/engine/fixture";
import { clampProgress, trajectoryPose } from "@/lib/playback";
import type { RepairProposal } from "@/engine/repair";
import { objectPolygon, rectangle, transform } from "@/engine/geometry";

interface SceneProps {
  input:EvaluationInput; result:Evaluation|null; repair:RepairProposal|null; selected:string|null; task:"journey"|"door";
  onSelect:(id:string|null)=>void;onMove:(id:string,x:number,y:number)=>void;
  editing:boolean;planView:boolean;progress:number;compare:boolean;dimensions:boolean;
}
type Color=string;
function Box({size,at=[0,0,0],color,radius=.025,opacity=1}:{size:[number,number,number];at?:[number,number,number];color:Color;radius?:number;opacity?:number}) {
  return <RoundedBox args={size} radius={Math.min(radius,...size.map(s=>s/3))} smoothness={3} position={at} castShadow receiveShadow><meshStandardMaterial color={color} roughness={.82} transparent={opacity<1} opacity={opacity}/></RoundedBox>;
}
function Furniture({object,selected,onDown,onMove,onUp,onSelect}:{object:RoomObject;selected:boolean;onDown:(event:ThreeEvent<PointerEvent>)=>void;onMove:(event:ThreeEvent<PointerEvent>)=>void;onUp:(event:ThreeEvent<PointerEvent>)=>void;onSelect:()=>void}) {
  const w=object.width,d=object.depth,h=object.height;
  return <group position={[object.pose.x,0,-object.pose.y]} rotation={[0,object.pose.theta,0]} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onClick={e=>{e.stopPropagation();onSelect();}}>
    {object.kind==="bed"?<>
      <Box size={[w,.22,d]} at={[0,.18,0]} color="#bda381"/>
      <Box size={[w-.035,.19,d-.04]} at={[0,.38,.015]} color="#fffdf2" radius={.07}/>
      <Box size={[w-.04,.075,d*.68]} at={[0,.5,d*.15]} color="#c3cbb4" radius={.035}/>
      <Box size={[w-.05,.06,.2]} at={[0,.55,d*.41]} color="#a5b59c"/>
      <Box size={[w+.025,.72,.075]} at={[0,.38,-d/2+.02]} color="#c9b699"/>
      {[-1,1].map(i=><Box key={i} size={[w*.4,.12,.36]} at={[i*w*.23,.55,-d*.31]} color="#f7f4e9" radius={.065}/>)}
      {[-1,1].map(i=><Box key={i} size={[.07,.13,.07]} at={[i*w*.4,.07,d*.4]} color="#9c8466"/>)}
    </>:object.kind==="table"?<>
      <Box size={[w,.1,d]} at={[0,h-.05,0]} color="#c3a884"/>
      <Box size={[w-.05,h*.54,d-.05]} at={[0,h*.54,0]} color="#d6c1a0"/>
      <Box size={[.16,.018,.025]} at={[0,h*.55,d/2-.02]} color="#806c50"/>
      <mesh position={[0,h+.075,-.035]} castShadow><cylinderGeometry args={[.055,.07,.15,20]}/><meshStandardMaterial color="#ece6d6"/></mesh>
      <mesh position={[0,h+.21,-.035]} castShadow><coneGeometry args={[.13,.17,24]}/><meshStandardMaterial color="#f3eddc"/></mesh>
    </>:object.kind==="bench"?<>
      <Box size={[w,.12,d]} at={[0,h-.06,0]} color="#bca27e"/>
      <Box size={[w-.03,.075,d-.025]} at={[0,h+.01,0]} color="#ddd9c3"/>
      {[-1,1].map(i=><Box key={i} size={[.055,h-.09,d-.06]} at={[i*w*.4,(h-.09)/2,0]} color="#a68d6b"/>)}
    </>:object.kind==="wardrobe"?<>
      <Box size={[w,h,d]} at={[0,h/2,0]} color="#cbbca2"/>
      <Box size={[.028,h-.06,.025]} at={[w/2+.012,h/2,0]} color="#a18c70"/>
      {[-1,1].map(i=><Box key={i} size={[.04,.22,.025]} at={[w/2+.035,h*.48,i*.07]} color="#76694f"/>)}
    </>:<Box size={[w,h,d]} at={[0,h/2,0]} color="#c7b599"/>}
    {selected?<Line points={[[-w/2-.035,.025,-d/2-.035],[w/2+.035,.025,-d/2-.035],[w/2+.035,.025,d/2+.035],[-w/2-.035,.025,d/2+.035],[-w/2-.035,.025,-d/2-.035]]} color="#6c8c73" lineWidth={2.5}/>:null}
  </group>;
}

function CameraMode({planView,width,depth}:{planView:boolean;width:number;depth:number}){
  const {camera,invalidate,size}=useThree();
  useEffect(()=>{camera.position.set(...(planView?[0,10,.001]:[5.6,6.2,6.6]) as [number,number,number]);camera.lookAt(0,0,0);if(camera instanceof OrthographicCamera)camera.zoom=Math.min(size.width/(planView?width+1:Math.hypot(width,depth)+1.3),size.height/(planView?depth+1:Math.max(width,depth)+1.3))*.95;camera.updateProjectionMatrix();invalidate();},[camera,invalidate,planView,size.width,size.height,width,depth]);
  return null;
}
type LabelRefs={pin:RefObject<HTMLDivElement|null>;selected:RefObject<HTMLDivElement|null>;width:RefObject<HTMLDivElement|null>;depth:RefObject<HTMLDivElement|null>;moves:Record<string,RefObject<HTMLDivElement|null>>};
function ProjectLabel({target,position}:{target:RefObject<HTMLDivElement|null>;position:[number,number,number]}){
  const {camera,size}=useThree();const point=useRef(new Vector3());
  useFrame(()=>{if(!target.current)return;point.current.set(...position).project(camera);const half=Math.min(100,(target.current.offsetWidth||100)/2+8);const x=Math.max(half,Math.min(size.width-half,(point.current.x*.5+.5)*size.width));const y=Math.max(35,Math.min(size.height-40,(-point.current.y*.5+.5)*size.height));target.current.style.transform=`translate(${x}px, ${y}px) translate(-50%, -50%)`;target.current.style.visibility=point.current.z>1?"hidden":"visible";});
  return null;
}
function Room({input,result:committedResult,repair,selected,task,onSelect,onMove,editing,planView,progress,compare,dimensions,labels}:SceneProps&{labels:LabelRefs}){
  const {room,profile,journey}=repair?.input??input;
  const result=repair?.evaluation??committedResult;
  const [preview,setPreview]=useState<{id:string;x:number;y:number}|null>(null);
  const dragging=useRef<{id:string;offsetX:number;offsetY:number;startX:number;startY:number;moved:boolean}|null>(null);
  const floorPlane=useRef(new Plane(new Vector3(0,1,0),0));
  const coordinate=(event:ThreeEvent<PointerEvent>)=>{const point=new Vector3();event.ray.intersectPlane(floorPlane.current,point);return{x:point.x+room.width/2,y:room.depth/2-point.z};};
  const startDrag=(object:RoomObject,event:ThreeEvent<PointerEvent>)=>{
    event.stopPropagation();onSelect(object.id);
    if(!editing||object.locked||!object.movable)return;
    const p=coordinate(event);dragging.current={id:object.id,offsetX:object.pose.x-p.x,offsetY:object.pose.y-p.y,startX:object.pose.x,startY:object.pose.y,moved:false};
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  };
  const drag=(event:ThreeEvent<PointerEvent>)=>{
    const active=dragging.current;if(!active)return;event.stopPropagation();
    const p=coordinate(event),x=Math.max(.1,Math.min(room.width-.1,p.x+active.offsetX)),y=Math.max(.1,Math.min(room.depth-.1,p.y+active.offsetY));
    active.moved=true;setPreview({id:active.id,x:Math.round(x*100)/100,y:Math.round(y*100)/100});
  };
  const stop=(event:ThreeEvent<PointerEvent>)=>{
    const active=dragging.current;if(!active)return;event.stopPropagation();
    (event.target as HTMLElement).releasePointerCapture(event.pointerId);
    if(preview&&active.moved)onMove(active.id,preview.x,preview.y);
    dragging.current=null;setPreview(null);
  };
  const route=result?.tasks.journey.path??[];
  const witness=result?.tasks[task].witness;
  const routePose=trajectoryPose(route,progress,journey.start);
  const door=room.door,doorAngle=task==="door"?door.closedAngle+(door.openAngle-door.closedAngle)*clampProgress(progress):door.fixedAngle;
  const arc=Array.from({length:31},(_,i)=>{const a=door.closedAngle+(door.openAngle-door.closedAngle)*i/30;return[door.hinge.x+Math.cos(a)*door.width,.027,-door.hinge.y-Math.sin(a)*door.width] as [number,number,number];});
  const selectedObject=room.objects.find(o=>o.id===selected);
  return <>
    <CameraMode planView={planView} width={room.width} depth={room.depth}/>
    <ambientLight intensity={1.35}/><hemisphereLight args={["#fffaf0","#c6c8b9",1.6]}/>
    <directionalLight position={[-3,7,3]} intensity={2.4} castShadow shadow-mapSize={[2048,2048]} shadow-camera-left={-6} shadow-camera-right={6} shadow-camera-top={6} shadow-camera-bottom={-6} shadow-bias={-.0005}/>
    <group position={[-room.width/2,0,room.depth/2]}>
      <Box size={[room.width+.2,.14,room.depth+.2]} at={[room.width/2,-.1,-room.depth/2]} color="#b7ab96" radius={.04}/>
      <Box size={[room.width,.04,room.depth]} at={[room.width/2,-.01,-room.depth/2]} color="#e9e3d4" radius={.01}/>
      {Array.from({length:15},(_,i)=><Line key={i} points={[[0,.012,-i*room.depth/15],[room.width,.012,-i*room.depth/15]]} color="#d9cfbc" lineWidth={.7}/>)}
      <Box size={[room.width+.08,1.32,.09]} at={[room.width/2,.64,-room.depth-.035]} color="#e7e5da"/>
      <Box size={[.09,1.32,room.depth+.08]} at={[-.035,.64,-room.depth/2]} color="#e3e1d4"/>
      <Box size={[room.width+.08,.04,.13]} at={[room.width/2,1.31,-room.depth-.035]} color="#f8f5eb"/>
      <Box size={[.13,.04,room.depth+.08]} at={[-.035,1.31,-room.depth/2]} color="#f8f5eb"/>
      <Box size={[room.width,.075,.04]} at={[room.width/2,.04,-room.depth+.025]} color="#f9f7ef"/>
      <Box size={[.04,.075,room.depth]} at={[.025,.04,-room.depth/2]} color="#f9f7ef"/>
      <Box size={[1.16,.72,.035]} at={[1.4,.87,-room.depth+.027]} color="#c7d6d0" radius={.003}/>
      {[-1,1].map(i=><Box key={i} size={[.045,.77,.07]} at={[1.4+i*.6,.87,-room.depth+.035]} color="#f9f6e9" radius={.003}/>)}
      <Box size={[1.23,.045,.08]} at={[1.4,.48,-room.depth+.045]} color="#f9f6e9"/><Box size={[1.23,.045,.06]} at={[1.4,1.25,-room.depth+.045]} color="#f9f6e9"/>
      <Box size={[.025,.75,.06]} at={[1.4,.87,-room.depth+.045]} color="#f9f6e9"/>
      <Box size={[1.3,.04,.18]} at={[1.4,.46,-room.depth+.09]} color="#cbbba1"/>
      {/* A flat textile is decorative only; it does not change collision geometry. */}
      <Box size={[2.2,.006,1.95]} at={[2.7,.018,-1.95]} color="#e1dbc9" radius={.035}/>
      {room.objects.map(object=><Furniture key={object.id} object={preview?.id===object.id?{...object,pose:{...object.pose,x:preview.x,y:preview.y}}:object} selected={selected===object.id||Boolean(repair?.moves.some(m=>m.objectId===object.id))} onDown={e=>startDrag(object,e)} onMove={drag} onUp={stop} onSelect={()=>onSelect(object.id)}/>)}
      {compare?fixture.room.objects.filter(o=>{const current=room.objects.find(c=>c.id===o.id);return current&&(current.pose.x!==o.pose.x||current.pose.y!==o.pose.y);}).map(o=><Line key={o.id} points={[...objectPolygon(o),objectPolygon(o)[0]].map(p=>[p.x,.035,-p.y])} color="#a3a69b" dashed dashSize={.04} gapSize={.03} lineWidth={1.7}/>):null}
      {repair?<RepairGhosts proposal={repair} original={input}/>:null}
      <group position={[door.hinge.x,0,-door.hinge.y]} rotation={[0,doorAngle,0]}>
        <Box size={[door.width,.7,door.thickness]} at={[door.width/2,.35,0]} color="#cdbb98" opacity={task==="door"?.72:.35}/>
        <Box size={[.045,.045,.07]} at={[door.width-.09,.38,.035]} color="#9d8962"/>
      </group>
      <Line points={arc} color={result?.tasks.door.status==="verified_feasible"?"#598b70":"#c89a5b"} dashed dashSize={.06} gapSize={.04} lineWidth={1.6}/>
      {route.length>1?<><SweptFootprint path={route} width={profile.width} length={profile.length}/><Line points={route.map(p=>[p.x,.045,-p.y])} color="#4e9879" lineWidth={3}/></>:null}
      <mesh position={[journey.start.x,.03,-journey.start.y]} rotation={[-Math.PI/2,0,0]}><ringGeometry args={[.055,.075,32]}/><meshBasicMaterial color="#547c65"/></mesh>
      {task==="journey"?<Footprint pose={routePose} width={profile.width} length={profile.length} color={route.length?"#4a9576":"#98ac9a"}/>:null}
      {witness?<>
        <Line points={[...witness.footprint,witness.footprint[0]].map(p=>[p.x,.055,-p.y])} color="#c88d44" lineWidth={3}/>
        {task==="journey"?<Footprint pose={witness.pose} width={profile.width} length={profile.length} color="#ca9655"/>:null}
      </>:null}
      {dimensions?<>
        <Line points={[[0,.02,.28],[room.width,.02,.28]]} color="#8c947f" lineWidth={1}/>
        <Line points={[[room.width+.27,.02,0],[room.width+.27,.02,-room.depth]]} color="#8c947f" lineWidth={1}/>
      </>:null}
    </group>
    {witness?<ProjectLabel target={labels.pin} position={[witness.pose.x-room.width/2,.83,room.depth/2-witness.pose.y]}/>:null}
    {selectedObject&&!witness?<ProjectLabel target={labels.selected} position={[selectedObject.pose.x-room.width/2,selectedObject.height+.2,room.depth/2-selectedObject.pose.y]}/>:null}
    {repair?.moves.map(move=><ProjectLabel key={move.objectId} target={labels.moves[move.objectId]} position={[(move.from.x+move.to.x)/2-room.width/2,.62,room.depth/2-(move.from.y+move.to.y)/2]}/>)}
    {dimensions?<><ProjectLabel target={labels.width} position={[0,.025,room.depth/2+.3]}/><ProjectLabel target={labels.depth} position={[room.width/2+.28,.025,0]}/></>:null}
    <ContactShadows position={[0,-.19,0]} opacity={.3} scale={10} blur={2.5} far={6} resolution={256} frames={1}/>
    <OrbitControls makeDefault enablePan={false} enableRotate={!editing&&!planView} minZoom={25} maxZoom={180} minPolarAngle={.2} maxPolarAngle={Math.PI/2.6} target={[0,.2,0]}/>
  </>;
}
function Footprint({pose,width,length,color}:{pose:Pose;width:number;length:number;color:string}){
  const points:[number,number,number][]=[[-length/2,.05,-width/2],[length/2,.05,-width/2],[length/2,.05,width/2],[-length/2,.05,width/2],[-length/2,.05,-width/2]];
  return <group position={[pose.x,0,-pose.y]} rotation={[0,pose.theta,0]}>
    <mesh position={[0,.035,0]} rotation={[-Math.PI/2,0,0]}><planeGeometry args={[length,width]}/><meshBasicMaterial color={color} transparent opacity={.13} depthWrite={false}/></mesh>
    <Line points={points} color={color} lineWidth={2}/>
    <Line points={[[-.1,.06,.1],[.08,.06,0],[-.1,.06,-.1]]} color={color} lineWidth={2}/>
  </group>;
}
function SweptFootprint({path,width,length}:{path:Pose[];width:number;length:number}){
  const geometry=useMemo(()=>{
    const vertices:number[]=[];
    const outlines=path.map(pose=>transform(rectangle(length,width),pose));
    const triangle=(a:{x:number;y:number},b:{x:number;y:number},c:{x:number;y:number})=>vertices.push(a.x,.025,-a.y,b.x,.025,-b.y,c.x,.025,-c.y);
    if(outlines[0]){triangle(outlines[0][0],outlines[0][1],outlines[0][2]);triangle(outlines[0][0],outlines[0][2],outlines[0][3]);}
    for(let i=1;i<outlines.length;i++)for(let edge=0;edge<4;edge++){
      const a=outlines[i-1][edge],b=outlines[i-1][(edge+1)%4],c=outlines[i][(edge+1)%4],d=outlines[i][edge];triangle(a,b,c);triangle(a,c,d);
    }
    const buffer=new BufferGeometry();buffer.setAttribute("position",new Float32BufferAttribute(vertices,3));return buffer;
  },[path,width,length]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <mesh geometry={geometry}><meshBasicMaterial color="#5eaa86" transparent opacity={.075} side={DoubleSide} depthWrite={false}/></mesh>;
}
function RepairGhosts({proposal,original}:{proposal:RepairProposal;original:EvaluationInput}){
  return <>{proposal.moves.map(move=>{
    const object=original.room.objects.find(o=>o.id===move.objectId)!;
    const polygon=objectPolygon(object),dx=move.to.x-move.from.x,dy=move.to.y-move.from.y;
    const angle=Math.atan2(dy,dx),tip=move.to,arrow=.1;
    return <group key={move.objectId}>
      <Line points={[...polygon,polygon[0]].map(p=>[p.x,.06,-p.y])} color="#bd935d" dashed dashSize={.045} gapSize={.025} lineWidth={2}/>
      <group position={[move.from.x,object.height/2,-move.from.y]} rotation={[0,move.from.theta,0]}><mesh><boxGeometry args={[object.width,object.height,object.depth]}/><meshBasicMaterial color="#bb986c" wireframe transparent opacity={.25}/></mesh></group>
      {move.distanceM>.001?<><Line points={[[move.from.x,.08,-move.from.y],[move.to.x,.08,-move.to.y]]} color="#3e8569" lineWidth={2.5}/><Line points={[[tip.x-arrow*Math.cos(angle-.5),.08,-tip.y+arrow*Math.sin(angle-.5)],[tip.x,.08,-tip.y],[tip.x-arrow*Math.cos(angle+.5),.08,-tip.y+arrow*Math.sin(angle+.5)]]} color="#3e8569" lineWidth={2.5}/></>:null}
    </group>;
  })}</>;
}
export default function RoomScene(props:SceneProps){
  const moveLabels=useMemo(()=>Object.fromEntries((props.repair?.moves??[]).map(move=>[move.objectId,createRef<HTMLDivElement>()])),[props.repair]);
  const labels:LabelRefs={pin:useRef<HTMLDivElement>(null),selected:useRef<HTMLDivElement>(null),width:useRef<HTMLDivElement>(null),depth:useRef<HTMLDivElement>(null),moves:moveLabels};
  const witness=(props.repair?.evaluation??props.result)?.tasks[props.task].witness,object=props.input.room.objects.find(o=>o.id===props.selected);
  return <div className="canvas-wrap" aria-label="Interactive three-dimensional room. The translucent ribbon shows sampled occupied footprints along the verified trajectory. Use the object list for keyboard editing."><Canvas orthographic shadows="percentage" camera={{position:[5.6,6.2,6.6],zoom:88,near:.1,far:60}} dpr={[1,2]} gl={{antialias:true,alpha:true}} onPointerMissed={()=>props.onSelect(null)}><Suspense fallback={null}><Room {...props} labels={labels}/></Suspense></Canvas>
    {witness?<div ref={labels.pin} className="scene-projection"><div className="scene-pin"><span>{props.task==="journey"?"01":"02"}</span>{witness.objectName}<small>{witness.kind==="buffer"?"Clearance buffer":"Geometric interference"}</small></div></div>:null}
    {object&&!witness?<div ref={labels.selected} className="scene-projection"><div className="object-pin">{object.name}{object.locked?" · locked":""}</div></div>:null}
    {props.repair?.moves.map(move=><div key={move.objectId} ref={moveLabels[move.objectId]} className="scene-projection"><span className="move-distance-label" title={`${move.objectName}: placement displacement, furniture travel is not assessed`}>{cm(move.distanceM)} cm{move.rotationRad>.001?` · ${Math.round(move.rotationRad*180/Math.PI)}°`:""}<small>{move.objectName}</small></span></div>)}
    {props.dimensions?<><div ref={labels.width} className="scene-projection"><span className="dimension-label">{cm(props.input.room.width)} cm</span></div><div ref={labels.depth} className="scene-projection"><span className="dimension-label">{cm(props.input.room.depth)} cm</span></div></>:null}
  </div>;
}
const cm=(value:number)=>Math.round(value*100);
