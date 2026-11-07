"use client";

import { ArrowRight, Check, ChevronDown, LoaderCircle, X } from "lucide-react";
import type { RepairProgress, RepairProposal } from "@/engine/repair";

const centimetres = (metres: number) => Math.round(metres * 100);
function reserveLabel(value: number) {
  return value < .001 ? "Under 1 mm" : `${(Math.floor(value * 1000) / 10).toFixed(1)} cm+`;
}

export default function RepairPanel({ progress, searching, selected, preview, onSelect, onPreview, onApply, onClose }: {
  progress: RepairProgress | null;
  searching: boolean;
  selected: number;
  preview: boolean;
  onSelect: (index: number) => void;
  onPreview: (value: boolean) => void;
  onApply: (proposal: RepairProposal) => void;
  onClose: () => void;
}) {
  const active = progress?.proposals[selected];
  return <section className="repair-panel" aria-label="Computed furniture changes">
    <div className="repair-heading"><h3>{searching ? "Finding changes" : active ? "Compare changes" : "No proposal found"}</h3><button onClick={onClose} aria-label={searching ? "Cancel layout search" : "Close layout proposals"}><X size={17}/></button></div>
    {searching ? <div className="repair-searching" role="status"><LoaderCircle className="spin" size={25}/><p>{progress?.phase ?? "Preparing room geometry"}</p><span>{(progress?.generated ?? 0).toLocaleString()} placements considered</span><button onClick={onClose}>Cancel search</button></div> : active ? <>
      <div className="repair-choices" aria-label="Verified layout alternatives">{progress?.proposals.map((proposal, index) => <button key={proposal.id} className={index === selected ? "selected" : ""} aria-pressed={index === selected} onClick={() => onSelect(index)}>
        <span>{index === 0 ? "Least movement found" : `${(Math.floor(proposal.certifiedReserveM * 1000) / 10).toFixed(1)} cm+ reserve`}<small>{proposal.moves.length} pieces · {centimetres(proposal.translationM)} cm total</small></span>{index === selected ? <Check size={16}/> : null}
      </button>)}</div>
      <div className="repair-moves">{active.moves.map(move => <div key={move.objectId}><span>{move.objectName}</span><strong>{centimetres(move.distanceM)} cm{move.rotationRad > .001 ? ` · ${Math.round(move.rotationRad * 180 / Math.PI)}°` : ""}</strong></div>)}</div>
      <div className={`repair-reserve ${active.certifiedReserveM < .001 ? "narrow" : ""}`}><span>Extra modeled space</span><strong>{reserveLabel(active.certifiedReserveM)}</strong></div>
      {active.certifiedReserveM < .001 ? <p className="repair-caution">A very small margin. Compare a higher-reserve option.</p> : null}
      <div className="repair-compare" aria-label="Compare before applying"><button className={!preview ? "active" : ""} aria-pressed={!preview} onClick={() => onPreview(false)}>Original</button><button className={preview ? "active" : ""} aria-pressed={preview} onClick={() => onPreview(true)}>Preview changes</button></div>
      <button className="primary-button" onClick={() => onApply(active)}>Apply & rehearse<ArrowRight size={17}/></button>
    </> : <p className="repair-empty">{progress?.reason ?? "No verified layout was found. Try changing a lock or editing the room."}</p>}
    {!searching ? <details className="repair-scope"><summary>Search scope<ChevronDown size={13}/></summary><p>Finite geometry contacts and radial placements; up to {progress?.scope.maxMoves ?? 3} moved pieces from {progress?.scope.maxObjects ?? 6} unlocked objects. Ranked by pieces moved, then translation plus rotation. {progress?.evaluated ?? 0} complete layout evaluations. Positions occupied by other furniture in the original room remain excluded, including pieces that also move. This is the least movement found in that search.</p><p>Extra space is certified beyond the chosen journey buffer and uncertainty, and between the door leaf and furniture. Profile, locks and task poses stay unchanged. Furniture travel between placements is not assessed.</p></details> : null}
  </section>;
}
