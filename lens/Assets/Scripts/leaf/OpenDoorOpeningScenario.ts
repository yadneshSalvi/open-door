import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { experience, state } from './OpenDoorScenarioSupport';
import { dragTableClear, hold, observeProductAudio, pressVisible, retreatVisible, settled } from './OpenDoorVisibleFlow';
const Core=require('../OpenDoorCore');

/** A real collision → visible table gesture → checked chair payoff. Door remains blocked. */
@component
export class OpenDoorOpeningScenario extends Scenario {
  async run():Promise<void>{
    await sleep(1500);const controller=experience(),before=await settled();
    if(before.menu!=='overview'||!before.miniature||!before.placement.confirmed||before.sourceRevision!==0)throw Error('Reset to the confirmed blocked miniature, then frame the camera.');
    expect(before.inputHash).toBe(Core.stableHash(Core.cloneInput()));
    expect(before.journey).toBe('blocked_witness');expect(before.door).toBe('blocked_witness');
    const started=Date.now();let shotStarted=0,poses=0,lastPose='',wasPlaying=false;
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_OPENING_ROUND3 '+JSON.stringify({name,wallEpochMs:Date.now(),wallElapsedMs:Date.now()-started,shotElapsedMs:shotStarted?Date.now()-shotStarted:null,nativeTime:getTime(),...extra,state:state(controller)}));
    const stopAudio=observeProductAudio(this,emit),observer=this.createEvent('UpdateEvent');
    observer.bind(()=>{const s=state(controller),observe=s.playing||wasPlaying;wasPlaying=s.playing;if(!observe)return;const key=JSON.stringify(s.playerPose);if(key===lastPose)return;lastPose=key;poses++;emit('observed-moving-pose',{poseOrdinal:poses,pose:s.playerPose});});
    try{
      emit('setup-start');await pressVisible('Try the route',emit);
      const collision=await settled();expect(collision.inputHash).toBe(before.inputHash);expect(collision.journey).toBe('blocked_witness');
      shotStarted=Date.now();
      emit('opening-camera-window',{minimumMs:2000,scope:'Actual checked collision pose. Operator may finish a slow camera move during this preroll; camera must be still for the hand gesture.'});
      await sleep(2000);
      const moved=await dragTableClear(emit);
      expect(moved.sourceRevision).toBe(before.sourceRevision+1);expect(moved.journey).toBe('verified_feasible');expect(moved.door).toBe('blocked_witness');
      expect(moved.playerPose.x).toBeCloseTo(moved.journeyGoal.x,6);expect(moved.playerPose.y).toBeCloseTo(moved.journeyGoal.y,6);
      expect(poses>1).toBe(true);
      emit('opening-actual-payoff',{observedMovingPoses:poses,scope:'Only the chair turn has cleared. The bench still blocks the separate door check. Accept the recorded action clock before making a first-ten-second claim.'});
      await hold(emit,'chair endpoint; door still blocked',3000);emit('opening-complete');
    }finally{stopAudio();this.removeEvent(observer);await retreatVisible();}
  }
}
