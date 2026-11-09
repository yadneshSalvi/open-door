import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as policy from '../lens-src/SpatialExperiencePolicy';
import * as presentation from '../lens-src/SpatialPresentation';
import * as corner from '../lens-src/SpatialCorner';
import {assertTargetBudget} from '../lens-src/SpatialUIContract';
const require=createRequire(import.meta.url),Core=require('../lens-src/OpenDoorCore.js');

// Execute the authored controller against a small SDK boundary. This simulates
// platform branching and transactions; it is not a device or rendered-UI test.
class V {
  constructor(public x=0,public y=0,public z=0,public w=0){}
  static zero(){return new V();}static one(){return new V(1,1,1);}static up(){return new V(0,1,0);}static right(){return new V(1,0,0);}static forward(){return new V(0,0,1);}static lerp(a:V,b:V,t:number){return a.add(b.sub(a).uniformScale(t));}
  add(v:V){return new V(this.x+v.x,this.y+v.y,this.z+v.z);}sub(v:V){return new V(this.x-v.x,this.y-v.y,this.z-v.z);}uniformScale(s:number){return new V(this.x*s,this.y*s,this.z*s);}
  get lengthSquared(){return this.x*this.x+this.y*this.y+this.z*this.z;}get length(){return Math.sqrt(this.lengthSquared);}normalize(){return this.uniformScale(1/this.length);}distance(v:V){return this.sub(v).length;}cross(v:V){return new V(this.y*v.z-this.z*v.y,this.z*v.x-this.x*v.z,this.x*v.y-this.y*v.x);}
}
class Event {listeners:((event?:any)=>void)[]=[];add(fn:(event?:any)=>void){this.listeners.push(fn);return ()=>{this.listeners=this.listeners.filter(f=>f!==fn);};}fire(event?:any){this.listeners.forEach(fn=>fn(event));}}
class Node {
  components:Record<string,any>={};
  createComponent(name:string){const event=()=>new Event();const value:any=name==='Interactable'?{onHoverEnter:event(),onHoverExit:event(),onTriggerStart:event(),onTriggerEnd:event(),onTriggerUpdate:event(),onTriggerCanceled:event(),onTriggerEndOutside:event()}:{};this.components[name]=value;return value;}getComponent(name:string){return this.components[name]||null;}
  enabled=true;position=new V();forward=new V(0,0,1);right=V.right();children:Node[]=[];
  constructor(public name='node'){}setParent(parent:Node){parent.children.push(this);}getChildrenCount(){return this.children.length;}getChild(i:number){return this.children[i];}
  getTransform(){return {forward:this.forward,right:this.right,up:this.forward.cross(this.right),getWorldPosition:()=>this.position,getWorldTransform:()=>({multiplyPoint:(v:V)=>this.position.add(v)}),getInvertedWorldTransform:()=>({multiplyPoint:(v:V)=>v.sub(this.position)}),setWorldPosition:(v:V)=>{this.position=v;},setLocalPosition:(v:V)=>{this.position=v;},setWorldScale:()=>{},setLocalRotation:()=>{},setWorldRotation:()=>{}};}
}
class UI {
  dock=new Node('dock');annotations=new Node('annotations');tags:Record<string,any>={};targets:Record<string,Node>={};actions:any[]=[];
  tag(key:string,width=18,height=3.2){return this.tags[key]||(this.tags[key]={root:new Node(key),text:{text:''},width,height,visible:false,color:new V(),offset:new V()});}
  hideTags(){Object.values(this.tags).forEach(tag=>tag.visible=false);}hideSpatialTargets(){Object.values(this.targets).forEach(t=>t.enabled=false);}
  setActions(actions:any[]){assertTargetBudget(actions.length,this.targetCount());this.actions=actions;}
  targetCount(){return Object.values(this.targets).filter(t=>t.enabled).length;}visibleTargetCount(){return this.actions.length+this.targetCount();}
  actionLabels(){return this.actions.map(a=>a.label);}targetHovered(){return false;}dockHovered(){return false;}
  makeSpatialTarget(key:string){if(!this.targets[key]){this.targets[key]=new Node(key);this.targets[key].enabled=false;}return this.targets[key];}
  setTargetEnabled(key:string,on:boolean){const target=this.targets[key];if(!target)return;if(on)assertTargetBudget(this.actions.length,this.targetCount()+(target.enabled?0:1));target.enabled=on;}
  setTargetColor(){}setTargetSelected(){}face(){}updateTags(){}
}
class Surface {status='idle';candidate=null;aim=null;requests=0;request(){this.requests++;this.status='querying';}stop(){this.status='idle';}update(_camera?:unknown){} }
class Hints {dismissed=false;update(){}dismiss(){this.dismissed=true;}snapshot(){return {active:false,dismissed:this.dismissed,holding:false};}}
class Audio {stop(){}play(){}follow(){}available(){return true;}}
function compile(file:string,req:(name:string)=>unknown,globals:Record<string,unknown>){
  const output=ts.transpileModule(readFileSync(new URL('../lens-src/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,experimentalDecorators:true}}).outputText;
  const exports:any={};new Function('require','exports',...Object.keys(globals),output)(req,exports,...Object.values(globals));return exports;
}
function controller(isEditor=true){
  let now=100;const camera=new Node('camera');camera.position=new V(0,80,60);
  const req=(name:string):any=>name==='./OpenDoorCore'?Core:name==='./SpatialExperiencePolicy'?policy:name==='./SpatialPresentation'?presentation:name==='./SpatialCorner'?corner:name==='./OpenDoorSpatialUI'?{OpenDoorSpatialUI:UI}:name==='./OpenDoorSurfacePlacement'?{OpenDoorSurfacePlacement:Surface}:name==='./OpenDoorHints'?{OpenDoorHints:Hints}:name==='./OpenDoorAudio'?{OpenDoorAudio:Audio}:name.includes('WorldCameraFinderProvider')?{default:{getInstance:()=>({getTransform:()=>camera.getTransform()})}}:{TargetingMode:{Direct:1,Indirect:2},Interactable:{getTypeName:()=>'Interactable'},InteractableAudioFeedback:{getTypeName:()=>'AudioFeedback'}};
  class Base {sceneObject=new Node('scene');}
  const module=compile('OpenDoorExperience.ts',req,{BaseScriptComponent:Base,component:(c:unknown)=>c,input:()=>{},allowUndefined:()=>{},vec2:V,vec3:V,vec4:V,quat:{angleAxis:()=>({multiply:()=>({})}),rotationFromTo:()=>({})},Shape:{createBoxShape:()=>({})},global:{scene:{createSceneObject:(name:string)=>new Node(name)},deviceInfoSystem:{isEditor:()=>isEditor}},getTime:()=>now,getDeltaTime:()=>1/60,print:()=>{}});
  const experience:any=new module.OpenDoorExperience();experience.cubeMesh={};experience.baseMaterial={};experience.font={};
  experience.renderRoom=()=>{};experience.present=()=>{};
  return {experience,camera,setTime:(n:number)=>{now=n;}};
}
function ready(){
  const h=controller(),e=h.experience;e.input=Core.cloneInput();e.result=Core.evaluate(e.input);e.currentRevision=e.input.room.revision;e.roomRoot=new Node('room');e.player=new Node('chair');e.doorRoot=new Node('door');e.spatial=new UI();e.uiRoot=e.spatial.dock;e.audio=new Audio();e.camera=h.camera.getTransform();
  for(const key of ['chair-card','chair-status','room-note','about-card'])e.spatial.tag(key);
  for(const object of e.input.room.objects)e.furnitureRoots[object.id]=new Node(object.id);
  e.drawLockIcon=()=>{};e.updateProposalTargets=()=>{};e.updateDock=()=>{};
  return h;
}

describe('actual native controller at mocked SDK boundary',()=>{
  it('forces the non-editor branch to place before Back, even with a saved Preview pose',()=>{
    const {experience:e,camera}=controller(false);e.placementConfirmed=true;e.evaluateCurrent=()=>{};e.start();
    expect(e.startupPolicy.branch).toBe('device');expect(e.placementConfirmed).toBe(false);expect(e.menu).toBe('placement');expect(e.surface.requests).toBe(1);
    expect(e.spatial.actions.find((a:any)=>a.id==='back').enabled).toBe(false);
    const saved=e.miniatureSurfacePositionCm;camera.position=new V(100,160,-200);e.useManualPlacement();
    expect(e.surface.requests).toBe(2);expect(e.placementConfirmed).toBe(false);expect(e.menu).toBe('placement');expect(e.miniatureSurfacePositionCm).toBe(saved);
    expect(e.spatial.actions.find((a:any)=>a.id==='useProvided').label).toBe('Look again');expect(e.spatial.actions.find((a:any)=>a.id==='back').enabled).toBe(false);
    e.surface.confirm=()=>null;e.confirmSurface();expect(e.placementConfirmed).toBe(false);
    const hit=new V(100,115,-275);e.surface.confirm=()=>hit;e.confirmSurface();expect(e.placementConfirmed).toBe(true);expect(e.menu).toBe('overview');expect(e.miniatureSurfacePositionCm).toBe(hit);
  });
  it('requires a fresh floor hit before a device enters real size',()=>{
    const {experience:e}=controller(false);e.placementConfirmed=true;e.evaluateCurrent=()=>{};e.start();e.surface.confirm=()=>new V(0,40,-15);e.confirmSurface();
    const saved=e.fullSizeStartPositionCm;e.toggleScale();expect(e.menu).toBe('placement');expect(e.placementIntent).toBe('floor');expect(e.miniature).toBe(true);expect(e.deviceFloorConfirmed).toBe(false);expect(e.fullSizeStartPositionCm).toBe(saved);
    const hit=new V(100,0,-200);e.surface.confirm=()=>hit;e.confirmSurface();expect(e.deviceFloorConfirmed).toBe(true);expect(e.miniature).toBe(false);expect(e.fullSizeStartPositionCm.x).toBeCloseTo(78,10);expect(e.fullSizeStartPositionCm.y).toBe(0);expect(e.fullSizeStartPositionCm.z).toBeCloseTo(-110,10);
    const room=presentation.fullSizeRoomPosition(e.input.room,e.input.journey.start,e.fullSizeStartPositionCm,0),center={x:room.x+(1.4-2.1)*100,z:room.z-(2.35-1.7)*100};expect(center.x).toBeCloseTo(hit.x);expect(center.z).toBeCloseTo(hit.z);
  });
  it('limits saved-spot fallback to Preview and shows confirmation only for a ready hit',()=>{
    const {experience:preview}=controller(true);preview.placementConfirmed=false;preview.evaluateCurrent=()=>{};preview.start();const saved=preview.miniatureSurfacePositionCm;preview.useManualPlacement();expect(preview.menu).toBe('overview');expect(preview.placementConfirmed).toBe(true);expect(preview.miniatureSurfacePositionCm).toBe(saved);
    const {experience:e}=ready();e.menu='placement';e.outline=()=>{};e.surface.aim=new V(0,0,-75);
    for(const status of ['querying','no_surface','timed_out']){e.surface.status=status;e.surface.candidate=new V(5,0,-75);e.updateSpatialState();expect(e.surfaceMarker?.enabled||false).toBe(false);expect(e.spatial.actions.find((a:any)=>a.id==='placeHere').enabled).toBe(false);expect(e.spatial.tags['room-note'].text.text).toBe('Look at a level surface');}
    e.surface.status='ready';e.surface.candidate=new V(5,0,-75);e.updateSpatialState();expect(e.surfaceMarker.enabled).toBe(true);expect(e.surfaceMarker.position).toEqual(new V(5,.2,-75));expect(e.spatial.tags['room-note'].text.text).toBe('Pinch Place here');
    e.surface.status='no_surface';e.surface.candidate=null;e.updateSpatialState();expect(e.surfaceMarker.enabled).toBe(false);expect(e.spatial.actions.find((a:any)=>a.id==='placeHere').enabled).toBe(false);
  });
  it('keeps confirmed editor staging and the genuinely blocked original fixture',()=>{
    const {experience:e}=controller(true);e.placementConfirmed=true;e.evaluateCurrent=()=>{};e.start();
    expect(e.startupPolicy.branch).toBe('preview');expect(e.menu).toBe('overview');expect(e.surface.requests).toBe(0);
    expect(e.input).toEqual(Core.cloneInput());expect(e.result.tasks.journey.status).toBe('blocked_witness');expect(e.result.tasks.door.status).toBe('blocked_witness');
  });
  it('shares one target budget across focused furniture, More, size, Place and far states',()=>{
    const {experience:e,camera}=ready();e.hoveredObject='table';e.focusUntil=103;
    for(const menu of ['overview','more','profile','profileWidth','placement','overview']){
      e.menu=menu;e.updateSpatialState();expect(e.spatial.visibleTargetCount()).toBeLessThanOrEqual(3);
      if(menu!=='overview'){expect(e.spatial.targetCount()).toBe(0);expect(e.spatial.actions).toHaveLength(3);}
    }
    expect(e.spatial.targets['Lock table'].enabled).toBe(true);
    camera.position=new V(0,0,200);e.updateSpatialState();expect(e.band).toBe('far');expect(e.spatial.visibleTargetCount()).toBe(0);expect(e.spatial.targets['Lock table'].enabled).toBe(false);
  });
  it('keeps ghost selection targets persistent and rejects a release from an obsolete option',()=>{
    const {experience:e}=ready();e.menu='repairChoices';const proposal={id:'first',sourceHash:Core.stableHash(e.input),moves:[{objectId:'table',to:{x:.91,y:3.01,theta:0}}]};e.repairProposals=[proposal];let selected=0;e.selectRepair=()=>selected++;
    e.updateGhostSelection(0,proposal);const item=e.proposalHitRoots[0],root=item.root,events=root.components.Interactable;expect(root.children).toHaveLength(3);
    events.onTriggerStart.fire();e.generation++;events.onTriggerEnd.fire();expect(selected).toBe(0);
    e.updateGhostSelection(0,proposal);expect(e.proposalHitRoots[0].root).toBe(root);expect(root.children).toHaveLength(3);
    events.onTriggerStart.fire();events.onTriggerEndOutside.fire();events.onTriggerEnd.fire();expect(selected).toBe(0);
    events.onTriggerStart.fire();events.onTriggerEnd.fire();expect(selected).toBe(1);
    events.onTriggerStart.fire();e.menu='repair';e.updateGhostSelection(0,proposal);events.onTriggerEnd.fire();expect(selected).toBe(1);expect(root.enabled).toBe(false);
  });
  it('keeps the nearby real-size dock usable without pretending distant chair detail is near',()=>{
    const {experience:e,camera}=ready();e.miniature=false;camera.position=new V(0,20,0);e.player.position=new V(0,-136,-300);e.spatial.dock.position=new V(0,-20,-75);
    e.updateSpatialState();expect(e.band).toBe('far');expect(e.spatial.actionLabels()).toEqual(['Suggest fixes','Try the route','More']);expect(e.spatial.targetCount()).toBe(0);expect(e.spatial.visibleTargetCount()).toBe(3);expect(e.spatial.tags['Distant room status'].visible).toBe(false);
    e.miniature=true;e.roomRoot.position=new V(0,-136,-300);e.updateSpatialState();expect(e.band).toBe('far');expect(e.spatial.visibleTargetCount()).toBe(0);expect(e.spatial.tags['Distant room status'].visible).toBe(true);
  });
  it('transitions from search to three choices, review and cancel within one aggregate target budget',()=>{
    const {experience:e}=ready();e.input.room.revision=2;e.result=Core.evaluate(e.input);e.currentRevision=2;
    const hash=Core.stableHash(e.input);expect(hash).toBe('925846b6f7877a22');
    // Keep actual controller/menu/target methods; only SDK mesh creation is stubbed.
    e.updateProposalTargets=Object.getPrototypeOf(e).updateProposalTargets.bind(e);e.cube=()=>new Node('leader');e.renderRoom=()=>e.updateSpatialState();
    e.hoveredObject='table';e.focusUntil=103;e.showMenu('search');expect(e.spatial.actionLabels()).toEqual(['Cancel']);
    const object=e.input.room.objects.find((o:any)=>o.id==='table');
    const proposals=[0,1,2].map(index=>({id:'choice-'+index,sourceHash:hash,certifiedReserveM:index*.01,evaluation:e.result,moves:[{objectId:'table',from:object.pose,to:{x:.91,y:3.01,theta:0},distanceM:.72,rotationRad:0}]}));
    e.repairProposals=proposals;e.updateSpatialState();expect(e.spatial.visibleTargetCount()).toBe(1);expect(e.proposalHitRoots.every((item:any)=>!item.root.enabled)).toBe(true);
    e.repairProgress={status:'complete',proposals};e.finishRepair();
    expect(e.menu).toBe('repairChoices');expect(e.spatial.actions).toHaveLength(0);expect(e.spatial.targetCount()).toBe(3);expect(e.proposalHitRoots.every((item:any)=>item.root.enabled)).toBe(true);
    e.selectRepair(2);e.updateSpatialState();expect(e.menu).toBe('repair');expect(e.spatial.actionLabels()).toEqual(['Use','Compare','Cancel']);expect(e.spatial.targetCount()).toBe(0);
    e.showMenu('repairCompare');e.updateSpatialState();expect(e.spatial.actionLabels()).toEqual(['Before','After','Back']);expect(e.spatial.visibleTargetCount()).toBe(3);
    e.setRepairPreview(false);expect(e.spatial.tags['Selected layout'].text.text).toBe('Before');expect(e.spatial.visibleTargetCount()).toBe(3);
    e.cancelRepair();expect(e.menu).toBe('overview');expect(e.spatial.visibleTargetCount()).toBeLessThanOrEqual(3);expect(Core.stableHash(e.input)).toBe(hash);
  });
  it('passes the live camera into surface updates only while Place is open',()=>{
    const {experience:e}=ready(),seen:any[]=[];e.surface.update=(camera:any)=>seen.push(camera);e.updateSpatialState=()=>{};
    e.menu='placement';e.update();e.menu='more';e.update();expect(seen).toEqual([e.camera,null]);
  });
  it('shows only placement instructions and puts its controls along the pitched gaze',()=>{
    const {experience:e,camera}=ready();e.updateSpatialState();expect(e.spatial.tags['Furniture note table'].visible).toBe(true);
    camera.position=new V(-30,-94,-416);camera.forward=new V(0,48.9,58).normalize();e.camera=camera.getTransform();e.menu='placement';e.surface.status='no_surface';e.surface.aim=camera.position.add(camera.forward.uniformScale(-75));e.updateSpatialState();
    expect(e.roomRoot.enabled).toBe(false);expect(Object.entries(e.spatial.tags).filter(([,v]:[string,any])=>v.visible).map(([name])=>name)).toEqual(['room-note']);
    const desired=camera.position.add(camera.forward.uniformScale(-65)).sub(camera.forward.cross(camera.right).uniformScale(8));
    for(let n=0;n<120;n++)Object.getPrototypeOf(e).updateDock.call(e,camera.position,false);
    expect(e.spatial.dock.position.distance(desired)).toBeLessThan(.001);expect(desired.y-camera.position.y).toBeLessThan(-40);
  });
  it('aligns through the real edit path, clears the old certificate and recomputes both tasks',()=>{
    const {experience:e}=ready();e.input.room.objects[1].pose={x:.5469999999999999,y:1.8070000000000002,theta:0};e.input.room.objects[2].pose={x:1.495,y:.692,theta:0};e.input.room.revision=3;e.acceptedRepair={certifiedReserveM:.0304};e.planJSONexport='old';e.currentShareLink='old';
    e.alignTable();expect(e.input.room.revision).toBe(4);expect(Core.stableHash(e.input)).toBe('23bff2355c471375');expect(e.acceptedRepair).toBeNull();expect(e.currentRevision).toBe(-1);expect(e.history).toHaveLength(1);expect(e.currentShareLink).toBe('');expect(e.planJSONexport).toBe('');
    for(let n=0;n<100&&e.evaluationJob;n++)e.stepEvaluation();
    expect(e.evaluationJob).toBeNull();expect(e.result.inputHash).toBe('23bff2355c471375');expect(e.result.tasks.journey.status).toBe('verified_feasible');expect(e.result.tasks.door.status).toBe('verified_feasible');expect(e.currentRevision).toBe(4);
  });
  it('hides the real-size chair until its complete buffered footprint fits the measured corner',()=>{
    const {experience:e}=ready();e.input.room.objects[1].pose={x:.91,y:3.01,theta:0};e.input.room.objects[2].pose={x:1.495,y:.692,theta:0};e.result=Core.evaluate(e.input);e.miniature=false;
    const visible=e.result.tasks.journey.path.filter((pose:any)=>{e.playerPose=pose;e.updateChairCrop();return e.player.enabled;});expect(visible).toHaveLength(26);
    e.playerPose=e.input.journey.start;e.updateChairCrop();expect(e.player.enabled).toBe(false);e.miniature=true;e.updateChairCrop();expect(e.player.enabled).toBe(true);
  });
});

describe('actual WorldQuery request adapter with controlled callbacks',()=>{
  it('re-queries at2Hz from a changed camera and rejects stale callbacks after confirmation',()=>{
    let now=0,starts=0,stops=0,created=0;const callbacks:((hit:any)=>void)[]=[],rays:any[]=[];const session={start(){starts++;},stop(){stops++;},hitTest:(start:any,end:any,callback:(hit:any)=>void)=>{rays.push({start,end});callbacks.push(callback);}};
    const module=compile('OpenDoorSurfacePlacement.ts',()=>({createHitTestSession:()=>{created++;return session;}}),{vec3:V,getTime:()=>now,print:()=>{}});
    const surface=new module.OpenDoorSurfacePlacement(),camera=new Node('camera');camera.position=new V(0,160,0);surface.request(camera.getTransform());
    callbacks[0]({position:new V(0,120,-75),normal:V.up()});expect(surface.status).toBe('ready');
    now=.49;surface.update(camera.getTransform());expect(rays).toHaveLength(1);
    camera.position=new V(40,160,0);now=.5;surface.update(camera.getTransform());expect(rays).toHaveLength(2);expect(rays[1].start.x).toBe(40);expect(surface.aim.x).toBe(40);
    expect(surface.status).toBe('ready');expect(surface.confirm()).toEqual(new V(0,120,-75));callbacks[1]({position:new V(40,120,-75),normal:V.up()});expect(surface.status).toBe('confirmed');expect(surface.candidate.x).toBe(0);
    now=1;surface.update(camera.getTransform());expect(rays).toHaveLength(2);expect(starts).toBe(1);expect(stops).toBe(1);expect(created).toBe(1);
    surface.stop();expect(stops).toBe(1);surface.request(camera.getTransform());expect(created).toBe(1);expect(starts).toBe(2);surface.stop();expect(stops).toBe(2);
  });
  it('queries the actual downward gaze so the looked-at tabletop precedes the back wall',()=>{
    const rays:any[]=[],tableY=-142.9;
    const session={start(){},stop(){},hitTest:(start:V,end:V,callback:(hit:any)=>void)=>{
      rays.push({start,end});const t=(tableY-start.y)/(end.y-start.y),point=start.add(end.sub(start).uniformScale(t));
      // Measured working camera/table arrangement; a flattened ray crosses the
      // table plane behind the tabletop and therefore meets the wall instead.
      const onTable=t>=0&&t<=1&&point.z>=-492&&point.z<=-455;
      callback(onTable?{position:point,normal:V.up()}:{position:new V(-30,-130,-500),normal:V.forward()});
    }};
    const module=compile('OpenDoorSurfacePlacement.ts',()=>({createHitTestSession:()=>session}),{vec3:V,getTime:()=>0,print:()=>{}});
    const surface=new module.OpenDoorSurfacePlacement(),camera=new Node('camera');camera.position=new V(-30,-94,-416);camera.forward=new V(0,48.9,58).normalize();surface.request(camera.getTransform());
    expect(surface.status).toBe('ready');expect(surface.candidate.y).toBeCloseTo(tableY,8);expect(surface.candidate.z).toBeCloseTo(-474,8);expect(rays[0].end.distance(rays[0].start)).toBeCloseTo(150,8);
    const direction=rays[0].end.sub(rays[0].start).normalize();for(const key of ['x','y','z'] as const)expect(direction[key]).toBeCloseTo(-camera.forward[key],12);
  });
  it('clears a previous hit after a current no-hit and cannot confirm it',()=>{
    let callback:(hit:any)=>void=()=>{},now=0;const session={start(){},stop(){},hitTest:(_s:any,_e:any,c:(hit:any)=>void)=>callback=c};
    const module=compile('OpenDoorSurfacePlacement.ts',()=>({createHitTestSession:()=>session}),{vec3:V,getTime:()=>now,print:()=>{}});
    const surface=new module.OpenDoorSurfacePlacement(),camera=new Node('camera');camera.position=new V(0,160,0);surface.request(camera.getTransform());callback({position:new V(0,120,-75),normal:V.up()});now=.5;surface.update(camera.getTransform());callback(null);expect(surface.status).toBe('no_surface');expect(surface.confirm()).toBeNull();
  });
});

describe('official first-use hint lifecycle at mocked prefab boundary',()=>{
  it('waits for context, can be seen again after leaving, and only dismisses on success',()=>{
    let plays=0,playing=false,enabled=false,materialOpacity=1;
    const root=new Node('hint'),mesh=new Node('HandHints');mesh.setParent(root);
    const endEvents=new Set<()=>void>(),autoFade=()=>{materialOpacity=0;enabled=false;};
    const clip={playbackMode:'loop'},player={getClip:()=>clip,getClipIsPlaying:()=>playing,onEvent:{remove:(fn:()=>void)=>endEvents.delete(fn)},stopClip:()=>{playing=false;},setClipEnabled:(_name:string,on:boolean)=>{enabled=on;}};
    mesh.components.AnimationPlayer=player;
    const controller={autoPlay:true,animationPlayerClipEndEvent:autoFade,playHintAnimation:()=>{plays++;playing=true;enabled=true;materialOpacity=1;endEvents.add(autoFade);}};root.components.Hint=controller;
    const module=compile('OpenDoorHints.ts',()=>({HandMode:{Right:1},HandAnimationsLibrary:{Right:{PinchNear:'pinch',PinchMoveX:'move'}},InteractionHintController:{getTypeName:()=>'Hint'}}),{requireAsset:()=>({instantiate:()=>root}),vec3:V,quat:{angleAxis:()=>({multiply:()=>({})})},PlaybackMode:{Single:'single'}});
    const hint=new module.OpenDoorHints(new Node(),'pinch');expect(controller.autoPlay).toBe(false);hint.update(false,new V(),0);expect(plays).toBe(0);
    hint.update(true,new V(),0);hint.update(true,new V(),0);expect(plays).toBe(1);expect(hint.dismissed).toBe(false);
    // Simulate the official one-shot completing. Leaving root.enabled true
    // alone would not pass: the package's end callback would fade the mesh.
    expect(clip.playbackMode).toBe('single');playing=false;endEvents.forEach(fn=>fn());
    expect(materialOpacity).toBe(1);expect(enabled).toBe(true);expect(hint.snapshot().holding).toBe(true);
    hint.update(false,new V(),0);hint.update(true,new V(),0);expect(plays).toBe(2);hint.dismiss();hint.update(true,new V(),0);expect(root.enabled).toBe(false);expect(plays).toBe(2);
    expect(enabled).toBe(false);expect(playing).toBe(false);expect(hint.snapshot().holding).toBe(false);
  });
});
