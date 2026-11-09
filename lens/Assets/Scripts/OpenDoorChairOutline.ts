import {wheelchairParts} from './SpatialPresentation';
import {SpatialMeshBatch} from './SpatialMeshBatch';

/** Wire silhouette inside exactly the same supplied chair envelope as its solid model. */
export function buildChairOutline(parent:SceneObject,profile:{width:number;length:number;height:number},material:(key:string,color:vec4)=>Material){
  const batch=new SpatialMeshBatch(parent,material),color=new vec4(.86,.92,.95,.7);
  for(const part of wheelchairParts(profile)){
    const p=part.position,s=part.size;
    if(part.shape==='wheel'){
      for(const side of [-1,1])for(let n=0;n<24;n++){
        const a=n*Math.PI/12,b=(n+1)*Math.PI/12,z=p.z+side*s.z/2;
        batch.line(new vec3(p.x+Math.cos(a)*s.x/2,p.y+Math.sin(a)*s.y/2,z),new vec3(p.x+Math.cos(b)*s.x/2,p.y+Math.sin(b)*s.y/2,z),color,.35);
      }
    }else{
      const corners:vec3[]=[];for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1])corners.push(new vec3(p.x+x*s.x/2,p.y+y*s.y/2,p.z+z*s.z/2));
      for(let n=0;n<8;n++)for(const bit of [1,2,4])if((n&bit)===0)batch.line(corners[n],corners[n|bit],color,.35);
    }
  }
  batch.flush();
}
