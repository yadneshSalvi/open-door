/** Static display geometry, batched by material. No interactables are created or replaced. */
export class SpatialMeshBatch {
  private groups:Record<string,{color:vec4;vertices:number[];indices:number[];visual?:RenderMeshVisual}>={};
  constructor(private parent:SceneObject,private material:(key:string,color:vec4)=>Material){}
  private group(color:vec4){const key=[color.x,color.y,color.z,color.w].join(',');return this.groups[key]||(this.groups[key]={color,vertices:[],indices:[]});}
  public face(points:vec3[],color:vec4,triangles?:number[]){
    if(points.length<3)return;const group=this.group(color),base=group.vertices.length/8;
    for(const p of points)group.vertices.push(p.x,p.y,p.z,0,1,0,0,0);
    if(triangles)for(const index of triangles)group.indices.push(base+index);
    else for(let n=1;n<points.length-1;n++)group.indices.push(base,base+n,base+n+1);
  }
  public line(a:vec3,b:vec3,color:vec4,widthCm:number){
    const delta=b.sub(a);if(delta.lengthSquared<1e-10)return;
    const unit=delta.normalize(),reference=Math.abs(unit.y)>.95?vec3.forward():vec3.up();
    const side=unit.cross(reference).normalize().uniformScale(widthCm/2),up=unit.cross(side).normalize().uniformScale(widthCm/2);
    const corners=[a.add(side).add(up),a.sub(side).add(up),a.sub(side).sub(up),a.add(side).sub(up),b.add(side).add(up),b.sub(side).add(up),b.sub(side).sub(up),b.add(side).sub(up)];
    for(const indices of [[0,3,2,1],[4,5,6,7],[0,1,5,4],[1,2,6,5],[2,3,7,6],[3,0,4,7]])this.face(indices.map(i=>corners[i]),color);
  }
  public flush(){
    for(const [key,group] of Object.entries(this.groups)){
      if(!group.indices.length)continue;
      const builder=new MeshBuilder([{name:'position',components:3},{name:'normal',components:3},{name:'texture0',components:2}]);
      builder.topology=MeshTopology.Triangles;builder.indexType=MeshIndexType.UInt16;
      builder.appendVerticesInterleaved(group.vertices);builder.appendIndices(group.indices);if(!builder.isValid())throw new Error('Invalid display mesh batch');builder.updateMesh();
      if(!group.visual){const node=global.scene.createSceneObject('Batched evidence');node.setParent(this.parent);group.visual=node.createComponent('Component.RenderMeshVisual');group.visual.mainMaterial=this.material('evidence-batch-'+key,group.color);}
      group.visual.mesh=builder.getMesh();
    }
  }
}
