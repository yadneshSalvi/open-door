import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as contract from '../lens-src/SpatialUIContract';
import * as annotationLayout from '../lens-src/SpatialAnnotationLayout';
import {PressIdentity} from '../lens-src/SpatialPresentation';

// Runtime boundary stub, not a rendering or hardware simulation. Execute the
// actual helper to check lifecycle, identity and visibility across menu changes.
function harness(){
  class V {constructor(public x=0,public y=0,public z=0,public w=0){} static zero(){return new V();} static one(){return new V(1,1,1);}static up(){return new V(0,1,0);}static forward(){return new V(0,0,1);}sub(v:V){return new V(this.x-v.x,this.y-v.y,this.z-v.z);}add(v:V){return new V(this.x+v.x,this.y+v.y,this.z+v.z);}uniformScale(s:number){return new V(this.x*s,this.y*s,this.z*s);}distance(v:V){return this.sub(v).length;}get lengthSquared(){return this.x*this.x+this.y*this.y+this.z*this.z;}get length(){return Math.sqrt(this.lengthSquared);}normalize(){return this.uniformScale(1/this.length);}}
  class Event {listeners:(()=>void)[]=[];add(f:()=>void){this.listeners.push(f);}fire(){this.listeners.forEach(f=>f());}}
  class Component {static getTypeName(){return this.name;}onInitialized=new Event();onTriggerDown=new Event();onTriggerUp=new Event();onHoverEnter=new Event();onHoverExit=new Event();interactable={onTriggerCanceled:new Event()};initialize(){}setVariant(){}addItems(){}removeItems(){}forceLayout(){}}
  class Button extends Component{} class FlexLayout extends Component{}class FlexItem extends Component{}class RoundedRectangle extends Component{}
  class Visual {onInitialized=new Event();baseDefaultColor:unknown;borderDefaultColor:unknown;constructor(public args:unknown){}}
  const nodes:Node[]=[];
  class Node {enabled=true;children:Node[]=[];components:Record<string,any>={};position=new V();scale=V.one();rotation:unknown;constructor(public name:string){nodes.push(this);}setParent(p:Node){p.children.push(this);}getTransform(){return {getWorldPosition:()=>this.position,getWorldTransform:()=>({multiplyPoint:(v:V)=>this.position.add(v)}),setWorldPosition:(v:V)=>{this.position=v;},setLocalPosition:(v:V)=>{this.position=v;},setWorldRotation:(q:unknown)=>{this.rotation=q;},setWorldScale:(v:V)=>{this.scale=v;}};}createComponent(name:string){const types:Record<string,any>={Button,FlexLayout,FlexItem,RoundedRectangle};const c=types[name]?new types[name]():{textFill:{},sceneObject:this};this.components[name]=c;return c;}}
  const source=ts.transpileModule(readFileSync(new URL('../lens-src/OpenDoorSpatialUI.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
  const module={exports:{} as any};
  const req=(name:string)=> name==='./SpatialAnnotationLayout'?annotationLayout:name==='./SpatialUIContract'?contract:name==='./SpatialPresentation'?{PressIdentity}:{Button,FlexLayout,FlexItem,RoundedRectangle,RoundedRectangleVisual:Visual,FlexDirection:{Row:1,Column:2},FlexJustify:{Center:1},FlexAlign:{Center:1}};
  new Function('require','exports','global','vec2','vec3','vec4','quat','Rect','HorizontalAlignment','VerticalAlignment','HorizontalOverflow','VerticalOverflow',source)(req,module.exports,{scene:{createSceneObject:(name:string)=>new Node(name)}},V,V,V,{lookAt:(direction:V,up:V)=>({direction,up})},{create:()=>({})},{Center:1},{Center:1},{Shrink:1},{Shrink:1});
  const ui=new module.exports.OpenDoorSpatialUI(new Node('parent'),{});
  return {ui,nodes,V};
}

describe('native UI contract',()=>{
  it('rejects a floor sign that would put part of its face below the measured floor',()=>{
    const {ui,V}=harness(),tag=ui.tag('Corner scope',16,4.5),camera=new V(0,80,80);
    ui.setTagText(tag,'Bedside · real size');tag.visible=true;tag.floorY=0;tag.layout={anchor:new V(0,0,0),candidates:[new V(0,.1,0),new V(0,8,0)],priority:0};
    ui.arrangeTags(camera,(p:any)=>new V(.5+p.x/100,.5-p.y/100),[]);
    expect(tag.resolvedPosition.y).toBe(8);expect(ui.getLayoutSnapshot().unplaced).toEqual([]);
  });
  it('fades band exits for300ms while canceling a held action immediately',()=>{
    const {ui,nodes}=harness();let calls=0;
    ui.setActions([{id:'go',label:'Go',run:()=>calls++}]);const button=nodes.find(n=>n.components.Button)!.components.Button;
    button.visual.onInitialized.fire();button.onTriggerDown.fire();ui.setDockVisible(false);ui.setActions([]);
    ui.updateTags(null,.15);expect(ui.dockVisibility().opacity).toBeCloseTo(.5);expect(ui.dock.enabled).toBe(true);expect(ui.actionLabels()).toEqual(['Go']);
    button.onTriggerUp.fire();expect(calls).toBe(0);expect(button.visual.opacity).toBeCloseTo(.5);
    ui.updateTags(null,.15);expect(ui.dockVisibility().opacity).toBe(0);expect(ui.dock.enabled).toBe(false);expect(ui.visibleTargetCount()).toBe(0);
    ui.setDockVisible(true);ui.setActions([{id:'go',label:'Go',run:()=>calls++}]);ui.updateTags(null,.3);
    button.onTriggerDown.fire();button.onTriggerUp.fire();expect(calls).toBe(1);
    ui.setDockVisible(false,true);expect(ui.dock.enabled).toBe(false);
  });
  it('keeps all three persistent hit regions separated in the full-size column',()=>{
    const {ui,nodes}=harness();ui.setActions(['a','b','c'].map(id=>({id,label:id,run:()=>{}})));const roots=nodes.filter(n=>n.components.Button);
    ui.setDockVertical(true);expect(ui.row.direction).toBe(2);expect(ui.row.rowGap).toBeCloseTo(2.7);
    expect(contract.SPATIAL_UI.buttonHeight+ui.row.rowGap-roots[0].components.Button.colliderSize.y).toBeGreaterThanOrEqual(2);
    ui.setDockVertical(false);expect(ui.row.direction).toBe(1);expect(nodes.filter(n=>n.components.Button)).toEqual(roots);
  });
  it('moves a live annotation away from actual tracked-hand bounds without moving its anchor',()=>{
    const {ui,V}=harness(),camera=new V(0,0,100),project=(p:any)=>new V(.5+p.x/100,.5-p.y/100);
    const tag=ui.tag('Move distance',8.5,3.2);ui.setTagText(tag,'Moved126cm');tag.visible=true;tag.leader={lengthCm:2};
    const anchor=new V(0,0,0);tag.layout={anchor,candidates:[new V(0,8,0),new V(-9,-3,0)],priority:-1,required:true};
    ui.arrangeTags(camera,project,[],[],[{name:'right hand',points:[new V(-4,6,0),new V(4,10,0)]}]);
    expect(tag.resolvedPosition.x).toBe(-9);expect(tag.resolvedLeader.to).toBe(anchor);expect(ui.getLayoutSnapshot().occluders).toHaveLength(1);
    expect(ui.getLayoutSnapshot().unplaced).toEqual([]);
  });
  it('keeps physical text and target separation within the reviewed limits',()=>{
    const {SPATIAL_UI:u}=contract;
    expect(contract.estimatedCapHeight(u.buttonText)).toBeGreaterThanOrEqual(.9);
    expect(contract.estimatedCapHeight(u.captionText)).toBeGreaterThanOrEqual(.8);
    // Only the face animates; persistent hit regions retain the full gap.
    const {ui,nodes}=harness();ui.setActions(['a','b','c'].map(id=>({id,label:id,run:()=>{}})));
    const widths=nodes.filter(n=>n.components.Button).map(n=>n.components.Button.colliderSize.x);
    expect(widths).toEqual([u.buttonWidth,u.buttonWidth,u.buttonWidth]);
    expect(u.buttonWidth+u.gap-widths[0]).toBeGreaterThanOrEqual(2);
    expect(contract.dockWidth(3)).toBeCloseTo(35.9);
    // Snap's 53cm width at110cm, projected to the closest75cm working pose.
    expect(contract.dockWidth(3)).toBeLessThanOrEqual(53*75/110);
    expect(2*Math.atan(u.buttonHeight/(2*80))*180/Math.PI).toBeGreaterThan(3);
  });
  it('retains three collider roots and rejects a fourth visible object command',()=>{
    const {ui,nodes}=harness();const actions=['a','b','c'].map(id=>({id,label:id,run:()=>{}}));
    ui.setActions(actions);const roots=nodes.filter(n=>n.components.Button);
    expect(roots).toHaveLength(3);expect(ui.visibleTargetCount()).toBe(3);
    ui.makeSpatialTarget('lock','Lock',()=>{});expect(ui.target('lock').enabled).toBe(false);
    expect(()=>ui.setTargetEnabled('lock',true)).toThrow(/three/);
    ui.setActions([]);ui.setTargetEnabled('lock',true);ui.setActions(actions.slice(0,2));
    expect(()=>ui.setActions(actions)).toThrow(/three/);
    ui.hideSpatialTargets();ui.setActions(actions);expect(nodes.filter(n=>n.components.Button).slice(0,3)).toEqual(roots);
  });
  it('does not turn a held pinch into a replacement action and animates only a face child',()=>{
    const {ui,nodes}=harness();let count=0;
    ui.setActions([{id:'before',label:'Before',selected:true,run:()=>count++}]);
    const root=nodes.find(n=>n.components.Button)!;const button=root.components.Button;
    button.onTriggerDown.fire();ui.setActions([{id:'after',label:'After',selected:true,run:()=>count++}]);button.onTriggerUp.fire();expect(count).toBe(0);
    button.onTriggerDown.fire();button.onTriggerUp.fire();expect(count).toBe(1);
    expect(button.visual.args.sceneObject).not.toBe(root);
    expect(button.visual.args.style.hovered.localScale.x).toBe(1.04);
    expect(button.visual.args.style.triggered.localPosition.z).toBe(-.35);
    expect(button.visual.args.depthSettings.depthTest).toBe(true);
    expect(button.playAudio).toBe(true);
  });
  it('keeps a held Back press across placement availability changes without rebuilding its row',()=>{
    const {ui,nodes}=harness();let count=0,layouts=0;
    ui.rowReady=true;ui.row.forceLayout=()=>layouts++;
    const actions=(ready:boolean)=>[{id:'place',identity:'placement|place',label:'Place here',enabled:ready,run:()=>{}},{id:'back',identity:'placement|back',label:'Back',run:()=>count++}];
    ui.setActions(actions(false));const back=nodes.filter(n=>n.components.Button)[1].components.Button;
    back.onTriggerDown.fire();ui.setActions(actions(true));ui.setActions(actions(false));back.onTriggerUp.fire();
    expect(count).toBe(1);expect(layouts).toBe(1);
  });
  it('distinguishes disabled, hovered and selected states after the visual theme initializes',()=>{
    const {ui,nodes}=harness();ui.setActions([{id:'before',label:'Before',selected:true,run:()=>{}},{id:'after',label:'After',run:()=>{}},{id:'apply',label:'Use',enabled:false,run:()=>{}}]);
    const targets=nodes.filter(n=>n.components.Button),selected=targets[0].components.Button.visual;
    selected.defaultBorderSize=.1;selected.onInitialized.fire();expect(selected.defaultBorderSize).toBe(.35);
    expect(targets[1].components.Button.visual.borderDefaultColor.w).toBe(.42);
    const disabled=targets[2].components.Button;expect(disabled.inactive).toBe(true);expect(disabled.visual.args.style.inactive.borderColor.w).toBe(.3);
    expect(disabled.visual.args.style.hovered.borderSize).toBe(.28);expect(disabled.visual.args.style.hovered.baseColor.x).toBeCloseTo(.0385);
    const face=targets[2].children.find(n=>n.name==='Button face')!,label=face.children.find(n=>n.components['Component.Text'])!.components['Component.Text'];expect(label.textFill.color.w).toBe(.5);
  });
  it('fades tags over 300ms, faces the actual camera and never installs an interaction target',()=>{
    const {ui,V}=harness();const tag=ui.writeTag('clearance','3 cm extra room');tag.visible=true;
    ui.updateTags(new V(0,80,80),.15);expect(tag.fade).toBeCloseTo(.5);expect(tag.root.rotation.direction.y).toBeCloseTo(Math.SQRT1_2);
    ui.updateTags(new V(0,80,80),.15);expect(tag.fade).toBe(1);expect(tag.root.scale.x).toBe(1);
    tag.visible=false;ui.updateTags(null,.15);expect(tag.root.enabled).toBe(true);ui.updateTags(null,.15);expect(tag.root.enabled).toBe(false);
    expect(tag.root.components.Button).toBeUndefined();expect(tag.leaderRoot.components.Button).toBeUndefined();
    tag.visible=true;ui.updateTags(null,.3);ui.hideTags(true);expect(tag.fade).toBe(0);expect(tag.root.enabled).toBe(false);expect(tag.leaderRoot.enabled).toBe(false);
  });
  it('keeps cached rejected labels hidden when eligibility is renewed on the next frame',()=>{
    const {ui}=harness(),tag=ui.writeTag('chair','Example wheelchair');tag.visible=true;ui.updateTags(null,.3);
    ui.layoutSnapshot={unplaced:['chair']};tag.visible=true;ui.retainLayoutResult();ui.updateTags(null,1/60);
    expect(tag.visible).toBe(false);expect(tag.root.enabled).toBe(false);expect(tag.leaderRoot.enabled).toBe(false);
  });
  it('keeps resolved leader endpoints through an eligibility refresh and renders the full physical segment',()=>{
    const {ui,V}=harness(),tag=ui.writeTag('move','Moved 12 cm'),camera=new V(0,80,80),anchor=new V(1,-4,-3),at=new V(1,5,1);
    tag.visible=true;tag.layout={anchor,candidates:[at],priority:0};ui.arrangeTags(camera,(p:any)=>new V(.5+p.x/100,.5-p.y/100),[]);ui.updateTags(camera,.3);
    const acceptedLength=tag.leaderPlate.size.y;expect(acceptedLength).toBeGreaterThan(2);
    tag.leader={lengthCm:2};tag.visible=true;ui.retainLayoutResult();ui.updateTags(camera,1/60);
    expect(tag.leaderDot.position).toEqual(anchor);expect(tag.leaderPlate.size.y).toBeCloseTo(acceptedLength,10);
    const end=tag.leaderRoot.position.add(tag.leaderRoot.rotation.up.uniformScale(tag.leaderPlate.size.y/2));expect(end.distance(anchor)).toBeLessThan(1e-8);
    const q=tag.leaderRoot.rotation;expect(q.direction.x*q.up.x+q.direction.y*q.up.y+q.direction.z*q.up.z).toBeCloseTo(0,10);
  });
  it('keeps off-centre ordinary labels level with the camera while projection uses the same plane',()=>{
    const {ui,V}=harness(),tag=ui.writeTag('bench','Blocks door');tag.root.position=new V(-20,0,0);tag.visible=true;
    const right=new V(1,0,0),up=new V(0,.5,-Math.sqrt(.75)),normal=new V(0,Math.sqrt(.75),.5);ui.setViewFrame(right,up,normal);ui.updateTags(new V(0,80,80),.3);
    expect(tag.root.rotation.direction).toEqual(normal);expect(tag.root.rotation.up).toEqual(up);
  });
  it('fully reveals placement instructions while immediately hiding previous room labels',()=>{
    const {ui}=harness(),note=ui.writeTag('room-note','Look at a level surface'),old=ui.writeTag('chair','Example wheelchair');
    old.visible=true;ui.updateTags(null,.3);
    for(let frame=0;frame<30;frame++){ui.hideTags();ui.hideTags(true,'room-note');note.visible=true;ui.updateTags(null,1/60);}
    expect(note.fade).toBe(1);expect(note.text.textFill.color.w).toBe(1);expect(old.fade).toBe(0);expect(old.root.enabled).toBe(false);
  });
});
