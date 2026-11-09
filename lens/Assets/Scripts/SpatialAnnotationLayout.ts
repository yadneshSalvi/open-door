/** Projection-space checks for annotation placement only; never collision geometry. */
export type AnnotationBox={left:number;right:number;top:number;bottom:number};
export type AnnotationVector={x:number;y:number;z:number};
export type AnnotationPlane={right:AnnotationVector;up:AnnotationVector;normal:AnnotationVector};
/** Shared physical plane for rendered labels and their projected exclusion bounds. */
export function annotationFrame(camera:AnnotationVector,at:AnnotationVector,floorAligned=false,view?:AnnotationPlane){
  if(view&&!floorAligned)return view;
  const dx=camera.x-at.x,dy=camera.y-at.y,dz=camera.z-at.z,length=Math.hypot(dx,dy,dz);
  if(!Number.isFinite(length)||length<1e-8)return null;
  const horizontal=Math.hypot(dx,dz),right=horizontal>1e-8?{x:dz/horizontal,y:0,z:-dx/horizontal}:{x:1,y:0,z:0};
  const normal=floorAligned?{x:0,y:1,z:0}:{x:dx/length,y:dy/length,z:dz/length};
  const up=floorAligned?(horizontal>1e-8?{x:-dx/horizontal,y:0,z:-dz/horizontal}:{x:0,y:0,z:-1}):{x:normal.y*right.z-normal.z*right.y,y:normal.z*right.x-normal.x*right.z,z:normal.x*right.y-normal.y*right.x};
  return {right,up,normal};
}
export function annotationBounds(points:{x:number;y:number}[],padding=.008):AnnotationBox|null {
  if(!points.length||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  return {left:Math.min(...points.map(p=>p.x))-padding,right:Math.max(...points.map(p=>p.x))+padding,top:Math.min(...points.map(p=>p.y))-padding,bottom:Math.max(...points.map(p=>p.y))+padding};
}
export function annotationsOverlap(a:AnnotationBox,b:AnnotationBox){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
/** Physical camera-facing rectangle; all components are copied explicitly for native vec3 getters. */
export function projectedPlate(at:AnnotationVector,camera:AnnotationVector,width:number,height:number,project:(point:AnnotationVector)=>{x:number;y:number},padding=.008):AnnotationBox|null {
  const frame=annotationFrame(camera,at);if(!frame)return null;
  const points=[];
  for(const x of [-1,1])for(const y of [-1,1])points.push(project({x:at.x+frame.right.x*x*width/2+frame.up.x*y*height/2,y:at.y+frame.right.y*x*width/2+frame.up.y*y*height/2,z:at.z+frame.right.z*x*width/2+frame.up.z*y*height/2}));
  return annotationBounds(points,padding);
}
/** A contextual command may not cover even the object it acts on. Null means use the dock. */
export function safeSpatialTarget(anchor:AnnotationVector,camera:AnnotationVector,preferred:AnnotationVector,width:number,height:number,project:(point:AnnotationVector)=>{x:number;y:number},subjects:AnnotationBox[],occupied:AnnotationBox[]=[],limitCm=10):AnnotationVector|null {
  const frame=annotationFrame(camera,anchor);if(!frame)return null;
  const scale=limitCm/10,offsets=[[0,8,4],[-6,6,4],[6,6,4],[-8,3,4],[8,3,4],[-8,-3,4],[8,-3,4],[0,-8,4],[-6,-6,4],[6,-6,4],[0,0,9]];
  const points:AnnotationVector[]=[{x:preferred.x,y:preferred.y,z:preferred.z},...offsets.map(([x,y,z])=>({x:anchor.x+(frame.right.x*x+frame.up.x*y+frame.normal.x*z)*scale,y:anchor.y+(frame.right.y*x+frame.up.y*y+frame.normal.y*z)*scale,z:anchor.z+(frame.right.z*x+frame.up.z*y+frame.normal.z*z)*scale}))].filter(p=>Math.hypot(p.x-anchor.x,p.y-anchor.y,p.z-anchor.z)<=limitCm+1e-6);
  const candidates=points.map(point=>{const segment={from:project(point),to:project(anchor)},unsafeLeader=subjects.filter(box=>segmentCrossesBox(segment,box)).length>2||occupied.some(box=>segmentCrossesBox(segment,box));return {box:unsafeLeader?null:projectedPlate(point,camera,width+.6,height+.6,project),cost:Math.hypot(point.x-anchor.x,point.y-anchor.y,point.z-anchor.z)};});
  const index=chooseAnnotation(candidates,subjects,occupied,-1,.015);return index<0?null:points[index];
}
/** Retain a valid previous slot, otherwise choose the nearest supplied safe slot. */
export function chooseAnnotation(candidates:{box:AnnotationBox|null;cost:number}[],protectedBoxes:AnnotationBox[],occupied:AnnotationBox[],previous=-1,margin=.025,required=false):number {
  const safe=(index:number)=>{const box=candidates[index]?.box;return Boolean(box&&box.left>=margin&&box.right<=1-margin&&box.top>=margin&&box.bottom<=1-margin&&!protectedBoxes.some(o=>annotationsOverlap(box,o))&&!occupied.some(o=>annotationsOverlap(box,o)));};
  if(previous>=0&&safe(previous))return previous;
  let best=-1,cost=Infinity;for(let i=0;i<candidates.length;i++)if(safe(i)&&candidates[i].cost<cost){best=i;cost=candidates[i].cost;}
  // Required labels follow exactly the same safety policy. Native acceptance
  // must resolve an unplaced required label; it may not cover the subject.
  return best;
}

export type ScreenPoint={x:number;y:number};
export type ScreenSegment={from:ScreenPoint;to:ScreenPoint};
export function segmentCrossesBox(segment:ScreenSegment,box:AnnotationBox):boolean {
  let lo=0,hi=1;const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y;
  for(const [p,q] of [[-dx,segment.from.x-box.left],[dx,box.right-segment.from.x],[-dy,segment.from.y-box.top],[dy,box.bottom-segment.from.y]]){
    if(Math.abs(p)<1e-12){if(q<0)return false;continue;}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;
  }
  return lo<hi&&hi>0&&lo<1;
}
export function leadersCross(a:ScreenSegment,b:ScreenSegment):boolean {
  const cross=(p:ScreenPoint,q:ScreenPoint,r:ScreenPoint)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
  return cross(a.from,a.to,b.from)*cross(a.from,a.to,b.to)<-1e-12&&cross(b.from,b.to,a.from)*cross(b.from,b.to,a.to)<-1e-12;
}

/** Count the anchor object plus at most one other object, using the same rule in native QA. */
export function annotationLeaderSafe(segment:ScreenSegment,objects:AnnotationBox[],controls:AnnotationBox[],occupied:AnnotationBox[]=[],leaders:ScreenSegment[]=[]):boolean {
  return !occupied.some(box=>segmentCrossesBox(segment,box))
    &&!controls.some(box=>segmentCrossesBox(segment,box))
    &&!leaders.some(line=>leadersCross(segment,line))
    &&objects.filter(box=>segmentCrossesBox(segment,box)).length<=2;
}

/** A line's local Y is its actual endpoint direction, not a projected approximation. */
export function leaderGeometry(from:AnnotationVector,to:AnnotationVector,camera:AnnotationVector,trimCm=0){
  const delta={x:to.x-from.x,y:to.y-from.y,z:to.z-from.z},distance=Math.hypot(delta.x,delta.y,delta.z);
  if(!Number.isFinite(distance)||distance<=Math.max(.001,trimCm))return null;
  const up={x:delta.x/distance,y:delta.y/distance,z:delta.z/distance},length=distance-Math.max(0,trimCm);
  const center={x:to.x-up.x*length/2,y:to.y-up.y*length/2,z:to.z-up.z*length/2},eye={x:camera.x-center.x,y:camera.y-center.y,z:camera.z-center.z};
  const dot=eye.x*up.x+eye.y*up.y+eye.z*up.z;let normal={x:eye.x-up.x*dot,y:eye.y-up.y*dot,z:eye.z-up.z*dot},n=Math.hypot(normal.x,normal.y,normal.z);
  if(n<1e-6){normal=Math.abs(up.x)<.9?{x:0,y:up.z,z:-up.y}:{x:-up.z,y:0,z:up.x};n=Math.hypot(normal.x,normal.y,normal.z);}
  normal={x:normal.x/n,y:normal.y/n,z:normal.z/n};
  return {center,up,normal,length};
}
