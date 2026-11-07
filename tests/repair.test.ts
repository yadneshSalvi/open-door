import { beforeAll, describe, expect, it } from 'vitest';
import { cloneInput, placementIssue } from '../src/engine/fixture';
import { createRepairSearch, applyRepairProposal, rankRepairProposals, REPAIR_SETTINGS, type RepairProgress } from '../src/engine/repair';
import { evaluate, evaluateDoor, evaluateSteps, verifyTrajectory } from '../src/engine/planner';
import type { EvaluationInput } from '../src/engine/types';
function finish(input:EvaluationInput,options={}) {const job=createRepairSearch(input,options);let ticks=0;while(job.progress.status==='searching'){job.step(32);if(++ticks>100000)throw new Error('Finite search failed to terminate');}return job.progress;}
let result:RepairProgress;
beforeAll(()=>{result=finish(cloneInput());},20000);
describe('finite deterministic furniture repairs',()=>{
  it('finds a genuinely computed short multiobject fixture repair with stationary bed',()=>{
    expect(result.status).toBe('complete');expect(result.proposals.length).toBeGreaterThan(0);expect(result.proposals.length).toBeLessThanOrEqual(3);
    const best=result.proposals[0];expect(best.moves.length).toBe(2);expect(best.translationM).toBeLessThan(1.6);
    expect(best.input.room.objects[0]).toEqual(cloneInput().room.objects[0]);
    expect(best.input.profile).toEqual(cloneInput().profile);expect(best.input.journey).toEqual(cloneInput().journey);
    expect(best.input.room.revision).toBe(0);expect(best.input.room.width).toBe(4.2);expect(best.input.room.depth).toBe(3.4);
    expect(result.evaluated).toBeLessThanOrEqual(REPAIR_SETTINGS.maxEvaluations);
  });
  it('independently verifies every final placement, route, door and reserve claim',()=>{
    for(const p of result.proposals){
      for(const o of p.input.room.objects)expect(placementIssue(p.input.room,o.id,o.pose.x,o.pose.y,o.pose.theta)).toBeNull();
      expect(verifyTrajectory(p.input,p.evaluation.tasks.journey.motions).status).toBe('clear');expect(evaluateDoor(p.input).status).toBe('verified_feasible');
      // A conservative bound can be much lower than the exact gap. Certify the declared target independently.
      const target=p.extraClearanceM;
      const reserved={...p.input,profile:{...p.input.profile,clearance:p.input.profile.clearance+target}};
      const route=verifyTrajectory(reserved,p.evaluation.tasks.journey.motions),door=evaluateDoor(p.input,target);
      expect(route.status).toBe('clear');expect(door.status).toBe('verified_feasible');
      expect(p.certifiedReserveM).toBeCloseTo(target+Math.min(route.clearance,door.minimumClearance!),10);
      expect(p.extraClearanceM).toBe(target);
      expect(evaluate(p.input,p.evaluation.tasks.journey.motions).tasks.journey.motions).toEqual(p.evaluation.tasks.journey.motions);
    }
    expect(result.proposals.some(p=>p.certifiedReserveM>=.01)).toBe(true);
  });
  it('ranks reserve domains together and labels only the actual least movement found',()=>{
    const p=result.proposals[0];
    const low={...p,id:'low',movementCostM:2,extraClearanceM:0,certifiedReserveM:.001};
    const better={...p,id:'better',movementCostM:1,extraClearanceM:.01,certifiedReserveM:.011};
    const higher={...p,id:'higher',movementCostM:3,extraClearanceM:.03,certifiedReserveM:.031};
    const ranked=rankRepairProposals([low,higher,better]);
    expect(ranked.map(p=>p.id)).toEqual(['better','higher']);expect(ranked[0].label).toBe('Least movement found');
    expect(ranked[1].certifiedReserveM).toBeGreaterThan(ranked[0].certifiedReserveM);
  });
  it('atomically applies all moves and rejects stale, changed or tampered sources',()=>{
    const p=result.proposals[0],source=cloneInput(),next=applyRepairProposal(source,p);
    expect(source).toEqual(cloneInput());expect(next.room.revision).toBe(source.room.revision+1);
    for(const m of p.moves)expect(next.room.objects.find(o=>o.id===m.objectId)?.pose).toEqual(m.to);
    for(const mutate of [(i:EvaluationInput)=>i.room.revision++,(i:EvaluationInput)=>i.profile.clearance+=.01,(i:EvaluationInput)=>i.room.objects[1].locked=true,(i:EvaluationInput)=>i.journey.goal.x+=.1]){const changed=cloneInput();mutate(changed);expect(()=>applyRepairProposal(changed,p)).toThrow(/stale/);}
    const tampered=structuredClone(p);tampered.input.profile.width=.01;expect(()=>applyRepairProposal(source,tampered)).toThrow(/protected/);
    const bad=structuredClone(p);bad.moves[0].to={...bad.moves[0].to,x:-1};expect(()=>applyRepairProposal(source,bad)).toThrow();
    const exaggerated=structuredClone(p);exaggerated.certifiedReserveM+=.1;expect(()=>applyRepairProposal(source,exaggerated)).toThrow(/reserve/);
    const inflated=structuredClone(p);inflated.extraClearanceM=.03;expect(()=>applyRepairProposal(source,inflated)).toThrow(/reserve/);
  });
  it('preserves an already verified layout without proposing needless moves',()=>{
    const already=finish(result.proposals[0].input);expect(already.proposals).toEqual([]);expect(already.reason).toMatch(/already verifies/);
  });
  it('supports incremental evaluation and rejects invalid preferred trajectories',()=>{
    const p=result.proposals[0],steps=evaluateSteps(p.input,{maxNodes:1,preferredMotions:p.evaluation.tasks.journey.motions});
    expect(steps.next().done).toBe(false);let item=steps.next();while(!item.done)item=steps.next();expect(item.value.tasks.journey.status).toBe('verified_feasible');
    const wrong=[{start:p.input.journey.start,distance:0,angle:0}];expect(evaluate(p.input,wrong).tasks.journey.status).toBe('verified_feasible');expect(evaluate(p.input,wrong).tasks.journey.motions).not.toEqual(wrong);
  });
  it('cancellation discards existing proposals and prevents further work',()=>{
    const job=createRepairSearch(cloneInput());let n=0;while(!job.progress.proposals.length&&job.progress.status==='searching'){job.step(32);if(++n>100000)throw Error('not finite');}
    job.cancel();const cancelled=job.progress;expect(cancelled.status).toBe('cancelled');expect(cancelled.proposals).toEqual([]);expect(job.step(32)).toEqual(cancelled);
  },20000);
  it('does not fabricate a result for locked blockers or exhausted finite limits',()=>{
    const locked=cloneInput();locked.room.objects.forEach(o=>o.locked=true);const none=finish(locked);expect(none.proposals).toEqual([]);expect(none.reason).toMatch(/unlocked/);
    const limited=finish(cloneInput(),{maxEvaluations:0});expect(limited.proposals).toEqual([]);expect(limited.status).toBe('complete');expect(limited.reason).toMatch(/does not prove/);
  });
  it('derives candidates for renamed furniture in a rotated and translated room',()=>{
    const input=cloneInput(),width=input.room.width,depth=input.room.depth;
    const rotate=(p:{x:number;y:number;theta:number})=>({x:depth-p.y+.2,y:p.x+.3,theta:p.theta+Math.PI/2});
    input.room.width=depth+.4;input.room.depth=width+.6;input.room.id='custom-rotated';
    input.room.objects.forEach((o,k)=>{o.id=`piece-${k}`;o.name=`Item ${k}`;o.pose=rotate(o.pose);});
    input.journey.start=rotate(input.journey.start);input.journey.goal=rotate(input.journey.goal);
    const d=input.room.door;d.hinge={x:depth-d.hinge.y+.2,y:d.hinge.x+.3};d.closedAngle+=Math.PI/2;d.openAngle+=Math.PI/2;d.fixedAngle+=Math.PI/2;
    const custom=finish(input);expect(custom.proposals.length).toBeGreaterThan(0);
    for(const p of custom.proposals){expect(p.moves.every(m=>m.objectId.startsWith('piece-'))).toBe(true);expect(p.input.profile).toEqual(input.profile);expect(p.input.journey).toEqual(input.journey);expect(verifyTrajectory(p.input,p.evaluation.tasks.journey.motions).status).toBe('clear');expect(evaluateDoor(p.input).status).toBe('verified_feasible');}
  },20000);
});
