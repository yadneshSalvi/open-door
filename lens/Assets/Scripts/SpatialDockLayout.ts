import {AnnotationBox,AnnotationPlane,AnnotationVector,annotationBounds,annotationsOverlap} from './SpatialAnnotationLayout';
import {SPATIAL_UI as UI,dockWidth,estimatedCapHeight} from './SpatialUIContract';
import {sideDockPosition} from './SpatialExperiencePolicy';

type Point=AnnotationVector;
export type DockPose={position:Point;scale:number;vertical:boolean;mode:'body-side'|'patch-edge'};
export const SETTINGS_READOUT={width:12.5,height:3.2,gap:2.5};
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
export function dockSize(count:number,vertical:boolean){
  return vertical?{width:UI.buttonWidth+.6,height:count*UI.buttonHeight+Math.max(0,count-1)*(UI.gap+.5)+.6}:{width:dockWidth(count)+.6,height:UI.buttonHeight+.6};
}
/** A settings value belongs beside its dock, without adding another hit target. */
export function settingsReadoutCandidates(position:Point,frame:AnnotationPlane,count:number,vertical:boolean,scale=1):Point[]{
  const dock=dockSize(count,vertical),x=dock.width/2+SETTINGS_READOUT.width/2+SETTINGS_READOUT.gap,y=dock.height/2+SETTINGS_READOUT.height/2+SETTINGS_READOUT.gap;
  return [[0,y],[x,0],[-x,0],[x,3],[-x,3],[0,-y]].map(([dx,dy])=>({
    x:position.x+(frame.right.x*dx+frame.up.x*dy)*scale,
    y:position.y+(frame.right.y*dx+frame.up.y*dy)*scale,
    z:position.z+(frame.right.z*dx+frame.up.z*dy)*scale,
  }));
}
/** The same level billboard basis is used for projection and native rendering. */
export function dockBounds(pose:DockPose,count:number,frame:AnnotationPlane,project:(point:Point)=>{x:number;y:number}):AnnotationBox|null {
  const size=dockSize(count,pose.vertical);
  return planeBounds(pose.position,size.width,size.height,pose.scale,frame,project);
}
export function planeBounds(p:Point,width:number,height:number,scale:number,frame:AnnotationPlane,project:(point:Point)=>{x:number;y:number}):AnnotationBox|null {
  const points=[];
  for(const x of [-1,1])for(const y of [-1,1])points.push(project({
    x:p.x+(frame.right.x*x*width+frame.up.x*y*height)*scale/2,
    y:p.y+(frame.right.y*x*width+frame.up.y*y*height)*scale/2,
    z:p.z+(frame.right.z*x*width+frame.up.z*y*height)*scale/2,
  }));
  return annotationBounds(points);
}
/** Low, camera-side signs within40cm of an actual floor edge. */
export function floorLabelCandidates(anchors:Point[],eye:Point,right:Point):{point:Point;anchor:Point}[]{
  const result:{point:Point;anchor:Point}[]=[];
  for(const anchor of anchors){
    const dx=eye.x-anchor.x,dz=eye.z-anchor.z,l=Math.hypot(dx,dz);if(l<.001)continue;
    for(const height of [16,24,32,8,4])for(const lateral of [0,-12,12,-24,24,-32,32])for(const toward of [8,20,30,38]){
      const point={x:anchor.x+right.x*lateral+dx/l*toward,y:anchor.y+height,z:anchor.z+right.z*lateral+dz/l*toward};
      if(distance(point,anchor)<=40)result.push({point,anchor});
    }
  }
  return result;
}
export function safeDockPose(pose:DockPose,count:number,frame:AnnotationPlane,project:(point:Point)=>{x:number;y:number},subjects:AnnotationBox[]){
  const b=dockBounds(pose,count,frame,project);
  return Boolean(b&&b.left>=.025&&b.right<=.975&&b.top>=.025&&b.bottom<=.975&&!subjects.some(other=>annotationsOverlap(b,other)));
}
/** Prefer the existing clear pose. A closeup with no safe slot returns null. */
export function chooseFullSizeDock(eye:Point,look:Point,frame:AnnotationPlane,edges:Point[],count:number,project:(point:Point)=>{x:number;y:number},subjects:AnnotationBox[],previous:DockPose|null=null):DockPose|null {
  if(count<1)return null;
  if(previous&&(previous.mode==='patch-edge'||distance(previous.position,sideDockPosition(eye,look))<35)&&safeDockPose(previous,count,frame,project,subjects))return previous;
  for(const side of [1,-1]){
    const pose:DockPose={position:sideDockPosition(eye,look,side),scale:1,vertical:false,mode:'body-side'};
    if(safeDockPose(pose,count,frame,project,subjects))return pose;
  }
  const sorted=edges.slice().sort((a,b)=>distance(eye,a)-distance(eye,b));
  for(const anchor of sorted){
    const dx=eye.x-anchor.x,dz=eye.z-anchor.z,l=Math.hypot(dx,dz);if(l<.001)continue;
    // These are display docks beside a measured patch, not new floor/room input.
    // A vertical arrangement retains the same three physical targets and type.
    for(const vertical of [false,true])for(const height of vertical?[90,75,55,30]:[30,55,75,90])for(const offset of [0,20,40,55,-20,-35]){
      const position={x:anchor.x+dx/l*offset,y:anchor.y+height,z:anchor.z+dz/l*offset};
      const scale=Math.max(1,distance(eye,position)*Math.tan(.6*Math.PI/180)/estimatedCapHeight(UI.buttonText));
      const pose:DockPose={position,scale,vertical,mode:'patch-edge'};
      if(safeDockPose(pose,count,frame,project,subjects))return pose;
    }
  }
  return null;
}
