import {describe,it,expect} from 'vitest';
import {annotationBounds,annotationsOverlap,chooseAnnotation} from '../lens-src/SpatialAnnotationLayout';
describe('projected native annotation layout',()=>{
  const object={left:.4,right:.6,top:.4,bottom:.7};
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
  it('keeps essential chair or obstruction text eligible when every strict slot is occupied',()=>{
    const candidates=[{box:{left:.35,right:.65,top:.3,bottom:.5},cost:1},{box:{left:.05,right:.45,top:.4,bottom:.6},cost:8}];
    expect(chooseAnnotation(candidates,[object],[])).toBe(-1);
    // Fallback is explicit and in-frame. Required text chooses least projected
    // obstruction rather than silently disappearing; native visuals still gate it.
    expect(chooseAnnotation(candidates,[object],[],-1,.025,true)).toBe(1);
  });
  it('uses conservative projected corners and rejects invalid projections',()=>{
    const bounds=annotationBounds([{x:.2,y:.3},{x:.4,y:.5}],0)!;expect(bounds).toEqual({left:.2,right:.4,top:.3,bottom:.5});expect(annotationsOverlap(bounds,object)).toBe(false);
    expect(annotationBounds([{x:NaN,y:0}])).toBeNull();expect(annotationBounds([])).toBeNull();
  });
});
