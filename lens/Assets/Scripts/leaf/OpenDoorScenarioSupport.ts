import { findInScene, sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { findInteractablesByName } from 'Leaf.lspkg/Interactors/InteractableUtils';
import { OpenDoorExperience } from '../OpenDoorExperience';

/** Read runtime evidence; scenarios never call the solver or mutate private input. */
export function experience():OpenDoorExperience {
  const found=findInScene(object=>object.getComponent(OpenDoorExperience.getTypeName()) as OpenDoorExperience|null);
  if(found.length!==1)throw new Error('Expected one active OpenDoorExperience.');
  return found[0];
}
export function state(controller:OpenDoorExperience):any {return JSON.parse(controller.getVerificationState());}
export function target(name:string) {
  const found=findInteractablesByName(name,undefined,true);
  if(found.length!==1)throw new Error('Expected one enabled target: '+name+'; found '+found.length);
  return found[0];
}
export async function until(controller:OpenDoorExperience,condition:(value:any)=>boolean,description:string,timeoutMs=15000):Promise<any> {
  const start=Date.now();
  while(Date.now()-start<timeoutMs){
    const value=state(controller);if(condition(value))return value;
    await sleep(50);
  }
  throw new Error('Timed out waiting for '+description+'. Last state: '+controller.getVerificationState());
}
export function record(name:string,value:any){print('OPEN_DOOR_LEAF '+JSON.stringify({name,time:getTime(),state:value}));}
