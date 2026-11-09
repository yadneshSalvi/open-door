import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { ScenarioConfig } from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig';
import { findSceneObjectByName, sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, state, until } from './OpenDoorScenarioSupport';
import { editAndUndo, pressVisible, repairAndAlign, settled, retreatVisible, observeProductAudio, waitForDock, moreAction } from './OpenDoorVisibleFlow';

/** Whole input is checked; only the bedside crop, retaining the chair outline at crop edges is shown. */
@component
export class OpenDoorFullSizeFilmScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void>{
    await sleep(1500);const controller=experience(),before=await settled();
    if(before.sourceRevision!==0||before.menu!=='overview'||!before.miniature)throw Error('Reset the indoor Preview before full-size setup.');
    const started=Date.now();let poses=0,lastPose='',capture=false,wasPlaying=false;
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_FULL_FILM_ROUND4 '+JSON.stringify({name,wallEpochMs:Date.now(),elapsedMs:Date.now()-started,nativeTime:getTime(),...extra,state:state(controller)}));
    const stopAudio=observeProductAudio(this,emit);
    const observePose=(s:any)=>{if(!capture||!s.chairVisible)return;const key=JSON.stringify(s.playerPose);if(key===lastPose)return;lastPose=key;poses++;emit('observed-visible-corner-pose',{poseOrdinal:poses,pose:s.playerPose});};
    const observer=this.createEvent('UpdateEvent');observer.bind(()=>{const s=state(controller),observe=s.playing||wasPlaying;wasPlaying=s.playing;if(observe)observePose(s);});
    try{
      emit('setup-start',{scope:'Indoor bedside crop only; real SIK setup, HTTPS repair, Use and final real snap drag.'});
      await editAndUndo(emit);const final=await repairAndAlign(emit);
      const expected=config?.get('expectedInputHash');if(expected){if(typeof expected!=='string'||!/^[a-f0-9]{16}$/.test(expected))throw Error('expectedInputHash must be the actual main take hash.');expect(final.inputHash).toBe(expected);}
      expect(final.sourceRevision).toBe(before.sourceRevision+4);expect(final.acceptedRepair).toBe(null);
      await until(controller,s=>!s.undoVisible,'Undo chip expiry',8000);
      await moreAction('Real size',emit);
      const full=await until(controller,s=>!s.miniature&&s.menu==='overview','real-size overview');
      expect(full.inputHash).toBe(final.inputHash);expect(full.sourceRevision).toBe(final.sourceRevision);
      const room=findSceneObjectByName('Example room');if(!room)throw Error('Room display missing.');
      const transform=room.getTransform(),position=transform.getWorldPosition(),scale=transform.getWorldScale();
      expect(scale.x).toBeCloseTo(1,5);expect(scale.y).toBeCloseTo(1,5);expect(scale.z).toBeCloseTo(1,5);
      // Optional measured expectations belong to the capture setup, not a claimed
      // physical proof. Always log the runtime values, including partial outlines.
      const expectedPlacement=config?.get('expectedPlacementJson');
      if(expectedPlacement){
        const measured=JSON.parse(String(expectedPlacement));
        for(const axis of ['x','y','z'] as const)if(measured.positionCm?.[axis]!==undefined)expect(position[axis]).toBeCloseTo(measured.positionCm[axis],2);
        for(const key of ['minX','maxX','minY','maxY'])if(measured.corner?.[key]!==undefined)expect(full.placement.corner[key]).toBeCloseTo(measured.corner[key],5);
      }
      const rotation=transform.getWorldRotation();
      emit('runtime-corner-placement',{positionCm:{x:position.x,y:position.y,z:position.z},scale:{x:scale.x,y:scale.y,z:scale.z},rotation:{x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w},corner:full.placement.corner,scope:'Runtime snapshot only; measured candidate, not environment or hardware acceptance.'});
      const windowMs=Number(config?.get('cameraWindowMs')||'10000');
      if(!Number.isFinite(windowMs)||windowMs<1000||windowMs>30000)throw Error('cameraWindowMs must be between 1000 and 30000.');
      emit('full-size-camera-window',{windowMs,cameraCm:{x:-550,y:40,z:-850},lookAtCm:{x:-300,y:-60,z:-550},candidateRoomRootCm:{x:-400,y:-135.7,z:-610},scope:'Measured candidate. Operator eases the actual camera externally; keep this setup outside the protected playback. Allow natural lazy-follow settlement before the real route trigger. A separate recorded camera walk is required for acceptance.'});
      await sleep(windowMs);await waitForDock(emit);
      capture=true;await pressVisible('Try the route',emit);const end=await settled(final.sourceRevision);
      // The settled promise can resume before this observer's final Update.
      // Read the actual terminal state once, using the same deduplication path.
      observePose(end);capture=false;
      expect(end.inputHash).toBe(final.inputHash);expect(JSON.stringify(end.inputSnapshot)).toBe(JSON.stringify(final.inputSnapshot));
      expect(end.playerPose.x).toBeCloseTo(end.journeyGoal.x,6);expect(end.playerPose.y).toBeCloseTo(end.journeyGoal.y,6);
      expect(poses>1,'Actual visible chair poses, including outline-only crop intersections').toBe(true);
      emit('corner-playback-complete',{observedVisiblePoses:poses,scope:'Whole model rechecked; displayed motion is the cropped bedside route, not the whole route.'});await sleep(2500);
    }finally{stopAudio();this.removeEvent(observer);await retreatVisible();}
  }
}
