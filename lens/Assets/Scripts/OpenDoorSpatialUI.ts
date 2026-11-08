import { Button } from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button';
import { FlexLayout } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout';
import { FlexItem } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem';
import { FlexAlign, FlexDirection, FlexJustify } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes';
import { RoundedRectangle } from 'SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle';
import { PressIdentity } from './SpatialPresentation';

export type SpatialAction={id:string;identity?:string;label:string;run:()=>void;enabled?:boolean};
export type SpatialTag={root:SceneObject;text:Text;visible:boolean;detail:boolean;anchor:SceneObject|null;offset:vec3;expires:number;hovered:boolean};
type Target={root:SceneObject;button:Button;text:Text;item?:FlexItem;hovered:boolean;press:PressIdentity};

const LIGHT=new vec4(.95,.98,.91,1);
const TEXT_ROLES={button:39,body:39,caption:38};

/** Three persistent primary targets plus object-attached, depth-tested annotations. */
export class OpenDoorSpatialUI {
  public readonly dock:SceneObject;
  public readonly annotations:SceneObject;
  public readonly tags:Record<string,SpatialTag>={};
  private readonly slots:Target[]=[];
  private readonly spatialTargets:Record<string,Target>={};
  private readonly spatialActions:Record<string,()=>void>={};
  private readonly spatialIdentities:Record<string,string>={};
  private actions:SpatialAction[]=[];
  private row:FlexLayout;
  private rowReady=false;
  private currentItems:FlexItem[]=[];

  constructor(private parent:SceneObject,private font:Font) {
    this.dock=this.node('Open Door · surface tools',parent);
    this.dock.createComponent('Component.Canvas');
    this.annotations=this.node('Open Door · object annotations',parent);
    this.row=this.dock.createComponent(FlexLayout.getTypeName()) as FlexLayout;
    // A runtime-created FlexLayout may not have reached OnStart yet.
    // Manual item management is supported before that event only with discovery off.
    this.row.autoDiscoverItemsOnStart=false;
    this.row.width=36.9;this.row.height=7;
    this.row.direction=FlexDirection.Row;this.row.justifyContent=FlexJustify.Center;
    this.row.alignItems=FlexAlign.Center;this.row.columnGap=1.2;
    this.row.onInitialized.add(()=>{
      this.rowReady=true;
      this.row.addItems(this.currentItems);this.row.forceLayout();
    });
    for(let index=0;index<3;index++) {
      const target=this.makeTarget(this.dock,'Primary '+index,11.5,6,()=>{
        const action=this.actions[index];if(action&&action.enabled!==false)action.run();
      },()=>{const action=this.actions[index];return action&&action.enabled!==false?(action.identity||action.id):null;});
      const item=target.root.createComponent(FlexItem.getTypeName()) as FlexItem;
      item.overrideWidth=11.5;item.overrideHeight=6;item.flexGrow=0;item.flexShrink=0;
      target.item=item;this.slots.push(target);
    }
  }

  public setActions(actions:SpatialAction[]) {
    if(actions.length>3)throw new Error('Open Door permits at most three primary actions.');
    this.slots.forEach((slot,index)=>{
      const previous=this.actions[index],next=actions[index];
      if(!next||next.enabled===false||(previous?.identity||previous?.id)!==(next.identity||next.id))slot.press.cancel();
    });
    this.actions=actions;
    this.row.removeItems(this.currentItems);this.currentItems=[];
    this.slots.forEach((slot,index)=>{
      const action=actions[index];slot.root.enabled=Boolean(action);
      if(!action)return;
      slot.root.name=action.label;slot.text.text=action.label;
      slot.button.inactive=action.enabled===false;
      this.currentItems.push(slot.item!);
    });
    this.row.addItems(this.currentItems);if(this.rowReady)this.row.forceLayout();
  }

  public actionLabels(){return this.actions.map(a=>a.label);}

  public makeSpatialTarget(key:string,label:string,run:()=>void,width=12.5,height=6,identity=key):SceneObject {
    if(this.spatialIdentities[key]!==identity)this.spatialTargets[key]?.press.cancel();
    this.spatialIdentities[key]=identity;
    this.spatialActions[key]=run;
    let target=this.spatialTargets[key];
    if(!target)target=this.spatialTargets[key]=this.makeTarget(this.annotations,key,width,height,()=>this.spatialActions[key]?.(),()=>this.spatialIdentities[key]||null);
    target.root.name=key;target.text.text=label;return target.root;
  }

  public setTargetLabel(key:string,label:string){const target=this.spatialTargets[key];if(target)target.text.text=label;}
  public setTargetColor(key:string,color:vec4){const target=this.spatialTargets[key];if(target)target.text.textFill.color=color;}
  public setTargetEnabled(key:string,enabled:boolean){const target=this.spatialTargets[key];if(target){if(!enabled)target.press.cancel();target.root.enabled=enabled;}}
  public target(key:string){return this.spatialTargets[key]?.root||null;}
  public targetHovered(key:string){return this.spatialTargets[key]?.hovered||false;}
  public dockHovered(){return this.slots.some(slot=>slot.hovered);}
  public targetCount(){return Object.keys(this.spatialTargets).filter(k=>this.spatialTargets[k].root.enabled).length;}

  public tag(key:string,width=18,height=3.2):SpatialTag {
    if(this.tags[key])return this.tags[key];
    const root=this.node(key,this.annotations);root.createComponent('Component.Canvas');
    // A noninteractive UIKit shape: annotation plates must not intercept furniture pinches.
    const plate=root.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle;
    plate.size=new vec2(width,height);plate.initialize();plate.gradient=false;
    plate.backgroundColor=new vec4(.055,.075,.07,.90);
    const text=this.text(root,'',width-1,height-.4,'caption');
    text.sceneObject.getTransform().setLocalPosition(new vec3(0,0,.65));
    const tag={root,text,visible:false,detail:false,anchor:null,offset:vec3.zero(),expires:0,hovered:false};
    this.tags[key]=tag;return tag;
  }

  public writeTag(key:string,text:string,color:vec4=LIGHT){const tag=this.tag(key);tag.text.text=text;tag.text.textFill.color=color;return tag;}
  public hideTags(){for(const key of Object.keys(this.tags))this.tags[key].visible=false;}
  public hideSpatialTargets(){for(const key of Object.keys(this.spatialTargets))this.spatialTargets[key].root.enabled=false;}

  public face(object:SceneObject,cameraPosition:vec3) {
    const position=object.getTransform().getWorldPosition(),direction=cameraPosition.sub(position);
    if(direction.lengthSquared<.0001)return;
    object.getTransform().setWorldRotation(quat.lookAt(direction.normalize(),vec3.up()));
  }

  public updateTags(camera:vec3|null) {
    for(const key of Object.keys(this.tags)) {
      const tag=this.tags[key];tag.root.enabled=tag.visible&&Boolean(tag.text.text);
      if(!tag.root.enabled)continue;
      if(tag.anchor)tag.root.getTransform().setWorldPosition(tag.anchor.getTransform().getWorldTransform().multiplyPoint(tag.offset));
      if(camera){
        this.face(tag.root,camera);
        const scale=Math.max(.6,Math.min(1,camera.distance(tag.root.getTransform().getWorldPosition())/100));
        tag.root.getTransform().setWorldScale(new vec3(scale,scale,scale));
      }
    }
  }

  private makeTarget(parent:SceneObject,name:string,width:number,height:number,run:()=>void,identity:()=>string|null):Target {
    const root=this.node(name,parent);
    const button=root.createComponent(Button.getTypeName()) as Button;
    button.size=new vec3(width,height,1);button.playAudio=true;
    button.setVariant({theme:'SnapOS2',shape:'Rectangle',style:'PrimaryNeutral'});
    button.initialize();button.colliderFitElement=false;
    button.colliderSize=new vec3(width+.5,height+.5,1.5);
    const text=this.text(root,name,width-1,height-1,'button');
    text.sceneObject.getTransform().setLocalPosition(new vec3(0,0,.7));
    const target={root,button,text,hovered:false,press:new PressIdentity()};
    button.onTriggerDown.add(()=>target.press.begin(root.enabled?identity():null));
    button.onTriggerUp.add(()=>{if(target.press.release(root.enabled?identity():null))run();});
    button.interactable.onTriggerCanceled.add(()=>target.press.cancel());
    button.onHoverEnter.add(()=>target.hovered=true);
    button.onHoverExit.add(()=>{target.hovered=false;target.press.cancel();});
    return target;
  }

  private text(parent:SceneObject,value:string,width:number,height:number,role:keyof typeof TEXT_ROLES):Text {
    const object=this.node('Label',parent),text=object.createComponent('Component.Text');
    text.font=this.font;text.text=value;text.size=TEXT_ROLES[role];
    (text as Text&{weight?:number}).weight=500;
    text.depthTest=true;text.textFill.color=LIGHT;
    text.horizontalAlignment=HorizontalAlignment.Center;text.verticalAlignment=VerticalAlignment.Center;
    text.layoutRect=Rect.create(-width/2,width/2,-height/2,height/2);
    return text;
  }
  private node(name:string,parent:SceneObject){const object=global.scene.createSceneObject(name);object.setParent(parent);return object;}
}
