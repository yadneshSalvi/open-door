import {describe,it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {alignedTablePose,distanceBand,extraRoomText,overviewActions,moreActions,sideDockPosition,shouldCloseMenu,startupPlacement} from '../lens-src/SpatialExperiencePolicy';
import {clipFloorPolygon,clipFloorSegment,completeFootprintInCorner,cornerOpacity,pointInCorner,validCorner} from '../lens-src/SpatialCorner';
import {fullSizeRoomPosition,PRIMARY_MENUS} from '../lens-src/SpatialPresentation';
const require=createRequire(import.meta.url),Core=require('../lens-src/OpenDoorCore.js');
// Historical crop arithmetic remains a regression, not the current staging default.
const DEFAULT_CORNER={minX:.65,minY:1.35,maxX:2.15,maxY:3.35};
function repaired(){const input=Core.cloneInput();input.room.objects[1].pose={x:.5469999999999999,y:1.8070000000000002,theta:0};input.room.objects[2].pose={x:1.495,y:.692,theta:0};input.room.revision=3;return input;}

describe('round3 native experience policy',()=>{
  it('requires fresh device placement despite a confirmed Preview inspector pose',()=>{
    expect(startupPlacement(false,true)).toEqual({isEditor:false,beginPlacement:true,showPreviewDisclosure:false,branch:'device'});
    expect(startupPlacement(false,false).beginPlacement).toBe(true);expect(startupPlacement(true,true).beginPlacement).toBe(false);expect(startupPlacement(true,false).beginPlacement).toBe(true);
    const aim=sideDockPosition({x:120,y:160,z:-200},{x:3,y:-9,z:-4});expect(Math.hypot(aim.x-120,aim.z+200)).toBeCloseTo(52);expect(aim.y).toBe(115);
  });
  it('uses three distance bands with10cm hysteresis',()=>{
    expect(distanceBand(130,null)).toBe('far');expect(distanceBand(115,'far')).toBe('far');expect(distanceBand(109,'far')).toBe('middle');
    expect(distanceBand(125,'middle')).toBe('middle');expect(distanceBand(131,'middle')).toBe('far');expect(distanceBand(54,'middle')).toBe('near');expect(distanceBand(64,'near')).toBe('near');expect(distanceBand(66,'near')).toBe('middle');
  });
  it('keeps Place on first More, counts both comparison segments and includes Back',()=>{
    expect(PRIMARY_MENUS.more).toEqual(['place','nextMore','back']);expect(PRIMARY_MENUS.repairCompare).toEqual(['before','after','backRepair']);
    for(const menu of ['more','edit','door','profile','profileWidth','profileBuffer','repairCompare','about','placement']){expect(PRIMARY_MENUS[menu].length).toBeLessThanOrEqual(3);expect(PRIMARY_MENUS[menu].some(key=>key.startsWith('back'))).toBe(true);}
    expect(Object.values(PRIMARY_MENUS).flat()).not.toContain('toolsMore');
    for(const clear of [false,true])for(let context=0;context<=3;context++)expect(overviewActions(clear,context).length+context).toBeLessThanOrEqual(3);
    expect(shouldCloseMenu('more',0,6,false)).toBe(true);expect(shouldCloseMenu('more',0,7,true)).toBe(false);expect(shouldCloseMenu('repair',0,20,false)).toBe(true);expect(moreActions(0,true)[0]).toBe('undo');
  });
  it('aligns the screenshot table by a real valid edit while preserving protected input',()=>{
    const source=repaired(),before=JSON.stringify(source),pose=alignedTablePose(source.room.objects[1],source.room.objects[3]);expect(Core.stableHash(source)).toBe('d80f2566c8606cae');
    expect(pose.x).toBeCloseTo(.91,12);expect(pose.y).toBeCloseTo(3.01,12);expect(pose.theta).toBe(0);
    expect(Core.placementIssue(source.room,'table',source.room.objects[1].pose.x,pose.y)).toMatch(/overlap wardrobe/);expect(Core.placementIssue(source.room,'table',pose.x,pose.y,pose.theta)).toBeNull();
    const input={...source,room:Core.moveObject(source.room,'table',pose.x,pose.y,pose.theta)},result=Core.evaluate(input);
    expect(result.tasks.journey.status).toBe('verified_feasible');expect(result.tasks.door.status).toBe('verified_feasible');expect(input.room.revision).toBe(4);expect(Core.stableHash(input)).toBe('23bff2355c471375');expect(JSON.stringify(source)).toBe(before);
    expect(input.profile).toEqual(source.profile);expect(input.journey).toEqual(source.journey);expect(input.room.objects.filter((o:any)=>o.id!=='table')).toEqual(source.room.objects.filter((o:any)=>o.id!=='table'));
    expect(result.tasks.journey.minimumClearance).toBeCloseTo(.0015062914311184186,10);expect(extraRoomText(result.tasks.journey.minimumClearance)).toBe('At least 0.1 cm extra room');
  });
  it('keeps door blocked when only the original table is moved',()=>{
    const input=Core.cloneInput(),pose=alignedTablePose(input.room.objects[1],input.room.objects[3]);input.room=Core.moveObject(input.room,'table',pose.x,pose.y,pose.theta);const result=Core.evaluate(input);
    expect(result.tasks.journey.status).toBe('verified_feasible');expect(result.tasks.door.status).toBe('blocked_witness');expect(Core.cloneInput().room.objects[1].pose).toEqual({x:1.62,y:2.87,theta:0});
  });
});

describe('true-size bedside display crop',()=>{
  it('maps the1.5x2m subset onto the measured floor without scaling',()=>{
    expect(validCorner(DEFAULT_CORNER,{width:4.2,depth:3.4})).toBe(true);const root=fullSizeRoomPosition({width:4.2,depth:3.4},{x:1.18,y:1.45},{x:-247,y:-135.78,z:-160},0);expect(root).toEqual({x:-155,y:-135.78,z:-185});
    const world=(x:number,y:number)=>({x:root.x+(x-2.1)*100,z:root.z-(y-1.7)*100});expect(world(.65,1.35).x).toBeCloseTo(-300,10);expect(world(.65,1.35).z).toBeCloseTo(-150,10);expect(world(2.15,3.35).x).toBeCloseTo(-150,10);expect(world(2.15,3.35).z).toBeCloseTo(-350,10);
  });
  it('clips actual lines and oriented polygons without relocating their inputs',()=>{
    const r={minX:0,minY:0,maxX:2,maxY:2};expect(clipFloorSegment({x:-1,y:1},{x:3,y:1},r)).toEqual({from:{x:0,y:1},to:{x:2,y:1}});expect(clipFloorSegment({x:0,y:-1},{x:1,y:-1},r)).toBeNull();expect(clipFloorSegment({x:3,y:1},{x:-1,y:1},r)).toEqual({from:{x:2,y:1},to:{x:0,y:1}});
    const polygon=Core.transform(Core.rectangle(2,1),{x:1.9,y:1,theta:Math.PI/4}),before=JSON.stringify(polygon),clipped=clipFloorPolygon(polygon,r);expect(clipped.length).toBeGreaterThanOrEqual(3);expect(clipped.every(p=>pointInCorner(p,r))).toBe(true);expect(JSON.stringify(polygon)).toBe(before);
    expect(cornerOpacity({x:0,y:1},r)).toBe(0);expect(cornerOpacity({x:.06,y:1},r)).toBeCloseTo(.5);expect(cornerOpacity({x:.2,y:1},r)).toBe(1);
  });
  it('shows only26 complete buffered footprints, not all49 in-crop centers',()=>{
    const input=repaired(),pose=alignedTablePose(input.room.objects[1],input.room.objects[3]);input.room=Core.moveObject(input.room,'table',pose.x,pose.y,pose.theta);const path=Core.evaluate(input).tasks.journey.path,gap=input.profile.clearance+input.profile.uncertainty;
    expect(path).toHaveLength(49);expect(path.filter((p:any)=>pointInCorner(p,DEFAULT_CORNER))).toHaveLength(49);
    expect(path.filter((p:any)=>completeFootprintInCorner(Core.transform(Core.rectangle(input.profile.length,input.profile.width),p),DEFAULT_CORNER))).toHaveLength(27);
    const safe=path.filter((p:any)=>completeFootprintInCorner(Core.transform(Core.rectangle(input.profile.length+2*gap,input.profile.width+2*gap),p),DEFAULT_CORNER));expect(safe).toHaveLength(26);for(const key of ['x','y','theta'])expect(safe.at(-1)[key]).toBeCloseTo(input.journey.goal[key],12);expect(safe[0]).not.toEqual(input.journey.start);
  });
});
