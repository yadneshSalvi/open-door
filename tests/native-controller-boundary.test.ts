import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import * as policy from '../lens-src/SpatialExperiencePolicy';
import * as presentation from '../lens-src/SpatialPresentation';
import * as corner from '../lens-src/SpatialCorner';
import * as dragFeedback from '../lens-src/SpatialDragFeedback';
import {assertTargetBudget} from '../lens-src/SpatialUIContract';
import * as annotationLayout from '../lens-src/SpatialAnnotationLayout';
import * as uiContract from '../lens-src/SpatialUIContract';
import * as dockLayout from '../lens-src/SpatialDockLayout';
import observedDrag from './fixtures/native-drag-007.json';
const require=createRequire(import.meta.url),Core=require('../lens-src/OpenDoorCore.js');

// Execute the authored controller against a small SDK boundary. This simulates
// platform branching and transactions; it is not a device or rendered-UI test.
class V {
  constructor(public x=0,public y=0,public z=0,public w=0){}
  static zero(){return new V();}static one(){return new V(1,1,1);}static up(){return new V(0,1,0);}static right(){return new V(1,0,0);}static forward(){return new V(0,0,1);}static lerp(a:V,b:V,t:number){return a.add(b.sub(a).uniformScale(t));}
  add(v:V){return new V(this.x+v.x,this.y+v.y,this.z+v.z);}sub(v:V){return new V(this.x-v.x,this.y-v.y,this.z-v.z);}uniformScale(s:number){return new V(this.x*s,this.y*s,this.z*s);}
  get lengthSquared(){return this.x*this.x+this.y*this.y+this.z*this.z;}get length(){return Math.sqrt(this.lengthSquared);}normalize(){return this.uniformScale(1/this.length);}distance(v:V){return this.sub(v).length;}dot(v:V){return this.x*v.x+this.y*v.y+this.z*v.z;}cross(v:V){return new V(this.y*v.z-this.z*v.y,this.z*v.x-this.x*v.z,this.x*v.y-this.y*v.x);}
}
class Event {listeners:((event?:any)=>void)[]=[];add(fn:(event?:any)=>void){this.listeners.push(fn);return ()=>{this.listeners=this.listeners.filter(f=>f!==fn);};}fire(event?:any){this.listeners.forEach(fn=>fn(event));}}
class Node {
  components:Record<string,any>={};
  createComponent(name:string){const event=()=>new Event();const value:any=name==='Interactable'?{onHoverEnter:event(),onHoverExit:event(),onTriggerStart:event(),onTriggerEnd:event(),onTriggerUpdate:event(),onTriggerCanceled:event(),onTriggerEndOutside:event()}:{};this.components[name]=value;return value;}getComponent(name:string){return this.components[name]||null;}
  enabled=true;position=new V();forward=new V(0,0,1);right=V.right();children:Node[]=[];
  constructor(public name='node'){}destroy(){this.enabled=false;}setParent(parent:Node){parent.children.push(this);}getChildrenCount(){return this.children.length;}getChild(i:number){return this.children[i];}
  getTransform(){return {forward:this.forward,right:this.right,up:this.forward.cross(this.right),getWorldPosition:()=>this.position,getWorldTransform:()=>({multiplyPoint:(v:V)=>this.position.add(v)}),getInvertedWorldTransform:()=>({multiplyPoint:(v:V)=>v.sub(this.position)}),setWorldPosition:(v:V)=>{this.position=v;},setLocalPosition:(v:V)=>{this.position=v;},setWorldScale:()=>{},setLocalRotation:()=>{},setWorldRotation:()=>{}};}
}
class UI {
  dock=new Node('dock');annotations=new Node('annotations');tags:Record<string,any>={};targets:Record<string,Node>={};actions:any[]=[];
  tag(key:string,width=18,height=3.2){return this.tags[key]||(this.tags[key]={root:new Node(key),text:{text:''},width,height,visible:false,color:new V(),offset:new V()});}
  setTagText(tag:any,text:string){tag.text.text=text;}
  anyTargetHovered(){return false;}
  hideTags(){Object.values(this.tags).forEach(tag=>tag.visible=false);}hideSpatialTargets(){Object.values(this.targets).forEach(t=>t.enabled=false);}
  setActions(actions:any[]){assertTargetBudget(actions.length,this.targetCount());this.actions=actions;}
  targetCount(){return Object.values(this.targets).filter(t=>t.enabled).length;}visibleTargetCount(){return this.actions.length+this.targetCount();}
  actionLabels(){return this.actions.map(a=>a.label);}targetHovered(){return false;}dockHovered(){return false;}
  makeSpatialTarget(key:string){if(!this.targets[key]){this.targets[key]=new Node(key);this.targets[key].enabled=false;}return this.targets[key];}
  setTargetEnabled(key:string,on:boolean){const target=this.targets[key];if(!target)return;if(on)assertTargetBudget(this.actions.length,this.targetCount()+(target.enabled?0:1));target.enabled=on;}
  setViewFrame(){}setTargetAnchor(){}controlBoxes(){return [];}
  setDockVisible(visible:boolean){this.dock.enabled=visible;}setDockVertical(){}
  dockVisibility(){return {wanted:this.dock.enabled,visible:this.dock.enabled,opacity:this.dock.enabled?1:0,vertical:false};}
  setTargetColor(){}setTargetSelected(){}face(){}updateTags(){}
}
class Surface {canConfirm(){return this.status==='ready'&&Boolean(this.candidate);}status='idle';candidate=null;aim=null;requests=0;request(){this.requests++;this.status='querying';}stop(){this.status='idle';}update(_camera?:unknown){} }
class Hints {dismissed=false;update(){}dismiss(){this.dismissed=true;}snapshot(){return {active:false,dismissed:this.dismissed,holding:false};}}
class Audio {stop(){}play(){}follow(){}available(){return true;}}
function compile(file:string,req:(name:string)=>unknown,globals:Record<string,unknown>){
  const output=ts.transpileModule(readFileSync(new URL('../lens-src/'+file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021,experimentalDecorators:true}}).outputText;
  const exports:any={};new Function('require','exports',...Object.keys(globals),output)(req,exports,...Object.values(globals));return exports;
}
function controller(isEditor=true,project?:(x:number,y:number,z:number)=>V){
  let now=100;const camera=new Node('camera');camera.position=new V(0,80,60);
  const req=(name:string):any=>name==='./OpenDoorCore'?Core:name==='./SpatialExperiencePolicy'?policy:name==='./SpatialPresentation'?presentation:name==='./SpatialCorner'?corner:name==='./SpatialUIContract'?uiContract:name==='./SpatialAnnotationLayout'?annotationLayout:name==='./SpatialDockLayout'?dockLayout:name==='./SpatialDragFeedback'?dragFeedback:name==='./OpenDoorSpatialUI'?{OpenDoorSpatialUI:UI}:name==='./OpenDoorSurfacePlacement'?{OpenDoorSurfacePlacement:Surface}:name==='./OpenDoorHints'?{OpenDoorHints:Hints}:name==='./OpenDoorAudio'?{OpenDoorAudio:Audio}:name.includes('HandInputData')?{HandInputData:{getInstance:()=>({getHand:()=>({enabled:false,isTracked:()=>false})})}}:name.includes('WorldCameraFinderProvider')?{default:{getInstance:()=>({getTransform:()=>camera.getTransform(),worldSpaceToScreenSpace:project})}}:{TargetingMode:{Direct:1,Indirect:2},Interactable:{getTypeName:()=>'Interactable'},InteractableAudioFeedback:{getTypeName:()=>'AudioFeedback'}};
  class Base {sceneObject=new Node('scene');}
  const module=compile('OpenDoorExperience.ts',req,{BaseScriptComponent:Base,component:(c:unknown)=>c,input:()=>{},allowUndefined:()=>{},vec2:V,vec3:V,vec4:V,quat:{angleAxis:()=>({multiply:()=>({})}),rotationFromTo:()=>({})},Shape:{createBoxShape:()=>({})},global:{scene:{createSceneObject:(name:string)=>new Node(name)},deviceInfoSystem:{isEditor:()=>isEditor}},getTime:()=>now,getDeltaTime:()=>1/60,print:()=>{}});
  const experience:any=new module.OpenDoorExperience();experience.cubeMesh={};experience.baseMaterial={};experience.font={};
  experience.renderRoom=()=>{};experience.present=()=>{};
  return {experience,camera,setTime:(n:number)=>{now=n;}};
}
function ready(project?:(x:number,y:number,z:number)=>V){
  const h=controller(true,project),e=h.experience;e.input=Core.cloneInput();e.result=Core.evaluate(e.input);e.currentRevision=e.input.room.revision;e.roomRoot=new Node('room');e.player=new Node('chair');e.doorRoot=new Node('door');e.spatial=new UI();e.uiRoot=e.spatial.dock;e.audio=new Audio();e.camera=h.camera.getTransform();
  for(const key of ['chair-card','chair-status','room-note','about-card'])e.spatial.tag(key);
  for(const object of e.input.room.objects)e.furnitureRoots[object.id]=new Node(object.id);
  e.drawLockIcon=()=>{};e.updateProposalTargets=()=>{};e.updateDock=()=>{};
  return h;
}

describe('actual native controller at mocked SDK boundary',()=>{
  it('refreshes projected control telemetry when a dock row changes without camera motion',()=>{
    const {experience:e,camera}=ready((x,y)=>new V(.5+x/200,.5-y/200));let arranged=0,retained=0;
    e.spatial.arrangeTags=()=>arranged++;e.spatial.retainLayoutResult=()=>retained++;
    e.spatial.setActions([{id:'undo',label:'Undo\nmove',run:()=>{}}]);e.arrangeAnnotations(camera.position);e.arrangeAnnotations(camera.position);
    expect(arranged).toBe(1);expect(retained).toBe(1);
    e.spatial.setActions([{id:'find',label:'Suggest fixes',run:()=>{}}]);e.arrangeAnnotations(camera.position);expect(arranged).toBe(2);
  });
  it('resolves the actual Undo target after the playback-end object-to-dock transition',()=>{
    const helper=compile('tests/OpenDoorVisibleFlow.ts',name=>name==='../OpenDoorCore'?Core:{},{});
    const stale={undoVisible:true,undoPresentation:'object',primaryActions:['Suggest fixes','Try the route','More']};
    expect(helper.enabledUndoLabel(stale,()=>false)).toBeNull();
    const settled={...stale,primaryActions:['Undo\nmove','Suggest fixes','More']};
    expect(helper.enabledUndoLabel(settled,(name:string)=>name==='Undo\nmove')).toBe('Undo\nmove');
    expect(helper.enabledUndoLabel(stale,(name:string)=>name==='Undo edit')).toBe('Undo edit');
    expect(helper.enabledUndoLabel({...stale,undoVisible:false,undoPresentation:'none'},()=>false)).toBeNull();
  });
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
    const hit=new V(100,0,-200);e.surface.confirm=()=>hit;e.confirmSurface();expect(e.deviceFloorConfirmed).toBe(true);expect(e.miniature).toBe(false);expect(e.fullSizeStartPositionCm.x).toBeCloseTo(108,10);expect(e.fullSizeStartPositionCm.y).toBe(0);expect(e.fullSizeStartPositionCm.z).toBeCloseTo(-105,10);
    const room=presentation.fullSizeRoomPosition(e.input.room,e.input.journey.start,e.fullSizeStartPositionCm,0),center={x:room.x+(1.1-2.1)*100,z:room.z-(2.4-1.7)*100};expect(center.x).toBeCloseTo(hit.x);expect(center.z).toBeCloseTo(hit.z);
  });
  it('limits saved-spot fallback to Preview and shows confirmation only for a ready hit',()=>{
    const {experience:preview}=controller(true);preview.placementConfirmed=false;preview.evaluateCurrent=()=>{};preview.start();const saved=preview.miniatureSurfacePositionCm;preview.useManualPlacement();expect(preview.menu).toBe('overview');expect(preview.placementConfirmed).toBe(true);expect(preview.miniatureSurfacePositionCm).toBe(saved);
    const {experience:e}=ready();e.menu='placement';e.outline=()=>{};e.surface.aim=new V(0,0,-75);
    for(const status of ['querying','no_surface','timed_out']){e.surface.status=status;e.surface.candidate=new V(5,0,-75);e.updateSpatialState();expect(e.surfaceMarker?.enabled||false).toBe(false);expect(e.spatial.actions.find((a:any)=>a.id==='placeHere').enabled).toBe(false);expect(e.spatial.tags['room-note'].text.text).toBe('Look at a level surface');}
    e.surface.status='ready';e.surface.candidate=new V(5,0,-75);e.updateSpatialState();expect(e.surfaceMarker.enabled).toBe(true);expect(e.surfaceMarker.position).toEqual(new V(5,.2,-75));expect(e.spatial.tags['room-note'].text.text).toBe('Pinch to place');
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
  it('updates a noninteractive settings value through a real size edit without adding a fourth target',()=>{
    const {experience:e}=ready();e.menu='profile';e.updateSpatialState();
    const value=e.spatial.tags['Chair settings value'];expect(value.visible).toBe(true);expect(value.text.text).toBe('66 × 105 cm');
    expect(e.spatial.tags['Chair size'].visible).toBe(false);expect(e.spatial.visibleTargetCount()).toBe(3);expect(value.root.components.Interactable).toBeUndefined();
    e.menu='profileWidth';e.updateSpatialState();expect(value.text.text).toBe('Width · 66 cm');
    e.adjustProfile('width',5);e.updateSpatialState();expect(value.text.text).toBe('Width · 71 cm');expect(value.visible).toBe(true);expect(e.evaluationJob).not.toBeNull();
    e.menu='profileBuffer';e.updateSpatialState();expect(value.text.text).toBe('3 cm gap');expect(e.spatial.visibleTargetCount()).toBe(3);
    e.menu='overview';e.updateSpatialState();expect(value.visible).toBe(false);
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
  it('pages three choices with an immediate Cancel inside one aggregate target budget',()=>{
    const {experience:e}=ready();e.input.room.revision=2;e.result=Core.evaluate(e.input);e.currentRevision=2;
    const hash=Core.stableHash(e.input);expect(hash).toBe('925846b6f7877a22');
    // Keep actual controller/menu/target methods; only SDK mesh creation is stubbed.
    e.updateProposalTargets=Object.getPrototypeOf(e).updateProposalTargets.bind(e);e.cube=()=>new Node('leader');e.renderRoom=()=>e.updateSpatialState();
    e.hoveredObject='table';e.focusUntil=103;e.showMenu('search');expect(e.spatial.actionLabels()).toEqual(['Cancel']);
    const object=e.input.room.objects.find((o:any)=>o.id==='table');
    const proposals=[0,1,2].map(index=>({id:'choice-'+index,sourceHash:hash,certifiedReserveM:index*.01,evaluation:e.result,input:Core.cloneInput(e.input),moves:[{objectId:'table',from:object.pose,to:{x:.91,y:3.01,theta:0},distanceM:.72,rotationRad:0}]}));
    e.repairProposals=proposals;e.updateSpatialState();expect(e.spatial.visibleTargetCount()).toBe(1);expect(e.proposalHitRoots.every((item:any)=>!item.root.enabled)).toBe(true);
    e.repairProgress={status:'complete',proposals};e.finishRepair();
    expect(e.menu).toBe('repairChoices');expect(e.spatial.actionLabels()).toEqual(['Next option','Cancel']);expect(e.spatial.targetCount()).toBe(0);
    for(let index=0;index<3;index++){
      expect(e.repairIndex).toBe(index);const label=e.spatial.tags['Layout option '+(index+1)];expect(label.visible).toBe(true);expect(label.root.components.Interactable).toBeUndefined();expect(e.spatial.targets['Layout option '+(index+1)]).toBeUndefined();
      const actualGhosts=e.proposalHitRoots.filter((item:any)=>item.root.enabled&&item.root.components.Interactable);expect(actualGhosts).toHaveLength(1);expect(e.spatial.visibleTargetCount()+actualGhosts.length).toBe(3);if(index<2)e.nextRepair();
    }
    e.selectRepair(2);e.updateSpatialState();expect(e.menu).toBe('repair');expect(e.spatial.actionLabels()).toEqual(['Use','Compare','Cancel']);expect(e.spatial.targetCount()).toBe(0);
    e.showMenu('repairCompare');e.updateSpatialState();expect(e.spatial.actionLabels()).toEqual(['Before','After','Back']);expect(e.spatial.visibleTargetCount()).toBe(3);
    e.setRepairPreview(false);expect(e.spatial.tags['Selected layout'].text.text).toBe('Before');expect(e.spatial.visibleTargetCount()).toBe(3);
    e.cancelRepair();expect(e.menu).toBe('overview');expect(e.spatial.visibleTargetCount()).toBeLessThanOrEqual(3);expect(Core.stableHash(e.input)).toBe(hash);
  });
  it('does not replace placement Back when WorldQuery availability changes',()=>{
    const {experience:e}=ready();e.placementConfirmed=true;e.menu='placement';e.surface.status='querying';e.updateActions();
    const before=e.spatial.actions.find((a:any)=>a.id==='back'),press=new presentation.PressIdentity();press.begin(before.identity);
    for(const status of ['no_surface','querying','ready']){e.surface.status=status;e.surface.candidate=status==='ready'?new V(0,0,-75):null;e.updateActions();expect(e.spatial.actions.find((a:any)=>a.id==='back').identity).toBe(before.identity);}
    const after=e.spatial.actions.find((a:any)=>a.id==='back');expect(press.release(after.identity)).toBe(true);after.run();expect(e.menu).toBe('overview');expect(e.surface.status).toBe('idle');
  });
  it('has clear move and option readout slots at the recorded steep working camera',()=>{
    // Projection calibrated from actual native world/screen pairs. This is a
    // layout regression, not a substitute for the next rendered Preview pass.
    const {experience:e,camera}=ready();camera.position=new V(-30,-75,-430);camera.forward=new V(0,67.9,44).normalize();e.camera=camera.getTransform();
    const right=e.camera.right,up=e.camera.up,normal=e.camera.forward;
    const project=(p:V)=>{const v=p.sub(camera.position),depth=-v.dot(normal);return {x:.5+.76236556*v.dot(right)/depth,y:.5-1.35641665*v.dot(up)/depth};};
    const world=(p:{x:number;y:number},height=0)=>new V(-30+(p.x-2.1)*10,-142.9+height*10,-474-(p.y-1.7)*10);
    const objectBox=(o:any)=>annotationLayout.annotationBounds(Core.objectPolygon(o).flatMap((p:any)=>[world(p),world(p,Math.min(o.height,1.1))]).map(project))!;
    const chairBox=(pose:any)=>annotationLayout.annotationBounds(Core.transform(Core.rectangle(e.input.profile.length,e.input.profile.width),pose).flatMap((p:any)=>[world(p),world(p,1.1)]).map(project))!;
    const doorBox=annotationLayout.annotationBounds([.14,.18].flatMap(x=>[.12,1.1].flatMap(y=>[world({x,y}),world({x,y},.54)])).map(project))!;
    const safe=(tablePose:any,width:number,height:number,ghost=false)=>{
      const table={...e.input.room.objects.find((o:any)=>o.id==='table'),pose:tablePose},bench={...e.input.room.objects.find((o:any)=>o.id==='bench'),pose:{x:1.495,y:.692,theta:0}},anchors=Core.objectPolygon(table).map((p:any)=>world(p,.5));
      if(ghost)anchors.push(...Core.objectPolygon(bench).map((p:any)=>world(p,.45)));
      const tag={angularSize:false,width,height} as any;e.positionAnnotation(tag,anchors[0],0,anchors);
      const objects=e.input.room.objects.map((o:any)=>o.id==='table'&&!ghost?table:o),subjects=[...objects.map(objectBox),chairBox(e.input.journey.start),doorBox];if(ghost)subjects.push(objectBox(table),objectBox(bench));
      const candidates=tag.layout.candidates.map((at:V,index:number)=>{
        const box=annotationLayout.annotationBounds([-1,1].flatMap(x=>[-1,1].map(y=>project(at.add(right.uniformScale(x*width/2)).add(up.uniformScale(y*height/2))))));
        const anchor=tag.layout.anchors[index],segment={from:project(at),to:project(anchor)};
        return {box:subjects.filter(b=>annotationLayout.segmentCrossesBox(segment,b)).length>2?null:box,cost:at.distance(anchor)};
      });
      const slot=annotationLayout.chooseAnnotation(candidates,subjects,[],-1,.015);expect(slot,JSON.stringify({tablePose,width,height,ghost})).toBeGreaterThanOrEqual(0);
      expect(tag.layout.candidates[slot].distance(tag.layout.anchors[slot])).toBeLessThanOrEqual(10.000001);
    };
    for(const pose of [{x:1.62,y:2.87,theta:0},{x:.91,y:2.87,theta:0},{x:.91,y:3.01,theta:0},{x:.547,y:1.807,theta:0}])safe(pose,8.5,3.2);
    for(const pose of [{x:.917,y:2.87,theta:0},{x:.907,y:2.87,theta:0},{x:.547,y:1.807,theta:0}])safe(pose,10.5,4.6,true);
  });
  it('keeps the compact distance clear of the recorded hand and furniture through all93 actual drag poses',()=>{
    const {experience:e,camera}=ready(),v=(p:{x:number;y:number;z:number})=>new V(p.x,p.y,p.z);
    camera.position=v(observedDrag.camera.position);camera.forward=v(observedDrag.camera.forward);camera.right=v(observedDrag.camera.right);e.camera=camera.getTransform();
    const {right,up,forward:normal}=e.camera;
    const frame={right,up,normal},project=(p:V)=>{const delta=p.sub(camera.position),depth=-delta.dot(normal);return{x:.5+.76236556*delta.dot(right)/depth,y:.5-1.35641665*delta.dot(up)/depth};};
    let formerFailures=0;
    for(const sample of observedDrag.samples){
      const anchors=sample.anchors.map(v),tag={} as any;e.positionAnnotation(tag,anchors[1],-1,anchors);
      const objects=[...observedDrag.staticObjects,sample.table],protectedBoxes=[...objects,...observedDrag.controls,sample.hand];
      const candidates=(width:number,height:number)=>tag.layout.candidates.map((point:V,index:number)=>{
        const anchor=tag.layout.anchors[index],segment={from:project(point),to:project(anchor)};
        return {box:annotationLayout.annotationLeaderSafe(segment,objects,observedDrag.controls)?dockLayout.planeBounds(point,width,height,1,frame,p=>project(v(p))):null,cost:point.distance(anchor)};
      });
      if(annotationLayout.chooseAnnotation(candidates(8.5,3.2),protectedBoxes,[],-1,.015)<0)formerFailures++;
      const actual=candidates(dragFeedback.MOVE_READOUT.width,dragFeedback.MOVE_READOUT.height),slot=annotationLayout.chooseAnnotation(actual,protectedBoxes,[],-1,.015);
      expect(slot,JSON.stringify(sample.pose)).toBeGreaterThanOrEqual(0);
      expect(actual[slot].cost).toBeLessThanOrEqual(10.000001);
      for(const box of protectedBoxes)expect(annotationLayout.annotationsOverlap(actual[slot].box!,box)).toBe(false);
    }
    expect(observedDrag.samples).toHaveLength(93);expect(formerFailures).toBeGreaterThan(30);
    expect(dragFeedback.dragDistanceValue({x:.547,y:1.807,theta:0},{x:.91,y:3.01,theta:0})).toBe('126 cm');
    // The real Inter glyph advance at the unchanged52-unit caption size fits
    // every three-digit centimetre distance in this supplied room, with padding.
    expect(3.5888671875*uiContract.SPATIAL_UI.captionText/uiContract.SPATIAL_UI.textUnitsPerEm).toBeLessThan(dragFeedback.MOVE_READOUT.width-1);
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
  it('commits a valid drag snap only after release, clears the old certificate and checks both tasks',()=>{
    const {experience:e}=ready();e.input.room.objects[1].pose={x:.5469999999999999,y:1.8070000000000002,theta:0};e.input.room.objects[2].pose={x:1.495,y:.692,theta:0};e.input.room.revision=3;e.acceptedRepair={certifiedReserveM:.0304};e.planJSONexport='old';e.currentShareLink='old';
    e.routeRoot=new Node('route');e.dashedOutline=()=>{};e.showDragGuide=()=>{};e.setHalo=()=>{};e.updateSpatialState=()=>{};e.play=()=>{};
    const root=e.furnitureRoots.table,event={interactor:{},stopPropagation:()=>{}},original=JSON.stringify(e.input);let pointer={...e.input.room.objects[1].pose};e.floorRayPoint=()=>pointer;
    e.beginFurnitureDrag({id:'table'},root,event);pointer={x:.91,y:3.0,theta:0};e.previewFurnitureDrag(event);
    expect(e.dragSnap.pose).toEqual({x:.91,y:3.01,theta:0});expect(JSON.stringify(e.input)).toBe(original);expect(e.history).toHaveLength(0);
    e.finishFurnitureDrag(event);expect(e.pendingDragCommit).not.toBeNull();expect(JSON.stringify(e.input)).toBe(original);expect(e.history).toHaveLength(0);
    e.flushFurnitureDrag();expect(e.input.room.revision).toBe(4);expect(Core.stableHash(e.input)).toBe('23bff2355c471375');expect(e.acceptedRepair).toBeNull();expect(e.currentRevision).toBe(-1);expect(e.history).toHaveLength(1);expect(e.currentShareLink).toBe('');expect(e.planJSONexport).toBe('');
    for(let n=0;n<100&&e.evaluationJob;n++)e.stepEvaluation();
    expect(e.evaluationJob).toBeNull();expect(e.result.inputHash).toBe('23bff2355c471375');expect(e.result.tasks.journey.status).toBe('verified_feasible');expect(e.result.tasks.door.status).toBe('verified_feasible');expect(e.currentRevision).toBe(4);
    expect(e.result.tasks.journey.minimumClearance).toBeLessThan(.002);expect(e.acceptedRepair).toBeNull();
  });
  it('keeps Undo reachable after the chip expires and never attaches a later size edit to the table',()=>{
    const {experience:e,setTime}=ready();e.updateSpatialState=()=>{};e.commitMove('table',.91,3.01);e.evaluationJob=null;e.currentRevision=e.input.room.revision;e.afterDragFeedback=false;
    expect(e.undoShortcutCurrent()).toBe(true);setTime(106);expect(e.undoShortcutCurrent()).toBe(false);e.showMenu('more');expect(e.spatial.actions[0].id).toBe('undo');
    const width=e.input.profile.width;e.adjustProfile('width',5);expect(e.undoObject).toBe('');expect(e.undoShortcutCurrent()).toBe(false);expect(e.history.at(-1).label).toBe('chair size');
    e.evaluationJob=null;e.showMenu('more');expect(e.spatial.actions[0].label).toBe('Undo\nchair size');e.spatial.actions[0].run();expect(e.input.profile.width).toBe(width);expect(e.input.room.objects[1].pose).toEqual({x:.91,y:3.01,theta:0});
  });
  it('uses a dock Undo when no safe object slot exists and retains the three-target budget',()=>{
    const {experience:e}=ready();e.updateSpatialState=()=>{};e.commitMove('table',.91,3.01);e.evaluationJob=null;e.currentRevision=e.input.room.revision;e.afterDragFeedback=false;e.band='middle';e.hoveredObject='';e.focusUntil=0;
    e.contextPositions={};e.undoDockFallback=true;e.contextDockActions=['undo'];e.menu='overview';e.updateActions();
    expect(e.spatial.actions.map((a:any)=>a.id)).toEqual(['undo','find','more']);expect(e.spatial.visibleTargetCount()).toBe(3);
    e.spatial.actions[0].run();expect(e.history).toHaveLength(0);expect(e.input.room.objects[1].pose.x).toBe(1.62);
  });
  it('allocates stable action callbacks and keeps every More page reversible',()=>{
    const {experience:e}=ready();e.updateSpatialState=()=>{};e.showMenu('more');const stable=e.actions;
    const labels=[];for(let n=0;n<4;n++){labels.push(e.spatial.actions[0].id);expect(e.spatial.actions.map((a:any)=>a.id).slice(1)).toEqual(['nextMore','back']);e.spatial.actions[1].run();expect(e.actions).toBe(stable);}
    expect(labels).toEqual(['place','scale','undo','about']);e.spatial.actions[2].run();expect(e.menu).toBe('overview');
  });
  it('keeps every real-size chair pose visible and uses outline-only outside the buffered corner',()=>{
    const {experience:e}=ready();e.input.room.objects[1].pose={x:.91,y:3.01,theta:0};e.input.room.objects[2].pose={x:1.495,y:.692,theta:0};e.result=Core.evaluate(e.input);e.miniature=false;e.chairSolid=new Node('solid');e.chairOutline=new Node('outline');
    let partial=0,solid=0;for(const pose of e.result.tasks.journey.path){e.playerPose=pose;e.updateChairCrop();expect(e.player.enabled).toBe(true);expect(e.chairSolid.enabled).not.toBe(e.chairOutline.enabled);if(e.chairContained)solid++;else partial++;}
    expect(partial).toBeGreaterThan(0);expect(solid).toBeGreaterThan(0);expect(partial+solid).toBe(49);
    e.playerPose=e.input.journey.start;e.updateChairCrop();expect(e.chairOutline.enabled).toBe(true);e.miniature=true;e.updateChairCrop();expect(e.chairSolid.enabled).toBe(true);expect(e.chairOutline.enabled).toBe(false);
  });

});

describe('actual WorldQuery request adapter with controlled callbacks',()=>{
  it('re-queries at2Hz from a changed camera and rejects stale callbacks after confirmation',()=>{
    let now=0,starts=0,stops=0,created=0;const callbacks:((hit:any)=>void)[]=[],rays:any[]=[];const session={start(){starts++;},stop(){stops++;},hitTest:(start:any,end:any,callback:(hit:any)=>void)=>{rays.push({start,end});callbacks.push(callback);}};
    const module=compile('OpenDoorSurfacePlacement.ts',()=>({createHitTestSessionWithOptions:(_options:any)=>{created++;return session;}}),{HitTestSessionOptions:{create:()=>({filter:true})},vec3:V,getTime:()=>now,print:()=>{}});
    const surface=new module.OpenDoorSurfacePlacement(),camera=new Node('camera');camera.position=new V(0,160,0);surface.request(camera.getTransform());
    callbacks[0]({position:new V(0,120,-75),normal:V.up()});expect(surface.status).toBe('ready');
    now=.49;surface.update(camera.getTransform());expect(rays).toHaveLength(1);
    camera.position=new V(40,160,0);now=.5;surface.update(camera.getTransform());expect(rays).toHaveLength(2);expect(rays[1].start.x).toBe(40);expect(surface.aim.x).toBe(40);
    expect(surface.status).toBe('ready');expect(surface.confirm()).toBeNull();callbacks[1]({position:new V(40,120,-75),normal:V.up()});expect(surface.canConfirm()).toBe(true);expect(surface.confirm()).toEqual(new V(40,120,-75));callbacks[0]({position:new V(0,120,-75),normal:V.up()});expect(surface.status).toBe('confirmed');expect(surface.candidate.x).toBe(40);
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
    const module=compile('OpenDoorSurfacePlacement.ts',()=>({createHitTestSessionWithOptions:(_options:any)=>session}),{HitTestSessionOptions:{create:()=>({filter:true})},vec3:V,getTime:()=>0,print:()=>{}});
    const surface=new module.OpenDoorSurfacePlacement(),camera=new Node('camera');camera.position=new V(-30,-94,-416);camera.forward=new V(0,48.9,58).normalize();surface.request(camera.getTransform());
    expect(surface.status).toBe('ready');expect(surface.candidate.y).toBeCloseTo(tableY,8);expect(surface.candidate.z).toBeCloseTo(-474,8);expect(rays[0].end.distance(rays[0].start)).toBeCloseTo(150,8);
    const direction=rays[0].end.sub(rays[0].start).normalize();for(const key of ['x','y','z'] as const)expect(direction[key]).toBeCloseTo(-camera.forward[key],12);
  });
  it('uses explicit unfiltered depth and keeps horizontal, range and fresh-hit requirements',()=>{
    let options:any,now=0,callback:(hit:any)=>void=()=>{};const session={start(){},stop(){},hitTest:(_s:any,_e:any,c:(hit:any)=>void)=>callback=c};
    const module=compile('OpenDoorSurfacePlacement.ts',()=>({createHitTestSessionWithOptions:(value:any)=>{options=value;return session;}}),{HitTestSessionOptions:{create:()=>({filter:true})},vec3:V,getTime:()=>now,print:()=>{}});
    const surface=new module.OpenDoorSurfacePlacement(),camera=new Node('camera');surface.request(camera.getTransform());expect(options.filter).toBe(false);
    callback({position:new V(0,-40,-60),normal:new V(0,.755,.656)});expect(surface.status).toBe('not_horizontal');expect(surface.confirm()).toBeNull();
    now=.5;surface.request(camera.getTransform());callback({position:new V(0,-40,-160),normal:V.up()});expect(surface.status).toBe('move_closer');
    now=1;surface.request(camera.getTransform());callback({position:new V(0,-40,-60),normal:V.up()});expect(surface.canConfirm()).toBe(true);expect(surface.diagnostic.normalY).toBe(1);
    now=1.8;expect(surface.confirm()).toBeNull();surface.request(camera.getTransform());callback({position:new V(1,-40,-60),normal:V.up()});expect(surface.confirm()).toEqual(new V(1,-40,-60));
  });
  it('clears a previous hit after a current no-hit and cannot confirm it',()=>{
    let callback:(hit:any)=>void=()=>{},now=0;const session={start(){},stop(){},hitTest:(_s:any,_e:any,c:(hit:any)=>void)=>callback=c};
    const module=compile('OpenDoorSurfacePlacement.ts',()=>({createHitTestSessionWithOptions:(_options:any)=>session}),{HitTestSessionOptions:{create:()=>({filter:true})},vec3:V,getTime:()=>now,print:()=>{}});
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
