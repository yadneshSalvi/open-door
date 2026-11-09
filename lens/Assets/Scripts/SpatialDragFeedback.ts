/** Display/input affordances around a real edit. No route or clearance result is inferred here. */
export type DragPose={x:number;y:number;theta:number};
export type RearEdgePiece={width:number;depth:number;pose:DragPose};
export type RearEdgeSnap={pose:DragPose;distanceM:number;guide:[{x:number;y:number},{x:number;y:number}]};
/** A single-line distance at the normal caption size, beside the visible start outline. */
export const MOVE_READOUT={width:5.4,height:2.2};

/** Snap only the rear-edge normal, within 2 cm, with no sideways teleport or rotation.
 * The caller must reject the candidate against the unchanged room placement rules.
 */
export function rearEdgeSnap(table:RearEdgePiece,wardrobe:RearEdgePiece,pose:DragPose,
  valid:(pose:DragPose)=>boolean,thresholdM=.02):RearEdgeSnap|null {
  if(![pose.x,pose.y,pose.theta,wardrobe.pose.theta,thresholdM].every(Number.isFinite)||thresholdM<0)return null;
  const relative=Math.atan2(Math.sin(pose.theta-wardrobe.pose.theta),Math.cos(pose.theta-wardrobe.pose.theta));
  if(Math.abs(relative)>Math.PI/90)return null;
  const c=Math.cos(wardrobe.pose.theta),s=Math.sin(wardrobe.pose.theta),nx=-s,ny=c;
  const rear=wardrobe.pose.x*nx+wardrobe.pose.y*ny+wardrobe.depth/2;
  const extent=(Math.abs(Math.sin(relative))*table.width+Math.abs(Math.cos(relative))*table.depth)/2;
  const delta=rear-(pose.x*nx+pose.y*ny+extent);
  if(Math.abs(delta)>thresholdM+1e-10)return null;
  const rounded=(n:number)=>Math.round(n*1e6)/1e6;
  const snapped={x:rounded(pose.x+nx*delta),y:rounded(pose.y+ny*delta),theta:pose.theta};
  if(!valid(snapped))return null;
  const tableX=snapped.x*c+snapped.y*s,wardrobeX=wardrobe.pose.x*c+wardrobe.pose.y*s;
  const from=Math.min(wardrobeX-wardrobe.width/2,tableX-table.width/2),to=Math.max(wardrobeX+wardrobe.width/2,tableX+table.width/2);
  return {pose:snapped,distanceM:Math.abs(delta),guide:[{x:c*from+nx*rear,y:s*from+ny*rear},{x:c*to+nx*rear,y:s*to+ny*rear}]};
}

export function dragDistanceLabel(from:DragPose,to:DragPose):string {
  const cm=Math.round(Math.hypot(to.x-from.x,to.y-from.y)*100);
  return 'Moved '+cm+' cm';
}
export function dragDistanceValue(from:DragPose,to:DragPose):string {
  return Math.round(Math.hypot(to.x-from.x,to.y-from.y)*100)+' cm';
}
