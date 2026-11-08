import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {PRIMARY_MENUS,PressIdentity,RevisionEvaluation,closestDisplaySegment,completionFeedback,detailVisible,emptyRepairPresentation,floorSection,fullSizeRoomPosition,obstructionLabels,ordinaryTaskFeedback,proposalCaption,reserveLabel,rotateFloor,wheelchairParts} from '../lens-src/SpatialPresentation';
const require=createRequire(import.meta.url);
const Core=require('../lens-src/OpenDoorCore.js');

describe('native spatial presentation',()=>{
  it('keeps the miniature slab but renders a thin full-size ground surface',()=>{
    expect(floorSection(true)).toEqual({centerYcm:-3,thicknessCm:6});
    expect(floorSection(false)).toEqual({centerYcm:0,thicknessCm:.1});
    const full=floorSection(false);
    expect(full.centerYcm+full.thicknessCm/2).toBeCloseTo(.05,8);
  });
  it('keeps the decorative chair inside every supplied occupied envelope',()=>{
    for(const width of [.3,.66,1.8])for(const length of [.45,1.05,1.8])for(const height of [.35,1.1,1.4]){
      const profile={width,length,height};
      for(const part of wheelchairParts(profile)){
        expect(Math.abs(part.position.x)+part.size.x/2).toBeLessThanOrEqual(length*50+1e-9);
        expect(Math.abs(part.position.z)+part.size.z/2).toBeLessThanOrEqual(width*50+1e-9);
        expect(part.position.y-part.size.y/2).toBeGreaterThanOrEqual(-1e-9);
        expect(part.position.y+part.size.y/2).toBeLessThanOrEqual(height*100+1e-9);
      }
    }
  });
  it('maps the actual journey start to a measured floor anchor after yaw',()=>{
    const room={width:4.2,depth:3.4},start={x:1.18,y:1.45},anchor={x:-28,y:-135.9,z:-420};
    for(const yaw of [0,Math.PI/4,-2.1,Math.PI]){
      const root=fullSizeRoomPosition(room,start,anchor,yaw);
      const offset=rotateFloor({x:(start.x-room.width/2)*100,y:0,z:-(start.y-room.depth/2)*100},yaw);
      expect(root.x+offset.x).toBeCloseTo(anchor.x,9);
      expect(root.z+offset.z).toBeCloseTo(anchor.z,9);
      expect(root.y).toBe(anchor.y);
    }
  });
  it('limits every contextual primary action set to three',()=>{
    for(const actions of Object.values(PRIMARY_MENUS))expect(actions.length).toBeLessThanOrEqual(3);
    expect(PRIMARY_MENUS.overview).toEqual(['find','rehearse','more']);
    expect(PRIMARY_MENUS.repair).toEqual(['apply','beforeAfter','cancel']);
    expect(PRIMARY_MENUS.repairChoices).toEqual([]);
  });
  it('names only actual obstruction witnesses and invents no clearance deficit',()=>{
    const input=Core.cloneInput(),labels=obstructionLabels(Core.evaluate(input));
    expect(labels.table).toBe('Blocks the turn');expect(labels.bench).toBe('Door hits this');
    expect(Object.values(labels).join(' ')).not.toMatch(/\d|cm|more/);
    expect(obstructionLabels({tasks:{journey:{status:'verified_feasible',witness:{objectId:'old'}},door:{status:'uncertain'}}})).toEqual({});
  });
  it('suppresses only duplicate generic witness feedback, preserving independent clear results',()=>{
    const input=Core.cloneInput(),blocked=Core.evaluate(input);
    expect(ordinaryTaskFeedback('journey',blocked,true)).toBeNull();
    expect(ordinaryTaskFeedback('door',blocked,true)).toBeNull();
    expect(ordinaryTaskFeedback('journey',blocked,false)).toBe('Turn blocked');
    expect(ordinaryTaskFeedback('door',blocked,false)).toBe('Door blocked');
    input.room=Core.moveObject(input.room,'bench',3.56,.48);
    const doorClear=Core.evaluate(input);
    expect(ordinaryTaskFeedback('door',doorClear,true)).toBe('Door clear');
    expect(ordinaryTaskFeedback('journey',doorClear,true)).toBeNull();
    expect(ordinaryTaskFeedback('journey',{tasks:{journey:{status:'no_path_found'}}},true)).toBe('No route found');
    expect(ordinaryTaskFeedback('journey',{tasks:{journey:{status:'uncertain'}}},true)).toBe('Turn uncertain');
  });
  it('rounds certified reserves down and explicitly flags a tiny margin',()=>{
    expect(reserveLabel(.030426874516801088,2)).toBe('+3.0 cm spare');
    expect(reserveLabel(.01028,1)).toBe('+1.0 cm spare');
    expect(reserveLabel(.000047,0)).toBe('Least moving · tight');
    expect(reserveLabel(Number.NaN,1)).toBe('Reserve unavailable');
  });
  it('never assigns a candidate reserve to the source Before view',()=>{
    expect(proposalCaption(false,.030426874516801088,2)).toBe('Before · current room');
    expect(proposalCaption(false,.00005561,0)).not.toMatch(/spare|cm|mm|least/);
    expect(proposalCaption(true,.030426874516801088,2)).toBe('After · +3.0 cm spare');
    expect(proposalCaption(true,.00005561,0)).toBe('After · least moving\nUnder 1 mm spare');
  });
  it('does not claim a clear turn after the independently clear door finishes',()=>{
    const input=Core.cloneInput();input.room=Core.moveObject(input.room,'bench',3.56,.48);
    const result=Core.evaluate(input);
    expect(result.tasks.journey.status).toBe('blocked_witness');expect(result.tasks.door.status).toBe('verified_feasible');
    expect(completionFeedback('door',result)).toEqual({anchor:'door',label:'Door clear'});
    expect(completionFeedback('journey',result)).toBeNull();
  });
  it('distinguishes an already-clear zero-move search from no layout found',()=>{
    const input=Core.cloneInput();
    expect(emptyRepairPresentation(Core.evaluate(input)).menu).toBe('repairEmpty');
    input.room=Core.moveObject(input.room,'table',3.88,2.85);
    expect(emptyRepairPresentation(Core.evaluate(input)).menu).toBe('repairEmpty');
    input.room=Core.moveObject(input.room,'bench',3.56,.48);
    const evaluation=Core.evaluate(input),job=Core.createRepairSearch(input);
    while(job.progress.status==='searching')job.step(100);
    expect(job.progress.proposals).toHaveLength(0);
    expect(emptyRepairPresentation(evaluation)).toEqual({menu:'repairUnneeded',label:'No changes needed'});
  });
  it('cancels replacement, disabled and interrupted commands under a held pinch',()=>{
    const press=new PressIdentity();
    press.begin('checking:undo:r2');expect(press.release('overview:find:r2')).toBe(false);
    press.begin('repair:apply:option1');expect(press.release('repair:apply:option2')).toBe(false);
    press.begin('more:back:r2');expect(press.release('more:back:r2')).toBe(true);
    expect(press.release('more:back:r2')).toBe(false);
    press.begin('lock:table:r2');press.cancel();expect(press.release('lock:table:r2')).toBe(false);
    press.begin(null);expect(press.release('repair:apply:option1')).toBe(false);
  });
  it('uses distance hysteresis with an explicit hover override',()=>{
    expect(detailVisible(36,false,true,false)).toBe(false);
    expect(detailVisible(36,true,true,false)).toBe(true);
    expect(detailVisible(44,true,true,false)).toBe(false);
    expect(detailVisible(130,false,false,false)).toBe(false);
    expect(detailVisible(130,true,false,false)).toBe(true);
    expect(detailVisible(200,false,false,true)).toBe(true);
  });
  it('puts the illustrative gap line on actual polygon edges without changing them',()=>{
    const a=[{x:0,y:0},{x:1,y:0},{x:1,y:1},{x:0,y:1}];
    const b=[{x:1.3,y:.2},{x:2,y:.2},{x:2,y:.8},{x:1.3,y:.8}];
    const before=JSON.stringify({a,b}),line=closestDisplaySegment(a,b)!;
    expect(line.distanceM).toBeCloseTo(.3,12);
    expect(line.from.x).toBe(1);expect(line.to.x).toBe(1.3);
    expect(line.from.y).toBe(line.to.y);
    expect(JSON.stringify({a,b})).toBe(before);
    expect(closestDisplaySegment([],b)).toBeNull();
  });
});

describe('cooperative native evaluation',()=>{
  it('publishes only a complete evaluation of the unchanged source',()=>{
    const input=Core.cloneInput();
    input.room=Core.moveObject(input.room,'table',3.88,2.85);
    input.room=Core.moveObject(input.room,'bench',3.56,.48);
    const hash=Core.stableHash(input),job=new RevisionEvaluation(7,input.room.revision,hash,Core.evaluateSteps(input));
    expect(job.value).toBeNull();
    let ticks=0;while(!job.completed&&ticks++<10000)job.step(()=>0,5,1);
    expect(ticks).toBeGreaterThan(1);expect(job.completed).toBe(true);
    const ordinary=Core.evaluate(input);
    expect(job.value.tasks).toEqual(ordinary.tasks);expect(job.value.inputHash).toBe(hash);
    expect(Core.stableHash(input)).toBe(hash);
    expect(job.matches(7,input.room.revision,hash)).toBe(true);
    expect(job.matches(8,input.room.revision,hash)).toBe(false);
    expect(job.matches(7,input.room.revision+1,hash)).toBe(false);
    expect(job.matches(7,input.room.revision,'different')).toBe(false);
  });
  it('cancels without draining or exposing a stale result',()=>{
    let advances=0;function* steps(){for(let n=0;n<20;n++){advances++;yield;}return {bad:'stale'};}
    const job=new RevisionEvaluation(1,2,'source',steps());
    job.step(()=>0,5,2);expect(advances).toBe(2);
    job.cancel();job.step(()=>0,5,20);
    expect(advances).toBe(2);expect(job.value).toBeNull();expect(job.matches(1,2,'source')).toBe(false);
  });
  it('stops at the time budget even when a step is expensive',()=>{
    let time=0;function* steps(){for(let n=0;n<4;n++){time+=9;yield;}return 'done';}
    const job=new RevisionEvaluation(1,0,'x',steps());job.step(()=>time,5,6);
    expect(job.steps).toBe(1);expect(job.maxStepMs).toBe(9);expect(job.completed).toBe(false);
  });
});
