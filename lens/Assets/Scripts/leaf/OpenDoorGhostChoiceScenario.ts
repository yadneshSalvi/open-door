import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, record, state, target, until } from './OpenDoorScenarioSupport';
import { pressVisible, settled, retreatVisible } from './OpenDoorVisibleFlow';

/** Actual 3D moved-furniture ghost selection, distinct from the labeled option button. */
@component
export class OpenDoorGhostChoiceScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const controller=experience(),before=await settled();
    if(before.menu!=='overview'||!before.miniature||before.repairProposals.length)throw Error('Start at a fresh settled miniature.');
    try{
      await pressVisible('Suggest fixes');
      const choices=await until(controller,s=>{
        if(['repairError','repairEmpty'].includes(s.menu))throw Error('Actual online search did not return alternatives.');
        return s.menu==='repairChoices'&&!s.repairSearching;
      },'locally checked online alternatives',30000);
      expect(choices.repairTransport).toBe('ready');expect(choices.repairProposals.length>0).toBe(true);
      expect(choices.inputHash).toBe(before.inputHash);expect(choices.sourceRevision).toBe(before.sourceRevision);
      expect(choices.ghostSelectionTargets).toBe(choices.repairProposals.length);
      expect(choices.totalUITargets<=3).toBe(true);
      const index=choices.repairProposals.reduce((best:number,p:any,i:number)=>p.certifiedReserveM>choices.repairProposals[best].certifiedReserveM?i:best,0);
      const name='Layout ghost '+(index+1),ghost=target(name).getSceneObject();
      let point:vec3|null=null;
      for(let n=0;n<ghost.getChildrenCount();n++){const child=ghost.getChild(n);if(child.enabled){point=child.getTransform().getWorldPosition();break;}}
      if(!point)throw Error('The selected actual ghost has no enabled moved-piece collider.');
      await pressVisible(name,record,point);
      const selected=await until(controller,s=>s.menu==='repair'&&s.repairSolo,'actual ghost selection');
      expect(selected.repairIndex).toBe(index);expect(selected.inputHash).toBe(before.inputHash);
      expect(selected.sourceRevision).toBe(before.sourceRevision);expect(selected.ghostSelectionTargets).toBe(0);
      expect(selected.hintSuccess.option).toBe(true);expect(selected.totalUITargets).toBe(3);
      expect(selected.displayedJourney).toBe('verified_feasible');expect(selected.displayedDoor).toBe('verified_feasible');
      record('round3-3d-ghost-selection',{before,choices,selected,scope:'Actual Direct SIK trigger on a moved-furniture ghost; source remains unchanged.'});
      await pressVisible('Cancel');const end=await settled();
      expect(end.inputHash).toBe(before.inputHash);expect(end.sourceRevision).toBe(before.sourceRevision);
      expect(end.repairProposals.length).toBe(0);
    }finally{await retreatVisible();}
  }
}
