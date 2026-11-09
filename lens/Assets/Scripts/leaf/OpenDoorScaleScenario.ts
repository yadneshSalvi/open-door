import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { ScenarioConfig } from 'Leaf.lspkg/Scenarios/scenario/ScenarioConfig';
import { pressVisible, retreatVisible } from './OpenDoorVisibleFlow';
import { findSceneObjectByName, sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import WorldCameraFinderProvider from 'SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider';
import { experience, record, state, until } from './OpenDoorScenarioSupport';

/** Scale through actual controls. Camera walk-around remains a separate visual acceptance. */
@component
export class OpenDoorScaleScenario extends Scenario {
  async run(config?:ScenarioConfig):Promise<void> {
    await sleep(1500);
    const controller=experience(),before=state(controller);
    if(before.menu!=='overview'||!before.miniature||before.evaluationPending)throw new Error('Start at the settled miniature overview.');
    const camera=WorldCameraFinderProvider.getInstance().getTransform(),cameraPosition=camera.getWorldPosition(),cameraRotation=camera.getWorldRotation();
    const room=findSceneObjectByName('Example room');if(!room)throw new Error('Room display missing.');
    await pressVisible('More');await until(controller,s=>s.menu==='more','More');
    await pressVisible('Real size');
    const full=await until(controller,s=>!s.miniature,'full-size mode');
    expect(full.inputHash).toBe(before.inputHash);expect(full.sourceRevision).toBe(before.sourceRevision);
    expect(JSON.stringify(full.inputSnapshot)).toBe(JSON.stringify(before.inputSnapshot));
    const input=full.inputSnapshot,start=input.journey.start,at=room.getTransform().getWorldTransform().multiplyPoint(new vec3((start.x-input.room.width/2)*100,0,-(start.y-input.room.depth/2)*100));
    const anchor=full.placement.fullSizeStartCm,scale=room.getTransform().getWorldScale();
    expect(at.x).toBeCloseTo(anchor.x,2);expect(at.y).toBeCloseTo(anchor.y,2);expect(at.z).toBeCloseTo(anchor.z,2);
    expect(scale.x).toBeCloseTo(1,5);expect(scale.y).toBeCloseTo(1,5);expect(scale.z).toBeCloseTo(1,5);
    expect(camera.getWorldPosition().distance(cameraPosition)).toBeCloseTo(0,4);
    const rotation=camera.getWorldRotation();
    expect(rotation.x).toBeCloseTo(cameraRotation.x,5);expect(rotation.y).toBeCloseTo(cameraRotation.y,5);
    expect(rotation.z).toBeCloseTo(cameraRotation.z,5);expect(rotation.w).toBeCloseTo(cameraRotation.w,5);
    record('full-size-anchor',{state:full,startWorldCm:{x:at.x,y:at.y,z:at.z},scale:{x:scale.x,y:scale.y,z:scale.z},cameraUnchanged:true});
    if(config?.get('retainFullSize')==='true'){
      await sleep(2000);
      record('full-size-retained-for-operator',{state:state(controller),scope:'Separate manually placed supplied-room Preview scene. Camera movement and visible floor contact require the capture operator.'});
      return;
    }
    await pressVisible('More');await until(controller,s=>s.menu==='more','real-size More');await pressVisible('Table view');
    const mini=await until(controller,s=>s.miniature,'return to miniature');
    expect(mini.inputHash).toBe(before.inputHash);
    expect(room.getTransform().getWorldScale().x).toBeCloseTo(.1,5);
    await until(controller,s=>s.menu==='overview','overview');await retreatVisible();
    record('scale-round-trip',state(controller));
  }
}
