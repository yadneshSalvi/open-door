/** Projection-space checks for annotation placement only; never collision geometry. */
export type AnnotationBox={left:number;right:number;top:number;bottom:number};
export function annotationBounds(points:{x:number;y:number}[],padding=.008):AnnotationBox|null {
  if(!points.length||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return null;
  return {left:Math.min(...points.map(p=>p.x))-padding,right:Math.max(...points.map(p=>p.x))+padding,top:Math.min(...points.map(p=>p.y))-padding,bottom:Math.max(...points.map(p=>p.y))+padding};
}
export function annotationsOverlap(a:AnnotationBox,b:AnnotationBox){return a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;}
/** Retain a valid previous slot, otherwise choose the nearest supplied safe slot. */
export function chooseAnnotation(candidates:{box:AnnotationBox|null;cost:number}[],protectedBoxes:AnnotationBox[],occupied:AnnotationBox[],previous=-1,margin=.025,required=false):number {
  const safe=(index:number)=>{const box=candidates[index]?.box;return Boolean(box&&box.left>=margin&&box.right<=1-margin&&box.top>=margin&&box.bottom<=1-margin&&!protectedBoxes.some(o=>annotationsOverlap(box,o))&&!occupied.some(o=>annotationsOverlap(box,o)));};
  if(previous>=0&&safe(previous))return previous;
  let best=-1,cost=Infinity;for(let i=0;i<candidates.length;i++)if(safe(i)&&candidates[i].cost<cost){best=i;cost=candidates[i].cost;}
  if(best>=0||!required)return best;
  // Required chair/obstruction text cannot silently disappear. Prefer the
  // smallest in-frame overlap only if every strict free-space rail is occupied.
  const area=(a:AnnotationBox,b:AnnotationBox)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  let score=Infinity;
  for(let i=0;i<candidates.length;i++){
    const box=candidates[i].box;if(!box||box.left<margin||box.right>1-margin||box.top<margin||box.bottom>1-margin)continue;
    const overlap=protectedBoxes.reduce((sum,b)=>sum+area(box,b),0)+occupied.reduce((sum,b)=>sum+area(box,b)*4,0),value=overlap*100000+candidates[i].cost;
    if(value<score){score=value;best=i;}
  }
  return best;
}
