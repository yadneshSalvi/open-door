import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { ScenarioConfig } from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig';
import { DefaultLeafInteractor } from 'Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor';
import { IKBodyInteractor } from 'Leaf.lspkg/Interactors/interactor/ik/IKBodyInteractor';
import { DiagnosticRecorder } from 'Leaf.lspkg/Diagnostic/DiagnosticRecorder';
import { findSceneObjectByName, sleep, withTimeout } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor';
import { SIK } from 'SpectaclesInteractionKit.lspkg/SIK';
import { experience, record, state, target, until } from './OpenDoorScenarioSupport';
const Core=require('../OpenDoorCore');

/** Actual SIK gesture transactions. Geometry is read only to choose a legal small test move. */
@component
export class OpenDoorDragScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void> {
    await sleep(1500);
    const controller=experience(),before=state(controller),mode=config?.get('expectedStrategy')||'indirect';
    if(mode!=='direct'&&mode!=='indirect')throw new Error('expectedStrategy must be direct or indirect.');
    if(before.menu!=='overview'||before.evaluationPending||before.repairProposals.length)throw new Error('Start at a settled overview with no proposal.');
    const input=before.inputSnapshot,table=input.room.objects.find((o:any)=>o.id==='table');
    if(!table||table.locked)throw new Error('The table must be unlocked for this transaction scenario.');
    const room=findSceneObjectByName('Room — provided fixture');if(!room)throw new Error('Room display missing.');
    const axes=[{x:.05,y:0},{x:-.05,y:0},{x:0,y:.05},{x:0,y:-.05}];
    const delta=axes.find(d=>[.25,.5,1,1.5,2].every(k=>!Core.placementIssue(input.room,table.id,table.pose.x+d.x*k,table.pose.y+d.y*k,table.pose.theta)));
    if(!delta)throw new Error('No legal small table test move in the current room; use a fresh or accepted fixture.');
    const transform=room.getTransform().getWorldTransform(),origin=transform.multiplyPoint(vec3.zero());
    const worldDelta=transform.multiplyPoint(new vec3(delta.x*100,0,-delta.y*100)).sub(origin);
    const hand=new DefaultLeafInteractor('Open Door transaction hand'),piece=target(table.name);
    const previews:any[]=[],events:any[]=[],releases:any[]=[],eventCounts:{[key:string]:number}={};
    const started=Date.now();let release:any=null,releaseKind='',gestureFailure='',ikStrategy:any=null;
    const compact=(value:any)=>({revision:value.revision,sourceRevision:value.sourceRevision,inputHash:value.inputHash,historyLength:value.historyLength,dragActive:value.dragActive,dragCommitPending:value.dragCommitPending,evaluationPending:value.evaluationPending,menu:value.menu});
    const vector=(value:vec3|null|undefined)=>value?{x:value.x,y:value.y,z:value.z}:null;
    const trace=(name:string,event:any)=>{
      eventCounts[name]=(eventCounts[name]||0)+1;
      if(events.length>=240)return;
      events.push({name,elapsedMs:Date.now()-started,nativeTime:getTime(),activeTargetingMode:event.interactor.activeTargetingMode,inputType:event.interactor.inputType,propagationPhase:event.propagationPhase,startPointCm:vector(event.interactor.startPoint),direction:vector(event.interactor.direction),state:compact(state(controller))});
    };
    const offUpdate=piece.onTriggerUpdate.add(event=>{
      trace('trigger-update',event);
      const value=state(controller);
      if(value.dragActive)previews.push({revision:value.revision,sourceRevision:value.sourceRevision,inputHash:value.inputHash,historyLength:value.historyLength,activeTargetingMode:event.interactor.activeTargetingMode});
    });
    // Product semantics commit either legitimate release, including when the
    // dragged target has moved beyond hover. Cancellation is a separate event.
    const captureRelease=(kind:string,event:any)=>{
      release=state(controller);releaseKind=kind;
      releases.push({kind,state:compact(release)});trace(kind,event);
    };
    const offRelease=piece.onTriggerEnd.add(event=>captureRelease('trigger-end',event));
    const offTrace:[()=>void,...(()=>void)[]]=[
      piece.onTriggerStart.add(event=>trace('trigger-start',event)),
      piece.onDragUpdate.add(event=>trace('drag-update',event)),
      piece.onTriggerEndOutside.add(event=>captureRelease('trigger-end-outside',event)),
      piece.onTriggerCanceled.add(event=>trace('trigger-canceled',event)),
      piece.onHoverEnter.add(event=>trace('hover-enter',event)),
      piece.onHoverExit.add(event=>trace('hover-exit',event))
    ];
    try {
      if(mode==='direct'){
        DiagnosticRecorder.getInstance().setPolicy('fail-fast');
        const sides=['left','right'] as const;
        const parents=sides.map(side=>SIK.HandInputData.getHand(side).getHandVisuals().root.getParent());
        const ik=new IKBodyInteractor({fallback:undefined});
        try{
          ikStrategy={rightIndirect:ik.right.isIndirect(piece),leftIndirect:ik.left.isIndirect(piece)};
          await withTimeout(ik.drag(piece,worldDelta),15000,'Direct table drag did not finish.');
          expect(DiagnosticRecorder.getInstance().hasErrors(),'Direct table gesture must finish without LEAF diagnostic errors').toBe(false);
        }finally{
          ik.destroy();
          const restoredParents=sides.map((side,index)=>{
            const parent=SIK.HandInputData.getHand(side).getHandVisuals().root.getParent();
            expect(parent.isSame(parents[index]),side+' IK cleanup must restore the original hand parent').toBe(true);
            expect(isNull(parent.getComponent('ObjectTracking3D')),side+' restored parent must own ObjectTracking3D').toBe(false);
            return {side,parent:parent.name,restored:true,hasTracking:true};
          });
          record('direct-drag-ik-cleanup',{restoredParents});
          await sleep(650);
        }
      }else await withTimeout(hand.drag(piece,worldDelta.uniformScale(1/24),400),8000,'Far table drag did not finish.');
    }catch(error){gestureFailure=String(error);throw error;}
    finally{
      offUpdate();offRelease();offTrace.forEach(off=>off());
      record('drag-gesture-trace',{mode,gestureFailure,ikStrategy,target:piece.getSceneObject().name,targetPositionCm:vector(piece.getTransform().getWorldPosition()),targetScale:vector(piece.getTransform().getWorldScale()),requestedWorldDeltaCm:vector(worldDelta),before:compact(before),previewCount:previews.length,releaseKind,releaseCount:releases.length,releases,release:release?compact(release):null,after:compact(state(controller)),eventCounts,events,eventsTruncated:Object.keys(eventCounts).reduce((n,key)=>n+eventCounts[key],0)>events.length,diagnostics:DiagnosticRecorder.getInstance().toReport()});
    }
    expect(previews.length>0,'Table drag must produce an active preview; inspect drag-gesture-trace event counts and modes').toBe(true);
    for(const preview of previews){
      expect(preview.inputHash,'Drag preview must preserve source input hash').toBe(before.inputHash);expect(preview.sourceRevision,'Drag preview must preserve source revision').toBe(before.sourceRevision);
      expect(preview.historyLength,'Drag preview must preserve Undo history').toBe(before.historyLength);
      expect(preview.activeTargetingMode,'Every table preview must use exactly '+mode+' targeting').toBe(mode==='direct'?TargetingMode.Direct:TargetingMode.Indirect);
    }
    expect(eventCounts['trigger-canceled']||0,'A canceled gesture must never satisfy the valid-drag contract').toBe(0);
    expect(releases.length,'A valid drag must emit exactly one legitimate release: end or endOutside').toBe(1);
    expect(release!==null,'A legitimate release must have an observed transaction snapshot').toBe(true);
    expect(releaseKind==='trigger-end'||releaseKind==='trigger-end-outside','Only actual end/endOutside is a legitimate release').toBe(true);
    expect(release.inputHash,'Release callback must precede source commit').toBe(before.inputHash);
    expect(release.revision,'Release callback must preserve evaluated revision until the next Update').toBe(before.revision);
    expect(release.sourceRevision,'Release callback must preserve source revision until the next Update').toBe(before.sourceRevision);
    expect(release.historyLength,'Release callback must preserve Undo history until the next Update').toBe(before.historyLength);
    expect(release.dragCommitPending,'Release must queue exactly one table commit before the next Update').toBe(true);
    const moved=await until(controller,s=>!s.evaluationPending&&s.revision===before.sourceRevision+1,'released table evaluation',30000);
    expect(moved.historyLength,'Committed table drag must add exactly one Undo entry').toBe(before.historyLength+1);
    expect(JSON.stringify(moved.profile),'Committed table drag must preserve the chair profile').toBe(JSON.stringify(before.profile));
    const movedTable=moved.objects.find((o:any)=>o.id==='table');
    expect(Boolean(movedTable),'Committed layout must retain the table object').toBe(true);
    expect(Math.hypot(movedTable.pose.x-table.pose.x,movedTable.pose.y-table.pose.y)>1e-5,'Released legal drag must move the table').toBe(true);
    for(const object of before.objects)if(object.id!=='table')expect(JSON.stringify(moved.objects.find((o:any)=>o.id===object.id)),'Table drag must preserve '+object.id).toBe(JSON.stringify(object));
    record('drag-'+mode,{before,previews,releaseKind,releaseCount:releases.length,release,moved});

    await hand.trigger(target('More'));await until(controller,s=>s.menu==='more','More');
    await hand.trigger(target('Room tools'));await until(controller,s=>s.menu==='tools','Room tools');
    await hand.trigger(target('More'));await until(controller,s=>s.menu==='toolsMore','Undo tools');
    await hand.trigger(target('Undo'));
    const restored=await until(controller,s=>!s.evaluationPending&&s.revision===moved.revision+1,'Undo evaluation',30000);
    expect(JSON.stringify(restored.objects),'Undo must restore every original furniture field').toBe(JSON.stringify(before.objects));
    expect(JSON.stringify(restored.profile),'Undo must preserve the chair profile').toBe(JSON.stringify(before.profile));
    expect(restored.historyLength,'Undo must restore the previous history length').toBe(before.historyLength);
    await hand.trigger(target('Back'));await until(controller,s=>s.menu==='overview','overview');

    // Locked and deliberately out-of-bounds drops use real bounded far-ray input.
    const bed=restored.inputSnapshot.room.objects.find((o:any)=>o.id==='bed');
    expect(bed.locked,'Refusal test requires the bed to remain locked').toBe(true);
    await withTimeout(hand.drag(target(bed.name+' — LOCKED'),worldDelta.uniformScale(1/24),300),8000,'Locked-bed gesture did not finish.');
    expect(state(controller).inputHash,'Locked-bed gesture must preserve source input').toBe(restored.inputHash);
    expect(state(controller).historyLength,'Locked-bed gesture must preserve history').toBe(restored.historyLength);
    record('locked-bed-refusal',state(controller));

    const fresh=state(controller),invalidPreviews:any[]=[];
    const invalidTarget=target(table.name),invalidStep=transform.multiplyPoint(new vec3(input.room.width*200,0,0)).sub(origin);
    const offInvalid=invalidTarget.onTriggerUpdate.add(()=>{const s=state(controller);if(s.dragActive)invalidPreviews.push({inputHash:s.inputHash,sourceRevision:s.sourceRevision,historyLength:s.historyLength});});
    try{await withTimeout(hand.drag(invalidTarget,invalidStep,250),8000,'Boundary gesture did not finish.');}finally{offInvalid();}
    const rolledBack=await until(controller,s=>!s.dragActive&&!s.dragCommitPending,'invalid-drop rollback');
    expect(invalidPreviews.length>0,'Boundary gesture must actually preview a drag before rollback').toBe(true);
    expect(rolledBack.inputHash,'Invalid-drop rollback must preserve source input').toBe(fresh.inputHash);expect(rolledBack.historyLength,'Invalid-drop rollback must preserve history').toBe(fresh.historyLength);
    expect(JSON.stringify(rolledBack.objects),'Invalid-drop rollback must restore every furniture field').toBe(JSON.stringify(fresh.objects));
    record('invalid-boundary-rollback',{before:fresh,previews:invalidPreviews,after:rolledBack});
  }
}
