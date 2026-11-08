import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { DefaultLeafInteractor } from 'Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor';
import { findSceneObjectByName, sleep, withTimeout } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor';
import { experience, state, target, until } from './OpenDoorScenarioSupport';
const Core=require('../OpenDoorCore');

/**
 * Deliberately paced Preview rehearsal, not a recording or a physical reach test.
 * The invisible LEAF CustomController sends actual SIK input. Product state is
 * only observed here; no product action, placement, solver or export handler is called.
 */
@component
export class OpenDoorFilmScenario extends Scenario {
  async run():Promise<void> {
    await sleep(1500);
    const controller=experience();
    const baseline=await until(controller,s=>!s.evaluationPending&&s.revision===s.sourceRevision,'initial evaluation');
    if(baseline.menu!=='overview'||!baseline.miniature||!baseline.placement.confirmed||baseline.profileReviewed||baseline.sourceRevision!==0)
      throw new Error('Reset Preview, confirm its measured miniature placement, and start from the unreviewed revision-0 overview.');
    expect(baseline.inputHash).toBe(Core.stableHash(Core.cloneInput()));
    expect(baseline.journey).toBe('blocked_witness');expect(baseline.door).toBe('blocked_witness');
    const hand=new DefaultLeafInteractor('Open Door automated Preview film input');
    const wallStart=Date.now(),nativeStart=getTime();
    let sequence=0;
    const stamp=()=>({sequence:sequence++,wallEpochMs:Date.now(),wallElapsedMs:Date.now()-wallStart,nativeTime:getTime(),nativeElapsedSeconds:getTime()-nativeStart});
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_FILM '+JSON.stringify({...stamp(),name,...extra,state:state(controller)}));
    const pause=async(name:string,milliseconds:number)=>{
      emit('hold-start',{hold:name,minimumMs:milliseconds});await sleep(milliseconds);emit('hold-end',{hold:name});
    };
    const press=async(name:string)=>{
      const item=target(name);let actualMode:number|undefined;
      const off=item.onTriggerStart.add(event=>{actualMode=event.interactor.activeTargetingMode;});
      emit('action-start',{action:'SIK trigger',target:name});
      try{await withTimeout(hand.trigger(item),8000,'SIK trigger timed out: '+name);}finally{off();}
      expect(actualMode).toBe(TargetingMode.Indirect);
      emit('action-end',{action:'SIK trigger',target:name,actualTargetingMode:actualMode,inputKind:'automated CustomController'});
    };
    let lastPose='',poseCount=0,capturePlayback=false;
    const observer=this.createEvent('UpdateEvent');
    observer.bind(()=>{
      if(!capturePlayback)return;
      const value=state(controller);
      if(!value.playing||!value.playerPose)return;
      const key=JSON.stringify(value.playerPose);
      if(key===lastPose)return;
      lastPose=key;poseCount++;
      print('OPEN_DOOR_FILM '+JSON.stringify({...stamp(),name:'observed-rehearsal-pose',poseOrdinal:poseCount,pose:value.playerPose,inputHash:value.inputHash,sourceRevision:value.sourceRevision,audio:value.audio}));
    });
    try{
      emit('rehearsal-start',{scope:'Lens Studio Preview; automated functional SIK input; supplied room and footprint; no scanning or physical-glasses claim',timing:'Native playback and HTTPS run at their actual speed. Holds explain actual states; the ending is not padded to a target duration.'});
      await pause('blocked room',4000);
      await press('Rehearse');
      await until(controller,s=>s.menu==='profileConfirm','provided profile acknowledgment');
      await pause('provided footprint dimensions',3500);
      await press('OK');
      const witness=await until(controller,s=>s.menu==='overview'&&!s.playing&&s.profileReviewed,'checked blocked witness');
      expect(witness.inputHash).toBe(baseline.inputHash);
      expect(witness.journey).toBe('blocked_witness');
      emit('blocked-witness',{note:'This is the checked collision pose, not a claimed collision-free path to it.'});
      await pause('obstruction on the furniture',4500);

      // Choose only a legal, visible test displacement. This is a manual edit,
      // never a substitute for the independently computed repair later on.
      const input=witness.inputSnapshot,table=input.room.objects.find((o:any)=>o.id==='table');
      if(!table||table.locked)throw new Error('The provided bedside table must be unlocked.');
      const deltas=[{x:-.3,y:0},{x:0,y:-.3},{x:.3,y:0},{x:0,y:.3}];
      const delta=deltas.find(d=>[.25,.5,1,1.5,2].every(k=>!Core.placementIssue(input.room,table.id,table.pose.x+d.x*k,table.pose.y+d.y*k,table.pose.theta)));
      if(!delta)throw new Error('No legal bounded demonstration drag is available; do not replace it with a handler call.');
      const room=findSceneObjectByName('Room — provided fixture');if(!room)throw new Error('Provided room display missing.');
      const transform=room.getTransform().getWorldTransform(),origin=transform.multiplyPoint(vec3.zero());
      // LEAF 2.0.2 drag applies its vector on each actual Update. The endpoint is
      // therefore measured below, not asserted to equal this nominal 30 cm move.
      const perUpdate=transform.multiplyPoint(new vec3(delta.x*100,0,-delta.y*100)).sub(origin).uniformScale(1/54);
      const item=target(table.name),previewSamples:any[]=[];
      let release:any=null;
      await withTimeout(hand.hover(item,1200),5000,'Table hover timed out.');
      const offUpdate=item.onTriggerUpdate.add(event=>{
        const value=state(controller);if(!value.dragActive)return;
        const position=item.getTransform().getWorldPosition();
        previewSamples.push({wallEpochMs:Date.now(),nativeTime:getTime(),sourceRevision:value.sourceRevision,inputHash:value.inputHash,historyLength:value.historyLength,activeTargetingMode:event.interactor.activeTargetingMode,worldCm:{x:position.x,y:position.y,z:position.z}});
      });
      const offRelease=item.onTriggerEnd.add(()=>{release=state(controller);});
      emit('action-start',{action:'SIK far drag',target:table.name,nominalDeltaM:delta,durationMs:900});
      try{await withTimeout(hand.drag(item,perUpdate,900),8000,'Table drag did not finish.');}
      finally{offUpdate();offRelease();}
      expect(previewSamples.length>0).toBe(true);
      for(const sample of previewSamples){
        expect(sample.inputHash).toBe(baseline.inputHash);expect(sample.sourceRevision).toBe(baseline.sourceRevision);
        expect(sample.historyLength).toBe(baseline.historyLength);expect(sample.activeTargetingMode).toBe(TargetingMode.Indirect);
      }
      expect(release!==null).toBe(true);expect(release.inputHash).toBe(baseline.inputHash);expect(release.dragCommitPending).toBe(true);
      const moved=await until(controller,s=>!s.evaluationPending&&s.sourceRevision===baseline.sourceRevision+1&&s.revision===s.sourceRevision,'released edit evaluation',15000);
      const movedTable=moved.objects.find((o:any)=>o.id===table.id);
      const actualDistanceM=Math.hypot(movedTable.pose.x-table.pose.x,movedTable.pose.y-table.pose.y);
      expect(actualDistanceM>.03&&actualDistanceM<.61).toBe(true);
      expect(moved.historyLength).toBe(baseline.historyLength+1);
      expect(JSON.stringify(moved.profile)).toBe(JSON.stringify(baseline.profile));
      emit('action-end',{action:'SIK far drag',target:table.name,actualDistanceM,previewSamples,queuedRelease:release});
      await pause('released edit and fresh check',3000);

      await press('More');await until(controller,s=>s.menu==='more','More');await pause('More controls',900);
      await press('Room tools');await until(controller,s=>s.menu==='tools','Room tools');await pause('Room tools',900);
      await press('More');await until(controller,s=>s.menu==='toolsMore','Undo controls');await pause('Undo control',900);
      await press('Undo');
      const restored=await until(controller,s=>!s.evaluationPending&&s.sourceRevision===moved.sourceRevision+1&&s.revision===s.sourceRevision,'Undo evaluation',15000);
      expect(JSON.stringify(restored.objects)).toBe(JSON.stringify(baseline.objects));
      expect(JSON.stringify(restored.profile)).toBe(JSON.stringify(baseline.profile));
      expect(JSON.stringify(restored.inputSnapshot.journey)).toBe(JSON.stringify(baseline.inputSnapshot.journey));
      expect(restored.historyLength).toBe(baseline.historyLength);
      expect(restored.journey).toBe('blocked_witness');expect(restored.door).toBe('blocked_witness');
      emit('original-geometry-restored',{note:'Undo restores poses and assumptions; the revision correctly advances.'});
      await pause('restored result',1500);await press('Back');
      await until(controller,s=>s.menu==='overview','restored overview');await pause('before the computed repair',2500);

      await press('Find changes');
      const options=await until(controller,s=>{
        if(s.menu==='repairError'||s.menu==='repairEmpty')throw new Error('The actual online repair did not produce the required options: '+JSON.stringify(s.repairMetrics));
        return !s.repairSearching&&s.menu==='repairChoices'&&s.repairProposals.length>0;
      },'actual online repair and local verification',30000);
      expect(options.repairTransport).toBe('ready');expect(options.repairMetrics.mode).toBe('https');
      expect(options.repairProposals.length).toBe(3);
      expect(options.inputHash).toBe(restored.inputHash);expect(options.sourceRevision).toBe(restored.sourceRevision);
      expect(options.primaryActions.length).toBe(0);expect(options.spatialTargetCount).toBe(3);
      const index=options.repairProposals.reduce((best:number,p:any,i:number)=>p.certifiedReserveM>options.repairProposals[best].certifiedReserveM?i:best,0);
      const chosen=options.repairProposals[index];
      expect(chosen.certifiedReserveM>=.03).toBe(true);
      emit('verified-options',{selectedOptionIndex:index,selectionRule:'greatest independently certified reserve among the returned finite-search choices'});
      await pause('three spatial alternatives',7000);
      await press('Layout option '+(index+1));
      const after=await until(controller,s=>s.menu==='repair'&&s.repairSolo&&s.repairPreview,'chosen After view');
      expect(after.inputHash).toBe(restored.inputHash);
      expect(after.displayedJourney).toBe('verified_feasible');expect(after.displayedDoor).toBe('verified_feasible');
      expect(after.primaryActions.length).toBe(3);
      await pause('chosen layout and certified reserve',6000);
      await press('Showing: After');
      const before=await until(controller,s=>!s.repairPreview,'original layout comparison');
      expect(before.displayedJourney).toBe(restored.journey);expect(before.displayedDoor).toBe(restored.door);
      expect(before.displayedRepairCaption).toBe('Before · current room');
      await pause('original layout',4500);
      await press('Showing: Before');
      await until(controller,s=>s.repairPreview,'proposed layout comparison');
      await pause('proposed layout',4500);
      capturePlayback=true;
      await press('Use this layout');
      const applied=await until(controller,s=>!s.evaluationPending&&s.sourceRevision===restored.sourceRevision+1&&s.revision===s.sourceRevision,'one applied revision',15000);
      expect(applied.historyLength).toBe(restored.historyLength+1);
      expect(applied.acceptedRepair.inputHash).toBe(applied.inputHash);
      expect(applied.acceptedRepair.proposalId).toBe(chosen.id);
      expect(JSON.stringify(applied.profile)).toBe(JSON.stringify(baseline.profile));
      expect(JSON.stringify(applied.inputSnapshot.journey)).toBe(JSON.stringify(baseline.inputSnapshot.journey));
      for(const object of baseline.objects){
        const current=applied.objects.find((o:any)=>o.id===object.id);expect(current.locked).toBe(object.locked);
        if(object.locked)expect(JSON.stringify(current.pose)).toBe(JSON.stringify(object.pose));
      }
      emit('applied-and-rehearsing');
      await until(controller,s=>s.playing,'actual chair playback');
      const end=await until(controller,s=>!s.playing&&s.menu==='overview','complete chair trajectory',30000);
      expect(end.inputHash).toBe(applied.inputHash);
      expect(end.journey).toBe('verified_feasible');expect(end.door).toBe('verified_feasible');
      expect(end.playerPose.x).toBeCloseTo(end.journeyGoal.x,6);expect(end.playerPose.y).toBeCloseTo(end.journeyGoal.y,6);
      expect(Math.atan2(Math.sin(end.playerPose.theta-end.journeyGoal.theta),Math.cos(end.playerPose.theta-end.journeyGoal.theta))).toBeCloseTo(0,6);
      expect(poseCount>1).toBe(true);
      capturePlayback=false;
      emit('rehearsal-endpoint',{observedMovingPoses:poseCount});
      await pause('clear endpoint',6500);
      emit('rehearsal-complete',{wallDurationMs:Date.now()-wallStart,observedMovingPoses:poseCount,scope:'Automated Preview/SIK rehearsal only; native footage and real-time capture acceptance are separate gates.'});
    }finally{this.removeEvent(observer);}
  }
}
