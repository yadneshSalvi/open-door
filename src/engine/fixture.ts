import type { EvaluationInput, RoomModel } from "./types";
import { objectPolygon, polygonsIntersect } from "./geometry";
export const fixture: EvaluationInput = {
  room:{
    schemaVersion:"1.0",id:"quiet-room-v1",name:"The quiet room",revision:0,width:4.2,depth:3.4,provenance:"provided_fixture",
    objects:[
      {id:"bed",name:"Oak bed",kind:"bed",pose:{x:2.8,y:2.32,theta:0},width:1.6,depth:2,height:.56,movable:true,locked:true,uncertainty:0},
      {id:"table",name:"Bedside table",kind:"table",pose:{x:1.62,y:2.87,theta:0},width:.48,depth:.5,height:.5,movable:true,locked:false,uncertainty:0},
      {id:"bench",name:"Entry bench",kind:"bench",pose:{x:.78,y:.64,theta:0},width:.8,depth:.34,height:.45,movable:true,locked:false,uncertainty:0},
      {id:"wardrobe",name:"Wardrobe",kind:"wardrobe",pose:{x:.35,y:2.66,theta:0},width:.62,depth:1.2,height:1.8,movable:true,locked:false,uncertainty:0},
    ],
    door:{id:"door",name:"Bedroom door",hinge:{x:.16,y:.12},width:.98,thickness:.04,closedAngle:0,openAngle:Math.PI/2,fixedAngle:Math.PI/2,height:2.05},
  },
  profile:{id:"provided-profile-v1",name:"Example device",width:.66,length:1.05,height:1.1,clearance:.03,uncertainty:0,movement:"pivot",minimumTurningRadius:.65,allowReverse:true},
  journey:{id:"bedside",name:"Reach the bedside",start:{x:1.18,y:1.45,theta:Math.PI/2},goal:{x:1.52,y:2.63,theta:Math.PI/2},positionTolerance:.06,headingTolerance:Math.PI/24},
};
export const suggestedPositions: Record<string,{x:number;y:number}>={table:{x:3.88,y:2.85},bench:{x:3.56,y:.48}};
export function cloneInput():EvaluationInput { return JSON.parse(JSON.stringify(fixture)); }
export function placementIssue(room:RoomModel,id:string,x:number,y:number,theta?:number):string|null {
  const object=room.objects.find(o=>o.id===id);if(!object)return "That object is not in the room.";
  if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(theta??object.pose.theta))return "Use finite coordinates.";
  const polygon=objectPolygon({...object,pose:{x,y,theta:theta??object.pose.theta}});
  if(polygon.some(p=>p.x<0||p.y<0||p.x>room.width||p.y>room.depth))return `${object.name} would cross the room boundary.`;
  const other=room.objects.find(o=>o.id!==id&&polygonsIntersect(polygon,objectPolygon(o)));
  return other?`${object.name} would overlap ${other.name.toLowerCase()}.`:null;
}
export function moveObject(room:RoomModel,id:string,x:number,y:number,theta?:number):RoomModel {
  const object=room.objects.find(o=>o.id===id);
  if(!object || !object.movable || object.locked || placementIssue(room,id,x,y,theta)) return room;
  return {...room,revision:room.revision+1,objects:room.objects.map(o=>o.id===id?{...o,pose:{x,y,theta:theta??o.pose.theta}}:o)};
}
