import { angleDistance, clearanceAt, distance, normalizeAngle, objectPolygon, poseAt, rectangle, stableHash, transform, verifyMotion } from "./geometry";
import type { DeviceProfile, Evaluation, EvaluationInput, JourneyTask, Motion, Obstacle, Polygon, Pose, TaskResult } from "./types";

export const SOLVER_VERSION="open-door/1.0.0";
export const SETTINGS={sweepTolerance:.001,searchStep:.16,maxNodes:8500};
export function goalReached(pose:Pose,task:JourneyTask):boolean {
  return distance(pose,task.goal)<=task.positionTolerance && angleDistance(pose.theta,task.goal.theta)<=task.headingTolerance;
}
export function motionAllowed(motion:Motion,profile:DeviceProfile):boolean {
  if(motion.distance<-.00001 && !profile.allowReverse) return false;
  if(Math.abs(motion.angle)<1e-9) return true;
  if(Math.abs(motion.distance)<1e-9) return profile.movement==="pivot";
  return Math.abs(motion.distance/motion.angle)>=profile.minimumTurningRadius-1e-9;
}
export function doorPolygon(input:EvaluationInput):Polygon {
  const d=input.room.door;
  return transform([{x:0,y:-d.thickness/2},{x:d.width,y:-d.thickness/2},{x:d.width,y:d.thickness/2},{x:0,y:d.thickness/2}],{...d.hinge,theta:d.fixedAngle});
}
export function routeObstacles(input:EvaluationInput):Obstacle[] {
  return [...input.room.objects.filter(o=>o.height>0).map(o=>({id:o.id,name:o.name,polygon:objectPolygon(o),uncertainty:o.uncertainty})),{id:input.room.door.id,name:input.room.door.name,polygon:doorPolygon(input),uncertainty:0}];
}
export function routeAssumptions(input:EvaluationInput):string[] {
  const p=input.profile;
  return [`Occupied rectangle ${(p.width*100).toFixed(0)} × ${(p.length*100).toFixed(0)} cm, including protrusions.`,`${p.movement==="pivot"?"Rotation in place allowed":"Minimum turn radius "+p.minimumTurningRadius.toFixed(2)+" m"}; reverse ${p.allowReverse?"allowed":"not allowed"}.`,`User-selected buffer ${(p.clearance*100).toFixed(0)} cm; profile uncertainty ±${(p.uncertainty*100).toFixed(0)} cm.`,"2D floor geometry; all listed furniture blocks the occupied height range.","Door held at the specified fixed-open angle during the journey.","Goal includes position and heading; approach/transfer comfort is not assessed."];
}
export function sampleMotions(motions:Motion[],step=.04):Pose[] {
  if(!motions.length)return[];
  const points:Pose[]=[motions[0].start];
  for(const motion of motions){
    const count=Math.max(1,Math.ceil((Math.abs(motion.distance)+Math.abs(motion.angle)*.5)/step));
    for(let i=1;i<=count;i++)points.push(poseAt(motion,i/count));
  }
  return points;
}
export function directMotions(start:Pose,goal:Pose,via?:{x:number;y:number}):Motion[] {
  const targets=via?[via,goal]:[goal];
  let current=start;const motions:Motion[]=[];
  for(const target of targets){
    const d=distance(current,target);if(d<1e-8)continue;
    const heading=Math.atan2(target.y-current.y,target.x-current.x);
    const turn={start:current,distance:0,angle:normalizeAngle(heading-current.theta)};
    if(Math.abs(turn.angle)>1e-8){motions.push(turn);current=poseAt(turn,1);}
    const line={start:current,distance:d,angle:0};motions.push(line);current=poseAt(line,1);
  }
  const turn={start:current,distance:0,angle:normalizeAngle(goal.theta-current.theta)};
  if(Math.abs(turn.angle)>1e-8)motions.push(turn);
  return motions;
}
export function verifyTrajectory(input:EvaluationInput,motions:Motion[]) {
  const local=rectangle(input.profile.length,input.profile.width),obstacles=routeObstacles(input);
  const buffer=input.profile.clearance+input.profile.uncertainty;
  const initial=clearanceAt(local,input.journey.start,obstacles,buffer,input.room);
  if(initial.distance<=0)return {status:"blocked" as const,clearance:initial.distance,witness:initial.witness,samples:1};
  let clearance=initial.distance;let samples=1;
  let previous=input.journey.start;
  for(const motion of motions){
    if(distance(previous,motion.start)>1e-6 || angleDistance(previous.theta,motion.start.theta)>1e-6 || !motionAllowed(motion,input.profile)) return {status:"invalid_motion" as const,clearance:0,samples};
    const result=verifyMotion(local,motion,obstacles,buffer,input.room,SETTINGS.sweepTolerance);samples+=result.samples;
    if(result.status!=="clear")return {...result,samples};
    clearance=Math.min(clearance,result.clearance);previous=poseAt(motion,1);
  }
  if(!goalReached(previous,input.journey))return {status:"wrong_goal" as const,clearance,samples};
  return {status:"clear" as const,clearance,samples};
}

class MinHeap<T extends {f:number}> {
  values:T[]=[];
  push(value:T){let i=this.values.length;this.values.push(value);while(i>0){const p=(i-1)>>1;if(this.values[p].f<=value.f)break;this.values[i]=this.values[p];i=p;}this.values[i]=value;}
  pop():T|undefined{if(!this.values.length)return;const first=this.values[0],last=this.values.pop()!;if(this.values.length){let i=0;while(i*2+1<this.values.length){let j=i*2+1;if(j+1<this.values.length&&this.values[j+1].f<this.values[j].f)j++;if(this.values[j].f>=last.f)break;this.values[i]=this.values[j];i=j;}this.values[i]=last;}return first;}
}
interface Node{pose:Pose;g:number;f:number;parent?:Node;motion?:Motion}
function reconstruct(node:Node):Motion[]{const motions:Motion[]=[];while(node.motion){motions.unshift(node.motion);node=node.parent!;}return motions;}
function search(input:EvaluationInput):{motions?:Motion[];explored:number;uncertain:boolean} {
  const p=input.profile,local=rectangle(p.length,p.width),obstacles=routeObstacles(input),buffer=p.clearance+p.uncertainty;
  const heuristic=(q:Pose)=>distance(q,input.journey.goal)+angleDistance(q.theta,input.journey.goal.theta)*.12;
  const key=(q:Pose)=>`${Math.round(q.x/.08)},${Math.round(q.y/.08)},${Math.round(normalizeAngle(q.theta)/(Math.PI/12))}`;
  const frontier=new MinHeap<Node>();frontier.push({pose:input.journey.start,g:0,f:heuristic(input.journey.start)});
  const best=new Map<string,number>();let explored=0,uncertain=false;
  while(frontier.values.length && explored<SETTINGS.maxNodes){
    const node=frontier.pop()!,k=key(node.pose);
    if((best.get(k)??Infinity)<=node.g)continue;best.set(k,node.g);explored++;
    if(goalReached(node.pose,input.journey)){return {motions:reconstruct(node),explored,uncertain};}
    // A checked exact connection improves the goal pose without a grid snap.
    if(p.movement==="pivot" && distance(node.pose,input.journey.goal)<.8){
      const tail=directMotions(node.pose,input.journey.goal);
      if(tail.every(m=>verifyMotion(local,m,obstacles,buffer,input.room,SETTINGS.sweepTolerance).status==="clear"))return{motions:[...reconstruct(node),...tail],explored,uncertain};
    }
    const primitives:{distance:number;angle:number}[]=[];
    for(const sign of p.allowReverse?[1,-1]:[1]){
      primitives.push({distance:SETTINGS.searchStep*sign,angle:0});
      const turn=Math.min(Math.PI/12,SETTINGS.searchStep/p.minimumTurningRadius);
      for(const a of [-turn,turn])primitives.push({distance:SETTINGS.searchStep*sign,angle:a*sign});
    }
    if(p.movement==="pivot")for(const angle of [-Math.PI/12,Math.PI/12])primitives.push({distance:0,angle});
    for(const primitive of primitives){
      const motion={start:node.pose,...primitive},pose=poseAt(motion,1),g=node.g+Math.abs(motion.distance)*(motion.distance<0?1.15:1)+Math.abs(motion.angle)*.14;
      if((best.get(key(pose))??Infinity)<=g)continue;
      const v=verifyMotion(local,motion,obstacles,buffer,input.room,SETTINGS.sweepTolerance);
      if(v.status==="uncertain")uncertain=true;
      if(v.status!=="clear")continue;
      frontier.push({pose,g,f:g+heuristic(pose)*1.08,parent:node,motion});
    }
  }
  return{explored,uncertain};
}
function evaluateJourneyCore(input:EvaluationInput):TaskResult {
  const {profile:p,journey:task}=input;
  const base={id:task.id,name:task.name,path:[] as Pose[],motions:[] as Motion[],minimumClearance:null,explored:0,assumptions:routeAssumptions(input),unknowns:["Physical comfort, transfers, effort and real-world accuracy are not assessed."]};
  const local=rectangle(p.length,p.width),obstacles=routeObstacles(input),buffer=p.clearance+p.uncertainty;
  for(const [label,pose] of [["Starting pose",task.start],["Requested bedside pose",task.goal]] as const){
    const c=clearanceAt(local,pose,obstacles,buffer,input.room);
    if(c.distance<=0) return {...base,status:"blocked_witness",summary:`${label} intersects ${c.witness?.objectName.toLowerCase()??"the room geometry"}${c.witness?.kind==="buffer"?"’s clearance buffer":""}.`,witness:c.witness};
  }
  let candidates:Motion[][]=[];
  if(p.movement==="pivot")candidates=[directMotions(task.start,task.goal),directMotions(task.start,task.goal,{x:task.goal.x,y:task.start.y}),directMotions(task.start,task.goal,{x:task.start.x,y:task.goal.y})];
  for(const motions of candidates){
    const v=verifyTrajectory(input,motions);
    if(v.status==="clear")return{...base,status:"verified_feasible",summary:"A continuous route reaches the bedside in the requested orientation.",motions,path:sampleMotions(motions),minimumClearance:v.clearance};
  }
  const found=search(input);
  if(found.motions){
    const v=verifyTrajectory(input,found.motions);
    if(v.status==="clear")return{...base,status:"verified_feasible",summary:"A verified route reaches the bedside in the requested orientation.",motions:found.motions,path:sampleMotions(found.motions),minimumClearance:v.clearance,explored:found.explored};
  }
  // A failed candidate gives a local witness, not a proof against every route.
  let witness:TaskResult["witness"];
  for(const motions of candidates){const v=verifyTrajectory(input,motions);if("witness" in v && v.witness){witness=v.witness;break;}}
  return{...base,status:found.uncertain?"uncertain":"no_path_found",summary:found.uncertain?"The search could not certify a route at the selected tolerance.":"No route found within this search resolution and node budget.",witness,explored:found.explored,unknowns:[...base.unknowns,"This search result does not prove every possible route is blocked."]};
}
export function evaluateJourney(input:EvaluationInput):TaskResult {
  const result=evaluateJourneyCore(input);
  if(result.status!=="verified_feasible" && (input.profile.uncertainty>0 || input.room.objects.some(o=>o.uncertainty>0))){
    const nominal={...input,profile:{...input.profile,uncertainty:0},room:{...input.room,objects:input.room.objects.map(o=>({...o,uncertainty:0}))}};
    const nominalResult=evaluateJourneyCore(nominal);
    if(nominalResult.status==="verified_feasible")return{...result,status:"uncertain",summary:"The nominal dimensions permit a route, but the stated uncertainty prevents certification.",unknowns:[...result.unknowns,"A route passed with measurement uncertainty removed; conservative geometry did not pass."]};
  }
  return result;
}
function evaluateDoorCore(input:EvaluationInput):TaskResult {
  const d=input.room.door;
  const local=[{x:0,y:-d.thickness/2},{x:d.width,y:-d.thickness/2},{x:d.width,y:d.thickness/2},{x:0,y:d.thickness/2}];
  const obstacles=input.room.objects.map(o=>({id:o.id,name:o.name,polygon:objectPolygon(o),uncertainty:o.uncertainty}));
  const motion={start:{...d.hinge,theta:d.closedAngle},distance:0,angle:d.openAngle-d.closedAngle};
  const v=verifyMotion(local,motion,obstacles,0,undefined,SETTINGS.sweepTolerance);
  return {id:"door-sweep",name:"Open the door",status:v.status==="clear"?"verified_feasible":v.status==="blocked"?"blocked_witness":"uncertain",summary:v.status==="clear"?"The door leaf clears the furniture through its full specified swing.":v.status==="blocked"?`The door leaf intersects ${v.witness?.objectName.toLowerCase()} during its swing.`:"Door clearance could not be certified at the selected tolerance.",witness:v.witness,path:sampleMotions([motion]),motions:[motion],minimumClearance:v.status==="clear"?v.clearance:null,explored:0,assumptions:[`Door width ${(d.width*100).toFixed(0)} cm, thickness ${(d.thickness*100).toFixed(0)} cm.`,`Swing ${(d.closedAngle*180/Math.PI).toFixed(0)}° to ${(d.openAngle*180/Math.PI).toFixed(0)}° against all listed furniture.`,"Checks leaf-to-furniture clearance only."],unknowns:["Handle reach, opening force and the person's complete door-opening maneuver are not assessed."]};
}
export function evaluateDoor(input:EvaluationInput):TaskResult {
  const result=evaluateDoorCore(input);
  if(result.status!=="verified_feasible" && input.room.objects.some(o=>o.uncertainty>0)){
    const nominal=evaluateDoorCore({...input,room:{...input.room,objects:input.room.objects.map(o=>({...o,uncertainty:0}))}});
    if(nominal.status==="verified_feasible")return{...result,status:"uncertain",summary:"The nominal door swing clears, but the stated measurement uncertainty prevents certification."};
  }
  return result;
}
export function evaluate(input:EvaluationInput):Evaluation {
  const start=Date.now();
  return {schemaVersion:"1.0",solverVersion:SOLVER_VERSION,revision:input.room.revision,inputHash:stableHash(input),tasks:{journey:evaluateJourney(input),door:evaluateDoor(input)},durationMs:Date.now()-start,settings:SETTINGS};
}
