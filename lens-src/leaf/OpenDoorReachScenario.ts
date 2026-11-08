import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { ScenarioConfig } from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig';
import { IKBodyInteractor } from 'Leaf.lspkg/Interactors/interactor/ik/IKBodyInteractor';
import { DiagnosticRecorder } from 'Leaf.lspkg/Diagnostic/DiagnosticRecorder';
import { TargetingMode } from 'SpectaclesInteractionKit.lspkg/Core/Interactor/Interactor';
import { Button } from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button';
import { SIK } from 'SpectaclesInteractionKit.lspkg/SIK';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { experience, record, state, target, until } from './OpenDoorScenarioSupport';

/** Place the Preview camera first. Run once at tabletop viewing distance and once after leaning in. */
@component
export class OpenDoorReachScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void> {
    await sleep(1500);
    const controller=experience(),before=state(controller);
    if(before.menu!=='overview'||before.evaluationPending)throw new Error('Start at the settled overview.');
    const expected=config?.get('expectedStrategy')||'indirect';
    if(expected!=='direct'&&expected!=='indirect')throw new Error('expectedStrategy must be direct or indirect.');
    const diagnostics=DiagnosticRecorder.getInstance();diagnostics.setPolicy('fail-fast');
    // Disable the factory's functional fallback: a failed reach must remain a failure.
    const sides=['left','right'] as const;
    const parents=sides.map(side=>SIK.HandInputData.getHand(side).getHandVisuals().root.getParent());
    const hand=new IKBodyInteractor({fallback:undefined});
    const events:any[]=[],off:(()=>void)[]=[],started=Date.now();let mode:number|undefined,failure='';
    const trace=(name:string,event:any,item:any)=>{
      const transform=item.getTransform(),position=transform.getWorldPosition(),scale=transform.getWorldScale(),rotation=transform.getWorldRotation(),current=state(controller);
      const entry={name,wallEpochMs:Date.now(),elapsedMs:Date.now()-started,nativeTime:getTime(),target:item.getSceneObject().name,propagationPhase:event.propagationPhase,activeTargetingMode:event.interactor.activeTargetingMode,inputType:event.interactor.inputType,menu:current.menu,primaryActions:current.primaryActions,sourceRevision:current.sourceRevision,positionCm:{x:position.x,y:position.y,z:position.z},scale:{x:scale.x,y:scale.y,z:scale.z},rotation:{x:rotation.x,y:rotation.y,z:rotation.z,w:rotation.w}};
      events.push(entry);print('OPEN_DOOR_REACH_EVENT '+JSON.stringify(entry));
    };
    const observe=(item:any)=>{
      for(const [key,name] of [['onHoverEnter','SIK hover enter'],['onHoverExit','SIK hover exit'],['onTriggerStart','SIK trigger start'],['onTriggerEnd','SIK trigger end'],['onTriggerEndOutside','SIK trigger end outside'],['onTriggerCanceled','SIK trigger canceled']])
        off.push(item[key].add((event:any)=>trace(name,event,item)));
      const button=item.getSceneObject().getComponent(Button.getTypeName()) as Button|null;
      if(button)for(const [key,name] of [['onTriggerDown','UIKit down'],['onTriggerUp','UIKit up'],['onHoverExit','UIKit hover exit']])
        off.push(button[key].add((event:any)=>trace(name,event,item)));
    };
    try{
      const more=target('More');observe(more);
      off.push(more.onTriggerStart.add(event=>{mode=event.interactor.activeTargetingMode;}));
      await hand.trigger(more);
      record('reach-trigger-returned',{expected,mode,events,state:state(controller)});
      await until(controller,s=>s.menu==='more','More menu');
      if(expected==='direct')expect(mode===TargetingMode.Direct||mode===TargetingMode.Poke).toBe(true);
      else expect(mode).toBe(TargetingMode.Indirect);
      expect(diagnostics.hasErrors()).toBe(false);
      // More and Back occupy the same persistent slot; the observer stays attached.
      await hand.trigger(target('Back'));
      const end=await until(controller,s=>s.menu==='overview','return to overview');
      expect(end.inputHash).toBe(before.inputHash);expect(end.sourceRevision).toBe(before.sourceRevision);
      const actualStrategy=mode===TargetingMode.Direct?'direct':mode===TargetingMode.Poke?'poke':mode===TargetingMode.Indirect?'indirect':'unknown';
      record('reach-'+expected,{before,end,activeTargetingMode:mode,actualStrategy,diagnostics:diagnostics.toReport()});
    }catch(error){failure=String(error);throw error;}
    finally{
      off.forEach(unsubscribe=>unsubscribe());
      record('reach-event-trace',{expected,mode,failure,events,diagnostics:diagnostics.toReport()});
      hand.destroy();
      const restoredParents=sides.map((side,index)=>{
        const parent=SIK.HandInputData.getHand(side).getHandVisuals().root.getParent();
        return {side,parent:parent.name,restored:parent.isSame(parents[index]),hasTracking:!isNull(parent.getComponent('ObjectTracking3D'))};
      });
      record('reach-ik-cleanup',{restoredParents});
      // Official TrackedHandWrapper restarts tracking after 500 ms. Let that
      // finish before LEAF cleanup or a subsequent shared-hand scenario.
      await sleep(650);
    }
  }
}
