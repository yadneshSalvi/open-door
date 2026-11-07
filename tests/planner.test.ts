import { describe, expect, it } from 'vitest';
import { cloneInput, moveObject, suggestedPositions } from '../src/engine/fixture';
import { evaluate, evaluateJourney, goalReached, motionAllowed, verifyTrajectory } from '../src/engine/planner';
function openRoom(){const i=cloneInput();i.room.width=10;i.room.depth=10;i.room.objects=[];i.journey.start={x:3,y:3,theta:0};i.journey.goal={x:5,y:3,theta:0};return i;}
describe('movement and truthful route semantics',()=>{
  it('requires goal heading, with wraparound',()=>{
    const task=openRoom().journey;
    expect(goalReached({...task.goal,theta:Math.PI},task)).toBe(false);
    expect(goalReached({...task.goal,theta:2*Math.PI-.01},task)).toBe(true);
  });
  it('enforces radius, reverse permission and no pivot for minimum-radius profiles',()=>{
    const p={...openRoom().profile,movement:'minimum_radius' as const,minimumTurningRadius:1,allowReverse:false};
    const start={x:3,y:3,theta:0};
    expect(motionAllowed({start,distance:0,angle:.1},p)).toBe(false);
    expect(motionAllowed({start,distance:.2,angle:.4},p)).toBe(false);
    expect(motionAllowed({start,distance:.4,angle:.4},p)).toBe(true);
    expect(motionAllowed({start,distance:-.4,angle:0},p)).toBe(false);
    expect(motionAllowed({start,distance:-.4,angle:.4},{...p,allowReverse:true})).toBe(true);
  });
  it('verifies a forward and reverse analytic quarter circle, not a pivot approximation',()=>{
    const i=openRoom();i.profile.movement='minimum_radius';i.profile.minimumTurningRadius=1;
    i.journey.goal={x:4,y:4,theta:Math.PI/2};
    expect(verifyTrajectory(i,[{start:i.journey.start,distance:Math.PI/2,angle:Math.PI/2}]).status).toBe('clear');
    i.journey.goal={x:2,y:2,theta:Math.PI/2};
    const reverse={start:i.journey.start,distance:-Math.PI/2,angle:Math.PI/2};
    expect(verifyTrajectory(i,[reverse]).status).toBe('clear');
    i.profile.allowReverse=false;
    expect(verifyTrajectory(i,[reverse]).status).toBe('invalid_motion');
  });
  it('rejects disconnected or wrong-heading trajectories',()=>{
    const i=openRoom();
    expect(verifyTrajectory(i,[{start:{...i.journey.start,x:4},distance:1,angle:0}]).status).toBe('invalid_motion');
    i.journey.goal.theta=Math.PI;
    expect(verifyTrajectory(i,[{start:i.journey.start,distance:2,angle:0}]).status).toBe('wrong_goal');
  });
  it('checks occupancy even for a zero-motion trajectory at the goal',()=>{
    const i=openRoom();i.journey.goal={...i.journey.start};
    i.room.objects=[{...cloneInput().room.objects[0],pose:{...i.journey.start}}];
    expect(verifyTrajectory(i,[]).status).not.toBe('clear');
  });
  it('distinguishes nominal clearance from conservative-only interference',()=>{
    const i=openRoom();i.journey.goal={...i.journey.start};
    // Device right face x=3.525. Obstacle left face x=3.60: .075 raw gap.
    i.room.objects=[{...cloneInput().room.objects[1],width:.2,depth:1,pose:{x:3.7,y:3,theta:0},uncertainty:0}];
    expect(evaluateJourney(i).status).toBe('verified_feasible');
    i.room.objects[0].uncertainty=.1;
    expect(evaluateJourney(i).status).toBe('uncertain');
  });
  it('executes fixture table then bench edits while preserving bed lock',()=>{
    const i=cloneInput(),bed=structuredClone(i.room.objects.find(o=>o.id==='bed'));
    const baseline=evaluate(i);
    expect(baseline.tasks.journey.status).toBe('blocked_witness');
    expect(baseline.tasks.journey.witness?.objectId).toBe('table');
    expect(baseline.tasks.door.status).toBe('blocked_witness');
    expect(baseline.tasks.door.witness?.objectId).toBe('bench');
    const table=suggestedPositions.table;i.room=moveObject(i.room,'table',table.x,table.y);
    const first=evaluate(i);
    expect(first.tasks.journey.status).toBe('verified_feasible');expect(first.tasks.door.status).toBe('blocked_witness');
    const bench=suggestedPositions.bench;i.room=moveObject(i.room,'bench',bench.x,bench.y);
    const second=evaluate(i);
    expect(second.tasks.journey.status).toBe('verified_feasible');expect(second.tasks.door.status).toBe('verified_feasible');
    expect(i.room.objects.find(o=>o.id==='bed')).toEqual(bed);
    expect(moveObject(i.room,'bed',0,0)).toBe(i.room);
    // An un-scripted edit is recomputed and obstructs the requested goal.
    i.room=moveObject(i.room,'bench',i.journey.goal.x,i.journey.goal.y);
    expect(evaluateJourney(i).status).toBe('blocked_witness');
  });
});
