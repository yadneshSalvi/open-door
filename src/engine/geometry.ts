import type { Clearance, Motion, Obstacle, Polygon, Pose, RoomObject, Vec2 } from "./types";

export const EPS = 1e-9;
export const TAU = Math.PI * 2;
export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);
export const normalizeAngle = (theta: number) => ((theta + Math.PI) % TAU + TAU) % TAU - Math.PI;
export const angleDistance = (a: number, b: number) => Math.abs(normalizeAngle(a - b));

export function rectangle(length: number, width: number): Polygon {
  return [{x: -length/2, y: -width/2}, {x: length/2, y: -width/2}, {x: length/2, y: width/2}, {x: -length/2, y: width/2}];
}
export function transform(poly: Polygon, pose: Pose): Polygon {
  const c = Math.cos(pose.theta), s = Math.sin(pose.theta);
  return poly.map(p => ({x: pose.x + p.x*c - p.y*s, y: pose.y + p.x*s + p.y*c}));
}
export function objectPolygon(object: RoomObject): Polygon {
  return transform(rectangle(object.width, object.depth), object.pose);
}
export function cross(a: Vec2, b: Vec2, c: Vec2) {
  return (b.x-a.x)*(c.y-a.y) - (b.y-a.y)*(c.x-a.x);
}
export function pointSegmentDistance(p: Vec2, a: Vec2, b: Vec2) {
  const dx = b.x-a.x, dy = b.y-a.y;
  const len = dx*dx+dy*dy;
  const t = len < EPS ? 0 : Math.max(0, Math.min(1, ((p.x-a.x)*dx+(p.y-a.y)*dy)/len));
  return Math.hypot(p.x-a.x-t*dx, p.y-a.y-t*dy);
}
export function segmentsIntersect(a: Vec2, b: Vec2, c: Vec2, d: Vec2): boolean {
  const c1 = cross(a,b,c), c2 = cross(a,b,d), c3 = cross(c,d,a), c4 = cross(c,d,b);
  if (((c1 > EPS && c2 < -EPS) || (c1 < -EPS && c2 > EPS)) && ((c3 > EPS && c4 < -EPS) || (c3 < -EPS && c4 > EPS))) return true;
  return (Math.abs(c1)<EPS && pointSegmentDistance(c,a,b)<EPS) || (Math.abs(c2)<EPS && pointSegmentDistance(d,a,b)<EPS) || (Math.abs(c3)<EPS && pointSegmentDistance(a,c,d)<EPS) || (Math.abs(c4)<EPS && pointSegmentDistance(b,c,d)<EPS);
}
export function pointInPolygon(point: Vec2, polygon: Polygon): boolean {
  let inside = false;
  for (let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a = polygon[i], b = polygon[j];
    if (pointSegmentDistance(point,a,b)<EPS) return true;
    if ((a.y>point.y)!==(b.y>point.y) && point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
}
export function polygonsIntersect(a: Polygon, b: Polygon): boolean {
  // The supported footprint primitives are convex; SAT includes boundary contact.
  for (const poly of [a,b]) for (let i=0;i<poly.length;i++) {
    const p=poly[i], q=poly[(i+1)%poly.length], nx=q.y-p.y, ny=p.x-q.x;
    let amin=Infinity,amax=-Infinity,bmin=Infinity,bmax=-Infinity;
    for (const v of a) {const k=v.x*nx+v.y*ny; amin=Math.min(amin,k);amax=Math.max(amax,k);}
    for (const v of b) {const k=v.x*nx+v.y*ny; bmin=Math.min(bmin,k);bmax=Math.max(bmax,k);}
    if (amax < bmin-EPS || bmax < amin-EPS) return false;
  }
  return true;
}
export function polygonDistance(a: Polygon, b: Polygon): number {
  if (polygonsIntersect(a,b)) return 0;
  let result=Infinity;
  for (let i=0;i<a.length;i++) for(let j=0;j<b.length;j++) {
    result=Math.min(result,pointSegmentDistance(a[i],b[j],b[(j+1)%b.length]),pointSegmentDistance(b[j],a[i],a[(i+1)%a.length]));
  }
  return result;
}
export function poseAt(motion: Motion, t: number): Pose {
  const {start,distance:d,angle:a}=motion;
  if(Math.abs(a)<EPS) return {x:start.x+d*t*Math.cos(start.theta), y:start.y+d*t*Math.sin(start.theta),theta:start.theta};
  const theta=start.theta+a*t, radius=d/a;
  return {x:start.x+radius*(Math.sin(theta)-Math.sin(start.theta)),y:start.y-radius*(Math.cos(theta)-Math.cos(start.theta)),theta:normalizeAngle(theta)};
}
export function clearanceAt(local: Polygon, pose: Pose, obstacles: Obstacle[], buffer: number, boundary?: {width:number;depth:number}): Clearance {
  const footprint=transform(local,pose);
  let distanceTo=Infinity;
  let witness: Clearance["witness"];
  if(boundary) {
    const raw=Math.min(...footprint.flatMap(p=>[p.x,p.y,boundary.width-p.x,boundary.depth-p.y]));
    distanceTo=raw-buffer;
    if(distanceTo<=EPS) witness={objectId:"room-boundary",objectName:"Room boundary",pose,footprint,obstacle:[],clearance:distanceTo,kind:"boundary"};
  }
  for(const obstacle of obstacles) {
    const raw=polygonDistance(footprint,obstacle.polygon);
    const gap=raw-buffer-obstacle.uncertainty;
    if(gap < distanceTo || (gap<=EPS && !witness)) {
      distanceTo=Math.min(distanceTo,gap);
      if(gap<=EPS) witness={objectId:obstacle.id,objectName:obstacle.name,pose,footprint,obstacle:obstacle.polygon,clearance:gap,kind:raw<=EPS?"intersection":"buffer"};
    }
  }
  return {distance:distanceTo,witness};
}

export interface SweepResult { status: "clear" | "blocked" | "uncertain"; clearance: number; witness?: Clearance["witness"]; samples: number }
/**
 * Certifies each interval using a Lipschitz bound: every point moves at most
 * |arc length| + radius * |angle| from its midpoint. Distance to a fixed set is
 * 1-Lipschitz. A sampled gap exceeding that bound proves the whole interval clear.
 * A tiny unresolved interval is uncertain, never silently accepted.
 */
export function verifyMotion(local: Polygon, motion: Motion, obstacles: Obstacle[], buffer: number, boundary?: {width:number;depth:number}, tolerance=0.001): SweepResult {
  const radius=Math.max(...local.map(p=>Math.hypot(p.x,p.y)));
  const movement=Math.abs(motion.distance)+radius*Math.abs(motion.angle);
  let samples=0, clearance=Infinity;
  for(const t of [0,1]) {
    const c=clearanceAt(local,poseAt(motion,t),obstacles,buffer,boundary); samples++;
    if(c.distance<=EPS) return {status:"blocked",clearance:c.distance,witness:c.witness,samples};
  }
  const stack:[[number,number,number]]|[number,number,number][]=[[0,1,0]];
  let unresolved=false;
  while(stack.length) {
    const [lo,hi,depth]=stack.pop()!;
    const c=clearanceAt(local,poseAt(motion,(lo+hi)/2),obstacles,buffer,boundary); samples++;
    if(c.distance<=EPS) return {status:"blocked",clearance:c.distance,witness:c.witness,samples};
    const bound=movement*(hi-lo)/2;
    if(c.distance>bound+EPS) {clearance=Math.min(clearance,c.distance-bound);continue;}
    if(bound<=tolerance || depth>=22) {unresolved=true;clearance=Math.min(clearance,c.distance-bound);continue;}
    const mid=(lo+hi)/2;
    stack.push([mid,hi,depth+1],[lo,mid,depth+1]);
  }
  return {status:unresolved?"uncertain":"clear",clearance,samples};
}

export const roomToLens=(p:{x:number;y:number;z:number})=>({x:p.x*100,y:p.z*100,z:-p.y*100});
export const lensToRoom=(p:{x:number;y:number;z:number})=>({x:p.x/100,y:-p.z/100,z:p.y/100});

/** Stable deterministic fingerprint. Identification only, not authentication. */
export function stableHash(value: unknown): string {
  function canonical(v:unknown):string {
    if(v===null || typeof v!=="object") return JSON.stringify(v);
    if(Array.isArray(v)) return "["+v.map(canonical).join(",")+"]";
    return "{"+Object.keys(v).sort().map(k=>JSON.stringify(k)+":"+canonical((v as Record<string,unknown>)[k])).join(",")+"}";
  }
  const text=canonical(value); let a=0x811c9dc5,b=0x9e3779b9;
  for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),2246822519);}
  return (a>>>0).toString(16).padStart(8,"0")+(b>>>0).toString(16).padStart(8,"0");
}
