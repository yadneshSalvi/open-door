import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, state, until } from './OpenDoorScenarioSupport';
import { observeProductAudio, pressVisible, settled, retreatVisible } from './OpenDoorVisibleFlow';
const Core=require('../OpenDoorCore');

/** Actual visible-hand width controls, with fresh checks and a reversible input edit. */
@component
export class OpenDoorChairSizeScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);
    const controller=experience(),before=await settled(),started=Date.now();let sequence=0;
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_CHAIR_SIZE_ROUND3 '+JSON.stringify({name,sequence:sequence++,wallEpochMs:Date.now(),wallElapsedMs:Date.now()-started,nativeTime:getTime(),...extra,state:state(controller)}));
    const stopAudio=observeProductAudio(this,emit);
    const requireOnlyWidth=(current:any,width:number,revision:number)=>{
      const expected=JSON.parse(JSON.stringify(before.inputSnapshot));
      expected.profile.width=width;expected.room.revision=revision;
      expect(current.inputHash,'Hash must match every current input field').toBe(Core.stableHash(current.inputSnapshot));
      expect(current.inputHash,'Only width and the committed revision may change').toBe(Core.stableHash(expected));
      expect(current.sourceRevision,'One revision per actual width button').toBe(revision);
      expect(current.revision,'Displayed checks belong to the current input').toBe(revision);
      expect(current.evaluationPending,'Each size change finishes its actual check').toBe(false);
      expect(current.totalUITargets<=3,'Size controls respect the aggregate target budget').toBe(true);
    };
    try{
      expect(before.profile.width,'Start with the example 66 cm chair').toBeCloseTo(.66,6);
      emit('chair-size-start');
      await pressVisible('Pinch chair to size',emit);await until(controller,s=>s.menu==='profile','chair menu');
      await pressVisible('Width',emit);await until(controller,s=>s.menu==='profileWidth','Width menu');
      expect(JSON.stringify(state(controller).primaryActions),'Use the actual published width controls').toBe(JSON.stringify(['−5 cm','+5 cm','Back']));
      await pressVisible('+5 cm',emit);
      const wider=await settled(before.sourceRevision+1);
      requireOnlyWidth(wider,before.profile.width+.05,before.sourceRevision+1);
      expect(wider.profile.width,'Actual +5 cm result').toBeCloseTo(.71,6);
      emit('chair-width-checked',{beforeWidthM:before.profile.width,widthM:wider.profile.width});
      await sleep(700);
      await pressVisible('−5 cm',emit);
      const restored=await settled(before.sourceRevision+2);
      requireOnlyWidth(restored,before.profile.width,before.sourceRevision+2);
      expect(restored.profile.width,'Actual −5 cm restores 66 cm').toBeCloseTo(.66,6);
      const normalized=JSON.parse(JSON.stringify(restored.inputSnapshot));normalized.room.revision=before.sourceRevision;
      expect(Core.stableHash(normalized),'All original input fields restore when the advancing revision is excluded').toBe(before.inputHash);
      expect(restored.hintSuccess.chair,'Real chair input dismisses its one-time hint').toBe(true);
      emit('chair-width-restored',{originalInputHash:before.inputHash,currentInputHash:restored.inputHash,revisionAdvancedBy:2,revisionNormalizedHash:Core.stableHash(normalized)});
      await sleep(700);
      await pressVisible('Back',emit);await until(controller,s=>s.menu==='profile','chair menu');
      await pressVisible('Back',emit);await until(controller,s=>s.menu==='overview','overview');
      emit('chair-size-complete',{scope:'Preview-only scripted visible-hand SIK input; no physical Spectacles claim.'});
    }finally{stopAudio();await retreatVisible();}
  }
}
