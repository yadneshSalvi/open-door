import {describe,it,expect} from 'vitest';
import {annotationBounds,annotationFrame,projectedPlate,safeSpatialTarget,annotationsOverlap,chooseAnnotation,leaderGeometry,leadersCross,segmentCrossesBox} from '../lens-src/SpatialAnnotationLayout';
describe('projected native annotation layout',()=>{
  const object={left:.4,right:.6,top:.4,bottom:.7};
  it('projects the same full camera-facing plane that the label renders at steep angles',()=>{
    const frame=annotationFrame({x:0,y:80,z:80},{x:0,y:0,z:0})!;
    expect(frame.normal.y).toBeCloseTo(Math.SQRT1_2);expect(frame.up.z).toBeCloseTo(-Math.SQRT1_2);
    expect(frame.right).toEqual({x:1,y:0,z:-0});
    const dot=(a:any,b:any)=>a.x*b.x+a.y*b.y+a.z*b.z;
    expect(dot(frame.normal,frame.up)).toBeCloseTo(0);expect(dot(frame.normal,frame.right)).toBeCloseTo(0);expect(dot(frame.up,frame.up)).toBeCloseTo(1);
    const floor=annotationFrame({x:0,y:80,z:80},{x:0,y:0,z:0},true)!;expect(floor.normal).toEqual({x:0,y:1,z:0});expect(floor.up.y).toBe(0);
    expect(annotationFrame({x:0,y:0,z:0},{x:0,y:0,z:0})).toBeNull();
  });
  it('keeps a contextual plate outside its own piece and nearby furniture without shrinking it',()=>{
    const camera={x:0,y:80,z:80},anchor={x:0,y:0,z:0},frame=annotationFrame(camera,anchor)!;
    const project=(p:{x:number;y:number;z:number})=>({x:.5+p.x/80,y:.5-(p.y*frame.up.y+p.z*frame.up.z)/80});
    const own={left:.46,right:.54,top:.47,bottom:.53},wardrobe={left:.32,right:.45,top:.31,bottom:.55};
    const safe=safeSpatialTarget(anchor,camera,{x:-7,y:5,z:0},9,6,project,[own,wardrobe]);
    expect(safe).not.toBeNull();const box=projectedPlate(safe!,camera,9.6,6.6,project)!;
    for(const subject of [own,wardrobe])expect(annotationsOverlap(box,subject)).toBe(false);
    expect(Math.hypot(safe!.x,safe!.y,safe!.z)).toBeLessThanOrEqual(10);
    expect(safeSpatialTarget(anchor,camera,anchor,9,6,project,[{left:0,right:1,top:0,bottom:1}])).toBeNull();
    expect(projectedPlate(anchor,camera,9,6,project)!.right-projectedPlate(anchor,camera,9,6,project)!.left).toBeGreaterThan(.11);
  });
  it('copies native getter-only vector components without producing an empty target',()=>{
    const native=(x:number,y:number,z:number)=>Object.create(null,{x:{get:()=>x},y:{get:()=>y},z:{get:()=>z}});
    const point=safeSpatialTarget(native(0,0,0),native(0,0,80),native(0,8,0),9,6,p=>({x:.5+p.x/80,y:.5-p.y/80}),[]);
    expect(point).not.toBeNull();expect(Object.values(point!).every(Number.isFinite)).toBe(true);expect(Object.keys(point!)).toEqual(['x','y','z']);
  });
  it('renders a leader from the plate edge to its true 3D anchor with no foreshortened endpoint',()=>{
    const from={x:8,y:10,z:5},to={x:2,y:0,z:-4},camera={x:-20,y:80,z:50},g=leaderGeometry(from,to,camera,2)!;
    for(const key of ['x','y','z'] as const)expect(g.center[key]+g.up[key]*g.length/2).toBeCloseTo(to[key],12);
    expect(g.normal.x*g.up.x+g.normal.y*g.up.y+g.normal.z*g.up.z).toBeCloseTo(0,12);
    expect(leaderGeometry(from,from,camera)).toBeNull();
  });
  it('chooses a nearby safe position without reducing the label size',()=>{
    const candidates=[{box:{left:.35,right:.65,top:.3,bottom:.5},cost:2},{box:{left:.05,right:.35,top:.4,bottom:.6},cost:8},{box:{left:.65,right:.95,top:.4,bottom:.6},cost:9}];
    const before=JSON.stringify(candidates);expect(chooseAnnotation(candidates,[object],[])).toBe(1);expect(JSON.stringify(candidates)).toBe(before);
    expect(chooseAnnotation(candidates,[object],[candidates[1].box])).toBe(2);
  });
  it('holds a valid previous slot and rejects clipping or overlap',()=>{
    const candidates=[{box:{left:.05,right:.25,top:.1,bottom:.3},cost:1},{box:{left:.7,right:.9,top:.1,bottom:.3},cost:2}];
    expect(chooseAnnotation(candidates,[],[],1)).toBe(1);
    expect(chooseAnnotation(candidates,[],[candidates[1].box],1)).toBe(0);
    expect(chooseAnnotation([{box:{left:-.1,right:.2,top:.1,bottom:.3},cost:1},{box:object,cost:2}],[object],[])).toBe(-1);
  });
  it('reports an essential label as unplaced instead of covering the subject',()=>{
    const candidates=[{box:{left:.35,right:.65,top:.3,bottom:.5},cost:1},{box:{left:.05,right:.45,top:.4,bottom:.6},cost:8}];
    expect(chooseAnnotation(candidates,[object],[])).toBe(-1);
    // Required text has no overlap exception; native acceptance must provide
    // a camera-side free-space candidate.
    expect(chooseAnnotation(candidates,[object],[],-1,.025,true)).toBe(-1);
  });
  it('rejects crossing leaders and labels without rejecting disjoint segments',()=>{
    const a={from:{x:.1,y:.1},to:{x:.9,y:.9}},b={from:{x:.1,y:.9},to:{x:.9,y:.1}};
    expect(leadersCross(a,b)).toBe(true);expect(leadersCross(a,{from:{x:.1,y:.8},to:{x:.2,y:.9}})).toBe(false);
    expect(segmentCrossesBox(a,object)).toBe(true);expect(segmentCrossesBox({from:{x:.1,y:.1},to:{x:.2,y:.2}},object)).toBe(false);
  });
  it('uses conservative projected corners and rejects invalid projections',()=>{
    const bounds=annotationBounds([{x:.2,y:.3},{x:.4,y:.5}],0)!;expect(bounds).toEqual({left:.2,right:.4,top:.3,bottom:.5});expect(annotationsOverlap(bounds,object)).toBe(false);
    expect(annotationBounds([{x:NaN,y:0}])).toBeNull();expect(annotationBounds([])).toBeNull();
  });
});
