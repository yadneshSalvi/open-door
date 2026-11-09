import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { findSceneObjectByName, sleep, withTimeout } from 'Leaf.lspkg/Utils/common/Utils';
import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor';
import WorldCameraFinderProvider from 'SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider';
import { alignedTablePose } from '../SpatialExperiencePolicy';
import { OpenDoorHandPath } from './OpenDoorHandPath';
import { experience, record, state, target, until } from './OpenDoorScenarioSupport';
const Core=require('../OpenDoorCore');
export type FilmLog=(name:string,extra?:any)=>void;
let pathHand:OpenDoorHandPath|null=null;
export function visiblePath(){return !pathHand||pathHand.shared.disposed?(pathHand=new OpenDoorHandPath()):pathHand;}
export function visibleHand(){return visiblePath().shared;}
export async function retreatVisible(){await visiblePath().teardown();}

/** Genuine SIK events from an owned SDK hand wrapper, posed at its measured pinch midpoint. */
export async function pressVisible(name:string,emit:FilmLog=record,point?:vec3){
  // Evaluation/playback can replace the dock one Update before the contextual
  // object target is re-enabled. Wait only for the real public SIK target.
  let item:ReturnType<typeof target>|null=null;const deadline=Date.now()+1000;
  while(!item){try{item=target(name);}catch(error){if(!String(error).endsWith('found 0')||Date.now()>=deadline)throw error;await sleep(16);}}
  let mode:number|undefined,releaseCount=0;
  const off=[
    item.onTriggerStart.add(event=>{mode=event.interactor.activeTargetingMode;emit('button-trigger-down',{target:name,actualTargetingMode:mode,wallEpochMs:Date.now(),nativeTime:getTime()});}),
    item.onTriggerEnd.add(event=>{releaseCount++;emit('button-trigger-up',{target:name,releaseKind:'end',actualTargetingMode:event.interactor.activeTargetingMode,wallEpochMs:Date.now(),nativeTime:getTime()});}),
    item.onTriggerEndOutside.add(event=>emit('button-trigger-outside',{target:name,actualTargetingMode:event.interactor.activeTargetingMode,wallEpochMs:Date.now(),nativeTime:getTime()})),
  ];
  emit('action-start',{target:name,inputKind:'visible scripted right hand'});
  try{await withTimeout(visiblePath().trigger(item,point),10000,'Visible-hand trigger timed out: '+name);}
  finally{off.forEach(remove=>remove());}
  expect(mode,'Actual SIK Direct trigger: '+name).toBe(TargetingMode.Direct);
  expect(releaseCount,'A button must receive one actual release: '+name).toBe(1);
  emit('action-end',{target:name,actualTargetingMode:mode});
}

/** Read-only scheduling receipt for video-only capture, never microphone evidence. */
export function observeProductAudio(owner:BaseScriptComponent,emit:FilmLog){
  const controller=experience();let previous=state(controller),active=true;
  const update=owner.createEvent('UpdateEvent'),destroy=owner.createEvent('OnDestroyEvent');
  const stop=()=>{if(!active)return;active=false;owner.removeEvent(update);owner.removeEvent(destroy);};
  update.bind(()=>{
    if(!active)return;const current=state(controller),old=previous.audio,audio=current.audio;
    if(audio&&old&&audio.count!==old.count)emit('product-audio-cue',{cue:audio.lastCue,count:audio.count,delta:audio.count-old.count,wallEpochMs:Date.now(),nativeTime:getTime(),scope:'Observed product scheduling counter, not recorded sound.'});
    if(previous.playing&&!current.playing&&old?.lastCue==='roll')emit('product-roll-stop',{wallEpochMs:Date.now(),nativeTime:getTime(),reason:'Observed playback end/stop; native cue assets may be reconstructed only at these recorded events.'});
    previous=current;
  });
  destroy.bind(stop);return stop;
}
export async function settled(revision?:number){
  return until(experience(),s=>!s.evaluationPending&&!s.playing&&s.revision===s.sourceRevision&&(revision===undefined||s.sourceRevision===revision),'fresh evaluation and automatic playback endpoint',30000);
}
export async function hold(emit:FilmLog,name:string,ms:number){emit('hold-start',{name,minimumMs:ms});await sleep(ms);emit('hold-end',{name});}
export async function waitForDock(emit:FilmLog){
  const camera=WorldCameraFinderProvider.getInstance().getTransform(),dock=findSceneObjectByName('Open Door · surface tools');
  if(!dock)throw Error('Surface tools missing.');let stable=0;const start=Date.now();
  while(Date.now()-start<20000){
    const forward=camera.forward.uniformScale(-1),flat=new vec3(forward.x,0,forward.z).normalize();
    const desired=camera.getWorldPosition().add(flat.uniformScale(75)).add(new vec3(0,-40,0));
    const distance=dock.getTransform().getWorldPosition().distance(desired);
    if(distance<5)stable++;else stable=0;
    if(stable>=4){emit('dock-settled',{distanceCm:distance,waitMs:Date.now()-start});return;}
    await sleep(100);
  }
  throw Error('Real-size controls did not settle near the operator camera.');
}

/** A genuine visible drag clears the bedside turn only; the door remains separately checked. */
export async function dragTableClear(emit:FilmLog=record){
  const controller=experience(),before=await settled(),input=before.inputSnapshot;
  const table=input.room.objects.find((o:any)=>o.id==='table'),wardrobe=input.room.objects.find((o:any)=>o.id==='wardrobe');
  if(!table||!wardrobe||table.locked)throw Error('An unlocked table and wardrobe are required.');
  const destination=alignedTablePose(table,wardrobe),delta={x:destination.x-table.pose.x,y:destination.y-table.pose.y};
  if(Math.hypot(delta.x,delta.y)<.01)throw Error('The demonstration must start with a genuinely displaced table.');
  for(let n=0;n<=24;n++)if(Core.placementIssue(input.room,table.id,table.pose.x+delta.x*n/24,table.pose.y+delta.y*n/24,table.pose.theta))throw Error('The planned demonstration drag crosses another footprint.');
  const room=findSceneObjectByName('Example room');if(!room)throw Error('Room display missing.');
  const matrix=room.getTransform().getWorldTransform(),origin=matrix.multiplyPoint(vec3.zero());
  const worldDelta=matrix.multiplyPoint(new vec3(delta.x*100,0,-delta.y*100)).sub(origin);
  const item=target(table.name),top=item.getTransform().getWorldTransform().multiplyPoint(new vec3(0,table.height*80,0)),previews:any[]=[];let release:any=null,releaseKind='',releaseCount=0,canceled=0;
  const off=item.onTriggerUpdate.add(event=>{const s=state(controller);if(s.dragActive)previews.push({inputHash:s.inputHash,sourceRevision:s.sourceRevision,historyLength:s.historyLength,mode:event.interactor.activeTargetingMode});});
  const end=(kind:string,event:any)=>{release=state(controller);releaseKind=kind;releaseCount++;emit('furniture-release',{target:table.name,releaseKind:kind,actualTargetingMode:event.interactor.activeTargetingMode,wallEpochMs:Date.now(),nativeTime:getTime(),state:release});};
  const offStart=item.onTriggerStart.add(event=>emit('furniture-grab',{target:table.name,actualTargetingMode:event.interactor.activeTargetingMode,wallEpochMs:Date.now(),nativeTime:getTime()}));
  const offEnd=item.onTriggerEnd.add(event=>end('end',event)),offOutside=item.onTriggerEndOutside.add(event=>end('endOutside',event)),offCancel=item.onTriggerCanceled.add(()=>canceled++);
  emit('drag-start',{target:table.name,intendedDestinationM:destination,scope:'Actual hand movement; the native release result decides what changed.'});
  try{await withTimeout(visiblePath().followTimedPath(item,[top,top.add(worldDelta)],1400,()=>{}),12000,'Visible table drag timed out.');}
  finally{off();offStart();offEnd();offOutside();offCancel();}
  expect(previews.length>0).toBe(true);expect(canceled).toBe(0);expect(releaseCount).toBe(1);
  for(const p of previews){expect(p.inputHash).toBe(before.inputHash);expect(p.sourceRevision).toBe(before.sourceRevision);expect(p.historyLength).toBe(before.historyLength);expect(p.mode).toBe(TargetingMode.Direct);}
  expect(release!==null).toBe(true);expect(release.dragCommitPending).toBe(true);expect(release.sourceRevision).toBe(before.sourceRevision);
  const moved=await settled(before.sourceRevision+1);
  expect(moved.historyLength).toBe(before.historyLength+1);expect(moved.journey).toBe('verified_feasible');expect(moved.door).toBe(before.door);
  emit('drag-checked',{before,previews,releaseKind,release,moved,scope:'The chair route clears; the separate door result is unchanged.'});
  return moved;
}

/** The same actual table gesture followed by its object Undo chip. */
export async function editAndUndo(emit:FilmLog=record){
  const controller=experience(),before=await settled(),moved=await dragTableClear(emit);
  await pressVisible('Undo edit',emit);
  const restored=await settled(moved.sourceRevision+1);
  expect(JSON.stringify(restored.objects)).toBe(JSON.stringify(before.objects));expect(JSON.stringify(restored.profile)).toBe(JSON.stringify(before.profile));expect(restored.historyLength).toBe(before.historyLength);
  emit('undo-checked',{state:restored});return restored;
}

/** Actual HTTPS proposal, local checks, Use, then an independently checked Align back edit. */
export async function repairAndAlign(emit:FilmLog=record,paced=false){
  const controller=experience(),before=await settled();
  await pressVisible('Suggest fixes',emit);
  const options=await until(controller,s=>{
    if(['repairError','repairEmpty'].includes(s.menu))throw Error('Actual online repair failed: '+JSON.stringify(s.repairMetrics));
    return !s.repairSearching&&s.menu==='repairChoices'&&s.repairProposals.length>0;
  },'real HTTPS options and local verification',30000);
  expect(options.repairTransport).toBe('ready');expect(options.repairMetrics.mode).toBe('https');
  expect(options.inputHash).toBe(before.inputHash);expect(options.sourceRevision).toBe(before.sourceRevision);expect(options.repairProposals.length<=3).toBe(true);
  const index=options.repairProposals.reduce((best:number,p:any,i:number)=>p.certifiedReserveM>options.repairProposals[best].certifiedReserveM?i:best,0),chosen=options.repairProposals[index];
  expect(chosen.certifiedReserveM>=.03).toBe(true);emit('verified-options',{index,chosen});
  if(paced)await hold(emit,'three checked alternatives',3000);
  await pressVisible('Layout option '+(index+1),emit);
  const after=await until(controller,s=>s.menu==='repair'&&s.repairSolo,'selected layout');
  expect(after.displayedJourney).toBe('verified_feasible');expect(after.displayedDoor).toBe('verified_feasible');
  await pressVisible('Compare',emit);await until(controller,s=>s.menu==='repairCompare','Compare');
  await pressVisible('Before',emit);expect(state(controller).displayedJourney).toBe(before.journey);
  if(paced)await hold(emit,'Before',1800);
  await pressVisible('After',emit);expect(state(controller).repairPreview).toBe(true);
  if(paced)await hold(emit,'After',1800);
  await pressVisible('Back',emit);await until(controller,s=>s.menu==='repair','selected layout controls');
  await pressVisible('Use',emit);
  const applied=await settled(before.sourceRevision+1);
  expect(applied.acceptedRepair.inputHash).toBe(applied.inputHash);expect(applied.historyLength).toBe(before.historyLength+1);
  expect(applied.journey).toBe('verified_feasible');expect(applied.door).toBe('verified_feasible');
  expect(applied.playerPose.x).toBeCloseTo(applied.journeyGoal.x,6);expect(applied.playerPose.y).toBeCloseTo(applied.journeyGoal.y,6);
  emit('repair-playback-endpoint',{state:applied});
  await until(controller,s=>!s.undoVisible,'prior object Undo chip expiry',8000);
  const table=applied.inputSnapshot.room.objects.find((o:any)=>o.id==='table');
  await visiblePath().hover(target(table.name),450);
  await until(controller,()=>{try{return Boolean(target('Align table'));}catch(_){return false;}},'on-object Align back');
  await pressVisible('Align table',emit);
  const aligned=await settled(applied.sourceRevision+1),pose=aligned.objects.find((o:any)=>o.id==='table').pose;
  expect(pose.x).toBeCloseTo(.91,6);expect(pose.y).toBeCloseTo(3.01,6);expect(pose.theta).toBeCloseTo(0,6);
  expect(aligned.acceptedRepair).toBe(null);expect(aligned.historyLength).toBe(applied.historyLength+1);
  expect(aligned.journey).toBe('verified_feasible');expect(aligned.door).toBe('verified_feasible');
  expect(JSON.stringify(aligned.profile)).toBe(JSON.stringify(before.profile));
  for(const object of applied.objects)if(object.id!=='table')expect(JSON.stringify(aligned.objects.find((o:any)=>o.id===object.id))).toBe(JSON.stringify(object));
  emit('final-aligned-fresh-check',{state:aligned,oldCertificateCleared:true,scope:'Fresh whole-input checks; the previous 3 cm layout certificate no longer applies.'});
  return aligned;
}
