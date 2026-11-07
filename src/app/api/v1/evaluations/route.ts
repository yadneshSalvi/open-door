import { evaluate } from "@/engine/planner";
import { evaluationRequestSchema } from "@/engine/schema";
import { apiError, json, readJSON } from "@/lib/api";
export { OPTIONS } from "@/lib/api";
export const runtime="nodejs";
export const maxDuration=30;
export async function POST(request:Request){
  try{
    const {requestId,generation,...input}=evaluationRequestSchema.parse(await readJSON(request));
    return json({requestId,generation,evaluation:evaluate(input)});
  }catch(error){return apiError(error);}
}
