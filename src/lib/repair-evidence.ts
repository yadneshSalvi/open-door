import { z } from "zod";
import { evaluationInputSchema } from "@/engine/schema";
import { angleDistance, distance, stableHash } from "@/engine/geometry";
import { applyRepairProposal, REPAIR_SETTINGS, type RepairProposal } from "@/engine/repair";
import { evaluate, evaluateDoor, verifyTrajectory } from "@/engine/planner";
import type { EvaluationInput, Motion } from "@/engine/types";

const finite = z.number().finite();
const fingerprint = z.string().regex(/^[a-f0-9]{16}$/);
const pose = z.object({ x: finite, y: finite, theta: finite }).strict();
export const acceptedRepairEvidenceSchema = z.object({
  schemaVersion: z.literal("1.0"),
  inputHash: fingerprint,
  proposalId: fingerprint,
  sourceHash: fingerprint,
  sourceRevision: z.number().int().nonnegative().max(1e9),
  extraClearanceM: finite.min(0).max(.1),
  certifiedReserveM: finite.min(0).max(20),
  moves: z.array(z.object({
    objectId: z.string().min(1).max(64), objectName: z.string().min(1).max(90),
    from: pose, to: pose, distanceM: finite.min(0).max(60), rotationRad: finite.min(0).max(Math.PI),
  }).strict()).min(1).max(REPAIR_SETTINGS.maxMoves),
}).strict();
export type AcceptedRepairEvidence = z.infer<typeof acceptedRepairEvidenceSchema>;

/** Reconstruct source and independently check the selection instead of trusting client annotations. */
export function verifyRepairEvidence(input: EvaluationInput, motions: Motion[] | undefined, claim: AcceptedRepairEvidence) {
  if (!motions || claim.inputHash !== stableHash(input) || input.room.revision !== claim.sourceRevision + 1) {
    throw new Error("The repair evidence does not identify this accepted revision.");
  }
  const source: EvaluationInput = JSON.parse(JSON.stringify(input));
  source.room.revision = claim.sourceRevision;
  for (const move of claim.moves) {
    const object = source.room.objects.find(o => o.id === move.objectId);
    if (!object || object.name !== move.objectName || stableHash(object.pose) !== stableHash(move.to) ||
      Math.abs(distance(move.from, move.to) - move.distanceM) > 1e-9 ||
      Math.abs(angleDistance(move.from.theta, move.to.theta) - move.rotationRad) > 1e-9) {
      throw new Error("The repair movements do not match this room.");
    }
    object.pose = { ...move.from };
  }
  evaluationInputSchema.parse(source);
  if (stableHash(source) !== claim.sourceHash || stableHash({ sourceHash: claim.sourceHash, moves: claim.moves, reserve: claim.extraClearanceM }) !== claim.proposalId) {
    throw new Error("The repair source or proposal fingerprint does not match.");
  }
  const proposed = { ...input, room: { ...input.room, revision: claim.sourceRevision } };
  const translationM = claim.moves.reduce((sum, move) => sum + move.distanceM, 0);
  const rotationRad = claim.moves.reduce((sum, move) => sum + move.rotationRad, 0);
  if (verifyTrajectory(proposed, motions).status !== "clear") throw new Error("The retained repair trajectory does not verify.");
  const evaluation = evaluate(proposed, motions);
  const proposal: RepairProposal = {
    id: claim.proposalId, label: "Accepted finite-search proposal", sourceHash: claim.sourceHash,
    sourceRevision: claim.sourceRevision, moves: claim.moves, input: proposed,
    evaluation,
    translationM, rotationRad, movementCostM: translationM + rotationRad * REPAIR_SETTINGS.rotationCostMPerRad,
    extraClearanceM: claim.extraClearanceM, certifiedReserveM: claim.certifiedReserveM,
  };
  const accepted = applyRepairProposal(source, proposal);
  if (stableHash(accepted) !== claim.inputHash) throw new Error("The repair is not one atomic revision of its source.");
  const reserved = { ...input, profile: { ...input.profile, clearance: input.profile.clearance + claim.extraClearanceM } };
  const route = verifyTrajectory(reserved, motions), door = evaluateDoor(input, claim.extraClearanceM);
  return {
    selection: claim,
    verification: {
      acceptedRevision: input.room.revision, acceptedInputHash: claim.inputHash,
      route: route.status, door: door.status,
      reserveTargetM: claim.extraClearanceM,
      certifiedReserveM: claim.extraClearanceM + Math.min(route.clearance, door.minimumClearance ?? 0),
      journeyBufferM: input.profile.clearance, profileUncertaintyM: input.profile.uncertainty,
      translationM, rotationRad, movementCostM: proposal.movementCostM,
      method: "The retained trajectory and complete door sweep were independently rechecked at the extra reserve target. Ordinary adaptive evaluation bounds can be looser; the original profile is unchanged.",
    },
    searchScope: REPAIR_SETTINGS,
    limits: "Finite heuristic search; no global minimum. Other furniture's original occupied positions are excluded. Furniture relocation trajectories and physical comfort are unassessed.",
  };
}
