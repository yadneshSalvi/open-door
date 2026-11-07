import { cloneInput, moveObject, suggestedPositions } from "../src/engine/fixture";
import { evaluate } from "../src/engine/planner";
const input=cloneInput();
for(const step of ["baseline","table","bench"]){
  if(step!=="baseline"){const p=suggestedPositions[step];input.room=moveObject(input.room,step,p.x,p.y);}
  const result=evaluate(input);
  console.log(JSON.stringify({step,revision:result.revision,hash:result.inputHash,durationMs:result.durationMs,journey:result.tasks.journey.status,routePoints:result.tasks.journey.path.length,door:result.tasks.door.status,witnesses:[result.tasks.journey.witness?.objectId,result.tasks.door.witness?.objectId]},null,2));
}
