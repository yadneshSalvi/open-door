import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, state } from './OpenDoorScenarioSupport';
import { editAndUndo, hold, pressVisible, repairAndAlign, settled, retreatVisible, observeProductAudio } from './OpenDoorVisibleFlow';
const Core=require('../OpenDoorCore');

/** Continuous native Preview take: visible hand, genuine SIK, actual HTTP and checks. */
@component
export class OpenDoorFilmScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);
    const controller=experience(),baseline=await settled();
    if(baseline.menu!=='overview'||!baseline.miniature||!baseline.placement.confirmed||baseline.sourceRevision!==0)throw Error('Reset Preview, then aim the camera at the measured miniature before starting.');
    expect(baseline.inputHash).toBe(Core.stableHash(Core.cloneInput()));
    expect(baseline.journey).toBe('blocked_witness');expect(baseline.door).toBe('blocked_witness');
    const started=Date.now(),nativeStart=getTime();let sequence=0,poseCount=0,lastPose='',wasPlaying=false;
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_FILM_ROUND3 '+JSON.stringify({name,sequence:sequence++,wallEpochMs:Date.now(),wallElapsedMs:Date.now()-started,nativeTime:getTime(),nativeElapsedSeconds:getTime()-nativeStart,...extra,state:state(controller)}));
    const stopAudio=observeProductAudio(this,emit);
    const observer=this.createEvent('UpdateEvent');observer.bind(()=>{const s=state(controller),observe=s.playing||wasPlaying;wasPlaying=s.playing;if(!observe)return;const key=JSON.stringify(s.playerPose);if(key===lastPose)return;lastPose=key;poseCount++;emit('observed-moving-pose',{poseOrdinal:poseCount,pose:s.playerPose,inputHash:s.inputHash});});
    try{
      emit('take-start',{scope:'Lens Studio Preview · scripted visible hand input · no physical Spectacles validation',timing:'Actual gestures, HTTPS and playback; no fixed-duration end padding.'});
      await hold(emit,'blocked room and hand hint',3000);
      await pressVisible('Try the route',emit);
      const blocked=await settled();expect(blocked.inputHash).toBe(baseline.inputHash);
      emit('actual-collision-pose',{scope:'Actual checked collision pose; no animated blocked prefix is claimed.'});
      await hold(emit,'chair hits the table',3500);
      await editAndUndo(emit);
      await hold(emit,'original furniture restored',2500);
      const final=await repairAndAlign(emit,true);
      expect(final.sourceRevision).toBe(baseline.sourceRevision+4);
      expect(poseCount>1).toBe(true);
      await hold(emit,'aligned table and fresh clear endpoint',3500);
      emit('take-complete',{wallDurationMs:Date.now()-started,observedMovingPoses:poseCount,finalInputHash:final.inputHash,finalRevision:final.sourceRevision});
    }finally{stopAudio();this.removeEvent(observer);await retreatVisible();}
  }
}
