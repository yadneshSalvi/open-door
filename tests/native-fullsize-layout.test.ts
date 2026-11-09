import {describe,it,expect} from 'vitest';
import {chooseFullSizeDock,dockBounds,floorLabelCandidates,planeBounds,safeDockPose} from '../lens-src/SpatialDockLayout';
import {annotationBounds,annotationLeaderSafe,annotationsOverlap,chooseAnnotation} from '../lens-src/SpatialAnnotationLayout';
import {wheelchairLabelAnchor,wheelchairLabelAnchors,wheelchairParts} from '../lens-src/SpatialPresentation';
import {estimatedCapHeight,SPATIAL_UI} from '../lens-src/SpatialUIContract';
import recorded from './fixtures/native-layout-006.json';

// Recorded Preview C pose and calibrated projection, not a physical-device test.
const eye={x:-550.0001220703125,y:40.00000762939453,z:-875.0001220703125};
const normal={x:-.5791288614273071,y:.31272971630096436,z:-.752867579460144};
const right={x:-.7926238775253296,y:5.1672856216100627e-8,z:.6097106337547302};
const up={x:normal.y*right.z-normal.z*right.y,y:normal.z*right.x-normal.x*right.z,z:normal.x*right.y-normal.y*right.x};
const frame={right,up,normal},dot=(a:any,b:any)=>a.x*b.x+a.y*b.y+a.z*b.z;
const project=(p:any)=>{const d={x:p.x-eye.x,y:p.y-eye.y,z:p.z-eye.z},depth=-dot(d,normal);return{x:.5+.76236556*dot(d,right)/depth,y:.5-1.35641665*dot(d,up)/depth};};
const world=(x:number,y:number,h=0)=>({x:-190-100*x,y:-135.7+h,z:-780+100*y});
const subjects=[
  {left:.5306716723,right:.7668295937,top:.4239478869,bottom:.8631602364},
  {left:.4825760884,right:.6036416130,top:.3867034478,bottom:.5883611875},
  {left:.3176801367,right:.5451186733,top:.0298831029,bottom:.6167291241},
  {left:.4803910418,right:.7092200356,top:.2455831332,bottom:.7101461725},
];
const edges=Array.from({length:5},(_,i)=>[world(2.2*i/4,1.4),world(2.2*i/4,3.4),world(0,1.4+2*i/4),world(2.2,1.4+2*i/4)]).flat();

const distance=(a:any,b:any)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
function observedView(snapshot:typeof recorded.snapshots.fullWide){
  const {position:eye,forward:normal,right}=snapshot.cameraFrame;
  const up={x:normal.y*right.z-normal.z*right.y,y:normal.z*right.x-normal.x*right.z,z:normal.x*right.y-normal.y*right.x};
  const project=(p:any)=>{const d={x:p.x-eye.x,y:p.y-eye.y,z:p.z-eye.z},depth=-dot(d,normal);return{x:.5+.76236556*dot(d,right)/depth,y:.5-1.35641665*dot(d,up)/depth};};
  return {eye,frame:{right,up,normal},project,objects:snapshot.subjects.map(s=>s.box),controls:snapshot.controls.map(s=>s.box)};
}

describe('real-size projected controls',()=>{
  it('replaces the offscreen body dock with a clear patch-edge pose at the actual C view',()=>{
    const look={x:-normal.x,y:-normal.y,z:-normal.z},pose=chooseFullSizeDock(eye,look,frame,edges,3,project,subjects)!;
    expect(pose).not.toBeNull();expect(pose.mode).toBe('patch-edge');expect(pose.scale).toBeGreaterThanOrEqual(1);
    const box=dockBounds(pose,3,frame,project)!;expect(box.top).toBeGreaterThanOrEqual(.025);expect(box.bottom).toBeLessThanOrEqual(.975);
    for(const subject of subjects)expect(annotationsOverlap(box,subject)).toBe(false);
    expect(chooseFullSizeDock(eye,look,frame,edges,3,project,subjects,pose)).toBe(pose);
    // A subsequently moving chair invalidates the old slot; it is never reported placed.
    expect(safeDockPose(pose,3,frame,project,[...subjects,box])).toBe(false);
    expect(chooseFullSizeDock(eye,look,frame,edges,3,project,[{left:0,right:1,top:0,bottom:1}],pose)).toBeNull();
  });
  it('projects the recorded bed bounds and keeps a route floor region clear too',()=>{
    const bed=annotationBounds([2,2.2].flatMap(x=>[1.4,3.32].flatMap(y=>[0,56].map(h=>project(world(x,y,h))))))!;
    expect(bed.left).toBeCloseTo(subjects[0].left,5);expect(bed.bottom).toBeCloseTo(subjects[0].bottom,5);
    const route=annotationBounds([.718,1.947].flatMap(x=>[1.4,3.208].map(y=>project(world(x,y,1.2)))))!;
    const pose=chooseFullSizeDock(eye,{x:-normal.x,y:-normal.y,z:-normal.z},frame,edges,3,project,[...subjects,route]);
    expect(pose).not.toBeNull();expect(annotationsOverlap(dockBounds(pose!,3,frame,project)!,route)).toBe(false);
  });
  it('anchors the chair leader on the actual backrest at every supplied size',()=>{
    for(const profile of [{width:.66,length:1.05,height:1.1},{width:.71,length:1.2,height:1.3}]){
      const p=wheelchairLabelAnchor(profile),back=wheelchairParts(profile).find(part=>part.name==='Backrest')!;
      expect(p.x).toBe(back.position.x);expect(p.z).toBe(back.position.z);expect(p.y).toBeCloseTo(back.position.y+back.size.y/2,12);
      expect(p.y).toBeLessThan(profile.height*100);expect(p.y*.1).toBeLessThan(11);
    }
  });
  it('fits the combined low bedside/door sign at C without covering the room or dock',()=>{
    const route=annotationBounds([.718,1.947].flatMap(x=>[1.4,3.208].map(y=>project(world(x,y,1.2)))))!;
    const protectedBoxes=[...subjects,route],dock=chooseFullSizeDock(eye,{x:-normal.x,y:-normal.y,z:-normal.z},frame,edges,3,project,protectedBoxes)!;
    protectedBoxes.push(dockBounds(dock,3,frame,project)!);
    const occupied:any[]=[];
    for(const [width,anchors] of [[16,[world(.16,1.4,2.5)]]] as const){
      const candidates=floorLabelCandidates([...anchors],eye,right).map(item=>{
        const distance=Math.hypot(item.point.x-eye.x,item.point.y-eye.y,item.point.z-eye.z),scale=Math.max(1,distance*Math.tan(.6*Math.PI/180)/estimatedCapHeight(SPATIAL_UI.captionText));
        return {...item,cost:Math.hypot(item.point.x-item.anchor.x,item.point.y-item.anchor.y,item.point.z-item.anchor.z),box:planeBounds(item.point,width,4.5,scale,frame,project)};
      });
      const index=chooseAnnotation(candidates,protectedBoxes,occupied,-1,.015);expect(index).toBeGreaterThanOrEqual(0);
      const chosen=candidates[index];expect(chosen.cost).toBeLessThanOrEqual(40);expect(chosen.point.y-chosen.anchor.y).toBeLessThanOrEqual(32);
      occupied.push(chosen.box);
    }
  });
  it('fits the near-edge sign against actual source006 C objects, controls and leader crossings',()=>{
    const v=observedView(recorded.snapshots.fullWide),anchors=edges.map(p=>({...p,y:p.y+1.5})).sort((a,b)=>distance(a,v.eye)-distance(b,v.eye)).slice(0,4);
    const candidates=floorLabelCandidates(anchors,v.eye,v.frame.right).map(item=>{
      const scale=Math.max(1,distance(item.point,v.eye)*Math.tan(.6*Math.PI/180)/estimatedCapHeight(SPATIAL_UI.captionText));
      const aboveFloor=item.point.y-Math.abs(v.frame.up.y)*4.5*scale/2>=-135.5;
      const leader={from:v.project(item.point),to:v.project(item.anchor)};
      const safe=aboveFloor&&annotationLeaderSafe(leader,v.objects,v.controls);
      return {...item,scale,cost:distance(item.point,item.anchor),box:safe?planeBounds(item.point,16,4.5,scale,v.frame,v.project):null};
    });
    const index=chooseAnnotation(candidates,[...v.objects,...v.controls],[],-1,.015);expect(index).toBeGreaterThanOrEqual(0);
    const chosen=candidates[index];expect(chosen.cost).toBeLessThanOrEqual(40);expect(chosen.box!.bottom).toBeLessThan(.975);
    expect(chosen.point.y-Math.abs(v.frame.up.y)*4.5*chosen.scale/2).toBeGreaterThanOrEqual(-135.5);
  });
  it('keeps the dock hidden at the actual close turn-circle view instead of covering chair or route',()=>{
    const v=observedView(recorded.snapshots.fullTurnCircle),pose=chooseFullSizeDock(v.eye,{x:-v.frame.normal.x,y:-v.frame.normal.y,z:-v.frame.normal.z},v.frame,edges,3,v.project,v.objects);
    expect(pose).toBeNull();expect(recorded.snapshots.fullTurnCircle.dockVisibility.visible).toBe(false);
  });
  it('places the final miniature status beside a real backrest corner within10cm',()=>{
    const v=observedView(recorded.snapshots.miniEndpoint),profile={width:.66,length:1.05,height:1.1};
    const anchors=wheelchairLabelAnchors(profile).map(p=>({x:-35.8+p.z*.1,y:-141.8+p.y*.1,z:-483.3-p.x*.1}));
    const candidates=anchors.map(anchor=>{
      const point={x:anchor.x-v.frame.up.x*9.7,y:anchor.y-v.frame.up.y*9.7,z:anchor.z-v.frame.up.z*9.7};
      const leader={from:v.project(point),to:v.project(anchor)};
      return {anchor,point,cost:distance(anchor,point),box:annotationLeaderSafe(leader,v.objects,v.controls)?planeBounds(point,10,3.2,1,v.frame,v.project):null};
    });
    const index=chooseAnnotation(candidates,[...v.objects,...v.controls],[],-1,.015);expect(index).toBeGreaterThan(0);
    const chosen=candidates[index];expect(chosen.cost).toBeLessThanOrEqual(10);
    expect(chosen.anchor.y).toBeCloseTo(-133.22,5);
    for(const subject of v.objects)expect(annotationsOverlap(chosen.box!,subject)).toBe(false);
  });
});
