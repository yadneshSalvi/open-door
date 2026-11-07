/** A model/session change invalidates success, failure and finally callbacks alike. */
export class AsyncScope {
  private generation=0;
  private controllers=new Set<AbortController>();
  begin() {
    const generation=this.generation,controller=new AbortController();
    this.controllers.add(controller);
    return {signal:controller.signal,isCurrent:()=>generation===this.generation&&!controller.signal.aborted,
      cancel:()=>{controller.abort();this.controllers.delete(controller);},
      finish:()=>this.controllers.delete(controller)};
  }
  invalidate() {
    this.generation++;
    for(const controller of this.controllers)controller.abort();
    this.controllers.clear();
  }
}

type FragmentHost={location:{hash:string};addEventListener:(type:string,listener:()=>void)=>void;removeEventListener:(type:string,listener:()=>void)=>void};
/** Capture before awaiting the parser; hashchange/popstate often describe one navigation. */
export function watchPlanFragment<T>(host:FragmentHost,options:{
  load:(fragment:string)=>Promise<T>;onStart:()=>void;onLoad:(value:T,fragment:string)=>void;onError:()=>void;
}) {
  let previous:string|undefined,generation=0,disposed=false;
  const navigate=()=>{
    const fragment=host.location.hash.startsWith('#plan=')?host.location.hash:'';
    if(fragment===previous)return;
    previous=fragment;const current=++generation;options.onStart();
    void options.load(fragment).then(value=>{
      if(!disposed&&current===generation)options.onLoad(value,fragment);
    }).catch(()=>{if(!disposed&&current===generation)options.onError();});
  };
  host.addEventListener('hashchange',navigate);host.addEventListener('popstate',navigate);
  navigate();
  return ()=>{disposed=true;generation++;host.removeEventListener('hashchange',navigate);host.removeEventListener('popstate',navigate);};
}
