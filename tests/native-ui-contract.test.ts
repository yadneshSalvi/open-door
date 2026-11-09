import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as contract from '../lens-src/SpatialUIContract';
import * as annotationLayout from '../lens-src/SpatialAnnotationLayout';
import {PressIdentity} from '../lens-src/SpatialPresentation';

// Runtime boundary stub, not a rendering or hardware simulation. Execute the
// actual helper to check lifecycle, identity and visibility across menu changes.
function harness(){
  class V {constructor(public x=0,public y=0,public z=0,public w=0){} static zero(){return new V();} static one(){return new V(1,1,1);}static up(){return new V(0,1,0);}static forward(){return new V(0,0,1);}sub(v:V){return new V(this.x-v.x,this.y-v.y,this.z-v.z);}add(v:V){return new V(this.x+v.x,this.y+v.y,this.z+v.z);}uniformScale(s:number){return new V(this.x*s,this.y*s,this.z*s);}get lengthSquared(){return this.x*this.x+this.y*this.y+this.z*this.z;}get length(){return Math.sqrt(this.lengthSquared);}normalize(){return this.uniformScale(1/this.length);}}
  class Event {listeners:(()=>void)[]=[];add(f:()=>void){this.listeners.push(f);}fire(){this.listeners.forEach(f=>f());}}
  class Component {static getTypeName(){return this.name;}onInitialized=new Event();onTriggerDown=new Event();onTriggerUp=new Event();onHoverEnter=new Event();onHoverExit=new Event();interactable={onTriggerCanceled:new Event()};initialize(){}setVariant(){}addItems(){}removeItems(){}forceLayout(){}}
  class Button extends Component{} class FlexLayout extends Component{}class FlexItem extends Component{}class RoundedRectangle extends Component{}
  class Visual {baseDefaultColor:unknown;borderDefaultColor:unknown;constructor(public args:unknown){}}
  const nodes:Node[]=[];
  class Node {enabled=true;children:Node[]=[];components:Record<string,any>={};position=new V();scale=V.one();rotation:unknown;constructor(public name:string){nodes.push(this);}setParent(p:Node){p.children.push(this);}getTransform(){return {getWorldPosition:()=>this.position,getWorldTransform:()=>({multiplyPoint:(v:V)=>this.position.add(v)}),setWorldPosition:(v:V)=>{this.position=v;},setLocalPosition:(v:V)=>{this.position=v;},setWorldRotation:(q:unknown)=>{this.rotation=q;},setWorldScale:(v:V)=>{this.scale=v;}};}createComponent(name:string){const types:Record<string,any>={Button,FlexLayout,FlexItem,RoundedRectangle};const c=types[name]?new types[name]():{textFill:{},sceneObject:this};this.components[name]=c;return c;}}
  const source=ts.transpileModule(readFileSync(new URL('../lens-src/OpenDoorSpatialUI.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText;
  const module={exports:{} as any};
  const req=(name:string)=> name==='./SpatialAnnotationLayout'?annotationLayout:name==='./SpatialUIContract'?contract:name==='./SpatialPresentation'?{PressIdentity}:{Button,FlexLayout,FlexItem,RoundedRectangle,RoundedRectangleVisual:Visual,FlexDirection:{Row:1},FlexJustify:{Center:1},FlexAlign:{Center:1}};
  new Function('require','exports','global','vec2','vec3','vec4','quat','Rect','HorizontalAlignment','VerticalAlignment','HorizontalOverflow','VerticalOverflow',source)(req,module.exports,{scene:{createSceneObject:(name:string)=>new Node(name)}},V,V,V,{lookAt:(direction:V,up:V)=>({direction,up})},{create:()=>({})},{Center:1},{Center:1},{Shrink:1},{Shrink:1});
  const ui=new module.exports.OpenDoorSpatialUI(new Node('parent'),{});
  return {ui,nodes,V};
}

describe('native UI contract',()=>{
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
  it('fades tags over 300ms, faces yaw only and never installs an interaction target',()=>{
    const {ui,V}=harness();const tag=ui.writeTag('clearance','3 cm extra room');tag.visible=true;
    ui.updateTags(new V(0,80,80),.15);expect(tag.fade).toBeCloseTo(.5);expect(tag.root.rotation.direction.y).toBe(0);
    ui.updateTags(new V(0,80,80),.15);expect(tag.fade).toBe(1);expect(tag.root.scale.x).toBe(1);
    tag.visible=false;ui.updateTags(null,.15);expect(tag.root.enabled).toBe(true);ui.updateTags(null,.15);expect(tag.root.enabled).toBe(false);
    expect(tag.root.components.Button).toBeUndefined();expect(tag.leaderRoot.components.Button).toBeUndefined();
    tag.visible=true;ui.updateTags(null,.3);ui.hideTags(true);expect(tag.fade).toBe(0);expect(tag.root.enabled).toBe(false);expect(tag.leaderRoot.enabled).toBe(false);
  });
  it('fully reveals placement instructions while immediately hiding previous room labels',()=>{
    const {ui}=harness(),note=ui.writeTag('room-note','Look at a level surface'),old=ui.writeTag('chair','Example wheelchair');
    old.visible=true;ui.updateTags(null,.3);
    for(let frame=0;frame<30;frame++){ui.hideTags();ui.hideTags(true,'room-note');note.visible=true;ui.updateTags(null,1/60);}
    expect(note.fade).toBe(1);expect(note.text.textFill.color.w).toBe(1);expect(old.fade).toBe(0);expect(old.root.enabled).toBe(false);
  });
});
