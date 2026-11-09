import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, record, state, until } from './OpenDoorScenarioSupport';
import { dragTableClear, moreAction, pressVisible, retreatVisible, settled } from './OpenDoorVisibleFlow';

/** Real exits, one-option paging, and Undo after the transient chip expires. */
@component
export class OpenDoorMenuExitScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const controller=experience(),before=await settled();
    if(before.menu!=='overview'||!before.miniature||before.sourceRevision!==0)throw Error('Reset to the blocked miniature for menu-exit QA.');
    try{
      await pressVisible('More');await until(controller,s=>s.menu==='more','More');
      expect(state(controller).primaryActions[0]).toBe('Place');
      await pressVisible('Back');await until(controller,s=>s.menu==='overview','More Back');
      await moreAction('Place');await until(controller,s=>s.menu==='placement','Place');
      await pressVisible('Back');await until(controller,s=>s.menu==='overview','placement Back');
      await moreAction('About');await until(controller,s=>s.menu==='about','About');
      await pressVisible('Back');await until(controller,s=>s.menu==='overview','About Back');
      await pressVisible('Suggest fixes');
      const choices=await until(controller,s=>{
        if(['repairError','repairEmpty'].includes(s.menu))throw Error('Online proposals unavailable for menu-exit QA.');
        return s.menu==='repairChoices'&&!s.repairSearching;
      },'checked choices',30000);
      expect(choices.ghostSelectionTargets).toBe(1);
      if(choices.repairProposals.length>1){
        await pressVisible('Next option');
        expect(state(controller).repairIndex).toBe((choices.repairIndex+1)%choices.repairProposals.length);
        expect(state(controller).ghostSelectionTargets).toBe(1);
      }
      await pressVisible('Cancel');await until(controller,s=>s.menu==='overview'&&!s.repairProposals.length,'choices Cancel');
      expect(state(controller).inputHash).toBe(before.inputHash);
      await pressVisible('More');await until(controller,s=>s.menu==='more','idle More');
      // Deliberate inactivity is QA only, never a film action.
      await sleep(6100);await until(controller,s=>s.menu==='overview','six-second idle exit');
      const edited=await dragTableClear();
      await until(controller,s=>!s.undoVisible,'object chip expiry',8000);
      await pressVisible('More');await until(controller,s=>s.menu==='more','persistent Undo');
      const label=state(controller).primaryActions[0];expect(label.startsWith('Undo')).toBe(true);
      await pressVisible(label);const restored=await settled(edited.sourceRevision+1);
      expect(JSON.stringify(restored.objects)).toBe(JSON.stringify(before.objects));
      expect(restored.historyLength).toBe(before.historyLength);
      record('round4-menu-exits',{before,restored});
    }finally{await retreatVisible();}
  }
}
