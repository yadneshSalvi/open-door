import { Button } from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button';
import { FlexLayout } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout';
import { FlexItem } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem';
import { FlexAlign, FlexDirection, FlexJustify } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes';
import { RoundedRectangle } from 'SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle';
import { RoundedRectangleVisual, RoundedRectangleVisualState } from 'SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual';
import { SPATIAL_UI as UI, dockWidth, assertTargetBudget, fadeOpacity } from './SpatialUIContract';
import { PressIdentity } from './SpatialPresentation';
import { AnnotationBox, annotationBounds, chooseAnnotation } from './SpatialAnnotationLayout';

export type SpatialAction={id:string;identity?:string;label:string;run:()=>void;enabled?:boolean;selected?:boolean};
export type SpatialTag={root:SceneObject;text:Text;visible:boolean;detail:boolean;anchor:SceneObject|null;offset:vec3;expires:number;hovered:boolean;opacity:number;leader?:{lengthCm?:number;to?:vec3};plate:RoundedRectangle;leaderRoot:SceneObject;leaderPlate:RoundedRectangle;fade:number;color:vec4;halfHeight:number;width:number;height:number;layout?:{anchor:vec3;candidates:vec3[];priority:number;required?:boolean};layoutSlot?:number};
type Target={root:SceneObject;button:Button;text:Text;item?:FlexItem;hovered:boolean;press:PressIdentity;width:number;height:number};

const LIGHT=new vec4(1,1,1,1);
const TEXT_ROLES={button:UI.buttonText,body:UI.bodyText,caption:UI.captionText};

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
    this.row.width=dockWidth(UI.maxTargets);this.row.height=7;
    this.row.direction=FlexDirection.Row;this.row.justifyContent=FlexJustify.Center;
    this.row.alignItems=FlexAlign.Center;this.row.columnGap=UI.gap;
    this.row.onInitialized.add(()=>{
      this.rowReady=true;
      this.row.addItems(this.currentItems);this.row.forceLayout();
    });
    for(let index=0;index<UI.maxTargets;index++) {
      const target=this.makeTarget(this.dock,'Primary '+index,UI.buttonWidth,UI.buttonHeight,()=>{
        const action=this.actions[index];if(action&&action.enabled!==false)action.run();
      },()=>{const action=this.actions[index];return action&&action.enabled!==false?(action.identity||action.id):null;});
      const item=target.root.createComponent(FlexItem.getTypeName()) as FlexItem;
      item.overrideWidth=UI.buttonWidth;item.overrideHeight=UI.buttonHeight;item.flexGrow=0;item.flexShrink=0;
      target.item=item;target.root.enabled=false;this.slots.push(target);
    }
  }

  public setActions(actions:SpatialAction[]) {
    assertTargetBudget(actions.length,this.targetCount());
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
      this.select(slot,Boolean(action.selected));
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
    if(!target){
      target=this.spatialTargets[key]=this.makeTarget(this.annotations,key,width,height,()=>this.spatialActions[key]?.(),()=>this.spatialIdentities[key]||null);
      target.root.enabled=false;
    }
    target.root.name=key;target.text.text=label;return target.root;
  }

  public setTargetLabel(key:string,label:string){const target=this.spatialTargets[key];if(target)target.text.text=label;}
  public setTargetColor(key:string,color:vec4){const target=this.spatialTargets[key];if(target)target.text.textFill.color=color;}
  public setTargetEnabled(key:string,enabled:boolean){const target=this.spatialTargets[key];if(target){if(!enabled)target.press.cancel();if(enabled)assertTargetBudget(this.actions.length,this.targetCount()+(target.root.enabled?0:1));target.root.enabled=enabled;}}
  public setTargetSelected(key:string,selected:boolean){const target=this.spatialTargets[key];if(target)this.select(target,selected);}
  public visibleTargetCount(){return this.actions.length+this.targetCount();}
  public target(key:string){return this.spatialTargets[key]?.root||null;}
  public targetHovered(key:string){return this.spatialTargets[key]?.hovered||false;}
  public dockHovered(){return this.slots.some(slot=>slot.hovered);}
  public targetCount(){return Object.keys(this.spatialTargets).filter(k=>this.spatialTargets[k].root.enabled).length;}

  public tag(key:string,width:number=UI.tagWidth,height:number=UI.tagHeight):SpatialTag {
    if(this.tags[key])return this.tags[key];
    const root=this.node(key,this.annotations);root.createComponent('Component.Canvas');
    // A noninteractive UIKit shape: annotation plates must not intercept furniture pinches.
    const plate=root.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle;
    plate.size=new vec2(width,height);plate.initialize();plate.gradient=false;
    plate.backgroundColor=new vec4(.055,.075,.07,.90);
    const text=this.text(root,'',width-1,height-.4,'caption');
    text.sceneObject.getTransform().setLocalPosition(new vec3(0,0,.65));
    const leaderRoot=this.node(key+' leader',this.annotations);
    const leaderPlate=leaderRoot.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle;
    leaderPlate.size=new vec2(UI.leaderWidthCm,UI.leaderCm);leaderPlate.initialize();leaderPlate.gradient=false;
    const tag:SpatialTag={root,text,visible:false,detail:false,anchor:null,offset:vec3.zero(),expires:0,hovered:false,opacity:1,leader:{lengthCm:UI.leaderCm},plate,leaderRoot,leaderPlate,fade:0,color:LIGHT,halfHeight:height/2,width,height};
    root.enabled=false;leaderRoot.enabled=false;
    this.tags[key]=tag;return tag;
  }

  public writeTag(key:string,text:string,color:vec4=LIGHT){const tag=this.tag(key);tag.text.text=text;tag.color=color;tag.text.textFill.color=color;return tag;}
  public hideTags(immediate=false,keep?:string){for(const [key,tag] of Object.entries(this.tags)){if(key===keep)continue;tag.visible=false;if(immediate){tag.fade=0;tag.root.enabled=false;tag.leaderRoot.enabled=false;}}}
  public hideSpatialTargets(){for(const key of Object.keys(this.spatialTargets))this.setTargetEnabled(key,false);}

  /** Keep label plates off the actual projected objects and active controls. No type resizing. */
  public arrangeTags(camera:vec3,project:(point:vec3)=>vec2,protectedGeometry:vec3[][]) {
    const protectedBoxes:AnnotationBox[]=protectedGeometry.map(points=>annotationBounds(points.map(project))).filter((box):box is AnnotationBox=>box!==null);
    for(const target of [...this.slots,...Object.values(this.spatialTargets)])if(target.root.enabled){
      const transform=target.root.getTransform().getWorldTransform(),points:vec3[]=[];
      for(const x of [-1,1])for(const y of [-1,1])points.push(transform.multiplyPoint(new vec3(x*(target.width/2+.3),y*(target.height/2+.3),0)));
      const box=annotationBounds(points.map(project));if(box)protectedBoxes.push(box);
    }
    const boxAt=(tag:SpatialTag,at:vec3)=>{
      const look=camera.sub(at);look.y=0;if(look.lengthSquared<.001)return null;
      const facing=look.normalize(),right=new vec3(facing.z,0,-facing.x).uniformScale(tag.width/2),up=new vec3(0,tag.height/2,0);
      return annotationBounds([at.add(right).add(up),at.sub(right).add(up),at.add(right).sub(up),at.sub(right).sub(up)].map(project));
    };
    const occupied:AnnotationBox[]=[];
    for(const tag of Object.values(this.tags))if(tag.visible&&!tag.layout){
      const point=tag.anchor?tag.anchor.getTransform().getWorldTransform().multiplyPoint(tag.offset):tag.root.getTransform().getWorldPosition(),box=boxAt(tag,point);if(box)occupied.push(box);
    }
    const tags=Object.values(this.tags).filter(tag=>tag.visible&&tag.layout).sort((a,b)=>a.layout!.priority-b.layout!.priority);
    for(const tag of tags){
      const layout=tag.layout!,candidates=layout.candidates.map(point=>({box:boxAt(tag,point),cost:point.distance(layout.anchor)}));
      const index=chooseAnnotation(candidates,protectedBoxes,occupied,tag.layoutSlot??-1,.025,Boolean(layout.required));
      if(index<0){if(!layout.required){tag.visible=false;tag.fade=0;}continue;}
      tag.layoutSlot=index;tag.anchor=null;const point=layout.candidates[index];tag.root.getTransform().setWorldPosition(point);
      if(tag.leader)tag.leader={to:layout.anchor,lengthCm:Math.max(1,point.distance(layout.anchor)-tag.height/2)};
      occupied.push(candidates[index].box!);
    }
  }

  public face(object:SceneObject,cameraPosition:vec3) {
    const position=object.getTransform().getWorldPosition(),direction=cameraPosition.sub(position);
    if(direction.lengthSquared<.0001)return;
    object.getTransform().setWorldRotation(quat.lookAt(direction.normalize(),vec3.up()));
  }

  /** Caller owns the frame loop and visibility policy. No timed expiry here. */
  public updateTags(camera:vec3|null,dt=1/60) {
    for(const key of Object.keys(this.tags)) {
      const tag=this.tags[key];
      tag.fade=fadeOpacity(tag.fade,tag.visible&&Boolean(tag.text.text)?tag.opacity:0,dt);
      tag.root.enabled=tag.fade>0;tag.leaderRoot.enabled=tag.root.enabled&&Boolean(tag.leader);
      if(!tag.root.enabled)continue;
      if(tag.anchor)tag.root.getTransform().setWorldPosition(tag.anchor.getTransform().getWorldTransform().multiplyPoint(tag.offset));
      const position=tag.root.getTransform().getWorldPosition();
      if(camera){
        const direction=camera.sub(position);direction.y=0;
        if(direction.lengthSquared>.0001)tag.root.getTransform().setWorldRotation(quat.lookAt(direction.normalize(),vec3.up()));
      }
      // Keep physical cap height when leaning in; do not shrink labels by distance.
      tag.root.getTransform().setWorldScale(vec3.one());
      tag.plate.opacity=tag.fade;
      tag.text.textFill.color=new vec4(tag.color.x,tag.color.y,tag.color.z,tag.color.w*tag.fade);
      if(tag.leader){
        const length=Math.max(.1,tag.leader.lengthCm??UI.leaderCm);
        const to=tag.leader.to||position.add(new vec3(0,-tag.halfHeight-length,0));
        const direction=to.sub(position),distance=Math.min(length,direction.length);
        if(distance>.001){
          const unit=direction.normalize();
          tag.leaderRoot.getTransform().setWorldPosition(to.sub(unit.uniformScale(distance/2)));
          const normal=camera?camera.sub(to).normalize():vec3.forward();
          tag.leaderRoot.getTransform().setWorldRotation(quat.lookAt(normal,unit));
          tag.leaderRoot.getTransform().setWorldScale(vec3.one());
          tag.leaderPlate.size=new vec2(UI.leaderWidthCm,distance);
          tag.leaderPlate.backgroundColor=new vec4(1,1,1,.78*tag.fade);
        }else tag.leaderRoot.enabled=false;
      }
    }
  }

  private select(target:Target,selected:boolean){
    // Controlled selection: each segment remains a separate Button/press identity.
    const visual=target.button.visual as RoundedRectangleVisual;
    visual.baseDefaultColor=selected?new vec4(.18,.20,.22,.90):new vec4(.035,.045,.055,.85);
    visual.borderDefaultColor=new vec4(1,1,1,selected?UI.hoverRimOpacity:UI.rimOpacity);
  }

  private makeTarget(parent:SceneObject,name:string,width:number,height:number,run:()=>void,identity:()=>string|null):Target {
    const root=this.node(name,parent);
    const button=root.createComponent(Button.getTypeName()) as Button;
    button.size=new vec3(width,height,1);button.playAudio=true;
    button.setVariant({theme:'SnapOS2',shape:'Rectangle',style:'PrimaryNeutral'});
    // Public custom-visual pattern from specs-build-ui; one shader border, no
    // overlapping filled plates. RoundedRectangle's CollapsedSquircle shader is unlit.
    const style=(hover=false,pressed=false):RoundedRectangleVisualState=>({
      baseType:'Color',baseColor:new vec4(.035,.045,.055,.85),hasBorder:true,
      borderType:'Color',borderSize:UI.rimCm,borderColor:new vec4(1,1,1,hover?UI.hoverRimOpacity:UI.rimOpacity),
      shouldScale:true,localScale:new vec3(hover?UI.hoverScale:1,hover?UI.hoverScale:1,1),
      shouldPosition:true,localPosition:new vec3(0,0,pressed?-UI.pressCm:0)
    });
    // Animate a child so hover/press never move the persistent collider or Flex item.
    const visualRoot=this.node('Button face',root);
    button.visual=new RoundedRectangleVisual({sceneObject:visualRoot,transparent:true,
      depthSettings:{depthTest:true,depthWrite:true},style:{default:style(),hovered:style(true),triggered:style(true,true),inactive:style()}});
    button.initialize();button.colliderFitElement=false;
    button.colliderSize=new vec3(width,height+.5,1.5);
    const text=this.text(visualRoot,name,width-1,height-1,'button');
    text.sceneObject.getTransform().setLocalPosition(new vec3(0,0,.7));
    const target={root,button,text,hovered:false,press:new PressIdentity(),width,height};
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
    text.horizontalOverflow=HorizontalOverflow.Shrink;text.verticalOverflow=VerticalOverflow.Shrink;
    text.horizontalAlignment=HorizontalAlignment.Center;text.verticalAlignment=VerticalAlignment.Center;
    text.layoutRect=Rect.create(-width/2,width/2,-height/2,height/2);
    return text;
  }
  private node(name:string,parent:SceneObject){const object=global.scene.createSceneObject(name);object.setParent(parent);return object;}
}
