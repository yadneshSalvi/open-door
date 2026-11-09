import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { ScenarioConfig } from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig';
import { findSceneObjectByName, sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, state, until } from './OpenDoorScenarioSupport';
import { editAndUndo, pressVisible, repairAndAlign, settled, retreatVisible, observeProductAudio, waitForDock } from './OpenDoorVisibleFlow';

/** Whole input is checked; only the complete-footprint-contained bedside route subset is shown. */
@component
export class OpenDoorFullSizeFilmScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void>{
    await sleep(1500);const controller=experience(),before=await settled();
    if(before.sourceRevision!==0||before.menu!=='overview'||!before.miniature)throw Error('Reset the indoor Preview before full-size setup.');
    const started=Date.now();let poses=0,lastPose='',capture=false,wasPlaying=false;
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_FULL_FILM_ROUND3 '+JSON.stringify({name,wallEpochMs:Date.now(),elapsedMs:Date.now()-started,nativeTime:getTime(),...extra,state:state(controller)}));
    const stopAudio=observeProductAudio(this,emit);
    const observePose=(s:any)=>{if(!capture||!s.chairVisible)return;const key=JSON.stringify(s.playerPose);if(key===lastPose)return;lastPose=key;poses++;emit('observed-visible-corner-pose',{poseOrdinal:poses,pose:s.playerPose});};
    const observer=this.createEvent('UpdateEvent');observer.bind(()=>{const s=state(controller),observe=s.playing||wasPlaying;wasPlaying=s.playing;if(observe)observePose(s);});
    try{
      emit('setup-start',{scope:'Indoor bedside crop only; real SIK setup, HTTPS repair, Use and final Align back.'});
      await editAndUndo(emit);const final=await repairAndAlign(emit);
      const expected=config?.get('expectedInputHash');if(expected){if(typeof expected!=='string'||!/^[a-f0-9]{16}$/.test(expected))throw Error('expectedInputHash must be the actual main take hash.');expect(final.inputHash).toBe(expected);}
      expect(final.sourceRevision).toBe(before.sourceRevision+4);expect(final.acceptedRepair).toBe(null);
      await until(controller,s=>!s.undoVisible,'Undo chip expiry',8000);
      await pressVisible('More',emit);await until(controller,s=>s.menu==='more','More');await pressVisible('Real size',emit);
      const full=await until(controller,s=>!s.miniature&&s.menu==='overview','real-size overview');
      expect(full.inputHash).toBe(final.inputHash);expect(full.sourceRevision).toBe(final.sourceRevision);
      const room=findSceneObjectByName('Example room');if(!room)throw Error('Room display missing.');
      const transform=room.getTransform(),position=transform.getWorldPosition(),scale=transform.getWorldScale();
      expect(scale.x).toBeCloseTo(1,5);expect(scale.y).toBeCloseTo(1,5);expect(scale.z).toBeCloseTo(1,5);
      expect(position.x).toBeCloseTo(-155,2);expect(position.y).toBeCloseTo(-135.78,2);expect(position.z).toBeCloseTo(-185,2);
      // Inspector vec2 inputs are float32; the metre bounds retain their
      // meaning within 0.01mm without requiring JavaScript double spelling.
      expect(full.placement.corner.minX).toBeCloseTo(.65,5);expect(full.placement.corner.maxX).toBeCloseTo(2.15,5);
      expect(full.placement.corner.minY).toBeCloseTo(1.35,5);expect(full.placement.corner.maxY).toBeCloseTo(3.35,5);
      emit('full-size-camera-window',{windowMs:10000,cameraCm:{x:-225,y:20,z:-30},lookAtCm:{x:-225,y:-135.78,z:-250},scope:'Operator sets camera externally; allow natural lazy-follow settlement. Only the bedside crop is displayed.'});
      await sleep(10000);await waitForDock(emit);
      capture=true;await pressVisible('Try the route',emit);const end=await settled(final.sourceRevision);
      // The settled promise can resume before this observer's final Update.
      // Read the actual terminal state once, using the same deduplication path.
      observePose(end);capture=false;
      expect(end.inputHash).toBe(final.inputHash);expect(JSON.stringify(end.inputSnapshot)).toBe(JSON.stringify(final.inputSnapshot));
      expect(end.playerPose.x).toBeCloseTo(end.journeyGoal.x,6);expect(end.playerPose.y).toBeCloseTo(end.journeyGoal.y,6);
      expect(poses,'All26 complete buffered footprints in the measured bedside patch').toBe(26);
      emit('corner-playback-complete',{observedVisiblePoses:poses,scope:'Whole model rechecked; displayed motion is only the contained bedside subset, not the whole route.'});await sleep(2500);
    }finally{stopAudio();this.removeEvent(observer);await retreatVisible();}
  }
}
