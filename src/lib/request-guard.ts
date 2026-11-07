import type { EvaluationInput, EvaluationResponse } from "@/engine/types";
import { stableHash } from "@/engine/geometry";

/** Cancelling then retrying identical input still creates a distinct active generation. */
export class RequestGuard {
  private generation=0;
  private active:{requestId:string;generation:number;revision:number;hash:string;consumed:boolean}|null=null;
  begin(input:EvaluationInput) {
    this.generation++;
    const requestId=`od-${this.generation}-${Date.now().toString(36)}`;
    this.active={requestId,generation:this.generation,revision:input.room.revision,hash:stableHash(input),consumed:false};
    return {requestId,generation:this.generation};
  }
  cancel(){this.generation++;this.active=null;}
  accepts(response:EvaluationResponse):boolean {
    const a=this.active;
    if(!a || a.consumed || a.generation!==response.generation || a.requestId!==response.requestId || a.revision!==response.evaluation.revision || a.hash!==response.evaluation.inputHash)return false;
    a.consumed=true;
    return true;
  }
}
