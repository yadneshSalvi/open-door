import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import qrcode from "qrcode-generator";
import type { EvaluationInput } from "./types";
import { stableHash } from "./geometry";
import { cloneInput, fixture } from "./fixture";

type Delta=[string,unknown][];
function deltaFrom(base:unknown,current:unknown,path=""):Delta|null {
  if(base===null||current===null||typeof base!=="object"||typeof current!=="object")return typeof base===typeof current?(base===current?[]:[[path,current]]):null;
  const a=Object.keys(base),b=Object.keys(current);if(a.join("|")!==b.join("|"))return null;
  let changes:Delta=[];
  for(const key of a){const diff=deltaFrom((base as Record<string,unknown>)[key],(current as Record<string,unknown>)[key],path?path+"."+key:key);if(diff===null)return null;changes=changes.concat(diff);}
  return changes;
}
function applyDelta(changes:unknown):EvaluationInput {
  if(!Array.isArray(changes)||changes.length>256)throw new Error("Invalid shared changes.");
  const input=cloneInput();
  for(const change of changes){
    if(!Array.isArray(change)||change.length!==2||typeof change[0]!=="string")throw new Error("Invalid shared change.");
    const keys=change[0].split(".");let current=input as unknown as Record<string,unknown>;
    for(const key of keys.slice(0,-1)){if(!Object.prototype.hasOwnProperty.call(current,key)||!current[key]||typeof current[key]!=="object")throw new Error("Unknown shared field.");current=current[key] as Record<string,unknown>;}
    const key=keys[keys.length-1];if(!Object.prototype.hasOwnProperty.call(current,key)||typeof current[key]!==typeof change[1]||typeof change[1]==="object")throw new Error("Unknown shared field.");
    current[key]=change[1];
  }
  return input;
}

/** Self-contained, user-initiated share. The fragment stays in the browser until evaluation. */
export function createShareLink(input:EvaluationInput,baseUrl:string):string {
  if(!/^https:\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[^?#]*)?$/.test(baseUrl)&&!/^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/?$/.test(baseUrl))throw new Error("Configure the published HTTPS companion URL first.");
  const hash=stableHash(input),changes=deltaFrom(fixture,input);
  const full=compressToEncodedURIComponent(JSON.stringify({version:1,input,hash}));
  const compact=changes?compressToEncodedURIComponent(JSON.stringify({version:2,fixture:"quiet-room-v1",changes,hash})):full;
  const payload=compact.length<full.length?compact:full;
  return baseUrl.replace(/\/$/,"")+"/#plan="+payload;
}
export function readShareLink(fragment:string):unknown {
  const token=fragment.replace(/^#?plan=/,"");
  if(token.length>16000)throw new Error("This shared plan is too large.");
  const text=decompressFromEncodedURIComponent(token);
  if(!text||text.length>64000)throw new Error("This shared plan is incomplete.");
  const value=JSON.parse(text);
  const input=value.version===1?value.input:value.version===2&&value.fixture==="quiet-room-v1"?applyDelta(value.changes):null;
  if(!input||stableHash(input)!==value.hash)throw new Error("This shared plan could not be verified.");
  return input;
}
export function shareQRCode(input:EvaluationInput,baseUrl:string):boolean[][] {
  const url=createShareLink(input,baseUrl);
  if(url.length>2000)throw new Error("This room is too large for a readable QR plan. Use the JSON export.");
  const qr=qrcode(0,"M");qr.addData(url,"Byte");qr.make();
  const size=qr.getModuleCount();
  return Array.from({length:size},(_,row)=>Array.from({length:size},(_,column)=>qr.isDark(row,column)));
}
