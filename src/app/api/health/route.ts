import { SOLVER_VERSION } from "@/engine/planner";
export function GET(){return Response.json({status:"ok",service:"Open Door",solverVersion:SOLVER_VERSION,aiConfigured:Boolean(process.env.OPENAI_API_KEY)});}
