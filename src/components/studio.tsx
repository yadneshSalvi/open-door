"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUpRight, BedDouble, Box, Check, CheckCheck, ChevronDown, ChevronRight, CircleHelp, DoorOpen, Expand, Eye, FileJson, Footprints, Grip, Info, Layers3, LoaderCircle, LockKeyhole, Maximize2, MousePointer2, Move, Pause, Play, Redo2, RotateCcw, RotateCw, Ruler, SlidersHorizontal, Sparkles, Undo2, UnlockKeyhole, X } from "lucide-react";
import { cloneInput, fixture, moveObject, placementIssue, suggestedPositions } from "@/engine/fixture";
import { stableHash } from "@/engine/geometry";
import type { DeviceProfile, Evaluation, EvaluationInput, EvaluationResponse, RoomObject, TaskResult } from "@/engine/types";
import { evaluationInputSchema } from "@/engine/schema";
import { RequestGuard } from "@/lib/request-guard";
import { AsyncScope, watchPlanFragment } from "@/lib/plan-navigation";
import type { PreferenceProposal } from "@/lib/preferences";

const RoomScene=dynamic(()=>import("./room-scene"),{ssr:false,loading:()=> <div className="scene-loading"><LoaderCircle className="spin" size={22}/><span>Setting out your room…</span></div>});
type Modal="profile"|"method"|"lens"|"export"|"preferences"|null;
type CheckState="checking"|"ready"|"error";
const cm=(m:number)=>Math.round(m*100);
const isClear=(task:TaskResult|undefined)=>task?.status==="verified_feasible";

export default function Studio(){
  const [input,setInput]=useState<EvaluationInput>(cloneInput);
  const [history,setHistory]=useState<EvaluationInput[]>([]),[future,setFuture]=useState<EvaluationInput[]>([]);
  const revision=useRef(0),latestInput=useRef(input),guard=useRef(new RequestGuard());
  const [result,setResult]=useState<Evaluation|null>(null),[checkState,setCheckState]=useState<CheckState>("checking");
  const [error,setError]=useState<string|null>(null),[notice,setNotice]=useState<string|null>(null);
  const [selected,setSelected]=useState<string|null>(null),[task,setTask]=useState<"journey"|"door">("journey");
  const [editing,setEditing]=useState(false),[planView,setPlanView]=useState(false),[dimensions,setDimensions]=useState(true),[compare,setCompare]=useState(false);
  const [playing,setPlaying]=useState(false),[progress,setProgress]=useState(0),[modal,setModal]=useState<Modal>(null),[retry,setRetry]=useState(0);
  const [profileAcknowledged,setProfileAcknowledged]=useState(false),[exportData,setExportData]=useState<{svg:string;plan:unknown;inputHash:string;revision:number}|null>(null),[exporting,setExporting]=useState(false);
  const pendingReplay=useRef(false);
  const [preferenceText,setPreferenceText]=useState("Keep the bed where it is. Use a 5 cm clearance buffer.");
  const [proposal,setProposal]=useState<{value:PreferenceProposal;hash:string;model:string}|null>(null),[parsing,setParsing]=useState(false);
  const [shareLink,setShareLink]=useState("");
  const importRef=useRef<HTMLInputElement>(null),exportGeneration=useRef(0),preferencesGeneration=useRef(0),shareGeneration=useRef(0),importGeneration=useRef(0);
  const scope=useRef(new AsyncScope());
  latestInput.current=input;

  const invalidateAsync=useCallback(()=>{
    scope.current.invalidate();guard.current.cancel();
    exportGeneration.current++;preferencesGeneration.current++;shareGeneration.current++;importGeneration.current++;
  },[]);
  const clearDerived=useCallback(()=>{
    setProposal(null);setParsing(false);setExportData(null);setExporting(false);setShareLink("");
    setError(null);setResult(null);setCheckState("checking");setPlaying(false);setProgress(0);
  },[]);
  const replacePlan=useCallback((next:EvaluationInput,message:string,acknowledged:boolean)=>{
    invalidateAsync();clearDerived();revision.current=next.room.revision;latestInput.current=next;
    setInput(next);setHistory([]);setFuture([]);setSelected(null);setTask("journey");
    setEditing(false);setPlanView(false);setDimensions(true);setCompare(false);setModal(null);
    setProfileAcknowledged(acknowledged);pendingReplay.current=false;
    setPreferenceText("Keep the bed where it is. Use a 5 cm clearance buffer.");setNotice(message);
    if(importRef.current)importRef.current.value="";
  },[invalidateAsync,clearDerived]);
  useEffect(()=>{
    const stop=watchPlanFragment(window,{
      load:async fragment=>{
        if(!fragment)return cloneInput();
        const {readShareLink}=await import("@/engine/share");
        return evaluationInputSchema.parse(readShareLink(fragment));
      },
      onStart:()=>{invalidateAsync();clearDerived();pendingReplay.current=false;setModal(null);},
      onLoad:(shared,fragment)=>replacePlan(shared,fragment?`Shared plan revision ${shared.room.revision} loaded. Checking its geometry.`:"Provided room restored.",Boolean(fragment)),
      onError:()=>replacePlan(cloneInput(),"That shared plan could not be loaded. The provided room is still available.",false),
    });
    return()=>{stop();invalidateAsync();};
  },[invalidateAsync,clearDerived,replacePlan]);

  useEffect(()=>{
    const active=guard.current.begin(input),work=scope.current.begin();let disposed=false;
    setCheckState("checking");setError(null);setPlaying(false);setProgress(0);setExportData(null);exportGeneration.current++;
    const timeout=setTimeout(async()=>{
      try{
        const response=await fetch("/api/v1/evaluations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...input,...active}),signal:work.signal});
        const data=await response.json();if(!response.ok)throw new Error(data.error??"The room could not be checked.");
        if(!disposed&&work.isCurrent()&&guard.current.accepts(data as EvaluationResponse)){setResult(data.evaluation);setCheckState("ready");}
      }catch(e){if(disposed||!work.isCurrent())return;setCheckState("error");setError(e instanceof Error?e.message:"The connection was interrupted. Your edits are kept.");}finally{work.finish();}
    },100);
    return()=>{disposed=true;clearTimeout(timeout);work.cancel();guard.current.cancel();};
  },[input,retry]);
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(null),4500);return()=>clearTimeout(timer);},[notice]);
  useEffect(()=>{
    if(!playing)return;
    const work=scope.current.begin(),start=performance.now()-progress*6500;let frame:number;
    const tick=(now:number)=>{if(!work.isCurrent())return;const next=Math.min(1,(now-start)/6500);setProgress(next);if(next<1)frame=requestAnimationFrame(tick);else setPlaying(false);};
    frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);work.cancel();};
    // Progress is deliberately captured at the start of playback, not every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[playing]);
  const commit=useCallback((next:EvaluationInput,message?:string)=>{
    if(next===latestInput.current)return;
    invalidateAsync();clearDerived();
    const previous=latestInput.current;setHistory(prev=>[...prev.slice(-39),previous]);setFuture([]);
    revision.current++;const updated={...next,room:{...next.room,revision:revision.current}};
    latestInput.current=updated;setInput(updated);setCheckState("checking");setCompare(false);
    if(message)setNotice(message);
  },[invalidateAsync,clearDerived]);
  function undo(){const previous=history.at(-1);if(!previous)return;invalidateAsync();clearDerived();setFuture(prev=>[input,...prev]);setHistory(prev=>prev.slice(0,-1));revision.current++;latestInput.current={...previous,room:{...previous.room,revision:revision.current}};setInput(latestInput.current);setCheckState("checking");setNotice("Previous layout restored. Checking this revision.");}
  function redo(){const next=future[0];if(!next)return;invalidateAsync();clearDerived();setHistory(prev=>[...prev,input]);setFuture(prev=>prev.slice(1));revision.current++;latestInput.current={...next,room:{...next.room,revision:revision.current}};setInput(latestInput.current);setCheckState("checking");}
  const move=useCallback((id:string,x:number,y:number,theta?:number)=>{
    const current=latestInput.current;const object=current.room.objects.find(o=>o.id===id);
    if(object?.locked){setNotice(`${object.name} is locked. Unlock it to make a change.`);return;}
    const issue=placementIssue(current.room,id,x,y,theta);if(issue){setNotice(issue);return;}
    const room=moveObject(current.room,id,x,y,theta);if(room!==current.room)commit({...current,room},`${object?.name??"Object"} moved. Checking the updated room.`);
  },[commit]);
  function lock(object:RoomObject){commit({...input,room:{...input.room,objects:input.room.objects.map(o=>o.id===object.id?{...o,locked:!o.locked}:o)}},`${object.name} ${object.locked?"unlocked":"locked in place"}.`);}
  const currentResult=checkState==="ready"&&result?.inputHash===stableHash(input)?result:null;
  useEffect(()=>{
    if(!pendingReplay.current||!profileAcknowledged||!currentResult)return;
    pendingReplay.current=false;
    if(task==="door"||isClear(currentResult.tasks.journey)){setProgress(0);setPlaying(true);}
    else{setSelected(currentResult.tasks.journey.witness?.objectId??null);setNotice("This footprint shows the geometric interference. No complete route is being claimed.");}
  },[profileAcknowledged,currentResult,task]);
  const clearCount=Number(isClear(currentResult?.tasks.journey))+Number(isClear(currentResult?.tasks.door));
  const selectedObject=input.room.objects.find(o=>o.id===selected);
  const witness=currentResult?.tasks[task].witness;
  const nextObject=currentResult?.tasks.journey.witness?.objectId??currentResult?.tasks.door.witness?.objectId;
  const nextMovable=input.room.objects.find(o=>o.id===nextObject);
  const suggestion=nextObject?suggestedPositions[nextObject]:undefined;

  async function exportPlan(){
    if(!currentResult)return;setModal("export");setExporting(true);setExportData(null);setShareLink("");setError(null);
    const generation=++exportGeneration.current,hash=currentResult.inputHash,work=scope.current.begin();
    const current=()=>work.isCurrent()&&generation===exportGeneration.current&&stableHash(latestInput.current)===hash;
    try{
      const response=await fetch("/api/v1/exports",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({input,expectedHash:hash,baseline:fixture.room,requestId:`export-${generation}`}),signal:work.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(current())setExportData(data);
    }catch(e){if(current())setError(e instanceof Error?e.message:"The plan could not be exported. Please retry.");}
    finally{if(current())setExporting(false);work.finish();}
  }
  async function sharePlan(){
    if(!exportData||exportData.inputHash!==stableHash(input))return;
    const snapshot=input,hash=exportData.inputHash,generation=++shareGeneration.current,work=scope.current.begin();
    const current=()=>work.isCurrent()&&generation===shareGeneration.current&&stableHash(latestInput.current)===hash;
    try{
      const {createShareLink}=await import("@/engine/share");
      if(!current())return;
      const link=createShareLink(snapshot,window.location.origin);setShareLink(link);
      try{await navigator.clipboard.writeText(link);if(current())setNotice("Link to this exact revision copied.");}
      catch{if(current())setNotice("Your plan link is ready below. Select and copy it.");}
    }catch{if(current())setError("The plan link could not be prepared. Please retry.");}
    finally{work.finish();}
  }
  async function parsePreferences(){
    if(parsing)return;setParsing(true);setProposal(null);setError(null);
    const generation=++preferencesGeneration.current,hash=stableHash(input),work=scope.current.begin();
    const current=()=>work.isCurrent()&&generation===preferencesGeneration.current&&stableHash(latestInput.current)===hash;
    try{
      const response=await fetch("/api/v1/preferences/parse",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:preferenceText,objects:input.room.objects.map(o=>({id:o.id,name:o.name})),requestId:`preferences-${generation}`}),signal:work.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      if(current())setProposal({value:data.proposal,hash,model:data.model});
    }catch(e){if(current())setError(e instanceof Error?e.message:"The preference request could not be completed.");}
    finally{if(current())setParsing(false);work.finish();}
  }
  function applyProposal(){
    if(!proposal)return;if(proposal.hash!==stableHash(input)){setError("The room changed while this proposal was prepared. Please create a fresh proposal.");return;}
    const p=proposal.value;
    commit({...input,profile:{...input.profile,clearance:p.clearanceCm===null?input.profile.clearance:p.clearanceCm/100,width:p.deviceWidthCm===null?input.profile.width:p.deviceWidthCm/100,length:p.deviceLengthCm===null?input.profile.length:p.deviceLengthCm/100,allowReverse:p.allowReverse??input.profile.allowReverse},room:{...input.room,objects:input.room.objects.map(o=>({...o,locked:p.locks.find(l=>l.objectId===o.id)?.locked??o.locked}))}},"Your reviewed preferences are applied. Geometry is being checked again.");
    setProposal(null);setModal(null);
  }
  async function importRoom(file:File|undefined){
    if(!file)return;
    const generation=++importGeneration.current,work=scope.current.begin();
    const current=()=>work.isCurrent()&&generation===importGeneration.current;
    try{
      if(file.size>64000)throw new Error("Use a room JSON under 64 KB.");
      const text=await file.text();if(!current())return;
      const raw=JSON.parse(text),next=evaluationInputSchema.parse(raw.input??raw);
      replacePlan(next,"Room imported. Its dimensions are being checked.",false);
    }catch{if(current())setNotice("That file is not a supported Open Door room. Export a JSON plan to see the schema.");}
    finally{if(current()&&importRef.current)importRef.current.value="";work.finish();}
  }
  function play(){
    if(!profileAcknowledged){pendingReplay.current=true;setModal("profile");return;}
    if(task==="journey"&&!isClear(currentResult?.tasks.journey)){setSelected(currentResult?.tasks.journey.witness?.objectId??null);setNotice("This outlined footprint is the verified interference. No complete route is being claimed.");return;}
    if(progress>=1)setProgress(0);setPlaying(p=>!p);
  }

  return <div className="app-shell">
    <header className="site-header"><a href="/" className="brand" aria-label="Open Door home"><span className="brand-mark"><DoorOpen size={25} strokeWidth={1.4}/></span>open door</a><nav aria-label="Main navigation"><button className="nav-active" onClick={()=>setModal(null)}>Your studio</button><button onClick={()=>setModal("method")}>How it works<ArrowUpRight size={12}/></button><button onClick={()=>setModal("lens")}>Made for SPECS<ArrowUpRight size={12}/></button></nav><div className="header-caption"><span className="small-dot"/>A little space. More possibility.</div></header>
    <main>
      <section className="studio-heading"><div><div className="eyebrow"><span>THE ROOM STUDIO</span><span className="eyebrow-rule"/>DESIGNED AROUND YOU</div><h1>Make room for <em>your everyday.</em></h1><p>Rehearse a journey. Understand a constraint. Find a little more possibility.</p></div><button className="quiet-button help-button" onClick={()=>setModal("method")}><CircleHelp size={17}/>A quick introduction</button></section>
      <section className="workspace" aria-label="Room design workspace">
        <div className="model-panel">
          <div className="model-header"><div className="room-heading"><span className="room-icon"><BedDouble size={18}/></span><div><h2>{input.room.name}</h2><p>Bedroom<span>·</span>{(input.room.width*input.room.depth).toFixed(1)} m²</p></div><span className="provided-badge">{input.room.provenance==="provided_fixture"?"Provided room":"User measurements"}</span></div><div className="model-actions"><input ref={importRef} type="file" accept="application/json,.json" className="sr-only" aria-label="Import room JSON" onChange={e=>void importRoom(e.target.files?.[0])}/><button title="Import an Open Door JSON room" onClick={()=>importRef.current?.click()}><FileJson size={16}/><span>Import</span></button><button className="icon-button" title="Reset to provided room" aria-label="Reset to provided room" onClick={()=>commit(cloneInput(),"Provided room restored.")}><RotateCcw size={16}/></button></div></div>
          <div className="scene-area">
            <div className="view-switch"><button className={!planView?"active":""} onClick={()=>setPlanView(false)}><Box size={14}/>3D room</button><button className={planView?"active":""} onClick={()=>setPlanView(true)}><Layers3 size={14}/>Floor plan</button></div>
            <div className="scene-tools" aria-label="Room tools"><Tool active={!editing} label="Inspect room" onClick={()=>setEditing(false)}><MousePointer2 size={18}/></Tool><Tool active={editing} label="Move furniture" onClick={()=>setEditing(true)}><Move size={18}/></Tool><div className="tool-divider"/><Tool active={dimensions} label="Show dimensions" onClick={()=>setDimensions(v=>!v)}><Ruler size={18}/></Tool><Tool active={compare} label="Compare original positions" onClick={()=>setCompare(v=>!v)}><Layers3 size={18}/></Tool></div>
            <RoomScene input={input} result={currentResult} selected={selected} task={task} onSelect={setSelected} onMove={move} editing={editing} planView={planView} progress={progress} compare={compare} dimensions={dimensions}/>
            <div className="scene-corner"><span className="north-marker">↑<small>N</small></span><span>MODEL 01<span className="tiny-line"/>METRES</span></div>
            <div className="scene-instruction"><Grip size={14}/>{editing?"Drag furniture to edit · locked pieces stay put":"Drag to look around · scroll to move closer"}</div>
            {checkState==="checking"?<div className="checking-pill"><LoaderCircle size={14} className="spin"/>Checking revision {input.room.revision}</div>:null}
          </div>
          <div className="playback-bar"><div className="history-controls"><Tool label="Undo change" disabled={!history.length} onClick={undo}><Undo2 size={17}/></Tool><Tool label="Redo change" disabled={!future.length} onClick={redo}><Redo2 size={17}/></Tool></div><button className={`play-button ${isClear(currentResult?.tasks.journey)||task==="door"?"":"inspect-play"}`} onClick={play} disabled={!currentResult}>{playing?<Pause size={15} fill="currentColor"/>:isClear(currentResult?.tasks.journey)||task==="door"?<Play size={15} fill="currentColor"/>:<Eye size={16}/>}<span>{playing?"Pause":task==="door"?"Rehearse door":isClear(currentResult?.tasks.journey)?"Rehearse journey":"Inspect the approach"}</span></button><input aria-label="Rehearsal progress" className="timeline" type="range" min="0" max="1" step=".005" value={progress} disabled={!currentResult||(task==="journey"&&!isClear(currentResult.tasks.journey))} onChange={e=>{setPlaying(false);setProgress(Number(e.target.value));}}/><span className="revision-label">REV {String(input.room.revision).padStart(2,"0")}</span></div>
          <div className="object-strip"><span>IN YOUR ROOM</span>{input.room.objects.map(o=><button className={selected===o.id?"selected":""} key={o.id} onClick={()=>setSelected(selected===o.id?null:o.id)}>{o.kind==="bed"?<BedDouble size={15}/>:<Box size={14}/>}<span>{o.name}</span>{o.locked?<LockKeyhole size={11}/>:null}</button>)}</div>
        </div>

        <aside className="inspector" aria-label="Tasks and room editing">
          <div className="inspector-heading"><span className="eyebrow">YOUR EVERYDAY, REHEARSED</span><h2>Small changes.<br/>{" "}Meaningful space.</h2><p>Two moments to try in this room.</p></div>
          <div className="profile-card"><span className="profile-icon"><Footprints size={19}/></span><div><strong>{input.profile.name}</strong><small>{cm(input.profile.width)} × {cm(input.profile.length)} cm<span>·</span>{cm(input.profile.clearance)} cm buffer</small></div><button aria-label="Edit device profile and assumptions" onClick={()=>setModal("profile")}><SlidersHorizontal size={16}/></button></div>
          <div className="task-list"><TaskCard number="01" icon={<Footprints size={18}/>} active={task==="journey"} task={currentResult?.tasks.journey} title="Reach the bedside" subtitle="Entrance landing → bedside" onClick={()=>{setTask("journey");setProgress(0);setPlaying(false);setSelected(currentResult?.tasks.journey.witness?.objectId??null);}}/><TaskCard number="02" icon={<DoorOpen size={18}/>} active={task==="door"} task={currentResult?.tasks.door} title="Open the door" subtitle="A full 90° swing" onClick={()=>{setTask("door");setProgress(0);setPlaying(false);setSelected(currentResult?.tasks.door.witness?.objectId??null);}}/></div>

          {checkState==="error"?<div className="connection-error"><Info size={19}/><strong>Your layout is kept.</strong><p>{error}</p><button className="primary-button" onClick={()=>setRetry(v=>v+1)}>Retry check<RotateCw size={16}/></button></div>:selectedObject?<ObjectEditor object={selectedObject} onClose={()=>setSelected(null)} onLock={()=>lock(selectedObject)} onMove={(x,y,theta)=>move(selectedObject.id,x,y,theta)} roomWidth={input.room.width} roomDepth={input.room.depth}/>:<div className={`next-step ${clearCount===2?"complete":""}`}>
            <div className="next-step-label">{clearCount===2?<CheckCheck size={15}/>:<span className="small-asterisk">✳</span>}{checkState==="checking"?"CHECKING YOUR ROOM":clearCount===2?"A LITTLE MORE POSSIBILITY":"A PLACE TO START"}</div>
            <h3>{checkState==="checking"?"Every change deserves a fresh look.":clearCount===2?"Both moments have room.":nextObject==="bench"?"Give the door its space.":"A little shift. A clearer approach."}</h3>
            <p>{checkState==="checking"?"We’re checking the full footprint and door swing against this revision.":clearCount===2?"The route and door swing pass these geometric checks, with your locked furniture preserved.":nextObject==="bench"?"The bedside route is clear. The entry bench still meets the door during its swing.":currentResult?.tasks.journey.summary??"Review your dimensions, then inspect the modeled journey."}</p>
            {suggestion&&nextMovable?<button className="primary-button" onClick={()=>{move(nextMovable.id,suggestion.x,suggestion.y);setSelected(null);if(nextMovable.id==="table")setTask("journey");}} disabled={checkState!=="ready"||nextMovable.locked}>{nextMovable.locked?`${nextMovable.name} is locked`:`Move ${nextMovable.name.toLowerCase()}`}<ArrowRight size={17}/></button>:clearCount===2?<button className="primary-button" onClick={()=>{setTask("journey");if(!profileAcknowledged){pendingReplay.current=true;setModal("profile");}else{setProgress(0);setPlaying(true);}}}>Try the whole journey<Play size={14}/></button>:null}
            {suggestion&&nextMovable?<small className="suggestion-caption">Suggested placement · you choose what changes</small>:null}
          </div>}
          <div className="check-progress"><div><span>{checkState==="checking"?"Checking your changes":`${clearCount} of 2 checks clear`}</span><strong>{checkState==="checking"?"—":`${clearCount}/2`}</strong></div><div className="progress-track"><span style={{width:`${clearCount/2*100}%`}}/></div><p><LockKeyhole size={12}/>{input.room.objects.filter(o=>o.locked).length} {input.room.objects.filter(o=>o.locked).length===1?"piece":"pieces"} held in place<span>·</span>Revision {input.room.revision}</p></div>
          <button className="export-button" onClick={()=>void exportPlan()} disabled={!currentResult}><ArrowDownToLine size={17}/>Keep this plan<ArrowUpRight size={16}/></button>
          <button className="preference-link" onClick={()=>{setError(null);setModal("preferences");}}><Sparkles size={13}/>Tell us what matters to you<ChevronRight size={13}/></button>
        </aside>
      </section>
      <section className="bottom-notes"><div><span className="outline-circle"><Check size={13}/></span><p><strong>Your choices, made visible.</strong> A model to think with. Your lived experience comes first.</p></div><button onClick={()=>setModal("method")}>What these checks mean<ArrowUpRight size={13}/></button></section>
      <footer><span>OPEN DOOR<span className="footer-dot">·</span>LEARN AR WITH SPECS</span><span>Provided room. Explicit dimensions. Geometric evidence.</span></footer>
    </main>
    {notice?<div className="toast" role="status"><Check size={15}/>{notice}<button aria-label="Dismiss notification" onClick={()=>setNotice(null)}><X size={14}/></button></div>:null}

    {modal?<Dialog title={modal==="profile"?"Your dimensions. Your assumptions.":modal==="method"?"A room to think with.":modal==="lens"?"Made for a different point of view.":modal==="export"?"A plan worth keeping.":"What matters in your room?"} onClose={()=>{if(modal==="profile")pendingReplay.current=false;setModal(null);setError(null);}}>
      {modal==="profile"?<ProfileForm profile={input.profile} acknowledged={profileAcknowledged} onSubmit={profile=>{setProfileAcknowledged(true);if(JSON.stringify(profile)!==JSON.stringify(input.profile))commit({...input,profile},"Profile updated. Checking your dimensions.");setModal(null);}}/>:null}
      {modal==="method"?<div className="method-content"><p className="modal-intro">Open Door helps you inspect whether a measured arrangement supports two specific geometric tasks. You stay in charge of what moves.</p><div className="method-steps"><div><span>01</span><div><h3>Start with explicit dimensions</h3><p>This example is a provided 420 × 340 cm room and a synthetic device profile. Nothing has been scanned or inferred from a camera.</p></div></div><div><span>02</span><div><h3>Rehearse the entire footprint</h3><p>The solver checks oriented rectangles through translation and rotation, including the final bedside heading. A separate calculation checks the door leaf throughout its swing.</p></div></div><div><span>03</span><div><h3>Change, compare, keep</h3><p>Move a piece, retain what matters, and see a fresh check. Export the exact revision with its dimensions, evidence and unassessed questions.</p></div></div></div><div className="scope-note"><Info size={18}/><p>A clear result applies to these modeled checks. It does not certify accessibility, comfortable transfers, reach, door force or real-world safety. No route found means the bounded search found none; it does not prove all routes impossible.</p></div><details><summary>Numerical method and evidence<ChevronDown size={14}/></summary><p>Every accepted motion interval is certified using a bound on the movement of every footprint point. Intervals unresolved within 1 mm remain uncertain. Search uses 16 cm motion primitives and at most 8,500 expanded states; verified trajectories are independently checked. Measurement uncertainty expands the occupied space; nominal-only clearance is shown as uncertain.</p><p>Solver {currentResult?.solverVersion??"open-door/1.0.0"}. Current result {currentResult?.inputHash??"pending"}. {currentResult?`${currentResult.durationMs} ms for the current evaluation.`:""}</p></details></div>:null}
      {modal==="lens"?<div className="method-content"><div className="lens-illustration"><DoorOpen size={48} strokeWidth={1}/><span>MINIATURE → INTENDED SCALE</span></div><p className="modal-intro">The companion makes room editing comfortable on a screen. The SPECS Lens brings the same geometric model into your space.</p><p>Inspect the miniature, choose a task, move the table or bench, then expand the model for a different spatial perspective. The native Lens runs the same portable numerical engine.</p><div className="scope-note"><Info size={18}/><p>The demonstration uses Lens Studio Preview and a provided room. Physical glasses, tracking comfort and on-device performance have not been validated.</p></div><a className="text-link" href="https://github.com/yadneshSalvi/open-door" target="_blank" rel="noreferrer">Project source and build notes<ArrowUpRight size={15}/></a></div>:null}
      {modal==="export"?<div>{exporting?<div className="export-loading"><LoaderCircle className="spin" size={24}/><p>Rechecking this revision and drawing your plan…</p></div>:exportData?<><div className="export-summary"><span className="export-icon"><FileJson size={30}/></span><div><strong>{input.room.name}</strong><p>Revision {exportData.revision}<span>·</span>{exportData.inputHash}</p></div><CheckCheck size={23}/></div><p className="modal-intro">Keep the dimensioned drawing alongside its complete, editable evidence.</p><div className="export-options"><button onClick={()=>download(exportData.svg,`open-door-r${exportData.revision}.svg`,"image/svg+xml")}><Ruler size={23}/><strong>Dimensioned drawing</strong><span>SVG · open or print to PDF</span><ArrowDownToLine size={17}/></button><button onClick={()=>download(JSON.stringify(exportData.plan,null,2),`open-door-r${exportData.revision}.json`,"application/json")}><FileJson size={23}/><strong>Complete room & evidence</strong><span>JSON · import it again later</span><ArrowDownToLine size={17}/></button></div><button className="share-plan-button" onClick={()=>void sharePlan()}><ArrowUpRight size={16}/>Copy a link to this revision</button>{shareLink?<label className="share-link-label">SHARE THIS PLAN<input aria-label="Link to this exact plan revision" readOnly value={shareLink} onFocus={e=>e.target.select()}/></label>:null}<div className="scope-note"><Info size={17}/><p>Includes dimensions, task results, furniture changes, device assumptions and unassessed questions. The drawing is a planning aid.</p></div></>:null}{error?<p className="error-text" role="alert">{error}</p>:null}</div>:null}
      {modal==="preferences"?<div><p className="modal-intro">Describe the pieces you want to keep and the dimensions you know. You’ll review a proposal before anything changes.</p><label className="field-label" htmlFor="preferences">YOUR PREFERENCES</label><textarea id="preferences" value={preferenceText} maxLength={1200} onChange={e=>setPreferenceText(e.target.value)} rows={4}/><button className="primary-button" disabled={parsing||preferenceText.trim().length<3} onClick={()=>void parsePreferences()}>{parsing?<><LoaderCircle className="spin" size={17}/>Preparing a proposal</>:<>Prepare a proposal<Sparkles size={15}/></>}</button>{proposal?<div className="proposal-card"><span className="eyebrow">REVIEW BEFORE APPLYING</span><h3>{proposal.value.summary}</h3><ul>{proposal.value.locks.map(l=><li key={l.objectId}>{l.locked?"Lock":"Unlock"} {input.room.objects.find(o=>o.id===l.objectId)?.name}</li>)}{proposal.value.clearanceCm!==null?<li>Clearance buffer: {proposal.value.clearanceCm} cm</li>:null}{proposal.value.deviceWidthCm!==null?<li>Device width: {proposal.value.deviceWidthCm} cm</li>:null}{proposal.value.deviceLengthCm!==null?<li>Device length: {proposal.value.deviceLengthCm} cm</li>:null}{proposal.value.allowReverse!==null?<li>Reverse: {proposal.value.allowReverse?"allowed":"not allowed"}</li>:null}{proposal.value.unassessed.map((u,i)=><li key={i}>Unassessed: {u}</li>)}</ul><button className="primary-button" onClick={applyProposal}>Apply these preferences<Check size={16}/></button><small>Language proposal · {proposal.model}. Geometry will be recalculated.</small></div>:null}{error?<p className="error-text" role="alert">{error}</p>:null}<p className="privacy-note">Only this text and object names are sent to the language service. Dimensions and locks can also be changed directly in the studio.</p></div>:null}
    </Dialog>:null}
  </div>;
}

function Tool({children,label,active,disabled,onClick}:{children:React.ReactNode;label:string;active?:boolean;disabled?:boolean;onClick:()=>void}){return <button type="button" className={`tool-button ${active?"active":""}`} aria-label={label} title={label} aria-pressed={active} disabled={disabled} onClick={onClick}>{children}</button>;}
function TaskCard({number,icon,active,task,title,subtitle,onClick}:{number:string;icon:React.ReactNode;active:boolean;task:TaskResult|undefined;title:string;subtitle:string;onClick:()=>void}){
  const clear=isClear(task),label=!task?"Checking":clear?"Clear for model":task.status==="uncertain"?"Uncertain":task.status==="no_path_found"?"No path found":"Needs a little room";
  return <button className={`task-card ${active?"active":""} ${clear?"clear":""}`} onClick={onClick} aria-pressed={active}><span className="task-icon">{icon}</span><div><strong>{title}</strong><small>{subtitle}</small><span className={`task-status ${!task?"pending":clear?"clear":"blocked"}`}>{!task?<LoaderCircle size={11} className="spin"/>:clear?<Check size={12}/>:<span className="status-diamond"/>}{label}</span></div><span className="task-number">{number}</span></button>;
}
function ObjectEditor({object,onClose,onLock,onMove,roomWidth,roomDepth}:{object:RoomObject;onClose:()=>void;onLock:()=>void;onMove:(x:number,y:number,theta?:number)=>void;roomWidth:number;roomDepth:number}){
  const [draftX,setDraftX]=useState(String(cm(object.pose.x))),[draftY,setDraftY]=useState(String(cm(object.pose.y)));
  useEffect(()=>{setDraftX(String(cm(object.pose.x)));setDraftY(String(cm(object.pose.y)));},[object.id,object.pose.x,object.pose.y]);
  return <div className="object-editor"><div className="editor-title"><span className="eyebrow">SELECTED PIECE</span><button aria-label="Close object controls" onClick={onClose}><X size={15}/></button></div><div className="object-name"><h3>{object.name}</h3><button className={object.locked?"locked":""} onClick={onLock} title={object.locked?"Unlock object":"Lock object"}>{object.locked?<LockKeyhole size={17}/>:<UnlockKeyhole size={17}/>}</button></div><p>{cm(object.width)} × {cm(object.depth)} cm<span>·</span>{object.locked?"Held in place":"Move it to make room"}</p><div className="position-fields"><label>X position<input aria-label={`${object.name} X position in centimetres`} type="number" min="0" max={cm(roomWidth)} step="5" value={draftX} disabled={object.locked} onChange={e=>setDraftX(e.target.value)} onBlur={()=>{if(draftX.trim())onMove(Number(draftX)/100,object.pose.y);setDraftX(String(cm(object.pose.x)));}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/><span>cm</span></label><label>Y position<input aria-label={`${object.name} Y position in centimetres`} type="number" min="0" max={cm(roomDepth)} step="5" value={draftY} disabled={object.locked} onChange={e=>setDraftY(e.target.value)} onBlur={()=>{if(draftY.trim())onMove(object.pose.x,Number(draftY)/100);setDraftY(String(cm(object.pose.y)));}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/><span>cm</span></label></div><div className="nudge-controls"><button aria-label="Move selected object left 10 centimetres" disabled={object.locked} onClick={()=>onMove(object.pose.x-.1,object.pose.y)}><ArrowLeft size={15}/></button><button aria-label="Move selected object back 10 centimetres" disabled={object.locked} onClick={()=>onMove(object.pose.x,object.pose.y+.1)}><ArrowRight size={15} style={{transform:"rotate(-90deg)"}}/></button><button aria-label="Move selected object forward 10 centimetres" disabled={object.locked} onClick={()=>onMove(object.pose.x,object.pose.y-.1)}><ArrowRight size={15} style={{transform:"rotate(90deg)"}}/></button><button aria-label="Move selected object right 10 centimetres" disabled={object.locked} onClick={()=>onMove(object.pose.x+.1,object.pose.y)}><ArrowRight size={15}/></button><button aria-label="Rotate selected object 15 degrees" disabled={object.locked} onClick={()=>onMove(object.pose.x,object.pose.y,object.pose.theta+Math.PI/12)}><RotateCw size={15}/></button></div><small className="editor-hint">Arrows move 10 cm. Rotation turns 15°.</small></div>;
}
function Dialog({title,children,onClose}:{title:string;children:React.ReactNode;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();return()=>ref.current?.close();},[]);
  return <dialog ref={ref} className="modal" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}}><div className="modal-inner"><div className="modal-heading"><span className="eyebrow">OPEN DOOR STUDIO</span><button className="icon-button" aria-label="Close dialog" onClick={onClose}><X size={20}/></button></div><h2>{title}</h2>{children}</div></dialog>;
}
function ProfileForm({profile,acknowledged,onSubmit}:{profile:DeviceProfile;acknowledged:boolean;onSubmit:(profile:DeviceProfile)=>void}){
  const [draft,setDraft]=useState(profile);
  const set=(key:keyof DeviceProfile,value:number|boolean|string)=>setDraft(prev=>({...prev,[key]:value}));
  return <form onSubmit={e=>{e.preventDefault();onSubmit(draft);}}><p className="modal-intro">This example profile is a synthetic test fixture. Replace it with dimensions you know, including any protrusions.</p><div className="profile-diagram"><div className="device-outline"><span>{cm(draft.width)} cm</span><Footprints size={35} strokeWidth={1}/><small>{cm(draft.length)} cm</small></div><p>The entire occupied footprint<br/><strong>including footrests and bags</strong></p></div><div className="form-grid"><label>Occupied width<span className="input-unit"><input type="number" min="30" max="180" required value={cm(draft.width)} onChange={e=>set("width",Number(e.target.value)/100)}/><span>cm</span></span></label><label>Occupied length<span className="input-unit"><input type="number" min="40" max="250" required value={cm(draft.length)} onChange={e=>set("length",Number(e.target.value)/100)}/><span>cm</span></span></label><label>Your clearance buffer<span className="input-unit"><input type="number" min="0" max="40" required value={cm(draft.clearance)} onChange={e=>set("clearance",Number(e.target.value)/100)}/><span>cm</span></span></label><label>Measurement uncertainty<span className="input-unit"><input type="number" min="0" max="20" required value={cm(draft.uncertainty)} onChange={e=>set("uncertainty",Number(e.target.value)/100)}/><span>± cm</span></span></label></div><label className="select-label">Movement model<select value={draft.movement} onChange={e=>set("movement",e.target.value)}><option value="pivot">Rotation in place allowed</option><option value="minimum_radius">Minimum turning radius</option></select></label>{draft.movement==="minimum_radius"?<label className="radius-input">Minimum turning radius (cm)<input type="number" min="20" max="300" value={cm(draft.minimumTurningRadius)} onChange={e=>set("minimumTurningRadius",Number(e.target.value)/100)}/></label>:null}<label className="checkbox-label"><input type="checkbox" checked={draft.allowReverse} onChange={e=>set("allowReverse",e.target.checked)}/>Include reverse movement in the model</label><div className="scope-note compact"><Info size={16}/><p>These are your modeling assumptions, not universal requirements. The example journey starts on the entrance landing inside the room.</p></div><button className="primary-button" type="submit">{acknowledged?"Save & recheck":"Use these assumptions"}<Check size={17}/></button></form>;
}
function download(contents:string,name:string,type:string){const url=URL.createObjectURL(new Blob([contents],{type}));const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
