import { z } from "zod";
import { evaluationInputSchema, roomSchema, preferredMotionsSchema } from "@/engine/schema";
import { stableHash } from "@/engine/geometry";
import { evaluate } from "@/engine/planner";
import { apiError, ApiError, json, readJSON } from "@/lib/api";
import { acceptedRepairEvidenceSchema, verifyRepairEvidence } from "@/lib/repair-evidence";
import { changesSince, planSVG } from "@/lib/export-plan";
export { OPTIONS } from "@/lib/api";
export const maxDuration=30;
const schema=z.object({input:evaluationInputSchema,expectedHash:z.string(),baseline:roomSchema,preferredMotions:preferredMotionsSchema,repairEvidence:acceptedRepairEvidenceSchema.optional(),requestId:z.string().max(100)}).strict();
export async function POST(request:Request){
  try{
    const {input,expectedHash,baseline,requestId,preferredMotions,repairEvidence}=schema.parse(await readJSON(request));
    if(stableHash(input)!==expectedHash)throw new ApiError("The layout changed. Check this revision before exporting.",409);
    let repair;
    if(repairEvidence){
      try{repair=verifyRepairEvidence(input,preferredMotions,repairEvidence);}
      catch(error){throw new ApiError(error instanceof Error?error.message:"Repair evidence could not be verified.",422);}
    }
    const evaluation=evaluate(input,preferredMotions);
    return json({requestId,revision:input.room.revision,inputHash:expectedHash,svg:planSVG(input,evaluation),plan:{schemaVersion:"1.0",title:"Open Door dimensioned plan",input,evaluation,repair,changes:changesSince(baseline,input.room),scope:"Geometric planning aid. No accessibility certification. Physical comfort, transfers, force and hardware behavior remain unassessed."}});
  }catch(error){return apiError(error);}
}
