import {describe,it,expect} from 'vitest';
import {annotationBounds,annotationsOverlap,chooseAnnotation} from '../lens-src/SpatialAnnotationLayout';
import {planeBounds,SETTINGS_READOUT,settingsReadoutCandidates} from '../lens-src/SpatialDockLayout';
import observed from './fixtures/native-settings-006.json';

const dot=(a:any,b:any)=>a.x*b.x+a.y*b.y+a.z*b.z;
function view(snapshot:typeof observed.snapshots.width66){
  const {position:eye,forward:normal,right}=snapshot.cameraFrame;
  const up={x:normal.y*right.z-normal.z*right.y,y:normal.z*right.x-normal.x*right.z,z:normal.x*right.y-normal.y*right.x};
  const project=(p:any)=>{const d={x:p.x-eye.x,y:p.y-eye.y,z:p.z-eye.z},depth=-dot(d,normal);return{x:.5+.76236556*dot(d,right)/depth,y:.5-1.35641665*dot(d,up)/depth};};
  return {frame:{right,up,normal},project};
}
describe('settings value at the observed native dock',()=>{
  it('keeps the current size readable without covering the model or any of the three controls',()=>{
    for(const snapshot of Object.values(observed.snapshots)){
      const {frame,project}=view(snapshot),dock=observed.derivedDockPosition;
      const floor=annotationBounds([-21,21].flatMap(x=>[-17,17].map(z=>project({x:-30+x,y:observed.surfaceFloorY,z:-474+z}))))!;
      const subjects=[...snapshot.subjects.map(s=>s.box),floor],controls=snapshot.controls.map(c=>c.box);
      // The derived settled dock is within2.5 native viewport pixels of the
      // recorded center while the actual dock is still finishing its easing.
      expect(Math.abs(project(dock).y-(controls[1].top+controls[1].bottom)/2)).toBeLessThan(.002);
      const candidates=settingsReadoutCandidates(dock,frame,3,false).map((point,index)=>({point,cost:index,box:planeBounds(point,SETTINGS_READOUT.width,SETTINGS_READOUT.height,1,frame,project)}));
      expect(annotationsOverlap(candidates[0].box!,floor)).toBe(true);
      const index=chooseAnnotation(candidates,[...subjects,...controls],[],-1,.015);
      expect(index).toBeGreaterThan(0);
      for(const subject of [...subjects,...controls])expect(annotationsOverlap(candidates[index].box!,subject)).toBe(false);
      expect(candidates[index].box!.left).toBeGreaterThan(.015);expect(candidates[index].box!.right).toBeLessThan(.985);
      expect(snapshot.unplaced).toContain('Chair size'); // Regression was observed, not invented.
    }
  });
  it('copies native vector getters and leaves the original settings geometry unchanged',()=>{
    const getter=(x:number,y:number,z:number)=>Object.create(null,{x:{get:()=>x},y:{get:()=>y},z:{get:()=>z}});
    const points=settingsReadoutCandidates(getter(10,20,30),{right:getter(1,0,0),up:getter(0,1,0),normal:getter(0,0,1)},3,false);
    expect(points).toHaveLength(6);expect(points.every(p=>Object.values(p).every(Number.isFinite))).toBe(true);
    expect(points.every(p=>p.z===30)).toBe(true);
    expect(SETTINGS_READOUT.width).toBe(12.5);expect(SETTINGS_READOUT.height).toBe(3.2);
  });
});
