/** Display-only calculations. Metres remain the engine's unit; these outputs are centimetres. */
export type Point3 = { x:number; y:number; z:number };
export type ChairPart = { name:string; shape:'box'|'wheel'; position:Point3; size:Point3 };
export type DisplayBounds = {min:Point3;max:Point3};

/** A context control must not sit behind another miniature piece.
 * Only the control moves; bounds are display-space centimetres, not solver input.
 */
export function visibleUndoPosition(top:Point3,camera:Point3,preferred:Point3,bounds:DisplayBounds[]):Point3 {
  const dx=camera.x-top.x,dz=camera.z-top.z,length=Math.hypot(dx,dz);
  const forward=length>.001?{x:dx/length,z:dz/length}:{x:0,z:1};
  const clear=(at:Point3)=>{
    const eye={x:camera.x-at.x,y:camera.y-at.y,z:camera.z-at.z},horizontal=Math.hypot(eye.x,eye.z),total=Math.hypot(horizontal,eye.y);
    if(total<.001)return false;
    const right=horizontal>.001?{x:eye.z/horizontal,y:0,z:-eye.x/horizontal}:{x:1,y:0,z:0};
    const up={x:eye.y*right.z/total,y:(eye.z*right.x-eye.x*right.z)/total,z:-eye.y*right.x/total};
    for(const x of [-4.75,0,4.75])for(const y of [-3.25,0,3.25]){
      const point={x:at.x+x*right.x+y*up.x,y:at.y+y*up.y,z:at.z+x*right.z+y*up.z};
      for(const box of bounds){
        let enter=0,leave=1;
        for(const axis of ['x','y','z'] as const){
          const delta=camera[axis]-point[axis];
          if(Math.abs(delta)<1e-8){if(point[axis]<box.min[axis]||point[axis]>box.max[axis]){enter=2;break;}}
          else{const a=(box.min[axis]-point[axis])/delta,b=(box.max[axis]-point[axis])/delta;enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));}
        }
        if(enter<=leave&&leave>=0&&enter<.999)return false;
      }
    }
    return true;
  };
  if(clear(preferred))return {x:preferred.x,y:preferred.y,z:preferred.z};
  for(const lift of [5,9,13])for(const distance of [12,16,20]){
    const candidate={x:top.x+forward.x*distance,y:top.y+lift,z:top.z+forward.z*distance};
    if(clear(candidate))return candidate;
  }
  return {x:preferred.x,y:preferred.y,z:preferred.z};
}

/** The full-size display has no occluded underside in Preview, so use a thin surface. */
export function floorSection(miniature:boolean):{centerYcm:number;thicknessCm:number} {
  return miniature?{centerYcm:-3,thicknessCm:6}:{centerYcm:0,thicknessCm:.1};
}

/** A schematic wheelchair, not a fitted device model. Every solid stays inside the supplied envelope. */
export function wheelchairParts(profile:{width:number;length:number;height:number}):ChairPart[] {
  const l=profile.length*100,w=profile.width*100,h=profile.height*100;
  const radius=Math.min(l*.25,h*.25),wheelX=-l*.18,wheelY=radius;
  const parts:ChairPart[]=[];
  const box=(name:string,x:number,y:number,z:number,sx:number,sy:number,sz:number)=>
    parts.push({name,shape:'box',position:{x,y,z},size:{x:sx,y:sy,z:sz}});
  for(const side of [-1,1]) {
    parts.push({name:'Rear wheel',shape:'wheel',position:{x:wheelX,y:wheelY,z:side*w*.43},size:{x:radius*2,y:radius*2,z:w*.08}});
    const caster=Math.min(l*.055,h*.055);
    parts.push({name:'Front caster',shape:'wheel',position:{x:l*.34,y:caster,z:side*w*.31},size:{x:caster*2,y:caster*2,z:w*.055}});
    box('Armrest',-l*.06,h*.52,side*w*.32,l*.38,h*.035,w*.065);
    box('Frame rail',-l*.025,h*.25,side*w*.27,l*.62,h*.035,w*.035);
  }
  box('Seat',-l*.10,h*.40,0,l*.42,h*.055,w*.60);
  box('Backrest',-l*.30,h*.59,0,l*.05,h*.38,w*.58);
  box('Footplate',l*.37,h*.13,0,l*.20,h*.035,w*.52);
  box('Footplate support',l*.27,h*.25,0,l*.035,h*.22,w*.40);
  return parts;
}

/** A leader ends on the visible backrest, not the unused top of the input envelope. */
export function wheelchairLabelAnchor(profile:{width:number;length:number;height:number}):Point3 {
  const back=wheelchairParts(profile).find(part=>part.name==='Backrest')!;
  return {x:back.position.x,y:back.position.y+back.size.y/2,z:back.position.z};
}

/** The top corners are equally truthful anchors when the middle has no clear label slot. */
export function wheelchairLabelAnchors(profile:{width:number;length:number;height:number}):Point3[] {
  const back=wheelchairParts(profile).find(part=>part.name==='Backrest')!,middle=wheelchairLabelAnchor(profile);
  return [middle,...[-1,1].map(side=>({x:middle.x,y:middle.y,z:middle.z+side*back.size.z/2}))];
}

export function rotateFloor(point:Point3,yaw:number):Point3 {
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return {x:c*point.x+s*point.z,y:point.y,z:-s*point.x+c*point.z};
}

/** Places the journey's start on a measured world-floor anchor, regardless of room dimensions. */
export function fullSizeRoomPosition(room:{width:number;depth:number},start:{x:number;y:number},anchor:Point3,yaw:number):Point3 {
  const offset=rotateFloor({x:(start.x-room.width/2)*100,y:0,z:-(start.y-room.depth/2)*100},yaw);
  return {x:anchor.x-offset.x,y:anchor.y,z:anchor.z-offset.z};
}

export function reserveLabel(reserveM:number,index:number):string {
  if(!Number.isFinite(reserveM)||reserveM<0)return 'Space not checked';
  if(reserveM<.001)return index===0?'Fewest moves':'Very little room';
  // Round downward: a label never claims more than the independently certified reserve.
  return String(Math.floor((reserveM+1e-12)*1000)/10)+' cm extra room';
}

/** A certificate belongs to the candidate, never to the Before/source view. */
export function proposalCaption(showAfter:boolean,reserveM:number,index:number):string {
  if(!showAfter)return 'Before';
  if(reserveM<.001)return 'After · under 0.1 cm extra room';
  return 'After · '+reserveLabel(reserveM,index);
}

/** Keep independently verified tasks independent in completion feedback. */
export function completionFeedback(task:string|null,result:any):{anchor:'chair'|'door';label:string}|null {
  if((task!=='journey'&&task!=='door')||result?.tasks?.[task]?.status!=='verified_feasible')return null;
  return task==='door'?{anchor:'door',label:'Door clear'}:{anchor:'chair',label:'Turn clear'};
}

/** A visible object-specific witness needs no duplicate generic result plate. */
export function ordinaryTaskFeedback(task:'journey'|'door',result:any,specificWitnessVisible:boolean):string|null {
  const value=result?.tasks?.[task];if(!value)return null;
  const name=task==='journey'?'Turn':'Door';
  if(value.status==='verified_feasible')return name+' clear';
  if(value.status==='blocked_witness')return specificWitnessVisible&&value.witness?.objectId?null:name+' blocked';
  if(value.status==='no_path_found')return task==='journey'?'No route found':'Door check incomplete';
  return 'Not sure yet. Try again.';
}

/** A successful zero-move result is distinct from an exhausted finite search. */
export function emptyRepairPresentation(result:any):{menu:'repairUnneeded'|'repairEmpty';label:string} {
  const clear=result?.tasks?.journey?.status==='verified_feasible'&&result?.tasks?.door?.status==='verified_feasible';
  return clear?{menu:'repairUnneeded',label:'No changes needed'}:{menu:'repairEmpty',label:'No layout found\nwithin this search'};
}

/** An asynchronous menu replacement cannot change the command under a held pinch. */
export class PressIdentity {
  private pressed:string|null=null;
  begin(identity:string|null){this.pressed=identity;}
  cancel(){this.pressed=null;}
  release(identity:string|null):boolean {
    const pressed=this.pressed;this.pressed=null;
    return pressed!==null&&pressed===identity;
  }
}

/** No collision deficit is inferred from a witness. */
export function obstructionLabels(result:any):Record<string,string> {
  const labels:Record<string,string>={};
  const route=result?.tasks?.journey,door=result?.tasks?.door;
  if(route?.status!=='verified_feasible'&&route?.witness?.objectId)
    labels[route.witness.objectId]='Chair hits here';
  if(door?.status!=='verified_feasible'&&door?.witness?.objectId)
    labels[door.witness.objectId]=labels[door.witness.objectId]?'Chair + door hit here':"Door can’t open past this";
  return labels;
}

export const PRIMARY_MENUS:Record<string,readonly string[]>={
  overview:['find','rehearse','more'],
  more:['place','nextMore','back'],
  door:['door','back'],
  placement:['placeHere','useProvided','back'],
  edit:['lock','back'],
  profile:['profileWidth','profileBuffer','back'],
  profileWidth:['widthMinus','widthPlus','backProfile'],
  profileBuffer:['bufferMinus','bufferPlus','backProfile'],
  search:['cancel'],
  // One spatial option + Next + Cancel. A fourth navigation target is never hidden.
  repairChoices:['nextOption','cancel'],
  repair:['apply','beforeAfter','cancel'],
  repairCompare:['before','after','backRepair'],
  repairEmpty:['locks','profile','back'],
  repairUnneeded:['rehearse','back'],
  repairError:['retry','offline','back'],
  about:['back'],
  sharing:['back'],
  playing:['stop'],
  checking:['undo'],
};

/** A bounded slice around the existing generator; never publishes partial geometry. */
export class RevisionEvaluation {
  private iterator:Iterator<unknown,any>;
  public cancelled=false;
  public completed=false;
  public value:any=null;
  public steps=0;
  public maxStepMs=0;
  constructor(public readonly generation:number,public readonly revision:number,public readonly inputHash:string,iterator:Iterator<unknown,any>) {
    this.iterator=iterator;
  }
  step(now:()=>number,budgetMs=5,maxSteps=6):boolean {
    if(this.cancelled||this.completed)return this.completed;
    const started=now();
    for(let n=0;n<maxSteps;n++) {
      const at=now(),next=this.iterator.next();
      this.steps++;this.maxStepMs=Math.max(this.maxStepMs,now()-at);
      if(next.done){this.completed=true;this.value=next.value;return true;}
      if(now()-started>=budgetMs)break;
    }
    return false;
  }
  cancel(){this.cancelled=true;this.value=null;}
  matches(generation:number,revision:number,inputHash:string){
    return !this.cancelled&&generation===this.generation&&revision===this.revision&&inputHash===this.inputHash;
  }
}

/** Annotation endpoints on separated edges; not a motion or clearance verifier. */
export type DisplaySegment={from:{x:number;y:number};to:{x:number;y:number};distanceM:number};
export function closestDisplaySegment(a:{x:number;y:number}[],b:{x:number;y:number}[]):DisplaySegment|null {
  let best:DisplaySegment|null=null;
  const visit=(points:{x:number;y:number}[],edges:{x:number;y:number}[],reverse:boolean)=>{
    for(const p of points)for(let i=0;i<edges.length;i++){
      const q=edges[i],r=edges[(i+1)%edges.length],dx=r.x-q.x,dy=r.y-q.y;
      const den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((p.x-q.x)*dx+(p.y-q.y)*dy)/den)):0;
      const projected={x:q.x+t*dx,y:q.y+t*dy},distanceM=Math.hypot(p.x-projected.x,p.y-projected.y);
      if(!best||distanceM<best.distanceM)best={from:reverse?projected:{...p},to:reverse?{...p}:projected,distanceM};
    }
  };
  visit(a,b,false);visit(b,a,true);return best;
}
