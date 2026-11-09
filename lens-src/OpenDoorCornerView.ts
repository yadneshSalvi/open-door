import { clipFloorPolygon,clipFloorSegment,CornerBounds,cornerOpacity,FloorPoint,pointInCorner } from './SpatialCorner';

/** A clipped drawing of the existing model at one centimetre per centimetre. */
export class OpenDoorCornerView {
  constructor(private parent:SceneObject,private bounds:CornerBounds,private cubeMesh:RenderMesh,
    private material:(key:string,color:vec4)=>Material,private point:(x:number,y:number,z:number)=>vec3,private yawOffset=0){}

  private node(name:string){const object=global.scene.createSceneObject(name);object.setParent(this.parent);return object;}
  public line(from:FloorPoint,to:FloorPoint,color:vec4,widthCm=1,heightM=.008,dashed=false) {
    const segment=clipFloorSegment(from,to,this.bounds);if(!segment)return;
    const dx=segment.to.x-segment.from.x,dy=segment.to.y-segment.from.y,length=Math.hypot(dx,dy);
    if(length<.0001)return;
    const pieces=Math.max(1,Math.ceil(length/(dashed?.07:.12)));
    for(let n=0;n<pieces;n++){
      if(dashed&&n%2)continue;
      const t=(n+.5)/pieces,x=segment.from.x+dx*t,y=segment.from.y+dy*t;
      const fade=cornerOpacity({x,y},this.bounds);if(fade<.015)continue;
      const alpha=Math.round(color.w*fade*16)/16;if(alpha<=0)continue;
      const object=this.node('Clipped floor mark'),visual=object.createComponent('Component.RenderMeshVisual');
      visual.mesh=this.cubeMesh;visual.mainMaterial=this.material('evidence-corner-line-'+[color.x,color.y,color.z,alpha].join('-'),new vec4(color.x,color.y,color.z,alpha));
      object.getTransform().setLocalPosition(this.point(x,y,heightM));
      object.getTransform().setLocalRotation(quat.angleAxis(Math.atan2(dy,dx)+this.yawOffset,vec3.up()));
      object.getTransform().setLocalScale(new vec3(length/pieces*100,.18,widthCm));
    }
  }
  public polygon(points:FloorPoint[],color:vec4,widthCm=1,heightM=.008,dashed=false) {
    for(let n=0;n<points.length;n++)this.line(points[n],points[(n+1)%points.length],color,widthCm,heightM,dashed);
  }
  public roomBoundary(room:{width:number;depth:number}) {
    this.polygon([{x:0,y:0},{x:room.width,y:0},{x:room.width,y:room.depth},{x:0,y:room.depth}],new vec4(.9,.95,1,.8),1.4);
    // Corner crop ends fade away. There is deliberately no invented wall at a crop edge.
  }
  public furniture(points:FloorPoint[],heightM:number,color:vec4,filled=true) {
    const polygon=clipFloorPolygon(points,this.bounds);if(polygon.length<3)return;
    if(filled)this.volume(polygon,heightM,new vec4(color.x,color.y,color.z,.26));
    this.polygon(points,color,1.4,.01,true);
    this.polygon(points,new vec4(color.x,color.y,color.z,color.w*.8),1,heightM);
    for(const point of points){
      if(!pointInCorner(point,this.bounds))continue;
      const fade=cornerOpacity(point,this.bounds);if(fade<.01)continue;
      const object=this.node('Furniture height edge'),visual=object.createComponent('Component.RenderMeshVisual');
      visual.mesh=this.cubeMesh;visual.mainMaterial=this.material('evidence-corner-upright-'+[color.x,color.y,color.z,fade].join('-'),new vec4(color.x,color.y,color.z,color.w*fade));
      object.getTransform().setLocalPosition(this.point(point.x,point.y,heightM/2));object.getTransform().setLocalScale(new vec3(.8,heightM*100,.8));
    }
  }
  private volume(points:FloorPoint[],height:number,color:vec4) {
    const builder=new MeshBuilder([{name:'position',components:3},{name:'normal',components:3},{name:'texture0',components:2}]);
    builder.topology=MeshTopology.Triangles;builder.indexType=MeshIndexType.UInt16;
    const vertices:number[]=[],indices:number[]=[];
    const face=(positions:vec3[],normal:vec3)=>{
      const start=vertices.length/8;
      for(const p of positions)vertices.push(p.x,p.y,p.z,normal.x,normal.y,normal.z,0,0);
      for(let n=1;n<positions.length-1;n++)indices.push(start,start+n,start+n+1);
    };
    face(points.map(p=>this.point(p.x,p.y,height)),vec3.up());
    for(let n=0;n<points.length;n++){
      const a=points[n],b=points[(n+1)%points.length],dx=b.x-a.x,dy=b.y-a.y;
      const normal=new vec3(dy,0,dx);if(normal.lengthSquared<1e-12)continue;
      face([this.point(a.x,a.y,0),this.point(b.x,b.y,0),this.point(b.x,b.y,height),this.point(a.x,a.y,height)],normal.normalize());
    }
    builder.appendVerticesInterleaved(vertices);builder.appendIndices(indices);if(!builder.isValid())return;builder.updateMesh();
    const visual=this.node('Transparent furniture box').createComponent('Component.RenderMeshVisual');
    visual.mesh=builder.getMesh();visual.mainMaterial=this.material('evidence-corner-volume-'+[color.x,color.y,color.z].join('-'),color);
  }
}
