import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import * as corner from '../lens-src/SpatialCorner';
import * as ribbon from '../lens-src/SpatialRouteRibbon';

// SDK boundary simulation, not a rendered or physical-device performance claim.
function renderer(){
  class V {
    constructor(public x=0,public y=0,public z=0,public w=1){} static up(){return new V(0,1,0);}static forward(){return new V(0,0,1);}
    sub(b:V){return new V(this.x-b.x,this.y-b.y,this.z-b.z);}add(b:V){return new V(this.x+b.x,this.y+b.y,this.z+b.z);}uniformScale(k:number){return new V(this.x*k,this.y*k,this.z*k);}
    cross(b:V){return new V(this.y*b.z-this.z*b.y,this.z*b.x-this.x*b.z,this.x*b.y-this.y*b.x);}get lengthSquared(){return this.x*this.x+this.y*this.y+this.z*this.z;}normalize(){return this.uniformScale(1/Math.sqrt(this.lengthSquared));}
  }
  const nodes:any[]=[],meshes:any[]=[];
  class Builder {vertices:number[]=[];indices:number[]=[];constructor(_format:unknown){}appendVerticesInterleaved(v:number[]){this.vertices=this.vertices.concat(v);}appendIndices(i:number[]){this.indices=this.indices.concat(i);}isValid(){return this.vertices.length%8===0&&this.vertices.every(Number.isFinite)&&this.indices.every(i=>Number.isInteger(i)&&i>=0&&i<this.vertices.length/8);}updateMesh(){meshes.push(this);}getMesh(){return this;}}
  const globals={vec3:V,vec4:V,MeshBuilder:Builder,MeshTopology:{Triangles:1},MeshIndexType:{UInt16:1},global:{scene:{createSceneObject:(name:string)=>{const node={name,setParent:()=>{},createComponent:()=>({})};nodes.push(node);return node;}}}};
  const load=(name:string,require:(id:string)=>unknown)=>{const source=ts.transpileModule(readFileSync(new URL('../lens-src/'+name,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2021}}).outputText,exports:any={};new Function('require','exports',...Object.keys(globals),source)(require,exports,...Object.values(globals));return exports;};
  const batch=load('SpatialMeshBatch.ts',()=>({}));
  const module=load('OpenDoorCornerView.ts',id=>id==='./SpatialMeshBatch'?batch:id==='./SpatialCorner'?corner:ribbon);
  const view=new module.OpenDoorCornerView({}, {minX:0,minY:0,maxX:2,maxY:2},{},()=>({}),(x:number,y:number,z:number)=>new V(x*100,z*100,-y*100));
  return {view,nodes,meshes,V};
}

describe('native display batching',()=>{
  it('creates one mesh per colour rather than one SceneObject per floor fragment',()=>{
    const {view,nodes,meshes,V}=renderer();for(let n=0;n<100;n++)view.line({x:0,y:n/60},{x:2,y:n/60},new V(1,1,1,.5),.1,.01,true);
    view.flush();expect(nodes).toHaveLength(1);expect(meshes).toHaveLength(1);expect(meshes[0].isValid()).toBe(true);
    expect(meshes[0].vertices.length/8).toBeLessThan(65536);
  });
  it('keeps a room outline, partial furniture and one ribbon in a bounded number of batches',()=>{
    const {view,nodes,meshes,V}=renderer();view.roomBoundary({width:4.2,depth:3.4});view.furniture([{x:1.6,y:.5},{x:2.6,y:.5},{x:2.6,y:1.5},{x:1.6,y:1.5}],.6,new V(1,1,1,1));
    view.ribbon(Array.from({length:20},(_,n)=>({x:.7+n*.025,y:1,theta:0})),1.05,.66);view.flush();
    expect(nodes.length).toBeLessThanOrEqual(8);expect(meshes.every(mesh=>mesh.isValid())).toBe(true);
    expect(meshes.flatMap(mesh=>mesh.vertices.filter((_:number,i:number)=>i%8===0)).every((x:number)=>x>=-1.1&&x<=201.1)).toBe(true);
  });
});
