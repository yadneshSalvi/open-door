import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {Box3,Ray,Vector3} from 'three';
import {PRIMARY_MENUS,PressIdentity,RevisionEvaluation,closestDisplaySegment,completionFeedback,detailVisible,emptyRepairPresentation,floorSection,fullSizeRoomPosition,obstructionLabels,ordinaryTaskFeedback,proposalCaption,reserveLabel,rotateFloor,visibleUndoPosition,wheelchairParts} from '../lens-src/SpatialPresentation';
const require=createRequire(import.meta.url);
const Core=require('../lens-src/OpenDoorCore.js');

describe('native spatial presentation',()=>{
  it('keeps the complete Undo hit rectangle visible beside the aligned table and wardrobe',()=>{
    const input=Core.cloneInput(),table=input.room.objects.find((o:any)=>o.id==='table');table.pose={x:.91,y:3.01,theta:0};
    const before=JSON.stringify(input),camera=new Vector3(-30,-94,-416);
    const world=(x:number,y:number,h:number)=>new Vector3(-30+(x-2.1)*10,-142.9+h*10,-474-(y-1.7)*10);
    const boxes=input.room.objects.filter((o:any)=>o.id!=='table').map((o:any)=>{
      const points:Vector3[]=[];for(const p of Core.objectPolygon(o))for(const h of [0,o.kind==='wardrobe'?Math.min(o.height,1.1):o.height])points.push(world(p.x,p.y,h));
      return new Box3().setFromPoints(points);
    });
    const top=world(.91,3.01,.5),preferred=top.clone().add(new Vector3(-7,5,0));
    const safe=visibleUndoPosition(top,camera,preferred,boxes);
    expect(safe).not.toEqual(preferred);
    const center=new Vector3(safe.x,safe.y,safe.z),normal=camera.clone().sub(center).normalize();
    const right=new Vector3().crossVectors(new Vector3(0,1,0),normal).normalize(),up=new Vector3().crossVectors(normal,right).normalize();
    // Independent Three.js ray/box checks cover the full 9.5 × 6.5 cm hit region,
    // including corners: a visible center alone would miss a clipped label edge.
    for(const x of [-4.75,0,4.75])for(const y of [-3.25,0,3.25]){
      const p=center.clone().addScaledVector(right,x).addScaledVector(up,y),ray=new Ray(p,camera.clone().sub(p).normalize());
      for(const box of boxes){const hit=ray.intersectBox(box,new Vector3());expect(hit===null||hit.distanceTo(p)>camera.distanceTo(p)).toBe(true);}
    }
    expect(new Ray(preferred,camera.clone().sub(preferred).normalize()).intersectBox(boxes[2],new Vector3())).not.toBeNull();
    expect(JSON.stringify(input)).toBe(before);
  });
  it('preserves an already visible contextual control and handles a vertical view finitely',()=>{
    const top={x:0,y:0,z:0},preferred={x:-7,y:5,z:0};
    expect(visibleUndoPosition(top,{x:0,y:50,z:70},preferred,[])).toEqual(preferred);
    const p=visibleUndoPosition(top,{x:0,y:50,z:0},preferred,[]);
    expect([p.x,p.y,p.z].every(Number.isFinite)).toBe(true);
  });
  it('copies native vec3 getters explicitly in both preferred-position return paths',()=>{
    const native=(x:number,y:number,z:number)=>Object.defineProperties({},
      {x:{get:()=>x},y:{get:()=>y},z:{get:()=>z}}) as {x:number;y:number;z:number};
    const top=native(0,0,0),camera=native(0,50,70),preferred=native(-7,5,0);
    expect(Object.keys(preferred)).toEqual([]);
    expect(visibleUndoPosition(top,camera,preferred,[])).toEqual({x:-7,y:5,z:0});
    const occupied={min:{x:-1000,y:-1000,z:-1000},max:{x:1000,y:1000,z:1000}};
    expect(visibleUndoPosition(top,camera,preferred,[occupied])).toEqual({x:-7,y:5,z:0});
  });
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
    expect(labels.table).toBe('Chair hits here');expect(labels.bench).toBe("Door can’t open past this");
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
    expect(reserveLabel(.030426874516801088,2)).toBe('3 cm extra room');
    expect(reserveLabel(.01028,1)).toBe('1 cm extra room');
    expect(reserveLabel(.000047,0)).toBe('Fewest moves');
    expect(reserveLabel(Number.NaN,1)).toBe('Space not checked');
  });
  it('never assigns a candidate reserve to the source Before view',()=>{
    expect(proposalCaption(false,.030426874516801088,2)).toBe('Before');
    expect(proposalCaption(false,.00005561,0)).not.toMatch(/spare|cm|mm|least/);
    expect(proposalCaption(true,.030426874516801088,2)).toBe('After · 3 cm extra room');
    expect(proposalCaption(true,.00005561,0)).toBe('After · less than 1 mm extra room');
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
