import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { ScenarioConfig } from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, record, until } from './OpenDoorScenarioSupport';
import { pressVisible, settled, retreatVisible, moreAction } from './OpenDoorVisibleFlow';

/** Operator aims the camera at a real Preview surface first. No synthetic surface hit. */
@component
export class OpenDoorPlacementScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void>{
    await sleep(1500);const controller=experience(),before=await settled();
    try{
      await moreAction('Place');
      const ready=await until(controller,s=>s.menu==='placement'&&s.placement.surfaceStatus==='ready'&&s.placement.candidate!==null,'actual WorldQuery surface ready',20000);
      expect(ready.placement.queries>before.placement.queries).toBe(true);record('round4-worldquery-ready',ready);
      if(config?.get('verifyMovingHit')==='true'){
        const first=ready.placement.candidate;
        record('round4-moving-hit-operator-window',{wallEpochMs:Date.now(),seconds:5,first,queries:ready.placement.queries,scope:'Operator changes real camera aim to another horizontal surface point. No synthetic hit or camera mutation by the scenario.'});
        await sleep(5000);
        const moved=await until(controller,s=>{
          const next=s.placement.candidate;
          return s.menu==='placement'&&s.placement.surfaceStatus==='ready'&&next!==null&&s.placement.queries>=ready.placement.queries+2&&Math.hypot(next.x-first.x,next.y-first.y,next.z-first.z)>=.5;
        },'a new genuine horizontal hit at least0.5cm away',3000);
        const next=moved.placement.candidate,distanceCm=Math.hypot(next.x-first.x,next.y-first.y,next.z-first.z);
        expect(moved.inputHash,'Reticle movement must not edit the room').toBe(before.inputHash);
        expect(moved.sourceRevision,'Reticle movement must not commit an input revision').toBe(before.sourceRevision);
        record('round4-moving-hit-checked',{wallEpochMs:Date.now(),first,next,distanceCm,queriesBefore:ready.placement.queries,queriesAfter:moved.placement.queries,surfaceStatus:moved.placement.surfaceStatus});
        await sleep(1000);
        await until(controller,s=>s.placement.surfaceStatus==='ready'&&s.placement.candidate!==null,'fresh actual hit before confirmation',3000);
      }
      await pressVisible('Place here');
      const placed=await until(controller,s=>s.menu==='overview'&&s.placement.confirmed,'surface placement');
      expect(placed.inputHash).toBe(before.inputHash);expect(placed.sourceRevision).toBe(before.sourceRevision);
      record('round4-surface-placed',{before,ready,placed,scope:'Preview WorldQuery and actual confirmation; no hardware validation.'});
    }finally{await retreatVisible();}
  }
}
