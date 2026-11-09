/** Presentation and input policy only. These helpers never alter checked geometry. */
export type SpatialPoint = {x:number;y:number;z:number};
export type DetailBand = 'far'|'middle'|'near';

/** Inspector placement is a Preview convenience, never a device startup bypass. */
export function startupPlacement(isEditor:boolean,previewPoseConfirmed:boolean) {
  return {isEditor,beginPlacement:!isEditor||!previewPoseConfirmed,showPreviewDisclosure:isEditor,
    branch:isEditor?'preview':'device'} as const;
}

/** A level aim point 75 cm ahead and 40 cm below the eye, independent of head pitch. */
export function placementAim(eye:SpatialPoint,forward:SpatialPoint):SpatialPoint {
  const length=Math.hypot(forward.x,forward.z);
  const x=length>1e-8?forward.x/length:0,z=length>1e-8?forward.z/length:-1;
  return {x:eye.x+x*75,y:eye.y-40,z:eye.z+z*75};
}

/** Ten-centimetre hysteresis; the first sample uses the nominal 55/120 cm bands. */
export function distanceBand(distanceCm:number,previous:DetailBand|null):DetailBand {
  if(!Number.isFinite(distanceCm))return 'far';
  if(previous==='near'&&distanceCm<65)return 'near';
  if(previous==='far'&&distanceCm>110)return 'far';
  if(previous==='middle'&&distanceCm>=55&&distanceCm<=130)return 'middle';
  return distanceCm<55?'near':distanceCm>120?'far':'middle';
}

/** The ordinary task result is a conservative extra-space bound, not a fitted-device promise. */
export function extraRoomText(lowerBoundM:number|null):string {
  if(lowerBoundM===null||!Number.isFinite(lowerBoundM)||lowerBoundM<0)return 'Space not checked';
  if(lowerBoundM<.001)return 'Less than 1 mm extra room';
  const centimetres=Math.floor((lowerBoundM+1e-12)*1000)/10;
  return 'At least '+String(centimetres)+' cm extra room';
}

/** Cancel a stale popup rather than changing its command under a held pinch. */
export function shouldCloseMenu(menu:string,lastInteraction:number,now:number,held:boolean):boolean {
  return !held&&['more','edit','door','profile','profileWidth','profileBuffer'].includes(menu)
    &&Number.isFinite(now)&&now-lastInteraction>=6;
}

/** All actual button hit targets count, including the contextual lock / Undo chips. */
export function overviewActions(clear:boolean,contextTargets:number):string[] {
  const budget=Math.max(0,3-Math.max(0,Math.floor(contextTargets)));
  if(budget===0)return [];
  if(budget===1)return ['more'];
  if(budget===2)return [clear?'rehearse':'find','more'];
  return clear?['rehearse','keep','more']:['find','rehearse','more'];
}

/** Align the real rectangle beside a rotated wardrobe, with a visible one-centimetre gap. */
export function alignedTablePose(table:{width:number;depth:number},wardrobe:{width:number;depth:number;pose:{x:number;y:number;theta:number}},sideGapM=.01) {
  const theta=wardrobe.pose.theta,c=Math.cos(theta),s=Math.sin(theta);
  const localX=(wardrobe.width+table.width)/2+sideGapM,localY=(wardrobe.depth-table.depth)/2;
  // This authored placement is expressed to a micrometre; remove binary float
  // tails so its exported input is identical to the reviewed decimal pose.
  const metre=(value:number)=>Math.round(value*1e6)/1e6;
  return {x:metre(wardrobe.pose.x+c*localX-s*localY),y:metre(wardrobe.pose.y+s*localX+c*localY),theta};
}
