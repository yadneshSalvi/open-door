import { Button } from 'SpectaclesUIKit.lspkg/Scripts/Components/Button/Button';
import { FlexLayout } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout';
import { FlexItem } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem';
import { FlexAlign, FlexDirection, FlexJustify } from 'SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes';
import { RoundedRectangle } from 'SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle';
import { RoundedRectangleVisual, RoundedRectangleVisualState } from 'SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual';
import { SPATIAL_UI as UI, dockWidth, assertTargetBudget, fadeOpacity } from './SpatialUIContract';
import { PressIdentity } from './SpatialPresentation';
import { AnnotationBox, AnnotationPlane, annotationBounds, annotationFrame, annotationLeaderSafe, annotationsOverlap, chooseAnnotation, leaderGeometry, ScreenSegment } from './SpatialAnnotationLayout';

export type SpatialAction={id:string;identity?:string;label:string;run:()=>void;enabled?:boolean;selected?:boolean};
export type SpatialTag={root:SceneObject;text:Text;visible:boolean;detail:boolean;anchor:SceneObject|null;offset:vec3;expires:number;hovered:boolean;opacity:number;leader?:{lengthCm?:number;to?:vec3};plate:RoundedRectangle;leaderRoot:SceneObject;leaderPlate:RoundedRectangle;fade:number;color:vec4;halfHeight:number;width:number;height:number;layout?:{anchor:vec3;candidates:vec3[];priority:number;required?:boolean;anchors?:vec3[]};layoutSlot?:number;resolvedPosition?:vec3;resolvedLeader?:{to:vec3;lengthCm:number};angularSize?:boolean;floorAligned?:boolean;floorY?:number;leaderDot?:SceneObject;lastStyle?:string;lastLeaderStyle?:string;lastScale?:number};
type Target={root:SceneObject;button:Button;text:Text;item?:FlexItem;hovered:boolean;press:PressIdentity;width:number;height:number;selected?:boolean;disabled?:boolean;dimmed?:boolean;color?:vec4;styled?:string;anchor?:vec3|null;leaderRoot?:SceneObject;leaderPlate?:RoundedRectangle;leaderDot?:SceneObject;opacity?:number;visualReady?:boolean};

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
  private layoutSnapshot:unknown=null;
  private viewFrame:AnnotationPlane|undefined;
  private dockWanted=true;
  private dockOpacity=1;
  private dockVertical=false;
  private deferredEmpty=false;
  public setViewFrame(right:vec3,up:vec3,normal:vec3){this.viewFrame={right:{x:right.x,y:right.y,z:right.z},up:{x:up.x,y:up.y,z:up.z},normal:{x:normal.x,y:normal.y,z:normal.z}};}

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
        const action=this.actions[index];if(this.dockWanted&&action&&action.enabled!==false)action.run();
      },()=>{const action=this.actions[index];return this.dockWanted&&this.dockOpacity>.99&&action&&action.enabled!==false?(action.identity||action.id):null;});
      const item=target.root.createComponent(FlexItem.getTypeName()) as FlexItem;
      item.overrideWidth=UI.buttonWidth;item.overrideHeight=UI.buttonHeight;item.flexGrow=0;item.flexShrink=0;
      target.item=item;target.root.enabled=false;this.slots.push(target);
    }
  }

  public setActions(actions:SpatialAction[]) {
    if(!this.dockWanted&&!actions.length&&this.dockOpacity>0){this.deferredEmpty=true;return;}
    this.deferredEmpty=false;
    assertTargetBudget(actions.length,this.targetCount());
    this.slots.forEach((slot,index)=>{
      const previous=this.actions[index],next=actions[index];
      if(!next||next.enabled===false||(previous?.identity||previous?.id)!==(next.identity||next.id))slot.press.cancel();
    });
    const layoutChanged=actions.length!==this.actions.length||actions.some((action,index)=>action.id!==this.actions[index]?.id);
    this.actions=actions;
    if(layoutChanged){this.row.removeItems(this.currentItems);this.currentItems=[];}
    this.slots.forEach((slot,index)=>{
      const action=actions[index];slot.root.enabled=Boolean(action);
      if(!action)return;
      slot.root.name=action.label;if(slot.text.text!==action.label)slot.text.text=action.label;
      slot.dimmed=actions.some(a=>a.selected)&&!action.selected&&(action.id==='before'||action.id==='after');
      slot.disabled=action.enabled===false;slot.button.inactive=slot.disabled||!this.dockWanted;
      this.select(slot,Boolean(action.selected));
      if(layoutChanged)this.currentItems.push(slot.item!);
    });
    if(layoutChanged){this.row.addItems(this.currentItems);if(this.rowReady)this.row.forceLayout();}
  }

  /** Distance bands fade; an unsafe projected position is hidden immediately. */
  public setDockVisible(visible:boolean,immediate=false){
    this.dockWanted=visible;
    if(!visible)for(const slot of this.slots){slot.press.cancel();slot.button.inactive=true;}
    else for(const slot of this.slots)slot.button.inactive=Boolean(slot.disabled);
    if(immediate)this.dockOpacity=visible?1:0;
    this.dock.enabled=this.dockOpacity>0||visible;
  }
  public dockVisibility(){return {wanted:this.dockWanted,opacity:this.dockOpacity,visible:this.dock.enabled,vertical:this.dockVertical};}
  public setDockVertical(vertical:boolean){
    if(this.dockVertical===vertical)return;
    this.dockVertical=vertical;this.row.direction=vertical?FlexDirection.Column:FlexDirection.Row;
    this.row.width=vertical?UI.buttonWidth:dockWidth(UI.maxTargets);
    this.row.height=vertical?UI.maxTargets*UI.buttonHeight+(UI.maxTargets-1)*(UI.gap+.5):7;
    this.row.rowGap=UI.gap+.5;if(this.rowReady)this.row.forceLayout();
  }
  private updateDockFade(dt:number){
    this.dockOpacity=fadeOpacity(this.dockOpacity,this.dockWanted?1:0,dt);
    this.dock.enabled=this.dockOpacity>0;
    for(const slot of this.slots){slot.opacity=this.dockOpacity;this.styleTarget(slot);}
    if(!this.dockWanted&&this.dockOpacity===0&&this.deferredEmpty)this.setActions([]);
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
    target.root.name=key;if(target.text.text!==label)target.text.text=label;return target.root;
  }

  public setTargetLabel(key:string,label:string){const target=this.spatialTargets[key];if(target&&target.text.text!==label)target.text.text=label;}
  public setTargetColor(key:string,color:vec4){const target=this.spatialTargets[key];if(target){target.color=color;this.styleTarget(target);}}
  public setTargetEnabled(key:string,enabled:boolean){const target=this.spatialTargets[key];if(target){if(!enabled){target.press.cancel();if(target.leaderRoot)target.leaderRoot.enabled=false;if(target.leaderDot)target.leaderDot.enabled=false;}if(enabled)assertTargetBudget(this.actions.length,this.targetCount()+(target.root.enabled?0:1));target.root.enabled=enabled;}}
  public setTargetAnchor(key:string,anchor:vec3|null){const target=this.spatialTargets[key];if(target)target.anchor=anchor;}
  public controlBoxes(project:(point:vec3)=>vec2,includeSpatial=true):AnnotationBox[]{
    const boxes:AnnotationBox[]=[];
    for(const target of [...(this.dock.enabled?this.slots:[]),...(includeSpatial?Object.values(this.spatialTargets):[])])if(target.root.enabled){
      const transform=target.root.getTransform().getWorldTransform(),points:vec3[]=[];
      for(const x of [-1,1])for(const y of [-1,1])points.push(transform.multiplyPoint(new vec3(x*(target.width/2+.3),y*(target.height/2+.3),0)));
      const box=annotationBounds(points.map(project));if(box)boxes.push(box);
    }
    return boxes;
  }
  private updateTargetLeaders(camera:vec3|null){
    for(const [name,target] of Object.entries(this.spatialTargets)){
      const on=Boolean(target.root.enabled&&target.anchor&&camera);
      if(!on){if(target.leaderRoot)target.leaderRoot.enabled=false;if(target.leaderDot)target.leaderDot.enabled=false;continue;}
      if(!target.leaderRoot){
        target.leaderRoot=this.node(name+' leader',this.annotations);const plate=target.leaderRoot.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle;
        plate.initialize();plate.gradient=false;plate.backgroundColor=new vec4(.82,.86,.87,.78);target.leaderPlate=plate;
        target.leaderDot=this.node(name+' anchor dot',this.annotations);const dot=target.leaderDot.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle;
        dot.initialize();dot.gradient=false;dot.size=new vec2(.3,.3);dot.backgroundColor=new vec4(.82,.86,.87,.78);
      }
      const at=target.root.getTransform().getWorldPosition(),to=target.anchor!,delta=to.sub(at),length=Math.max(0,delta.length-target.height/2-.3);
      target.leaderRoot.enabled=length>.01;target.leaderDot!.enabled=true;target.leaderDot!.getTransform().setWorldPosition(to);this.face(target.leaderDot!,camera!);
      if(length>.01){const g=leaderGeometry(at,to,camera!,target.height/2+.3);if(g){target.leaderRoot.getTransform().setWorldPosition(new vec3(g.center.x,g.center.y,g.center.z));target.leaderRoot.getTransform().setWorldRotation(quat.lookAt(new vec3(g.normal.x,g.normal.y,g.normal.z),new vec3(g.up.x,g.up.y,g.up.z)));target.leaderPlate!.size=new vec2(UI.leaderWidthCm,g.length);}}
    }
  }
  public setTargetSelected(key:string,selected:boolean){const target=this.spatialTargets[key];if(target)this.select(target,selected);}
  public visibleTargetCount(){return (this.dock.enabled?this.actions.length:0)+this.targetCount();}
  public target(key:string){return this.spatialTargets[key]?.root||null;}
  public targetHovered(key:string){return this.spatialTargets[key]?.hovered||false;}
  public dockHovered(){return this.slots.some(slot=>slot.root.enabled&&slot.hovered);}
  public anyTargetHovered(){return this.dockHovered()||Object.values(this.spatialTargets).some(target=>target.root.enabled&&target.hovered);}
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
    const leaderDot=this.node(key+' anchor dot',this.annotations),dot=leaderDot.createComponent(RoundedRectangle.getTypeName()) as RoundedRectangle;
    dot.size=new vec2(.3,.3);dot.initialize();dot.gradient=false;dot.backgroundColor=new vec4(.82,.86,.87,.78);leaderDot.enabled=false;
    const tag:SpatialTag={leaderDot,root,text,visible:false,detail:false,anchor:null,offset:vec3.zero(),expires:0,hovered:false,opacity:1,leader:{lengthCm:UI.leaderCm},plate,leaderRoot,leaderPlate,fade:0,color:LIGHT,halfHeight:height/2,width,height};
    root.enabled=false;leaderRoot.enabled=false;
    this.tags[key]=tag;return tag;
  }

  public setTagText(tag:SpatialTag,text:string){if(tag.text.text!==text)tag.text.text=text;}
  public writeTag(key:string,text:string,color:vec4=LIGHT){const tag=this.tag(key);this.setTagText(tag,text);tag.color=color;return tag;}
  public getLayoutSnapshot(){return this.layoutSnapshot;}
  /** Eligibility is renewed each frame; cached rejection must be renewed too. */
  public retainLayoutResult(){
    const unplaced=(this.layoutSnapshot as {unplaced?:string[]}|null)?.unplaced||[];
    for(const name of unplaced){const tag=this.tags[name];if(tag){tag.visible=false;tag.fade=0;tag.root.enabled=false;tag.leaderRoot.enabled=false;if(tag.leaderDot)tag.leaderDot.enabled=false;}}
  }
  public hideTags(immediate=false,keep?:string){for(const [key,tag] of Object.entries(this.tags)){if(key===keep)continue;tag.visible=false;if(immediate){tag.fade=0;tag.root.enabled=false;tag.leaderRoot.enabled=false;if(tag.leaderDot)tag.leaderDot.enabled=false;}}}
  public hideSpatialTargets(){for(const key of Object.keys(this.spatialTargets))this.setTargetEnabled(key,false);}

  /** Keep label plates off the actual projected objects and active controls. No type resizing. */
  public arrangeTags(camera:vec3,project:(point:vec3)=>vec2,protectedGeometry:vec3[][],names:string[]=[],occluders:{name:string;points:vec3[]}[]=[]) {
    const subjects=protectedGeometry.map((points,index)=>({name:names[index]||'subject-'+index,box:annotationBounds(points.map(project))}));
    const handBoxes=occluders.map(item=>({name:item.name,box:annotationBounds(item.points.map(project),.02)}));
    const objectBoxes=subjects.map(s=>s.box).filter((box):box is AnnotationBox=>box!==null),protectedBoxes=[...objectBoxes,...handBoxes.map(item=>item.box).filter((box):box is AnnotationBox=>box!==null)];
    const controls:{name:string;box:AnnotationBox|null}[]=[];
    for(const target of [...(this.dock.enabled?this.slots:[]),...Object.values(this.spatialTargets)])if(target.root.enabled){
      const transform=target.root.getTransform().getWorldTransform(),points:vec3[]=[];
      for(const x of [-1,1])for(const y of [-1,1])points.push(transform.multiplyPoint(new vec3(x*(target.width/2+.3),y*(target.height/2+.3),0)));
      const box=annotationBounds(points.map(project));controls.push({name:target.root.name,box});if(box)protectedBoxes.push(box);
    }
    const boxAt=(tag:SpatialTag,at:vec3)=>{
      const frame=annotationFrame(camera,at,tag.floorAligned,this.viewFrame);if(!frame)return null;
      const scale=this.tagScale(tag,camera,at),right=new vec3(frame.right.x,frame.right.y,frame.right.z).uniformScale(tag.width/2*scale),up=new vec3(frame.up.x,frame.up.y,frame.up.z).uniformScale(tag.height/2*scale);
      const corners=[at.add(right).add(up),at.sub(right).add(up),at.add(right).sub(up),at.sub(right).sub(up)];
      if(tag.floorY!==undefined&&corners.some(point=>point.y<tag.floorY!))return null;
      return annotationBounds(corners.map(project));
    };
    const occupied:AnnotationBox[]=[],leaders:ScreenSegment[]=[],plates:unknown[]=[],unplaced:string[]=[];
    for(const target of Object.values(this.spatialTargets))if(target.root.enabled&&target.anchor){const from=project(target.root.getTransform().getWorldPosition()),to=project(target.anchor);leaders.push({from:{x:from.x,y:from.y},to:{x:to.x,y:to.y}});}
    const tags=Object.entries(this.tags).filter(([,tag])=>tag.visible).sort(([,a],[,b])=>(a.layout?.priority??3)-(b.layout?.priority??3));
    for(const [name,tag] of tags){
      const fixed=tag.anchor?tag.anchor.getTransform().getWorldTransform().multiplyPoint(tag.offset):tag.root.getTransform().getWorldPosition();
      const layout=tag.layout||{anchor:fixed,candidates:[fixed],priority:3,required:true};
      const candidate=(point:vec3,index:number)=>{
        const anchor=layout.anchors?.[index]||layout.anchor,to=project(anchor),from=project(point),segment={from:{x:from.x,y:from.y},to:{x:to.x,y:to.y}};
        const unsafeLeader=Boolean(tag.leader)&&!annotationLeaderSafe(segment,objectBoxes,controls.map(control=>control.box).filter((box):box is AnnotationBox=>box!==null),occupied,leaders);
        return {box:unsafeLeader?null:boxAt(tag,point),cost:point.distance(anchor),segment,anchor};
      };
      const previous=tag.layoutSlot??-1,held=previous>=0&&layout.candidates[previous]?candidate(layout.candidates[previous],previous):null;
      const heldSafe=held&&chooseAnnotation([held],protectedBoxes,occupied,-1,.015)===0;
      const candidates=heldSafe?[]:layout.candidates.map(candidate);
      const index=heldSafe?previous:chooseAnnotation(candidates,protectedBoxes,occupied,-1,.015);
      if(index<0){tag.visible=false;tag.fade=0;tag.resolvedPosition=undefined;tag.resolvedLeader=undefined;unplaced.push(name);continue;}
      const selected=heldSafe?held!:candidates[index];
      tag.layoutSlot=index;tag.anchor=null;const point=layout.candidates[index];tag.resolvedPosition=point;tag.root.getTransform().setWorldPosition(point);
      if(tag.leader){const anchor=selected.anchor;tag.resolvedLeader={to:anchor,lengthCm:Math.max(0,point.distance(anchor)-tag.height/2*this.tagScale(tag,camera,point))};}
      occupied.push(selected.box!);if(tag.leader)leaders.push(selected.segment);
      plates.push({name,box:selected.box,offsetCm:point.distance(selected.anchor),required:Boolean(layout.required),leader:tag.leader?selected.segment:null});
    }
    this.layoutSnapshot={camera:{x:camera.x,y:camera.y,z:camera.z},subjects,occluders:handBoxes,controls,plates,leaders,unplaced,
      controlOverlaps:controls.flatMap(control=>control.box?subjects.filter(subject=>subject.box&&annotationsOverlap(control.box!,subject.box)).map(subject=>({control:control.name,subject:subject.name})):[])};
  }

  public face(object:SceneObject,cameraPosition:vec3) {
    const position=object.getTransform().getWorldPosition(),direction=cameraPosition.sub(position);
    if(direction.lengthSquared<.0001)return;
    object.getTransform().setWorldRotation(quat.lookAt(direction.normalize(),vec3.up()));
  }

  /** Caller owns the frame loop and visibility policy. No timed expiry here. */
  public updateTags(camera:vec3|null,dt=1/60) {
    this.updateDockFade(dt);
    this.updateTargetLeaders(camera);
    for(const key of Object.keys(this.tags)) {
      const tag=this.tags[key];
      tag.fade=fadeOpacity(tag.fade,tag.visible&&Boolean(tag.text.text)?tag.opacity:0,dt);
      tag.root.enabled=tag.fade>0;tag.leaderRoot.enabled=tag.root.enabled&&Boolean(tag.leader);if(tag.leaderDot)tag.leaderDot.enabled=tag.leaderRoot.enabled;
      if(!tag.root.enabled)continue;
      if(tag.resolvedPosition)tag.root.getTransform().setWorldPosition(tag.resolvedPosition);
      else if(tag.anchor)tag.root.getTransform().setWorldPosition(tag.anchor.getTransform().getWorldTransform().multiplyPoint(tag.offset));
      const position=tag.root.getTransform().getWorldPosition();
      if(camera){
        const direction=camera.sub(position);if(tag.floorAligned)direction.y=0;
        if(direction.lengthSquared>.0001){
          if(tag.floorAligned)tag.root.getTransform().setWorldRotation(quat.angleAxis(Math.atan2(direction.x,direction.z),vec3.up()).multiply(quat.angleAxis(-Math.PI/2,vec3.right())));
          else {const frame=annotationFrame(camera,position,false,this.viewFrame)!;tag.root.getTransform().setWorldRotation(quat.lookAt(new vec3(frame.normal.x,frame.normal.y,frame.normal.z),new vec3(frame.up.x,frame.up.y,frame.up.z)));}
        }
      }
      // Keep physical cap height when leaning in; do not shrink labels by distance.
      const scale=this.tagScale(tag,camera,position);if(tag.lastScale!==scale){tag.root.getTransform().setWorldScale(vec3.one().uniformScale(scale));tag.lastScale=scale;}
      const style=[tag.color.x,tag.color.y,tag.color.z,tag.color.w,tag.fade].join('|');
      if(style!==tag.lastStyle){tag.plate.opacity=tag.fade;tag.text.textFill.color=new vec4(tag.color.x,tag.color.y,tag.color.z,tag.color.w*tag.fade);tag.lastStyle=style;}
      if(tag.leader){
        const resolved=tag.resolvedLeader||tag.leader,length=Math.max(.1,resolved.lengthCm??UI.leaderCm);
        const to=resolved.to||position.add(new vec3(0,-tag.halfHeight-length,0));
        if(tag.leaderDot){tag.leaderDot.getTransform().setWorldPosition(to);if(camera)this.face(tag.leaderDot,camera);}
        const geometry=leaderGeometry(position,to,camera||position.add(vec3.forward()),Math.max(0,position.distance(to)-length));
        if(geometry){
          tag.leaderRoot.getTransform().setWorldPosition(new vec3(geometry.center.x,geometry.center.y,geometry.center.z));
          tag.leaderRoot.getTransform().setWorldRotation(quat.lookAt(new vec3(geometry.normal.x,geometry.normal.y,geometry.normal.z),new vec3(geometry.up.x,geometry.up.y,geometry.up.z)));
          tag.leaderRoot.getTransform().setWorldScale(vec3.one());tag.leaderPlate.size=new vec2(UI.leaderWidthCm,geometry.length);
          if(style!==tag.lastLeaderStyle){tag.leaderPlate.backgroundColor=new vec4(.82,.86,.87,.78*tag.fade);tag.lastLeaderStyle=style;}
        }else tag.leaderRoot.enabled=false;
      }
    }
  }

  private tagScale(tag:SpatialTag,camera:vec3|null,at:vec3){
    if(!tag.angularSize||!camera)return 1;
    const capCm=UI.captionText/UI.textUnitsPerEm*UI.estimatedCapRatio;
    return Math.max(1,camera.distance(at)*Math.tan(.6*Math.PI/180)/capCm);
  }
  private select(target:Target,selected:boolean){target.selected=selected;this.styleTarget(target);}
  private styleTarget(target:Target,force=false){
    const color=target.color||LIGHT,opacity=target.opacity??1,signature=[Boolean(target.selected),Boolean(target.disabled),Boolean(target.dimmed),color.x,color.y,color.z,color.w,opacity].join('|');
    if(!force&&target.styled===signature)return;target.styled=signature;
    const visual=target.button.visual as RoundedRectangleVisual;
    visual.baseDefaultColor=target.selected?new vec4(.12,.14,.16,.90):new vec4(.035,.045,.055,.85);
    visual.borderDefaultColor=new vec4(1,1,1,target.selected?1:target.dimmed?.42:UI.rimOpacity);
    visual.defaultBorderSize=target.selected?UI.selectedRimCm:UI.rimCm;
    visual.hoveredBorderSize=target.selected?UI.selectedRimCm:UI.hoverRimCm;
    if(target.visualReady)visual.opacity=opacity;
    target.text.textFill.color=new vec4(color.x,color.y,color.z,(target.disabled?UI.disabledLabelOpacity:target.selected?1:target.dimmed?.65:color.w)*opacity);
  }

  private makeTarget(parent:SceneObject,name:string,width:number,height:number,run:()=>void,identity:()=>string|null):Target {
    const root=this.node(name,parent);
    const button=root.createComponent(Button.getTypeName()) as Button;
    button.size=new vec3(width,height,1);button.playAudio=true;
    button.setVariant({theme:'SnapOS2',shape:'Rectangle',style:'PrimaryNeutral'});
    // Public custom-visual pattern from specs-build-ui; one shader border, no
    // overlapping filled plates. RoundedRectangle's CollapsedSquircle shader is unlit.
    const style=(hover=false,pressed=false,inactive=false):RoundedRectangleVisualState=>({
      baseType:'Color',baseColor:new vec4(hover?.0385:.035,hover?.0495:.045,hover?.0605:.055,.85),hasBorder:true,
      borderType:'Color',borderSize:hover?UI.hoverRimCm:UI.rimCm,borderColor:new vec4(1,1,1,inactive?UI.disabledRimOpacity:hover?UI.hoverRimOpacity:UI.rimOpacity),
      shouldScale:true,localScale:new vec3(hover?UI.hoverScale:1,hover?UI.hoverScale:1,1),
      shouldPosition:true,localPosition:new vec3(0,0,pressed?-UI.pressCm:0)
    });
    // Animate a child so hover/press never move the persistent collider or Flex item.
    const visualRoot=this.node('Button face',root);
    button.visual=new RoundedRectangleVisual({sceneObject:visualRoot,transparent:true,
      depthSettings:{depthTest:true,depthWrite:true},style:{default:style(),hovered:style(true),triggered:style(true,true),inactive:style(false,false,true)}});
    button.initialize();button.colliderFitElement=false;
    button.colliderSize=new vec3(width,height+.5,1.5);
    const text=this.text(visualRoot,name,width-1,height-1,'button');
    text.sceneObject.getTransform().setLocalPosition(new vec3(0,0,.7));
    const target:Target={root,button,text,hovered:false,press:new PressIdentity(),width,height};
    button.visual.onInitialized.add(()=>{target.visualReady=true;this.styleTarget(target,true);});
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
