/** Display clipping in room metres. It never changes the room, route, or 1:1 scale. */
export type FloorPoint={x:number;y:number};
export type CornerBounds={minX:number;minY:number;maxX:number;maxY:number};
export const DEFAULT_CORNER:CornerBounds={minX:0,minY:1.4,maxX:2.2,maxY:3.4};

export function validCorner(value:CornerBounds,room:{width:number;depth:number}):boolean {
  return [value.minX,value.minY,value.maxX,value.maxY].every(Number.isFinite)
    &&value.minX>=0&&value.minY>=0&&value.maxX<=room.width&&value.maxY<=room.depth
    &&value.maxX-value.minX>=.5&&value.maxY-value.minY>=.5;
}
export function pointInCorner(point:FloorPoint,bounds:CornerBounds):boolean {
  return point.x>=bounds.minX&&point.x<=bounds.maxX&&point.y>=bounds.minY&&point.y<=bounds.maxY;
}
export function completeFootprintInCorner(points:FloorPoint[],bounds:CornerBounds):boolean {
  return points.length>=3&&points.every(point=>pointInCorner(point,bounds));
}

/** Context only: direction and distance from the display edge to the actual hinge. */
export function doorEdgeMarker(hinge:FloorPoint,bounds:CornerBounds){
  if(![hinge.x,hinge.y].every(Number.isFinite)||pointInCorner(hinge,bounds))return null;
  const anchor={x:Math.max(bounds.minX,Math.min(bounds.maxX,hinge.x)),y:Math.max(bounds.minY,Math.min(bounds.maxY,hinge.y))};
  const dx=hinge.x-anchor.x,dy=hinge.y-anchor.y,distanceM=Math.hypot(dx,dy);
  if(distanceM<1e-9)return null;
  return {anchor,direction:{x:dx/distanceM,y:dy/distanceM},distanceM,label:'Door\n'+distanceM.toFixed(2)+' m'};
}

/** Liang–Barsky retains the original line direction and exact endpoints at the crop. */
export function clipFloorSegment(a:FloorPoint,b:FloorPoint,r:CornerBounds):{from:FloorPoint;to:FloorPoint}|null {
  if(![a.x,a.y,b.x,b.y].every(Number.isFinite))return null;
  const dx=b.x-a.x,dy=b.y-a.y,p=[-dx,dx,-dy,dy],q=[a.x-r.minX,r.maxX-a.x,a.y-r.minY,r.maxY-a.y];
  let enter=0,exit=1;
  for(let n=0;n<4;n++){
    if(Math.abs(p[n])<1e-12){if(q[n]<0)return null;continue;}
    const t=q[n]/p[n];
    if(p[n]<0)enter=Math.max(enter,t);else exit=Math.min(exit,t);
    if(enter>exit)return null;
  }
  return {from:{x:a.x+enter*dx,y:a.y+enter*dy},to:{x:a.x+exit*dx,y:a.y+exit*dy}};
}

/** Convex clipping for translucent furniture faces; dimensions stay in original metres. */
export function clipFloorPolygon(points:FloorPoint[],r:CornerBounds):FloorPoint[] {
  let output=points.map(p=>({...p}));
  for(const [axis,value,positive] of [['x',r.minX,true],['x',r.maxX,false],['y',r.minY,true],['y',r.maxY,false]] as const){
    const input=output;output=[];if(!input.length)break;
    const inside=(p:FloorPoint)=>positive?p[axis]>=value:p[axis]<=value;
    const cross=(a:FloorPoint,b:FloorPoint)=>{const t=(value-a[axis])/(b[axis]-a[axis]);return{x:a.x+t*(b.x-a.x),y:a.y+t*(b.y-a.y)};};
    for(let n=0;n<input.length;n++){
      const a=input[n],b=input[(n+1)%input.length],ai=inside(a),bi=inside(b);
      if(ai&&bi)output.push(b);else if(ai&&!bi)output.push(cross(a,b));else if(!ai&&bi)output.push(cross(a,b),b);
    }
  }
  return output;
}

/** A narrow soft edge, so the crop is visibly a view boundary rather than a new wall. */
export function cornerOpacity(point:FloorPoint,r:CornerBounds,fadeM=.12):number {
  const edge=Math.min(point.x-r.minX,r.maxX-point.x,point.y-r.minY,r.maxY-point.y);
  return Math.max(0,Math.min(1,edge/Math.max(.001,fadeM)));
}
