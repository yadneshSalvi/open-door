import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {rearEdgeSnap,dragDistanceLabel} from '../lens-src/SpatialDragFeedback';
import {sampledRibbon,triangulateRibbon} from '../lens-src/SpatialRouteRibbon';
import {fullSizeRoomPosition,rotateFloor} from '../lens-src/SpatialPresentation';
import {clipFloorPolygon,doorEdgeMarker,pointInCorner} from '../lens-src/SpatialCorner';
const Core=createRequire(import.meta.url)('../lens-src/OpenDoorCore.js');
const area=(points:{x:number;y:number}[])=>points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-p.y*q.x;},0)/2;
const trianglesArea=(points:{x:number;y:number}[],indices:number[])=>{let sum=0;for(let i=0;i<indices.length;i+=3)sum+=Math.abs(area(indices.slice(i,i+3).map(n=>points[n])));return sum;};

describe('real drag affordance around unchanged placement checks',()=>{
  it('snaps only a nearby valid rear edge, preserving the other coordinate and orientation',()=>{
    const input=Core.cloneInput(),table=input.room.objects[1],wardrobe=input.room.objects[3],before=JSON.stringify(input);
    const valid=(p:any)=>Core.placementIssue(input.room,'table',p.x,p.y,p.theta)===null;
    const snap=rearEdgeSnap(table,wardrobe,{x:.91,y:3,theta:0},valid)!;
    expect(snap.pose).toEqual({x:.91,y:3.01,theta:0});expect(snap.distanceM).toBeCloseTo(.01);
    expect(snap.pose.y+table.depth/2).toBeCloseTo(wardrobe.pose.y+wardrobe.depth/2);
    expect(rearEdgeSnap(table,wardrobe,{x:.91,y:2.98,theta:0},valid)).toBeNull();
    expect(rearEdgeSnap(table,wardrobe,{x:.5,y:3,theta:0},valid)).toBeNull();
    expect(rearEdgeSnap(table,wardrobe,{x:.91,y:3,theta:Math.PI/4},valid)).toBeNull();
    expect(dragDistanceLabel({x:1,y:1,theta:0},{x:1.12,y:1,theta:0})).toBe('Moved 12 cm');
    expect(JSON.stringify(input)).toBe(before);
  });
  it('aligns a rotated rear plane without silently rotating or moving sideways',()=>{
    const theta=Math.PI/3,c=Math.cos(theta),s=Math.sin(theta),wardrobe={width:.5,depth:.7,pose:{x:2,y:2,theta}},table={width:.48,depth:.5,pose:{x:0,y:0,theta}};
    const tangent=.6,normal=.09,pose={x:2+c*tangent-s*normal,y:2+s*tangent+c*normal,theta};
    const snap=rearEdgeSnap(table,wardrobe,pose,()=>true)!;
    const moved={x:snap.pose.x-pose.x,y:snap.pose.y-pose.y};
    expect(moved.x*c+moved.y*s).toBeCloseTo(0,6);expect(-moved.x*s+moved.y*c).toBeCloseTo(.01,6);expect(snap.pose.theta).toBe(theta);
    expect(rearEdgeSnap(table,wardrobe,pose,()=>false)).toBeNull();
  });
});

describe('provisional measured-corner mapping',()=>{
  it('labels the actual door distance at the crop edge without inventing a route',()=>{
    const input=Core.cloneInput(),copy=JSON.stringify(input),bounds={minX:0,minY:1.4,maxX:2.2,maxY:3.4};
    const marker=doorEdgeMarker(input.room.door.hinge,bounds)!;
    expect(marker.anchor).toEqual({x:.16,y:1.4});expect(marker.direction).toEqual({x:0,y:-1});expect(marker.distanceM).toBeCloseTo(1.28);expect(marker.label).toBe('Door\n1.28 m');
    const shifted=doorEdgeMarker({x:3,y:1},bounds)!;expect(shifted.distanceM).toBeCloseTo(Math.hypot(.8,.4));
    expect(doorEdgeMarker({x:1,y:2},bounds)).toBeNull();expect(JSON.stringify(input)).toBe(copy);
  });
  it('keeps one centimetre per centimetre with the opposite-facing placement',()=>{
    const room={width:4.2,depth:3.4},root=fullSizeRoomPosition(room,{x:1.18,y:1.45},{x:-308,y:-135.7,z:-635},Math.PI);
    expect(root.x).toBeCloseTo(-400,9);expect(root.z).toBeCloseTo(-610,9);expect(root.y).toBe(-135.7);
    for(const x of [0,2.2])for(const y of [1.4,3.4]){const offset=rotateFloor({x:(x-2.1)*100,y:0,z:-(y-1.7)*100},Math.PI);expect(root.x+offset.x).toBeCloseTo(-190-100*x,9);expect(root.z+offset.z).toBeCloseTo(-780+100*y,9);}
  });
});

describe('one sampled-footprint ribbon, independent from the verifier',()=>{
  it('merges overlapping straight samples into exactly their union, without repeated dark fills',()=>{
    const path=Array.from({length:21},(_,i)=>({x:1+i*.05,y:1,theta:0})),copy=JSON.stringify(path),loops=sampledRibbon(path,1.05,.66);
    expect(loops).toHaveLength(1);expect(area(loops[0])).toBeCloseTo(2.05*.66,8);
    const triangles=triangulateRibbon(loops[0]);expect(triangles.length).toBeGreaterThan(0);expect(trianglesArea(loops[0],triangles)).toBeCloseTo(area(loops[0]),8);expect(JSON.stringify(path)).toBe(copy);
  });
  it('draws the actual checked turn as a finite triangulated band and clips only the display',()=>{
    const input=Core.cloneInput();input.room.objects[1].pose={x:.91,y:3.01,theta:0};input.room.objects[2].pose={x:1.495,y:.692,theta:0};input.room.revision=4;
    const result=Core.evaluate(input),before=JSON.stringify(result),loops=sampledRibbon(result.tasks.journey.path,input.profile.length,input.profile.width);
    expect(loops).toHaveLength(1);expect(area(loops[0])).toBeGreaterThan(input.profile.length*input.profile.width);
    const bounds={minX:0,minY:1.4,maxX:2.2,maxY:3.4},clipped=clipFloorPolygon(loops[0],bounds);
    expect(clipped.every(p=>pointInCorner(p,bounds))).toBe(true);expect(trianglesArea(clipped,triangulateRibbon(clipped))).toBeCloseTo(area(clipped),8);
    expect(JSON.stringify(result)).toBe(before);expect(result.inputHash).toBe('23bff2355c471375');expect(result.tasks.journey.minimumClearance).toBeLessThan(.002);
  });
});
