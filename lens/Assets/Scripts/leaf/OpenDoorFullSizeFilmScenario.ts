import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { DefaultLeafInteractor } from 'Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor';
import { findSceneObjectByName, sleep, withTimeout } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor';
import WorldCameraFinderProvider from 'SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider';
import { experience, state, target, until } from './OpenDoorScenarioSupport';
const Core=require('../OpenDoorCore');

/** Real repair followed by the same verified trajectory in a separately placed Preview scene. */
@component
export class OpenDoorFullSizeFilmScenario extends Scenario {
  async run():Promise<void> {
    await sleep(1500);
    const controller=experience(),hand=new DefaultLeafInteractor('Open Door automated full-size film input');
    let baseline=await until(controller,s=>!s.evaluationPending&&s.revision===s.sourceRevision,'initial evaluation');
    if(baseline.menu!=='overview'||!baseline.miniature||baseline.sourceRevision!==0||!baseline.placement.confirmed)
      throw new Error('Start from the fresh confirmed miniature in the intended full-size Preview environment.');
    expect(baseline.inputHash).toBe(Core.stableHash(Core.cloneInput()));
    const started=Date.now(),nativeStarted=getTime();let sequence=0,captureFull=false,lastPose='',poseCount=0;
    const stamp=()=>({sequence:sequence++,wallEpochMs:Date.now(),wallElapsedMs:Date.now()-started,nativeTime:getTime(),nativeElapsedSeconds:getTime()-nativeStarted});
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_FULL_FILM '+JSON.stringify({...stamp(),name,...extra,state:state(controller)}));
    const press=async(name:string)=>{
      const item=target(name);let mode:number|undefined;
      const off=item.onTriggerStart.add(e=>{mode=e.interactor.activeTargetingMode;});
      emit('action-start',{target:name,inputKind:'automated SIK CustomController'});
      try{await withTimeout(hand.trigger(item),8000,'SIK trigger timed out: '+name);}finally{off();}
      expect(mode).toBe(TargetingMode.Indirect);emit('action-end',{target:name,actualTargetingMode:mode});
    };
    const observer=this.createEvent('UpdateEvent');
    observer.bind(()=>{
      if(!captureFull)return;
      const value=state(controller);if(!value.playing||!value.playerPose)return;
      const key=JSON.stringify(value.playerPose);if(key===lastPose)return;lastPose=key;poseCount++;
      print('OPEN_DOOR_FULL_FILM '+JSON.stringify({...stamp(),name:'observed-full-size-pose',poseOrdinal:poseCount,pose:value.playerPose,inputHash:value.inputHash,sourceRevision:value.sourceRevision,audio:value.audio}));
    });
    try{
      emit('setup-start',{scope:'Separate Preview environment; supplied room, manual floor anchor, automated SIK input. Prelude is not the full-size film interval.'});
      // Match the main take's revision naturally: one real edit, then actual Undo.
      // This excluded setup never assigns input state or calls a product handler.
      const initial=baseline,input0=initial.inputSnapshot,table=input0.room.objects.find((o:any)=>o.id==='table');
      const steps=[{x:-.05,y:0},{x:0,y:-.05},{x:.05,y:0},{x:0,y:.05}];
      const delta=steps.find(d=>[.5,1,2].every(k=>!Core.placementIssue(input0.room,table.id,table.pose.x+d.x*k,table.pose.y+d.y*k,table.pose.theta)));
      if(!delta)throw new Error('No legal setup drag; do not substitute state injection.');
      const setupRoom=findSceneObjectByName('Room — provided fixture');if(!setupRoom)throw new Error('Provided-room display missing.');
      const matrix=setupRoom.getTransform().getWorldTransform(),origin=matrix.multiplyPoint(vec3.zero());
      const dragStep=matrix.multiplyPoint(new vec3(delta.x*100,0,-delta.y*100)).sub(origin).uniformScale(1/30);
      emit('setup-drag-start',{target:table.name,nominalDeltaM:delta,inputKind:'automated SIK CustomController'});
      await withTimeout(hand.drag(target(table.name),dragStep,500),8000,'Setup drag did not finish.');
      const moved=await until(controller,s=>!s.evaluationPending&&s.revision===1&&s.sourceRevision===1,'actual setup edit',15000);
      expect(moved.historyLength).toBe(initial.historyLength+1);emit('setup-drag-complete');
      await press('More');await until(controller,s=>s.menu==='more','More');
      await press('Room tools');await until(controller,s=>s.menu==='tools','Room tools');
      await press('More');await until(controller,s=>s.menu==='toolsMore','Undo controls');
      await press('Undo');
      const restored=await until(controller,s=>!s.evaluationPending&&s.revision===2&&s.sourceRevision===2,'actual setup Undo',15000);
      expect(JSON.stringify(restored.objects)).toBe(JSON.stringify(initial.objects));
      expect(JSON.stringify(restored.profile)).toBe(JSON.stringify(initial.profile));
      expect(JSON.stringify(restored.inputSnapshot.journey)).toBe(JSON.stringify(initial.inputSnapshot.journey));
      expect(restored.historyLength).toBe(initial.historyLength);
      // Expected-value construction is read-only; the product reached revision 2 through SIK.
      const expected=Core.cloneInput();expected.room.revision=2;
      expect(restored.inputHash).toBe(Core.stableHash(expected));
      await press('Back');await until(controller,s=>s.menu==='overview','restored overview');
      baseline=restored;emit('setup-original-geometry-restored',{note:'Actual drag and Undo preserve the main take revision history.'});
      await press('Find changes');
      const options=await until(controller,s=>{
        if(s.menu==='repairError'||s.menu==='repairEmpty')throw new Error('The actual online search did not produce verified choices.');
        return !s.repairSearching&&s.menu==='repairChoices'&&s.repairProposals.length>0;
      },'actual HTTPS options and local checks',30000);
      expect(options.repairTransport).toBe('ready');expect(options.repairMetrics.mode).toBe('https');
      expect(options.repairProposals.length).toBe(3);expect(options.inputHash).toBe(baseline.inputHash);
      const index=options.repairProposals.reduce((best:number,p:any,i:number)=>p.certifiedReserveM>options.repairProposals[best].certifiedReserveM?i:best,0);
      const chosen=options.repairProposals[index];expect(chosen.certifiedReserveM>=.03).toBe(true);
      emit('verified-options',{chosenIndex:index,selectionRule:'greatest independently certified reserve returned'});
      await press('Layout option '+(index+1));
      await until(controller,s=>s.menu==='repair'&&s.repairSolo&&s.repairPreview,'chosen option');
      await press('Use this layout');
      const applied=await until(controller,s=>!s.evaluationPending&&s.sourceRevision===baseline.sourceRevision+1&&s.revision===s.sourceRevision,'actual applied revision',15000);
      expect(applied.historyLength).toBe(baseline.historyLength+1);
      expect(applied.acceptedRepair.inputHash).toBe(applied.inputHash);expect(applied.acceptedRepair.proposalId).toBe(chosen.id);
      expect(JSON.stringify(applied.profile)).toBe(JSON.stringify(baseline.profile));
      expect(JSON.stringify(applied.inputSnapshot.journey)).toBe(JSON.stringify(baseline.inputSnapshot.journey));
      for(const object of baseline.objects){
        const current=applied.objects.find((o:any)=>o.id===object.id);expect(current.locked).toBe(object.locked);
        if(object.locked)expect(JSON.stringify(current.pose)).toBe(JSON.stringify(object.pose));
      }
      if(!applied.profileReviewed)await press('OK');
      await until(controller,s=>s.playing,'actual miniature rehearsal');
      const miniEnd=await until(controller,s=>!s.playing&&s.menu==='overview','complete miniature trajectory',30000);
      expect(miniEnd.inputHash).toBe(applied.inputHash);expect(miniEnd.journey).toBe('verified_feasible');expect(miniEnd.door).toBe('verified_feasible');
      expect(miniEnd.playerPose.x).toBeCloseTo(miniEnd.journeyGoal.x,6);expect(miniEnd.playerPose.y).toBeCloseTo(miniEnd.journeyGoal.y,6);
      emit('miniature-prelude-complete');
      await press('More');await until(controller,s=>s.menu==='more','More');
      await press('Full size');
      const full=await until(controller,s=>!s.miniature,'full-size display');
      expect(full.inputHash).toBe(applied.inputHash);expect(full.sourceRevision).toBe(applied.sourceRevision);
      expect(JSON.stringify(full.inputSnapshot)).toBe(JSON.stringify(applied.inputSnapshot));
      const room=findSceneObjectByName('Room — provided fixture');if(!room)throw new Error('Provided-room display missing.');
      const input=full.inputSnapshot,start=input.journey.start;
      const at=room.getTransform().getWorldTransform().multiplyPoint(new vec3((start.x-input.room.width/2)*100,0,-(start.y-input.room.depth/2)*100));
      const anchor=full.placement.fullSizeStartCm,scale=room.getTransform().getWorldScale();
      expect(at.x).toBeCloseTo(anchor.x,2);expect(at.y).toBeCloseTo(anchor.y,2);expect(at.z).toBeCloseTo(anchor.z,2);
      expect(scale.x).toBeCloseTo(1,5);expect(scale.y).toBeCloseTo(1,5);expect(scale.z).toBeCloseTo(1,5);
      await press('Back');await until(controller,s=>s.menu==='overview'&&!s.miniature,'full-size overview');
      emit('full-size-ready',{cameraPlacementWindowMs:12000,startWorldCm:{x:at.x,y:at.y,z:at.z},displayScale:{x:scale.x,y:scale.y,z:scale.z},scope:'Operator camera-placement window. The scenario does not move the camera or speed up the natural dock follow.'});
      await sleep(12000);
      const camera=WorldCameraFinderProvider.getInstance().getTransform();
      const dock=findSceneObjectByName('Open Door · surface tools');if(!dock)throw new Error('Full-size controls missing.');
      let dockDistanceCm=Infinity;
      await until(controller,()=>{
        const forward=camera.forward.uniformScale(-1),horizontal=new vec3(forward.x,0,forward.z);
        if(horizontal.lengthSquared<.0001)return false;
        const desired=camera.getWorldPosition().add(horizontal.normalize().uniformScale(110)).add(new vec3(0,-38,0));
        dockDistanceCm=dock.getTransform().getWorldPosition().distance(desired);
        return dockDistanceCm<=4;
      },'natural lazy-follow control settlement',20000);
      emit('camera-window-ended',{dockDistanceCm,settlementToleranceCm:4});
      captureFull=true;
      await press('Rehearse');
      await until(controller,s=>s.playing&&!s.miniature,'actual full-size rehearsal');
      const end=await until(controller,s=>!s.playing&&s.menu==='overview'&&!s.miniature,'full-size trajectory endpoint',30000);
      captureFull=false;
      expect(end.inputHash).toBe(applied.inputHash);expect(end.sourceRevision).toBe(applied.sourceRevision);
      expect(JSON.stringify(end.inputSnapshot)).toBe(JSON.stringify(applied.inputSnapshot));
      expect(end.playerPose.x).toBeCloseTo(end.journeyGoal.x,6);expect(end.playerPose.y).toBeCloseTo(end.journeyGoal.y,6);
      expect(Math.atan2(Math.sin(end.playerPose.theta-end.journeyGoal.theta),Math.cos(end.playerPose.theta-end.journeyGoal.theta))).toBeCloseTo(0,6);
      expect(poseCount>1).toBe(true);
      emit('full-size-endpoint',{observedMovingPoses:poseCount});
      await sleep(3000);
      emit('full-size-film-complete',{observedMovingPoses:poseCount,scope:'Actual full-size playback of the same repaired supplied model. Separate manually placed Preview scene; no scanning or hardware claim.'});
    }finally{this.removeEvent(observer);}
  }
}
