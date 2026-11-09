import {clipFloorPolygon,clipFloorSegment,CornerBounds,doorEdgeMarker,FloorPoint,pointInCorner} from './SpatialCorner';
import {sampledRibbon,triangulateRibbon} from './SpatialRouteRibbon';
import {SpatialMeshBatch} from './SpatialMeshBatch';

/** True-size display clipping. All marks share static meshes, grouped by colour. */
export class OpenDoorCornerView {
  private batch:SpatialMeshBatch;
  constructor(private parent:SceneObject,private bounds:CornerBounds,_cubeMesh:RenderMesh,
    material:(key:string,color:vec4)=>Material,private point:(x:number,y:number,z:number)=>vec3,_yawOffset=0){this.batch=new SpatialMeshBatch(parent,material);}
  public flush(){this.batch.flush();}
  public line(from:FloorPoint,to:FloorPoint,color:vec4,widthCm=1,heightM=.008,dashed=false){
    const segment=clipFloorSegment(from,to,this.bounds);if(!segment)return;
    const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y,length=Math.hypot(dx,dy);if(length<1e-6)return;
    const count=dashed?Math.max(1,Math.ceil(length/.07)):1;
    for(let n=0;n<count;n++){
      if(dashed&&n%2)continue;
      const a=n/count,b=(n+1)/count;
      this.batch.line(this.point(segment.from.x+dx*a,segment.from.y+dy*a,heightM),this.point(segment.from.x+dx*b,segment.from.y+dy*b,heightM),color,widthCm);
    }
  }
  public polygon(points:FloorPoint[],color:vec4,widthCm=1,heightM=.008,dashed=false){
    for(let n=0;n<points.length;n++)this.line(points[n],points[(n+1)%points.length],color,widthCm,heightM,dashed);
  }
  public roomBoundary(room:{width:number;depth:number}){
    const color=new vec4(.92,.95,1,.8),edges=[[{x:0,y:0},{x:0,y:room.depth}],[{x:0,y:room.depth},{x:room.width,y:room.depth}]];
    for(const [a,b] of edges){
      const clipped=clipFloorSegment(a,b,this.bounds);if(!clipped)continue;
      this.line(a,b,color,2,.012);this.line(a,b,color,1,.1);
      for(const p of [clipped.from,clipped.to])this.batch.line(this.point(p.x,p.y,.012),this.point(p.x,p.y,.1),color,1);
    }
    const r=this.bounds;
    this.polygon([{x:r.minX,y:r.minY},{x:r.maxX,y:r.minY},{x:r.maxX,y:r.maxY},{x:r.minX,y:r.maxY}],new vec4(.76,.81,.84,.5),.5,.006,true);
  }
  public doorContext(hinge:FloorPoint){
    const marker=doorEdgeMarker(hinge,this.bounds);if(!marker)return;
    const {anchor:a,direction:d}=marker,t={x:-d.y,y:d.x},color=new vec4(.83,.87,.9,.7);
    // Neutral door symbol, not a checked sweep or mint route continuation.
    const inward={x:a.x-d.x*.14,y:a.y-d.y*.14},tip={x:a.x-d.x*.015,y:a.y-d.y*.015};
    this.line(inward,tip,color,.5,.024,true);
    for(const side of [-1,1])this.line(tip,{x:tip.x-d.x*.04+t.x*.025*side,y:tip.y-d.y*.04+t.y*.025*side},color,.5,.024);
    for(let n=0;n<8;n+=2){const p=(angle:number)=>({x:inward.x+t.x*Math.cos(angle)*.07-d.x*Math.sin(angle)*.07,y:inward.y+t.y*Math.cos(angle)*.07-d.y*Math.sin(angle)*.07});this.line(p(n*Math.PI/16),p((n+1)*Math.PI/16),color,.4,.024);}
  }
  public furniture(points:FloorPoint[],heightM:number,color:vec4,filled=true){
    const polygon=clipFloorPolygon(points,this.bounds);if(polygon.length<3)return;
    const alpha=new vec4(color.x,color.y,color.z,.10);
    if(filled){
      this.batch.face(polygon.map(p=>this.point(p.x,p.y,heightM)),alpha,triangulateRibbon(polygon));
      for(let n=0;n<polygon.length;n++){const a=polygon[n],b=polygon[(n+1)%polygon.length];this.batch.face([this.point(a.x,a.y,0),this.point(b.x,b.y,0),this.point(b.x,b.y,heightM),this.point(a.x,a.y,heightM)],alpha);}
    }
    this.polygon(points,color,1.2,.01);this.polygon(points,new vec4(color.x,color.y,color.z,color.w*.8),1,heightM);
    // Actual corners are upright. A crop intersection is a dashed cut, never a new cabinet corner.
    for(const p of points)if(pointInCorner(p,this.bounds))this.batch.line(this.point(p.x,p.y,.01),this.point(p.x,p.y,heightM),color,.8);
    const onOriginal=(a:FloorPoint,b:FloorPoint)=>points.some((p,n)=>{
      const q=points[(n+1)%points.length],dx=q.x-p.x,dy=q.y-p.y;
      return Math.abs(dx*(a.y-p.y)-dy*(a.x-p.x))<1e-8&&Math.abs(dx*(b.y-p.y)-dy*(b.x-p.x))<1e-8;
    });
    for(let n=0;n<polygon.length;n++){const a=polygon[n],b=polygon[(n+1)%polygon.length];if(onOriginal(a,b))continue;this.line(a,b,color,1,.01,true);this.line(a,b,color,1,heightM,true);}
  }
  public ribbon(path:{x:number;y:number;theta:number}[],length:number,width:number){
    for(const loop of sampledRibbon(path,length,width)){
      const clipped=clipFloorPolygon(loop,this.bounds);if(clipped.length<3)continue;
      this.batch.face(clipped.map(p=>this.point(p.x,p.y,.012)),new vec4(.36,.86,.72,.12),triangulateRibbon(clipped));
      this.polygon(loop,new vec4(.36,.86,.72,.75),.7,.016);
    }
    for(const pose of path){const dx=Math.cos(pose.theta)*.012,dy=Math.sin(pose.theta)*.012;this.line({x:pose.x-dx,y:pose.y-dy},{x:pose.x+dx,y:pose.y+dy},new vec4(.83,.9,.9,.18),.1,.018);}
  }
}
