import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, record, state, until } from './OpenDoorScenarioSupport';
import { pressVisible, settled, retreatVisible } from './OpenDoorVisibleFlow';

/** Persistent object affordances open shallow menus; navigation alone never edits the model. */
@component
export class OpenDoorObjectMenuScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const controller=experience(),before=await settled();
    try{
      await pressVisible('Pinch chair to size');await until(controller,s=>s.menu==='profile','chair menu');
      expect(state(controller).hintSuccess.chair,'Successful chair interaction dismisses only that one-time hint').toBe(true);
      expect(JSON.stringify(state(controller).primaryActions)).toBe(JSON.stringify(['Width','Extra room','Back']));
      await pressVisible('Width');await until(controller,s=>s.menu==='profileWidth','Width');
      await pressVisible('Back');await until(controller,s=>s.menu==='profile','chair menu');
      await pressVisible('Extra room');await until(controller,s=>s.menu==='profileBuffer','Extra room');
      await pressVisible('Back');await until(controller,s=>s.menu==='profile','chair menu');
      await pressVisible('Back');await until(controller,s=>s.menu==='overview','overview');
      await pressVisible('Pinch door to try it');await until(controller,s=>s.menu==='door','door menu');
      expect(JSON.stringify(state(controller).primaryActions)).toBe(JSON.stringify(['Try the door','Back']));
      await pressVisible('Try the door');const end=await settled();
      expect(end.inputHash).toBe(before.inputHash);expect(end.sourceRevision).toBe(before.sourceRevision);
      record('round3-object-menus',{before,end});
    }finally{await retreatVisible();}
  }
}
