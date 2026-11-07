import { z } from "zod";
export const apiHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"POST, GET, OPTIONS","Access-Control-Allow-Headers":"Content-Type","Cache-Control":"no-store"};
export function json(data:unknown,status=200){return Response.json(data,{status,headers:apiHeaders});}
export async function readJSON(request:Request,maxBytes=64000):Promise<unknown>{
  if(!request.headers.get("content-type")?.toLowerCase().includes("application/json"))throw new ApiError("Send JSON with Content-Type: application/json.",415);
  const length=Number(request.headers.get("content-length")??0);
  if(length>maxBytes)throw new ApiError("This model is too large for the demo.",413);
  const reader=request.body?.getReader();if(!reader)throw new ApiError("A JSON body is required.",400);
  let total=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBytes){await reader.cancel();throw new ApiError("This model is too large for the demo.",413);}chunks.push(value);}
  const body=new Uint8Array(total);let offset=0;for(const chunk of chunks){body.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(body));}catch{throw new ApiError("The body is not valid JSON.",400);}
}
export class ApiError extends Error {constructor(message:string,public status:number){super(message);}}
export function apiError(error:unknown){
  if(error instanceof ApiError)return json({error:error.message},error.status);
  if(error instanceof z.ZodError)return json({error:"Check the supplied dimensions and object identifiers.",fields:error.issues.slice(0,8).map(issue=>({path:issue.path.join("."),message:issue.message}))},422);
  return json({error:"This request could not be completed. Your current layout is unchanged."},500);
}
export function OPTIONS(){return new Response(null,{status:204,headers:apiHeaders});}
