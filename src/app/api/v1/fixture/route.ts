import { fixture } from "@/engine/fixture";
import { json } from "@/lib/api";
export { OPTIONS } from "@/lib/api";
export function GET(){return json(fixture);}
