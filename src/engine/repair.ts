import { angleDistance, clearanceAt, distance, normalizeAngle, objectPolygon, polygonDistance, polygonsIntersect, rectangle, stableHash, transform, verifyMotion } from './geometry';
import { evaluate, evaluateDoor, evaluateSteps, routeObstacles, verifyTrajectory } from './planner';
import type { Evaluation, EvaluationInput, Pose, RoomObject } from './types';

/** Finite heuristic scope, not a completeness or global optimality claim. */
export const REPAIR_SETTINGS={maxObjects:6,maxMoves:3,beamWidth:8,posesPerObject:24,maxEvaluations:400,maxRouteNodes:12000,nodesPerEvaluation:300,reserveTargets:[0,.01,.03],rotationCostMPerRad:.15,maxTicksPerStep:32,stepMillis:6,maxAxisCoordinates:128,maxPlacementCandidatesPerObject:48000,radialStepM:.08,radialDirections:24,maxRadiusM:6,candidateYieldBatch:32,contactPaddingM:.003,contactRule:"AABB face contacts and pairwise contact midpoints"};
export interface RepairMove {objectId:string;objectName:string;from:Pose;to:Pose;distanceM:number;rotationRad:number}
export interface RepairProposal {id:string;label:string;sourceHash:string;sourceRevision:number;moves:RepairMove[];input:EvaluationInput;evaluation:Evaluation;translationM:number;rotationRad:number;movementCostM:number;extraClearanceM:number;certifiedReserveM:number}
export interface RepairProgress {status:'searching'|'complete'|'cancelled';phase:string;generated:number;evaluated:number;proposals:RepairProposal[];sourceHash:string;sourceRevision:number;reason?:string;scope:typeof REPAIR_SETTINGS}
export interface RepairOptions {maxEvaluations?:number;maxRouteNodes?:number}
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function bounds(poly:{x:number;y:number}[]){return {left:Math.min(...poly.map(p=>p.x)),right:Math.max(...poly.map(p=>p.x)),bottom:Math.min(...poly.map(p=>p.y)),top:Math.max(...poly.map(p=>p.y))};}
function validPlacements(input:EvaluationInput):boolean {
  return input.room.objects.every((o,i)=>{const p=objectPolygon(o);return p.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)&&v.x>=0&&v.y>=0&&v.x<=input.room.width&&v.y<=input.room.depth)&&input.room.objects.slice(i+1).every(other=>!polygonsIntersect(p,objectPolygon(other)));});
}
function deviceClear(input:EvaluationInput,reserve:number):number {
  const p=input.profile,local=rectangle(p.length,p.width),obstacles=routeObstacles(input);
  return Math.min(...[input.journey.start,input.journey.goal].map(q=>clearanceAt(local,q,obstacles,p.clearance+p.uncertainty+reserve,input.room).distance));
}
function objectFits(input:EvaluationInput,o:RoomObject,pose:Pose,reserve:number):boolean {
  const poly=objectPolygon({...o,pose});
  if(poly.some(v=>v.x<.001||v.y<.001||v.x>input.room.width-.001||v.y>input.room.depth-.001))return false;
  if(input.room.objects.some(other=>other.id!==o.id&&polygonDistance(poly,objectPolygon(other))<=.001))return false;
  const p=input.profile,buffer=p.clearance+p.uncertainty+o.uncertainty+reserve;
  if([input.journey.start,input.journey.goal].some(q=>polygonDistance(poly,transform(rectangle(p.length,p.width),q))<=buffer+.002))return false;
  const d=input.room.door;
  return verifyMotion([{x:0,y:-d.thickness/2},{x:d.width,y:-d.thickness/2},{x:d.width,y:d.thickness/2},{x:0,y:d.thickness/2}],{start:{...d.hinge,theta:d.closedAngle},distance:0,angle:d.openAngle-d.closedAngle},[{id:o.id,name:o.name,polygon:poly,uncertainty:o.uncertainty}],reserve+.002,undefined).status==='clear';
}
function* poses(input:EvaluationInput,o:RoomObject,reserve:number,onGenerated:()=>void):Generator<void,Pose[]> {
  const result:Pose[]=[],seen=new Set<string>();let attempted=0;
  const accept=function*(pose:Pose):Generator<void>{if(attempted>=REPAIR_SETTINGS.maxPlacementCandidatesPerObject)return;attempted++;onGenerated();if(attempted%REPAIR_SETTINGS.candidateYieldBatch===0)yield;const key=[pose.x,pose.y,pose.theta].map(v=>v.toFixed(5)).join(',');if(seen.has(key))return;seen.add(key);if(distance(o.pose,pose)<1e-6&&angleDistance(o.pose.theta,pose.theta)<1e-6)return;if(objectFits(input,o,pose,reserve))result.push(pose);};
  candidateGeneration: for(const theta of [o.pose.theta,normalizeAngle(o.pose.theta+Math.PI/2),normalizeAngle(o.pose.theta-Math.PI/2)]){
    const ext=bounds(objectPolygon({...o,pose:{x:0,y:0,theta}})),hx=ext.right,hy=ext.top;
    const xs=[o.pose.x,hx+.003,input.room.width-hx-.003],ys=[o.pose.y,hy+.003,input.room.depth-hy-.003];
    const obstacles=input.room.objects.filter(q=>q.id!==o.id).map(q=>({b:bounds(objectPolygon(q)),pad:.003}));
    for(const q of [input.journey.start,input.journey.goal])obstacles.push({b:bounds(transform(rectangle(input.profile.length,input.profile.width),q)),pad:input.profile.clearance+input.profile.uncertainty+o.uncertainty+reserve+.003});
    for(const {b,pad} of obstacles){xs.push(b.left-hx-pad,b.right+hx+pad);ys.push(b.bottom-hy-pad,b.top+hy+pad);}
    // Midpoints recover narrow slots between exact geometry contacts, independent of grid spacing.
    const xContacts=[...xs],yContacts=[...ys];
    for(const a of xContacts)for(const b of xContacts)xs.push((a+b)/2);
    for(const a of yContacts)for(const b of yContacts)ys.push((a+b)/2);
    const trim=(values:number[],origin:number,max:number)=>[...new Set(values.filter(v=>v>0&&v<max))].sort((a,b)=>Math.abs(a-origin)-Math.abs(b-origin)).slice(0,REPAIR_SETTINGS.maxAxisCoordinates);
    for(const x of trim(xs,o.pose.x,input.room.width))for(const y of trim(ys,o.pose.y,input.room.depth)){if(attempted>=REPAIR_SETTINGS.maxPlacementCandidatesPerObject)break candidateGeneration;yield* accept({x,y,theta});}
    for(let radius=REPAIR_SETTINGS.radialStepM;radius<=Math.min(REPAIR_SETTINGS.maxRadiusM,Math.hypot(input.room.width,input.room.depth));radius+=REPAIR_SETTINGS.radialStepM)for(let k=0;k<REPAIR_SETTINGS.radialDirections;k++){if(attempted>=REPAIR_SETTINGS.maxPlacementCandidatesPerObject)break candidateGeneration;yield* accept({x:o.pose.x+radius*Math.cos(k*Math.PI/12),y:o.pose.y+radius*Math.sin(k*Math.PI/12),theta});}
  }
  result.sort((a,b)=>cost(o.pose,a)-cost(o.pose,b)||a.x-b.x||a.y-b.y||a.theta-b.theta);
  // Keep nearby poses and spatially distinct alternatives so a beam can escape a local route obstruction.
  const selected=result.slice(0,12);
  for(const q of result)if(selected.length<REPAIR_SETTINGS.posesPerObject&&!selected.some(p=>distance(p,q)<.16&&angleDistance(p.theta,q.theta)<.1))selected.push(q);
  return selected;
}
const cost=(a:Pose,b:Pose)=>distance(a,b)+angleDistance(a.theta,b.theta)*REPAIR_SETTINGS.rotationCostMPerRad;
interface State {input:EvaluationInput;moves:RepairMove[];cost:number;penalty:number}
export function createRepairSearch(source:EvaluationInput,options:RepairOptions={}) {
  const original=copy(source),sourceHash=stableHash(original),sourceRevision=original.room.revision;
  const progress:RepairProgress={status:'searching',phase:'Preparing geometry-derived candidates',generated:0,evaluated:0,proposals:[],sourceHash,sourceRevision,scope:copy(REPAIR_SETTINGS)};
  const evaluationLimit=Math.min(REPAIR_SETTINGS.maxEvaluations,Math.max(0,options.maxEvaluations??REPAIR_SETTINGS.maxEvaluations));
  const nodeLimit=Math.min(REPAIR_SETTINGS.maxRouteNodes,Math.max(0,options.maxRouteNodes??REPAIR_SETTINGS.maxRouteNodes));let routeNodes=0;
  function* run():Generator<void> {
    if(evaluationLimit>0&&nodeLimit>0){
      progress.phase='Checking the current layout';progress.evaluated++;
      const initial=evaluateSteps(original,{maxNodes:Math.min(REPAIR_SETTINGS.nodesPerEvaluation,nodeLimit),nominalFallback:false});
      let checked=initial.next();while(!checked.done){yield;checked=initial.next();}
      routeNodes+=checked.value.tasks.journey.explored;
      if(checked.value.tasks.journey.status==='verified_feasible'&&checked.value.tasks.door.status==='verified_feasible'){
        progress.reason='The current layout already verifies both tasks; no furniture move is needed.';return;
      }
    }
    const movable=original.room.objects.filter(o=>o.movable&&!o.locked).sort((a,b)=>{
      const proximity=(o:RoomObject)=>Math.min(distance(o.pose,original.journey.start),distance(o.pose,original.journey.goal),distance(o.pose,original.room.door.hinge));return proximity(a)-proximity(b)||a.id.localeCompare(b.id);
    }).slice(0,REPAIR_SETTINGS.maxObjects);
    if(!movable.length){progress.reason='No unlocked movable furniture is available in this finite search.';return;}
    for(const reserve of REPAIR_SETTINGS.reserveTargets){
      if(progress.evaluated>=evaluationLimit||routeNodes>=nodeLimit)break;
      const candidates=new Map<string,Pose[]>();
      for(const o of movable){progress.phase=`Generating furniture placements (${Math.round(reserve*100)} cm reserve)`;candidates.set(o.id,yield* poses(original,o,reserve,()=>progress.generated++));}
      let beam:State[]=[{input:original,moves:[],cost:0,penalty:0}];
      let best:RepairProposal|undefined;
      for(let depth=1;depth<=Math.min(REPAIR_SETTINGS.maxMoves,movable.length);depth++){
        const next:State[]=[],seen=new Set<string>();progress.phase=`Checking ${depth}-piece layouts (${Math.round(reserve*100)} cm reserve)`;
        for(const state of beam)for(const object of movable){
          if(state.moves.some(m=>m.objectId===object.id))continue;
          for(const pose of candidates.get(object.id)??[]){
            yield;progress.generated++;
            const input={...original,room:{...original.room,objects:state.input.room.objects.map(o=>o.id===object.id?{...o,pose}:o)}};
            const hash=stableHash(input);if(seen.has(hash)||!validPlacements(input))continue;seen.add(hash);
            const move={objectId:object.id,objectName:object.name,from:copy(object.pose),to:copy(pose),distanceM:distance(object.pose,pose),rotationRad:angleDistance(object.pose.theta,pose.theta)};
            const moves=[...state.moves,move],movementCost=state.cost+cost(object.pose,pose);
            const door=evaluateDoor(input,reserve),endpoint=deviceClear(input,reserve);
            const penalty=(door.status==='verified_feasible'?0:10)+(endpoint>0?0:10)+Math.max(0,-endpoint);
            next.push({input,moves,cost:movementCost,penalty});
          }
        }
        next.sort((a,b)=>a.penalty-b.penalty||a.cost-b.cost||stableHash(a.input).localeCompare(stableHash(b.input)));
        for(const state of next){
          if(state.penalty>0)continue;
          if(best&&state.cost>=best.movementCostM)continue;
          if(progress.evaluated>=evaluationLimit||routeNodes>=nodeLimit)break;
          progress.evaluated++;
          const reserved={...state.input,profile:{...state.input.profile,clearance:state.input.profile.clearance+reserve}};
          const steps=evaluateSteps(reserved,{nominalFallback:false,maxNodes:Math.min(REPAIR_SETTINGS.nodesPerEvaluation,nodeLimit-routeNodes)});
          let item=steps.next();while(!item.done){yield;item=steps.next();}
          routeNodes+=item.value.tasks.journey.explored;
          if(item.value.tasks.journey.status!=='verified_feasible')continue;
          yield;
          const motions=item.value.tasks.journey.motions;
          const route=verifyTrajectory(reserved,motions),door=evaluateDoor(state.input,reserve);
          if(route.status!=='clear'||door.status!=='verified_feasible')continue;
          const evaluation=evaluate(state.input,motions);
          if(evaluation.tasks.journey.status!=='verified_feasible'||evaluation.tasks.door.status!=='verified_feasible')continue;
          const certifiedReserveM=reserve+Math.min(route.clearance,door.minimumClearance??0);
          best={id:stableHash({sourceHash,moves:state.moves,reserve}),label:reserve===0?'Less furniture movement':`More clearance (${Math.round(reserve*100)} cm reserve)`,sourceHash,sourceRevision,moves:state.moves,input:copy(state.input),evaluation,translationM:state.moves.reduce((s,m)=>s+m.distanceM,0),rotationRad:state.moves.reduce((s,m)=>s+m.rotationRad,0),movementCostM:state.cost,extraClearanceM:reserve,certifiedReserveM};
        }
        if(best)break; // Lexicographic: a found depth beats all deeper layouts in this finite beam.
        beam=next.slice(0,REPAIR_SETTINGS.beamWidth);
        if(!beam.length||progress.evaluated>=evaluationLimit||routeNodes>=nodeLimit)break;
      }
      if(best){
        const duplicate=progress.proposals.findIndex(p=>stableHash(p.input)===stableHash(best!.input));
        if(duplicate<0)progress.proposals.push(best);
        else if(best.certifiedReserveM>progress.proposals[duplicate].certifiedReserveM)progress.proposals[duplicate]=best;
      }
      yield;
    }
    progress.proposals=rankRepairProposals(progress.proposals);
    progress.reason=progress.proposals.length?'Verified proposals from a finite contact/radial placement beam; no global optimum claimed.':'No verified proposal found within the finite placement beam and route-node limits; this does not prove infeasibility.';
  }
  const iterator=run();
  return {step(maxMillis=REPAIR_SETTINGS.stepMillis):RepairProgress {if(progress.status!=='searching')return copy(progress);const until=Date.now()+Math.max(0,Math.min(32,maxMillis));for(let ticks=0;ticks<REPAIR_SETTINGS.maxTicksPerStep;ticks++){if(iterator.next().done){progress.status='complete';progress.phase='Complete';break;}if(Date.now()>=until)break;}return copy(progress);},cancel(){if(progress.status==='cancelled')return;progress.status='cancelled';progress.phase='Cancelled';progress.proposals=[];iterator.return(undefined);},get progress():RepairProgress{return copy(progress);}};
}

/** Rank all reserve domains together; retain only a demonstrated movement/clearance tradeoff. */
export function rankRepairProposals(candidates:RepairProposal[]):RepairProposal[] {
  const ordered=[...candidates].sort((a,b)=>a.moves.length-b.moves.length||a.movementCostM-b.movementCostM||b.certifiedReserveM-a.certifiedReserveM||a.id.localeCompare(b.id));
  const retained:RepairProposal[]=[];let bestReserve=-Infinity;
  for(const candidate of ordered){
    if(retained.length&&candidate.certifiedReserveM<bestReserve+.005)continue;
    retained.push({...candidate,label:retained.length?'More modeled clearance':'Least movement found'});
    bestReserve=candidate.certifiedReserveM;
    if(retained.length===3)break;
  }
  return retained;
}

/** Rebuild only approved poses against the exact source snapshot, then reverify both tasks. */
export function applyRepairProposal(current:EvaluationInput,proposal:RepairProposal):EvaluationInput {
  if(current.room.revision!==proposal.sourceRevision||stableHash(current)!==proposal.sourceHash)throw new Error('This proposal is stale; search again for the current room and profile.');
  if(!proposal.moves.length||new Set(proposal.moves.map(m=>m.objectId)).size!==proposal.moves.length)throw new Error('Invalid repair moves.');
  const next=copy(current);
  for(const move of proposal.moves){const object=next.room.objects.find(o=>o.id===move.objectId);if(!object||!object.movable||object.locked||stableHash(object.pose)!==stableHash(move.from)||![move.to.x,move.to.y,move.to.theta].every(Number.isFinite))throw new Error('A repair move is invalid or locked.');object.pose=copy(move.to);}
  if(stableHash(next)!==stableHash(proposal.input)||!validPlacements(next))throw new Error('The proposal changed protected data or has invalid furniture placements.');
  const reserve=proposal.extraClearanceM;
  if(!REPAIR_SETTINGS.reserveTargets.includes(reserve)||!Number.isFinite(proposal.certifiedReserveM))throw new Error('Invalid claimed repair reserve.');
  const reserved={...next,profile:{...next.profile,clearance:next.profile.clearance+reserve}};
  const route=verifyTrajectory(reserved,proposal.evaluation.tasks.journey.motions),door=evaluateDoor(next,reserve);
  if(route.status!=='clear'||door.status!=='verified_feasible')throw new Error('The proposed route or door sweep no longer verifies at the claimed reserve.');
  const bound=reserve+Math.min(route.clearance,door.minimumClearance??0);
  if(Math.abs(bound-proposal.certifiedReserveM)>1e-9)throw new Error('The claimed repair reserve has been altered.');
  next.room.revision=current.room.revision+1;return next;
}
