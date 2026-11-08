import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { ScenarioConfig } from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig';
import { DefaultLeafInteractor } from 'Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor';
import { findSceneObjectByName, sleep, withTimeout } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor';
import { experience, state, target, until } from './OpenDoorScenarioSupport';
const Core=require('../OpenDoorCore');

/** Actual fresh plan and UI sharing. No state injection or direct product-handler calls. */
@component
export class OpenDoorShareFilmScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void> {
    await sleep(1500);
    const controller=experience(),hand=new DefaultLeafInteractor('Open Door automated share-film input');
    let baseline=await until(controller,s=>!s.evaluationPending&&s.revision===s.sourceRevision,'initial evaluation');
    if(baseline.menu!=='overview'||!baseline.miniature||baseline.sourceRevision!==0||!baseline.placement.confirmed)
      throw new Error('Start from a fresh confirmed miniature; this scenario must create its own repaired plan through actual input.');
    const expectedInputHash=config?.get('expectedInputHash');
    if(typeof expectedInputHash!=='string'||!/^[0-9a-f]{16}$/.test(expectedInputHash))
      throw new Error('Supply the observed main take input hash; do not infer or manufacture a match.');
    expect(baseline.inputHash,'Fresh baseline hash').toBe(Core.stableHash(Core.cloneInput()));
    const started=Date.now(),nativeStarted=getTime();let sequence=0;
    const stamp=()=>({sequence:sequence++,wallEpochMs:Date.now(),wallElapsedMs:Date.now()-started,nativeTime:getTime(),nativeElapsedSeconds:getTime()-nativeStarted});
    const emit=(name:string,extra:any={})=>print('OPEN_DOOR_SHARE_FILM '+JSON.stringify({...stamp(),name,...extra,state:state(controller)}));
    const press=async(name:string)=>{
      const item=target(name);let mode:number|undefined;
      const off=item.onTriggerStart.add(e=>{mode=e.interactor.activeTargetingMode;});
      emit('action-start',{target:name,inputKind:'automated SIK CustomController'});
      try{await withTimeout(hand.trigger(item),8000,'SIK trigger timed out: '+name);}finally{off();}
      expect(mode,'Share-film control must use actual indirect SIK input: '+name).toBe(TargetingMode.Indirect);
      emit('action-end',{target:name,actualTargetingMode:mode});
    };
      emit('setup-start',{scope:'Fresh share prelude uses actual SIK drag, Undo, HTTPS repair and Apply. Exclude setup from the handoff shot.'});
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

    expect(miniEnd.sourceRevision,'Fresh share prelude must naturally reach main take revision 3').toBe(3);
    expect(miniEnd.inputHash,'Fresh share plan must exactly match the observed main take hash').toBe(expectedInputHash);
    expect(miniEnd.acceptedRepair.inputHash,'Retained repair evidence must bind the current plan').toBe(expectedInputHash);
    emit('share-shot-ready',{preHoldMs:3000,expectedInputHash,scope:'This is a separate freshly reproduced take of the exact main model, not a continuation of the original recording.'});
    await sleep(3000);
    await press('More');await until(controller,s=>s.menu==='more','More');await sleep(700);
    await press('Room tools');await until(controller,s=>s.menu==='tools','Room tools');await sleep(700);
    await press('Save & share');await until(controller,s=>s.menu==='keep','Save & share');await sleep(700);
    await press('Show QR');
    const shared=await until(controller,s=>s.menu==='sharing'&&s.shareCurrent,'actual current-plan QR',8000);
    expect(shared.sourceRevision,'Sharing must preserve revision').toBe(3);
    expect(shared.inputHash,'Sharing must preserve exact main take input hash').toBe(expectedInputHash);
    expect(JSON.stringify(shared.inputSnapshot),'Sharing must preserve every supplied model field').toBe(JSON.stringify(miniEnd.inputSnapshot));
    expect(JSON.stringify(shared.acceptedRepair),'Sharing must preserve the retained repair evidence').toBe(JSON.stringify(miniEnd.acceptedRepair));
    const url=controller.currentShareLink;
    expect(url,'Actual UI URL must encode the current input').toBe(Core.createShareLink(shared.inputSnapshot,controller.companionBaseUrl));
    expect(url.startsWith('https://'),'Actual handoff must use HTTPS').toBe(true);
    emit('share-visible',{url,holdMs:8000,expectedInputHash,inputSnapshot:shared.inputSnapshot,acceptedRepair:shared.acceptedRepair,scope:'Model-only QR. Independent pixel decoding and fresh companion re-evaluation are separate acceptance gates.'});
    await sleep(8000);
    const end=state(controller);
    expect(end.inputHash,'QR hold must preserve current model').toBe(expectedInputHash);
    expect(controller.currentShareLink,'QR hold must preserve the exact URL').toBe(url);
    emit('share-film-complete',{url,expectedInputHash,actualDurationMs:Date.now()-started});
  }
}
