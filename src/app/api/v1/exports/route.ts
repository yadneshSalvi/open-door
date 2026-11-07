import { z } from "zod";
import { evaluationInputSchema, roomSchema } from "@/engine/schema";
import { stableHash } from "@/engine/geometry";
import { evaluate } from "@/engine/planner";
import { apiError, ApiError, json, readJSON } from "@/lib/api";
import { changesSince, planSVG } from "@/lib/export-plan";
export { OPTIONS } from "@/lib/api";
export const maxDuration=30;
const schema=z.object({input:evaluationInputSchema,expectedHash:z.string(),baseline:roomSchema,requestId:z.string().max(100)}).strict();
export async function POST(request:Request){
  try{
    const {input,expectedHash,baseline,requestId}=schema.parse(await readJSON(request));
    if(stableHash(input)!==expectedHash)throw new ApiError("The layout changed. Check this revision before exporting.",409);
    const evaluation=evaluate(input);
    return json({requestId,revision:input.room.revision,inputHash:expectedHash,svg:planSVG(input,evaluation),plan:{schemaVersion:"1.0",title:"Open Door dimensioned plan",input,evaluation,changes:changesSince(baseline,input.room),scope:"Geometric planning aid. No accessibility certification. Physical comfort, transfers, force and hardware behavior remain unassessed."}});
  }catch(error){return apiError(error);}
}
