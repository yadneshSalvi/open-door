import { HandMode,HandAnimationsLibrary,InteractionHintController } from '3D Hints.lspkg/Scripts/InteractionHintController';

/** Official hint animation; it illustrates a gesture and never drives an interaction. */
export class OpenDoorHints {
  private root:SceneObject;
  private controller:InteractionHintController;
  private player!:AnimationPlayer;
  private clipName:string|null=null;
  private visibleLastUpdate=false;
  public dismissed=false;
  constructor(parent:SceneObject,private gesture:'move'|'pinch'='move'){
    const prefab=requireAsset('3D Hints.lspkg/Specs3DHandHints__PLACE_IN_SCENE.prefab') as ObjectPrefab;
    this.root=prefab.instantiate(parent);
    const find=(node:SceneObject):InteractionHintController|null=>{
      if(node.name==='GUIDE_ReadAndDisable')node.enabled=false;
      if(node.name==='HandHints')this.player=node.getComponent('AnimationPlayer') as AnimationPlayer;
      const script=node.getComponent(InteractionHintController.getTypeName()) as InteractionHintController;
      let found=script||null;for(let n=0;n<node.getChildrenCount();n++)found=find(node.getChild(n))||found;
      return found;
    };
    this.controller=find(this.root)!;
    if(!this.controller||!this.player)throw new Error('Official 3D Hints controller/player was not found');
    if(this.controller)this.controller.autoPlay=false;
    this.root.enabled=false;
  }
  public update(visible:boolean,position:vec3,yaw:number){
    if(this.dismissed||!visible){this.hide();return;}
    this.root.enabled=true;
    this.root.getTransform().setWorldPosition(position);
    this.root.getTransform().setWorldRotation(quat.angleAxis(yaw,vec3.up()).multiply(quat.angleAxis(-Math.PI/3,vec3.right())));
    this.root.getTransform().setWorldScale(new vec3(.28,.28,.28));
    // One animation per encounter. Leaving the relevant object does not mark
    // the gesture learned; only the caller's successful action dismisses it.
    if(!this.visibleLastUpdate){
      const animation=this.gesture==='move'?HandAnimationsLibrary.Right.PinchMoveX:HandAnimationsLibrary.Right.PinchNear;
      this.clipName=animation;
      this.controller.playHintAnimation(HandMode.Right,animation,1,1);
      // The package's exposed completion event fades its mesh after one loop.
      // Retain the official one-shot end pose until success/relevance exit,
      // using public player APIs without changing package code or materials.
      this.player.getClip(this.clipName).playbackMode=PlaybackMode.Single;
      this.player.onEvent.remove(this.controller.animationPlayerClipEndEvent);
    }
    this.visibleLastUpdate=true;
  }
  public dismiss(){this.dismissed=true;this.hide();}
  public snapshot(){return {active:this.root.enabled,dismissed:this.dismissed,holding:Boolean(this.clipName)&&!this.player.getClipIsPlaying(this.clipName!),gesture:this.gesture};}
  private hide(){
    this.root.enabled=false;this.visibleLastUpdate=false;
    if(this.clipName){this.player.stopClip(this.clipName);this.player.setClipEnabled(this.clipName,false);this.clipName=null;}
  }
}
