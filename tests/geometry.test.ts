import { describe, expect, it } from 'vitest';
import { clearanceAt, lensToRoom, polygonDistance, polygonsIntersect, poseAt, rectangle, roomToLens, transform, verifyMotion } from '../src/engine/geometry';
import type { Obstacle, Polygon } from '../src/engine/types';
const box=(x:number,y:number,l:number,w:number,theta=0)=>transform(rectangle(l,w),{x,y,theta});
const obstacle=(polygon:Polygon,uncertainty=0):Obstacle=>({id:'block',name:'Block',polygon,uncertainty});
describe('independent analytic geometry oracles',()=>{
  it('matches an independent analytic axis-aligned corpus',()=>{
    // Closed-form AABB interval gaps; no production intersection oracle.
    let seed=1234567;
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    for(let n=0;n<150;n++){
      const ax=random()*6-3,ay=random()*6-3,bx=random()*6-3,by=random()*6-3;
      const al=.1+random()*2,aw=.1+random()*2,bl=.1+random()*2,bw=.1+random()*2;
      const dx=Math.max(0,Math.abs(ax-bx)-(al+bl)/2),dy=Math.max(0,Math.abs(ay-by)-(aw+bw)/2);
      const a=box(ax,ay,al,aw),b=box(bx,by,bl,bw);
      expect(polygonDistance(a,b)).toBeCloseTo(Math.hypot(dx,dy),10);
      expect(polygonsIntersect(a,b)).toBe(dx===0&&dy===0);
    }
  });
  it('preserves fixed-trajectory obstruction when buffer or obstacle grows',()=>{
    const local=rectangle(.2,.2),motion={start:{x:0,y:0,theta:0},distance:2,angle:0};
    for(const buffer of [0,.03,.3])for(const size of [.1,.3,.6])
      expect(verifyMotion(local,motion,[obstacle(box(1,0,size,size))],buffer).status).toBe('blocked');
  });
  it('uses occupied corners, including rotated protrusions',()=>{
    // A 2 × .4 rectangle rotated 45° reaches x=(1+.2)/sqrt(2).
    const a=box(0,0,2,.4,Math.PI/4);
    expect(Math.max(...a.map(p=>p.x))).toBeCloseTo(1.2/Math.sqrt(2),12);
    expect(polygonsIntersect(a,box(.7,.7,.1,.1))).toBe(true);
    expect(polygonsIntersect(a,box(.7,-.7,.1,.1))).toBe(false);
  });
  it('computes Euclidean diagonal gap rather than a single SAT projection gap',()=>{
    expect(polygonDistance(box(0,0,2,2),box(4,5,2,2))).toBeCloseTo(Math.sqrt(13),12);
    expect(polygonDistance(box(0,0,2,2),box(3,0,2,2))).toBeCloseTo(1,12);
    expect(polygonsIntersect(box(0,0,2,2),box(2,0,2,2))).toBe(true);
  });
  it('preserves distances and intersection under common rigid transforms',()=>{
    const a=box(0,0,2,.4,.31),b=box(3,1,.3,.7,-.2);
    for(const theta of [0,.7,Math.PI,-2.3]){
      const rigid={x:7.4,y:-2.1,theta};
      expect(polygonDistance(transform(a,rigid),transform(b,rigid))).toBeCloseTo(polygonDistance(a,b),10);
      expect(polygonsIntersect(transform(a,rigid),transform(b,rigid))).toBe(false);
    }
  });
  it('detects collision only inside a translational sweep',()=>{
    const local=rectangle(.2,.2),motion={start:{x:0,y:0,theta:0},distance:2,angle:0},obs=[obstacle(box(1,0,.1,.1))];
    expect(clearanceAt(local,motion.start,obs,0).distance).toBeCloseTo(.85);
    expect(clearanceAt(local,poseAt(motion,1),obs,0).distance).toBeCloseTo(.85);
    expect(verifyMotion(local,motion,obs,0).status).toBe('blocked');
  });
  it('detects intermediate-only rotation and door-like hinge sweep',()=>{
    const local=rectangle(2,.2),motion={start:{x:0,y:0,theta:0},distance:0,angle:Math.PI/2};
    const obs=[obstacle(box(.7,.7,.08,.08))];
    expect(clearanceAt(local,motion.start,obs,0).distance).toBeGreaterThan(.5);
    expect(clearanceAt(local,poseAt(motion,1),obs,0).distance).toBeGreaterThan(.5);
    expect(verifyMotion(local,motion,obs,0).status).toBe('blocked');
    const leaf=[{x:0,y:-.02},{x:1,y:-.02},{x:1,y:.02},{x:0,y:.02}];
    expect(verifyMotion(leaf,motion,obs,0).status).toBe('blocked');
  });
  it('does not certify an unresolved near-grazing sweep',()=>{
    // Exact straight-line clearance .0002; below the .001 interval bound.
    const result=verifyMotion(rectangle(.2,.2),{start:{x:0,y:0,theta:0},distance:2,angle:0},[obstacle(box(1,.2002,.1,.2))],0,undefined,.001);
    expect(result.status).toBe('uncertain');
  });
  it('checks oriented bounds and inflates uncertainty exactly once',()=>{
    const local=rectangle(2,.2);
    expect(clearanceAt(local,{x:.8,y:2,theta:0},[],0,{width:4,depth:4}).distance).toBeCloseTo(-.2);
    expect(clearanceAt(local,{x:.8,y:2,theta:Math.PI/2},[],0,{width:4,depth:4}).distance).toBeCloseTo(.7);
    const obs=[obstacle(box(2,0,1,1),.1)];
    expect(clearanceAt(rectangle(1,1),{x:0,y:0,theta:0},obs,.2).distance).toBeCloseTo(.7);
    expect(clearanceAt(rectangle(1,1),{x:0,y:0,theta:0},obs,1).distance).toBeLessThan(0);
  });
  it('integrates signed constant-radius arcs analytically',()=>{
    const start={x:2,y:3,theta:0};
    expect(poseAt({start,distance:Math.PI,angle:Math.PI/2},1)).toEqual({x:4,y:5,theta:Math.PI/2});
    const reverse=poseAt({start,distance:-Math.PI,angle:Math.PI/2},1);
    expect(reverse.x).toBeCloseTo(0);expect(reverse.y).toBeCloseTo(1);
  });
  it('maps metres to Lens centimetres with z up and round trips',()=>{
    expect(roomToLens({x:1,y:2,z:3})).toEqual({x:100,y:300,z:-200});
    for(const p of [{x:1.2,y:-3.4,z:.56},{x:0,y:0,z:0}])expect(lensToRoom(roomToLens(p))).toEqual(p);
  });
});
