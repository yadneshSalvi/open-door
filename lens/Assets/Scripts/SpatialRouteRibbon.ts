import {FloorPoint} from './SpatialCorner';

type Pose=FloorPoint&{theta:number};
const cross=(a:FloorPoint,b:FloorPoint)=>a.x*b.y-a.y*b.x;
const sub=(a:FloorPoint,b:FloorPoint)=>({x:a.x-b.x,y:a.y-b.y});
const mix=(a:FloorPoint,b:FloorPoint,t:number)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const key=(p:FloorPoint)=>Math.round(p.x*1e7)+','+Math.round(p.y*1e7);
function inside(p:FloorPoint,poly:FloorPoint[],strict=false){
  return poly.every((a,i)=>cross(sub(poly[(i+1)%poly.length],a),sub(p,a))>(strict?1e-9:-1e-9));
}

/** Union of up to 96 checked sample rectangles, for a single visual ribbon only.
 * The unchanged continuous-motion verifier remains the source of the task result.
 */
export function sampledRibbon(path:Pose[],length:number,width:number):FloorPoint[][] {
  if(!path.length||!(length>0&&width>0))return [];
  const samples=path.length<=96?path:Array.from({length:96},(_,i)=>path[Math.round(i*(path.length-1)/95)]);
  const polygons=samples.map(p=>{
    const c=Math.cos(p.theta),s=Math.sin(p.theta);
    return [[-length/2,-width/2],[length/2,-width/2],[length/2,width/2],[-length/2,width/2]].map(([x,y])=>({x:p.x+c*x-s*y,y:p.y+s*x+c*y}));
  });
  const edges:{a:FloorPoint;b:FloorPoint}[]=[];
  for(let n=0;n<polygons.length;n++)for(let j=0;j<4;j++){
    const a=polygons[n][j],b=polygons[n][(j+1)%4],d=sub(b,a),cuts=[0,1];
    for(let m=0;m<polygons.length;m++)if(m!==n)for(let k=0;k<4;k++){
      const c=polygons[m][k],e=polygons[m][(k+1)%4],v=sub(e,c),den=cross(d,v),r=sub(c,a);
      if(Math.abs(den)>1e-12){const t=cross(r,v)/den,u=cross(r,d)/den;if(t>0&&t<1&&u>=0&&u<=1)cuts.push(t);}
      else if(Math.abs(cross(r,d))<1e-10){const q=d.x*d.x+d.y*d.y;for(const p of [c,e]){const t=((p.x-a.x)*d.x+(p.y-a.y)*d.y)/q;if(t>0&&t<1)cuts.push(t);}}
    }
    cuts.sort((x,y)=>x-y);
    for(let k=1;k<cuts.length;k++){
      if(cuts[k]-cuts[k-1]<1e-8)continue;
      const mid=mix(a,b,(cuts[k-1]+cuts[k])/2);
      if(polygons.some((p,m)=>m!==n&&inside(mid,p,true)))continue;
      // Probe just outside this directed CCW edge. Shared internal edges vanish.
      const norm=Math.hypot(d.x,d.y),outside={x:mid.x+d.y/norm*1e-7,y:mid.y-d.x/norm*1e-7};
      if(polygons.some((p,m)=>m!==n&&inside(outside,p)))continue;
      const from=mix(a,b,cuts[k-1]),to=mix(a,b,cuts[k]);
      if(!edges.some(e=>key(e.a)===key(from)&&key(e.b)===key(to)))edges.push({a:from,b:to});
    }
  }
  const loops:FloorPoint[][]=[];
  while(edges.length){
    const first=edges.shift()!,loop=[first.a];let next=first.b;
    for(let n=0;n<4096&&key(next)!==key(loop[0]);n++){
      loop.push(next);const at=edges.findIndex(edge=>key(edge.a)===key(next));if(at<0)break;next=edges.splice(at,1)[0].b;
    }
    if(key(next)===key(loop[0])&&loop.length>=3)loops.push(loop);
  }
  return loops;
}

/** Ear clipping of a simple CCW ribbon boundary; returns original vertex indices. */
export function triangulateRibbon(points:FloorPoint[]):number[] {
  const remaining=points.map((_,i)=>i),out:number[]=[];
  let guard=points.length*points.length;
  while(remaining.length>3&&guard-->0){
    let found=false;
    for(let n=0;n<remaining.length;n++){
      const a=remaining[(n+remaining.length-1)%remaining.length],b=remaining[n],c=remaining[(n+1)%remaining.length];
      const triangle=[points[a],points[b],points[c]];
      if(cross(sub(points[b],points[a]),sub(points[c],points[b]))<=1e-12)continue;
      if(remaining.some(i=>i!==a&&i!==b&&i!==c&&inside(points[i],triangle,true)))continue;
      out.push(a,b,c);remaining.splice(n,1);found=true;break;
    }
    if(!found){const at=remaining.findIndex((i,n)=>Math.abs(cross(sub(points[i],points[remaining[(n+remaining.length-1)%remaining.length]]),sub(points[remaining[(n+1)%remaining.length]],points[i])))<1e-10);if(at<0)return [];remaining.splice(at,1);}
  }
  if(remaining.length===3)out.push(...remaining);
  return out;
}
