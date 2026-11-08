import { Scenario } from 'Leaf.lspkg/Scenarios/scenario/Scenario';
import { DefaultLeafInteractor } from 'Leaf.lspkg/Interactors/interactor/DefaultLeafInteractor';
import { expect } from 'Leaf.lspkg/Utils/common/Expect';
import { sleep } from 'Leaf.lspkg/Utils/common/Utils';
import { experience, record, state, target, until } from './OpenDoorScenarioSupport';

/** Run from a fresh provided fixture. All actions travel through real SIK targets. */
@component
export class OpenDoorRepairScenario extends Scenario {
  async run():Promise<void> {
    await sleep(1500);
    const controller=experience(),hand=new DefaultLeafInteractor('Open Door functional hand');
    await until(controller,s=>!s.evaluationPending&&s.revision===s.sourceRevision,'initial evaluation');
    if(state(controller).menu==='placement')await hand.trigger(target('Use supplied pose'));
    const before=await until(controller,s=>s.menu==='overview','overview');
    expect(before.journey==='verified_feasible').toBe(false);
    expect(before.door==='verified_feasible').toBe(false);
    expect(before.objects.find((o:any)=>o.id==='table').locked).toBe(false);
    expect(before.objects.find((o:any)=>o.id==='bench').locked).toBe(false);
    record('blocked-before',before);

    await hand.trigger(target('Find changes'));
    const options=await until(controller,s=>!s.repairSearching&&s.repairProposals.length>0,'verified online options',30000);
    expect(options.inputHash).toBe(before.inputHash);
    expect(options.sourceRevision).toBe(before.sourceRevision);
    expect(options.primaryActions.length).toBe(0);
    expect(options.spatialTargetCount).toBe(options.repairProposals.length);
    const index=options.repairProposals.findIndex((proposal:any)=>proposal.certifiedReserveM>=.03);
    if(index<0)throw new Error('No independently verified +3 cm option returned.');
    record('spatial-options',options);
    await hand.trigger(target('Layout option '+(index+1)));
    const after=await until(controller,s=>s.menu==='repair'&&s.repairSolo,'solo option');
    expect(after.inputHash).toBe(before.inputHash);
    expect(after.displayedJourney).toBe('verified_feasible');
    expect(after.displayedDoor).toBe('verified_feasible');
    expect(after.primaryActions.length).toBe(3);
    expect(after.displayedRepairCaption).toBe('After · +3.0 cm spare');

    await hand.trigger(target('Showing: After'));
    expect(state(controller).repairPreview).toBe(false);
    expect(state(controller).displayedJourney).toBe(before.journey);
    expect(state(controller).displayedRepairCaption).toBe('Before · current room');
    await hand.trigger(target('Showing: Before'));
    expect(state(controller).repairPreview).toBe(true);
    await hand.trigger(target('Use this layout'));
    const applied=await until(controller,s=>s.sourceRevision===before.sourceRevision+1&&!s.evaluationPending,'one fresh revision');
    expect(applied.revision).toBe(applied.sourceRevision);
    expect(applied.historyLength).toBe(before.historyLength+1);
    expect(JSON.stringify(applied.profile)).toBe(JSON.stringify(before.profile));
    for(const object of before.objects){
      const current=applied.objects.find((o:any)=>o.id===object.id);
      expect(current.locked).toBe(object.locked);
      if(object.locked)expect(JSON.stringify(current.pose)).toBe(JSON.stringify(object.pose));
    }
    expect(applied.acceptedRepair.inputHash).toBe(applied.inputHash);
    if(!applied.profileReviewed)await hand.trigger(target('OK'));
    await until(controller,s=>s.playing,'real rehearsal');
    const end=await until(controller,s=>!s.playing&&s.menu==='overview','rehearsal endpoint',30000);
    expect(end.journey).toBe('verified_feasible');expect(end.door).toBe('verified_feasible');
    expect(end.inputHash).toBe(applied.inputHash);
    expect(end.playerPose.x).toBeCloseTo(end.journeyGoal.x,6);
    expect(end.playerPose.y).toBeCloseTo(end.journeyGoal.y,6);
    expect(Math.atan2(Math.sin(end.playerPose.theta-end.journeyGoal.theta),Math.cos(end.playerPose.theta-end.journeyGoal.theta))).toBeCloseTo(0,6);
    record('rehearsed-clear',end);
    await hand.trigger(target('Find changes'));
    const unchanged=await until(controller,s=>!s.repairSearching&&s.menu==='repairUnneeded','already-clear result',30000);
    expect(unchanged.inputHash).toBe(end.inputHash);
    expect(unchanged.repairProposals.length).toBe(0);
    expect(unchanged.chairAnnotation).toBe('No changes needed');
    record('already-clear-no-change',unchanged);
    await hand.trigger(target('Back'));
  }
}
