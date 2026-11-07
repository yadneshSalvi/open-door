import { describe, expect, it, vi } from 'vitest';
import { AsyncScope, watchPlanFragment } from '../src/lib/plan-navigation';
import { cloneInput } from '../src/engine/fixture';
import { createShareLink, readShareLink } from '../src/engine/share';
import { evaluationInputSchema } from '../src/engine/schema';

function deferred<T>() {let resolve!:(value:T)=>void,reject!:(reason:Error)=>void;const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function host(hash='') {
  const listeners=new Map<string,Set<()=>void>>();
  return {location:{hash},addEventListener:(type:string,fn:()=>void)=>{if(!listeners.has(type))listeners.set(type,new Set());listeners.get(type)!.add(fn);},
    removeEventListener:(type:string,fn:()=>void)=>{listeners.get(type)?.delete(fn);},
    navigate(next:string,type='hashchange'){this.location.hash=next;for(const fn of listeners.get(type)??[])fn();},
    count(){return [...listeners.values()].reduce((n,set)=>n+set.size,0);}};
}
const settle=async()=>{await Promise.resolve();await Promise.resolve();};
describe('same-tab shared plan navigation',()=>{
  it('loads canonical and same-tab shared revisions, deduplicating hashchange/popstate',async()=>{
    const browser=host(),loaded:{revision:number;fragment:string}[]=[],start=vi.fn();
    const edited=cloneInput();edited.room.revision=11;edited.profile.clearance=.05;
    const fragment=createShareLink(edited,'https://open-door.example.com').split('/#')[1];
    const stop=watchPlanFragment(browser,{onStart:start,load:async hash=>hash?evaluationInputSchema.parse(readShareLink(hash)):cloneInput(),
      onLoad:(value,hash)=>loaded.push({revision:value.room.revision,fragment:hash}),onError:vi.fn()});
    await settle();browser.navigate('#'+fragment);browser.navigate('#'+fragment,'popstate');await settle();
    expect(loaded.map(v=>v.revision)).toEqual([0,11]);expect(start).toHaveBeenCalledTimes(2);
    // Back to canonical, forward to share, then non-plan anchor: canonical semantics.
    browser.navigate('','popstate');await settle();browser.navigate('#'+fragment,'popstate');await settle();browser.navigate('#about');await settle();
    expect(loaded.map(v=>v.revision)).toEqual([0,11,0,11,0]);stop();expect(browser.count()).toBe(0);
  });
  it('captures each fragment before asynchronous parser loading and discards older completion',async()=>{
    const browser=host('#plan=first'),first=deferred<string>(),second=deferred<string>();
    const captured:string[]=[],loaded=vi.fn(),error=vi.fn();
    const stop=watchPlanFragment(browser,{onStart:vi.fn(),load:hash=>{captured.push(hash);return hash==='#plan=first'?first.promise:second.promise;},onLoad:loaded,onError:error});
    browser.navigate('#plan=second');second.resolve('second model');await settle();first.resolve('first model');await settle();
    expect(captured).toEqual(['#plan=first','#plan=second']);expect(loaded).toHaveBeenCalledExactlyOnceWith('second model','#plan=second');expect(error).not.toHaveBeenCalled();stop();
  });
  it('ignores stale failure after back navigation and invalidates pending work on disposal',async()=>{
    const browser=host('#plan=bad'),bad=deferred<string>(),canonical=deferred<string>(),loaded=vi.fn(),error=vi.fn();
    const stop=watchPlanFragment(browser,{onStart:vi.fn(),load:hash=>hash?bad.promise:canonical.promise,onLoad:loaded,onError:error});
    browser.navigate('','popstate');bad.reject(new Error('old parse failed'));await settle();expect(error).not.toHaveBeenCalled();
    stop();canonical.resolve('canonical model');await settle();expect(loaded).not.toHaveBeenCalled();expect(browser.count()).toBe(0);
  });
  it('reports the active malformed plan once, allowing a subsequent valid navigation',async()=>{
    const browser=host('#plan=bad'),loaded=vi.fn(),error=vi.fn();
    const stop=watchPlanFragment(browser,{onStart:vi.fn(),load:async hash=>{if(hash==='#plan=bad')throw new Error('invalid');return 'valid';},onLoad:loaded,onError:error});
    await settle();expect(error).toHaveBeenCalledOnce();browser.navigate('#plan=good');await settle();expect(loaded).toHaveBeenCalledExactlyOnceWith('valid','#plan=good');stop();
  });
});
describe('model async lifetime',()=>{
  it('aborts old operations and prevents success, catch and finally writes after navigation',async()=>{
    const scope=new AsyncScope(),success=deferred<void>(),failure=deferred<void>(),writes:string[]=[];
    async function run(promise:Promise<void>) {const work=scope.begin();try{await promise;if(work.isCurrent())writes.push('success');}catch{if(work.isCurrent())writes.push('error');}finally{if(work.isCurrent())writes.push('finished');work.finish();}}
    const old=scope.begin(),a=run(success.promise),b=run(failure.promise);scope.invalidate();
    expect(old.signal.aborted).toBe(true);expect(old.isCurrent()).toBe(false);
    success.resolve();failure.reject(new Error('stale export/preferences/evaluation error'));await Promise.all([a,b]);expect(writes).toEqual([]);
    const current=scope.begin();expect(current.isCurrent()).toBe(true);current.finish();
  });
  it('invalidates non-abortable share/import completions, including same-input retry and unmount',()=>{
    const scope=new AsyncScope(),share=scope.begin(),file=scope.begin();scope.invalidate();
    expect(share.isCurrent()).toBe(false);expect(file.isCurrent()).toBe(false);
    const retry=scope.begin();expect(retry.isCurrent()).toBe(true);scope.invalidate();expect(retry.isCurrent()).toBe(false);
  });
});
