import { beforeAll, describe, expect, it } from "vitest";
import { cloneInput, fixture } from "../src/engine/fixture";
import { applyRepairProposal, createRepairSearch, type RepairProposal } from "../src/engine/repair";
import { stableHash } from "../src/engine/geometry";
import type { EvaluationInput } from "../src/engine/types";
import { verifyRepairEvidence, type AcceptedRepairEvidence } from "../src/lib/repair-evidence";
import { POST } from "../src/app/api/v1/exports/route";

let proposal: RepairProposal, accepted: EvaluationInput, claim: AcceptedRepairEvidence;
beforeAll(() => {
  const job = createRepairSearch(cloneInput());
  while (job.progress.status === "searching") job.step(32);
  proposal = job.progress.proposals.find(p => p.extraClearanceM === .03)!;
  accepted = applyRepairProposal(cloneInput(), proposal);
  claim = { schemaVersion: "1.0", inputHash: stableHash(accepted), proposalId: proposal.id,
    sourceHash: proposal.sourceHash, sourceRevision: proposal.sourceRevision, moves: proposal.moves,
    extraClearanceM: proposal.extraClearanceM, certifiedReserveM: proposal.certifiedReserveM };
}, 20000);

describe("accepted repair export evidence", () => {
  it("retains the selected reserve and independently certifies the unchanged profile", () => {
    const proof = verifyRepairEvidence(accepted, proposal.evaluation.tasks.journey.motions, claim);
    expect(proof.verification.acceptedInputHash).toBe(stableHash(accepted));
    expect(proof.verification.reserveTargetM).toBe(.03);
    expect(proof.verification.certifiedReserveM).toBeCloseTo(proposal.certifiedReserveM, 10);
    expect(proof.verification.journeyBufferM).toBe(fixture.profile.clearance);
    expect(proof.verification.route).toBe("clear");
    expect(proof.verification.door).toBe("verified_feasible");
    expect(accepted.profile).toEqual(fixture.profile);
  });

  it("rejects stale, overstated, missing or replaced evidence", () => {
    const motions = proposal.evaluation.tasks.journey.motions;
    expect(() => verifyRepairEvidence(accepted, undefined, claim)).toThrow();
    expect(() => verifyRepairEvidence(accepted, [], claim)).toThrow();
    expect(() => verifyRepairEvidence(accepted, motions, { ...claim, certifiedReserveM: .3 })).toThrow();
    expect(() => verifyRepairEvidence(accepted, motions, { ...claim, sourceHash: "0".repeat(16) })).toThrow();
    const edited = structuredClone(accepted); edited.profile.clearance += .01;
    expect(() => verifyRepairEvidence(edited, motions, claim)).toThrow();
  });

  it("exports the actual proof alongside the ordinary evaluation", async () => {
    const response = await POST(new Request("http://localhost/api/v1/exports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
      input: accepted, expectedHash: stableHash(accepted), baseline: fixture.room, requestId: "repair-proof-test",
      preferredMotions: proposal.evaluation.tasks.journey.motions, repairEvidence: claim,
    }) }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.plan.repair.selection).toEqual(claim);
    expect(data.plan.repair.verification.certifiedReserveM).toBeGreaterThanOrEqual(.03);
    expect(data.plan.evaluation.tasks.journey.motions).toEqual(proposal.evaluation.tasks.journey.motions);
    expect(data.plan.input.profile).toEqual(fixture.profile);
  });
});
