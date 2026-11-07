import { z } from "zod";
import { objectPolygon, polygonsIntersect } from "./geometry";

const finite=z.number().finite();
const coordinate=finite.min(-20).max(40);
const angle=finite.min(-Math.PI*4).max(Math.PI*4);
const id=z.string().min(1).max(64).regex(/^[a-zA-Z0-9_-]+$/);
const name=z.string().trim().min(1).max(90);
const pose=z.object({x:coordinate,y:coordinate,theta:angle}).strict();
export const roomObjectSchema=z.object({
  id,name,kind:z.enum(["bed","table","bench","wardrobe","custom"]),pose,
  width:finite.min(.05).max(10),depth:finite.min(.05).max(10),height:finite.min(.01).max(5),
  movable:z.boolean(),locked:z.boolean(),uncertainty:finite.min(0).max(.25),
}).strict();
export const roomSchema=z.object({
  schemaVersion:z.literal("1.0"),id,name,revision:z.number().int().nonnegative().max(1e9),
  width:finite.min(1).max(20),depth:finite.min(1).max(20),objects:z.array(roomObjectSchema).max(24),
  door:z.object({id,name,hinge:z.object({x:coordinate,y:coordinate}).strict(),width:finite.min(.2).max(2),thickness:finite.min(.01).max(.15),closedAngle:angle,openAngle:angle,fixedAngle:angle,height:finite.min(.5).max(4)}).strict(),
  provenance:z.enum(["provided_fixture","user_measured"]),
}).strict().superRefine((room,ctx)=>{
  const ids=new Set<string>([room.door.id]);
  for(const object of room.objects){
    if(ids.has(object.id))ctx.addIssue({code:"custom",message:"Object IDs must be unique.",path:["objects"]});
    ids.add(object.id);
    if(objectPolygon(object).some(p=>p.x<0||p.y<0||p.x>room.width||p.y>room.depth))ctx.addIssue({code:"custom",message:`${object.name} crosses the room boundary.`,path:["objects"]});
  }
  for(let i=0;i<room.objects.length;i++)for(let j=i+1;j<room.objects.length;j++)if(polygonsIntersect(objectPolygon(room.objects[i]),objectPolygon(room.objects[j])))ctx.addIssue({code:"custom",message:`${room.objects[i].name} overlaps ${room.objects[j].name}.`,path:["objects"]});
  if(Math.abs(room.door.openAngle-room.door.closedAngle)>Math.PI*2)ctx.addIssue({code:"custom",message:"The door sweep must be at most one full turn.",path:["door"]});
});
export const profileSchema=z.object({
  id,name,width:finite.min(.3).max(1.8),length:finite.min(.4).max(2.5),height:finite.min(.1).max(2.5),
  clearance:finite.min(0).max(.4),uncertainty:finite.min(0).max(.2),movement:z.enum(["pivot","minimum_radius"]),
  minimumTurningRadius:finite.min(.2).max(3),allowReverse:z.boolean(),
}).strict();
export const journeySchema=z.object({id,name,start:pose,goal:pose,positionTolerance:finite.min(.01).max(.2),headingTolerance:finite.min(.01).max(.5)}).strict();
export const evaluationInputSchema=z.object({room:roomSchema,profile:profileSchema,journey:journeySchema}).strict();
export const motionSchema=z.object({start:pose,distance:finite.min(-50).max(50),angle:finite.min(-Math.PI*2).max(Math.PI*2)}).strict();
export const preferredMotionsSchema=z.array(motionSchema).max(2048).optional();
export const evaluationRequestSchema=z.object({room:roomSchema,profile:profileSchema,journey:journeySchema,preferredMotions:preferredMotionsSchema,requestId:z.string().min(1).max(100),generation:z.number().int().nonnegative()}).strict();
