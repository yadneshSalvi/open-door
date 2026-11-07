import { describe, expect, it } from "vitest";
import { cloneInput, moveObject, placementIssue } from "../src/engine/fixture";
import { stableHash } from "../src/engine/geometry";
import { evaluate } from "../src/engine/planner";
import { evaluationInputSchema } from "../src/engine/schema";
import { createShareLink, readShareLink, shareQRCode } from "../src/engine/share";
import { RequestGuard } from "../src/lib/request-guard";
import { validateProposal } from "../src/lib/preferences";
import { POST as evaluateRequest } from "../src/app/api/v1/evaluations/route";
import { POST as exportRequest } from "../src/app/api/v1/exports/route";

const request=(body:unknown)=>new Request("https://example.com/api",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
describe("revision and cancellation contracts",()=>{
  it("rejects an older response even when cancellation retries identical input",()=>{
    const guard=new RequestGuard(),input=cloneInput(),evaluation=evaluate(input);
    const first=guard.begin(input);guard.cancel();const second=guard.begin(input);
    expect(guard.accepts({...first,evaluation})).toBe(false);
    expect(guard.accepts({...second,evaluation})).toBe(true);
    expect(guard.accepts({...second,evaluation})).toBe(false);
  });
  it("rejects a profile or revision mismatch, then accepts the active result",()=>{
    const guard=new RequestGuard(),input=cloneInput(),old=evaluate(input),first=guard.begin(input);
    input.profile.width=.7;input.room.revision++;const second=guard.begin(input);
    expect(guard.accepts({...first,evaluation:old})).toBe(false);
    expect(guard.accepts({...second,evaluation:old})).toBe(false);
    expect(guard.accepts({...second,evaluation:evaluate(input)})).toBe(true);
  });
});
describe("input and proposal boundaries",()=>{
  it("rejects non-finite dimensions, duplicate IDs, unknown fields and overlapping furniture",()=>{
    let i=cloneInput();i.profile.width=Infinity;expect(evaluationInputSchema.safeParse(i).success).toBe(false);
    i=cloneInput();i.room.objects[1].id="bed";expect(evaluationInputSchema.safeParse(i).success).toBe(false);
    i=cloneInput();expect(evaluationInputSchema.safeParse({...i,verified:true}).success).toBe(false);
    i=cloneInput();i.room.objects[1].pose={...i.room.objects[0].pose};expect(evaluationInputSchema.safeParse(i).success).toBe(false);
  });
  it("rejects impossible placements and preserves locked objects",()=>{
    const i=cloneInput();expect(placementIssue(i.room,"table",-1,0)).toContain("boundary");
    expect(placementIssue(i.room,"table",2.8,2.3)).toContain("overlap");
    expect(moveObject(i.room,"table",2.8,2.3)).toBe(i.room);
    expect(moveObject(i.room,"bed",3,2)).toBe(i.room);
  });
  it("rejects unknown model-proposed object IDs and fabricated success fields",()=>{
    const value={summary:"Keep the bed.",locks:[{objectId:"not-a-real-object",locked:true}],clearanceCm:null,deviceWidthCm:null,deviceLengthCm:null,allowReverse:null,unassessed:[]};
    expect(()=>validateProposal(value,["bed"])).toThrow();
    expect(()=>validateProposal({...value,locks:[],verified:true},["bed"])).toThrow();
    expect(validateProposal({...value,locks:[{objectId:"bed",locked:true}]},["bed"]).locks[0].locked).toBe(true);
  });
});
describe("self-contained sharing and exact exports",()=>{
  it("round-trips a changed room and profile with a compact scannable QR",()=>{
    const input=cloneInput();input.room=moveObject(input.room,"table",3.88,2.85);input.profile.clearance=.05;
    const link=createShareLink(input,"https://open-door.example.com");
    const restored=readShareLink(link.slice(link.indexOf("#")));
    expect(restored).toEqual(input);expect(stableHash(restored)).toBe(stableHash(input));
    expect(link.length).toBeLessThan(600);
    const matrix=shareQRCode(input,"https://open-door.example.com");expect(matrix.length).toBeLessThan(90);expect(matrix.every(row=>row.length===matrix.length)).toBe(true);
  });
  it("rejects unsupported/incomplete shared plans and insecure destinations",()=>{
    expect(()=>createShareLink(cloneInput(),"javascript:alert(1)")).toThrow();
    expect(()=>readShareLink("#plan=corrupted")).toThrow();
  });
  it("requires the export input hash to match and re-evaluates the same revision",async()=>{
    const input=cloneInput(),baseline=cloneInput().room;
    let response=await exportRequest(request({input,baseline,expectedHash:"stale",requestId:"export-old"}));expect(response.status).toBe(409);
    response=await exportRequest(request({input,baseline,expectedHash:stableHash(input),requestId:"export-current"}));expect(response.status).toBe(200);
    const body=await response.json();expect(body.inputHash).toBe(stableHash(input));expect(body.plan.evaluation.revision).toBe(input.room.revision);expect(body.svg).toContain("420 cm");expect(body.plan.evaluation.tasks.journey.witness.objectId).toBe("table");
  });
});
describe("HTTPS handler validation",()=>{
  it("returns the active identity and computed witness",async()=>{
    const response=await evaluateRequest(request({...cloneInput(),requestId:"active-request",generation:7}));expect(response.status).toBe(200);
    const body=await response.json();expect(body.requestId).toBe("active-request");expect(body.generation).toBe(7);expect(body.evaluation.tasks.door.witness.objectId).toBe("bench");
  });
  it("bounds payloads and returns validation errors without running invalid models",async()=>{
    let response=await evaluateRequest(request({bad:"model"}));expect(response.status).toBe(422);
    response=await evaluateRequest(request({padding:"x".repeat(65000)}));expect(response.status).toBe(413);
    response=await evaluateRequest(new Request("https://example.com",{method:"POST",body:"not JSON"}));expect(response.status).toBe(415);
  });
});
