import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { record } from './OpenDoorScenarioSupport';
import { repairAndAlign, settled, retreatVisible } from './OpenDoorVisibleFlow';

@component
export class OpenDoorRepairScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);
    const before=await settled();
    if(before.menu!=='overview')throw Error('Start at a settled overview.');
    expect(before.journey==='verified_feasible').toBe(false);expect(before.door==='verified_feasible').toBe(false);
    record('round4-blocked-before',before);
    try{const after=await repairAndAlign(record);expect(after.sourceRevision).toBe(before.sourceRevision+2);}
    finally{await retreatVisible();}
  }
}
