/** Authored display meshes. Outer bounds remain within the unit footprint. */
function mesh(vertices:number[][],indices:number[]):RenderMesh {
  const builder=new MeshBuilder([{name:'position',components:3},{name:'normal',components:3},{name:'texture0',components:2}]);
  builder.topology=MeshTopology.Triangles;
  builder.indexType=MeshIndexType.UInt16;
  builder.appendVerticesInterleaved(vertices.flat());
  builder.appendIndices(indices);
  if(!builder.isValid())throw new Error('Architectural display mesh is invalid.');
  builder.updateMesh();
  return builder.getMesh();
}

export function roundedBoxMesh():RenderMesh {
  const vertices:number[][]=[],indices:number[]=[];
  const grid=[-.5,-.485,-.46,-.44,0,.44,.46,.485,.5];
  const faces=[
    [[1,0,0],[0,1,0],[0,0,1]],
    [[-1,0,0],[0,1,0],[0,0,-1]],
    [[0,1,0],[0,0,1],[1,0,0]],
    [[0,-1,0],[0,0,1],[-1,0,0]],
    [[0,0,1],[1,0,0],[0,1,0]],
    [[0,0,-1],[-1,0,0],[0,1,0]],
  ];
  for(const [normal,u,v] of faces){
    const first=vertices.length;
    for(const y of grid)for(const x of grid){
      const p=normal.map((n,i)=>n*.5+u[i]*x+v[i]*y);
      const nearest=p.map(a=>Math.max(-.44,Math.min(.44,a)));
      const outward=p.map((a,i)=>a-nearest[i]);
      const length=Math.hypot(...outward),n=outward.map(a=>a/length);
      vertices.push([nearest[0]+n[0]*.06,nearest[1]+n[1]*.06,nearest[2]+n[2]*.06,n[0],n[1],n[2],x+.5,y+.5]);
    }
    for(let y=0;y<grid.length-1;y++)for(let x=0;x<grid.length-1;x++){
      const a=first+y*grid.length+x,b=a+1,c=a+grid.length,d=c+1;
      indices.push(a,b,c,b,d,c);
    }
  }
  return mesh(vertices,indices);
}

/** Unit-height cylinder/conical frustum. Maximum radius is .5. */
export function roundVesselMesh(topRadius=.5,bottomRadius=.5):RenderMesh {
  const vertices:number[][]=[],indices:number[]=[],segments=24;
  for(let i=0;i<=segments;i++){
    const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a),slope=bottomRadius-topRadius,n=Math.hypot(1,slope);
    vertices.push([c*bottomRadius,-.5,s*bottomRadius,c/n,slope/n,s/n,i/segments,0]);
    vertices.push([c*topRadius,.5,s*topRadius,c/n,slope/n,s/n,i/segments,1]);
  }
  for(let i=0;i<segments;i++){const a=i*2;indices.push(a,a+1,a+3,a,a+3,a+2);}
  for(const side of [-1,1]){
    const center=vertices.length,radius=side===1?topRadius:bottomRadius;
    vertices.push([0,side*.5,0,0,side,0,.5,.5]);
    for(let i=0;i<=segments;i++){const a=i/segments*Math.PI*2,c=Math.cos(a),s=Math.sin(a);vertices.push([c*radius,side*.5,s*radius,0,side,0,c*.5+.5,s*.5+.5]);}
    for(let i=0;i<segments;i++){
      if(side===1)indices.push(center,center+i+2,center+i+1);
      else indices.push(center,center+i+1,center+i+2);
    }
  }
  return mesh(vertices,indices);
}
