import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { ScenarioConfig } from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { experience, state, until } from './OpenDoorScenarioSupport';
import { editAndUndo, pressVisible, repairAndAlign, settled, retreatVisible, observeProductAudio } from './OpenDoorVisibleFlow';
const Core=require('../OpenDoorCore');

/** Reproduce the final aligned main take through real input before sending its exact model. */
@component
export class OpenDoorShareFilmScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void>{
    await sleep(1500);const controller=experience(),before=await settled();
    if(before.sourceRevision!==0||before.menu!=='overview'||!before.miniature)throw Error('Reset Preview before reproducing the final aligned model.');
    const expected=config?.get('expectedInputHash');
    if(typeof expected!=='string'||!/^[a-f0-9]{16}$/.test(expected))throw Error('Pass the actual observed main-take hash as expectedInputHash.');
    const started=Date.now();
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_SHARE_FILM_ROUND4 '+JSON.stringify({name,wallEpochMs:Date.now(),elapsedMs:Date.now()-started,nativeTime:getTime(),...extra,state:state(controller)}));
    const stopAudio=observeProductAudio(this,emit);
    try{
      emit('setup-start');await editAndUndo(emit);const final=await repairAndAlign(emit);
      expect(final.sourceRevision).toBe(before.sourceRevision+4);expect(final.inputHash).toBe(expected);
      expect(final.acceptedRepair).toBe(null);
      // Wait for the evaluated edit's object chip to expire so Send to phone is a primary control.
      await until(controller,s=>!s.undoVisible,'object Undo chip expiry',8000);
      await retreatVisible();await sleep(300);
      emit('share-shot-ready',{expectedInputHash:expected,scope:'Separate take of the exact final aligned input.'});
      await pressVisible('Send to phone',emit);
      const shared=await until(controller,s=>s.menu==='sharing'&&s.shareCurrent,'current-plan QR',8000);
      expect(shared.inputHash).toBe(expected);expect(shared.sourceRevision).toBe(final.sourceRevision);
      expect(JSON.stringify(shared.inputSnapshot)).toBe(JSON.stringify(final.inputSnapshot));
      expect(shared.acceptedRepair).toBe(null);
      const url=controller.currentShareLink;
      expect(url).toBe(Core.createShareLink(shared.inputSnapshot,controller.companionBaseUrl));expect(url.startsWith('https://')).toBe(true);
      emit('share-visible',{url,expectedInputHash:expected,inputSnapshot:shared.inputSnapshot,scope:'Actual QR; independent pixel decoding and companion recheck remain separate gates.'});
      await sleep(3000);expect(state(controller).inputHash).toBe(expected);emit('share-film-complete',{url});
      if(config?.get('retainShare')!=='true'){
        await pressVisible('Back',emit);await until(controller,s=>s.menu==='overview','sharing Back');
      }else emit('share-retained',{url,scope:'QR held for a separate actual camera look; input remains unchanged.'});
    }finally{stopAudio();await retreatVisible();}
  }
}
