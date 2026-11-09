> Historical integration for the8November build. See the [current integration](../../../lens-src/SPATIAL-INTEGRATION.md).

# Spatial revision — Preview integration

This is the canonical source contract for the 8 November spatial redesign. Source checks do not establish native rendering, reachability or audio acceptance. The earlier accepted release remains recorded in [INTEGRATION.md](../../../lens-src/INTEGRATION.md). [Current spatial acceptance](../../spatial-release.md) closes observed native transactions, G2 presentation and source capture/handoff gates; final encoded-film QA and user review remain pending.

## Coordinated source set

The editor owner copies the following together into `Assets/Scripts/`, preserving the directory structure. Do not copy older Assets files back over canonical source.

- `OpenDoorExperience.ts`, `OpenDoorSpatialUI.ts`, `OpenDoorSurfacePlacement.ts`, `OpenDoorAudio.ts`, `SpatialPresentation.ts`.
- Existing `ArchitecturalMeshes.ts` and **unchanged** `OpenDoorCore.js`.
- For QA in a **separate development scene copy**, use `leaf/` with the official compatible `Leaf.lspkg` 2.0.2 package. Attach `OpenDoorLeafIndex.ts` once for functional scenarios; optionally attach `OpenDoorFilmIndex.ts` for film scenarios. The official LEAF panel owns MessagingBridge; avoid a duplicate bridge. Scenario components register through indices, not individual scene attachments. Remove indices, bridge and temporary helpers from production after QA, restart Preview, check compile/runtime and save cleanly. The accepted production scene has no active test automation.
- Import `Audio/turn-clear.wav`, `Audio/contact-soft.wav` and `Audio/wheel-roll.wav` as ordinary audio assets. Assign `clearSound`, `contactSound` and `wheelSound`. Retain an Audio Listener on the world camera. The files are original algorithmic sounds; [provenance](../../../lens-src/Audio/provenance.json) and the reproducible generator are retained.

Retain the unit cube (bounds ±0.5), PBR base material, unlit evidence material, Inter font, existing SIK/UI Kit and camera/render target setup. The experience owner is at identity. The controller places the model in world centimetres; changing the owner transform is not the placement interface. No engine bundle rebuild is needed for these source-only presentation changes. A coordinated `lens:bundle` check may verify the unchanged portable engine later; it must not overwrite a concurrently tested Assets revision.

## Measured placement inputs

The miniature uses the plain sideboard in **Sunlit Room**. Its measured surface is `(-30, -142.9, -474)` cm with yaw `0`; model floor y is `-141.8` cm. Front/side images from camera `(-30, -72, -408)` looking at `(-30, -141.8, -474)` passed grounding, dock readability and reduced clutter. Later review accepted the v5 miniature presentation for filming. The initial Colorful Home table test is historical.

Full size uses a separately staged supplied-room showroom on **Sunlit Outdoor** paved ground. Ground observations and independent support-view review agree with the configured plane at `−172.7` cm. The earlier Colorful Home anchor was rejected after a wider view revealed a wall intersection. A measured hit alone was insufficient. Disclose the separate Preview scene; this supplied room is not a reconstruction of background furniture.

All values are world centimetres and yaw degrees. Surface measurements are observations, not room recognition.

| Input | Current Preview configuration | Meaning |
| --- | --- | --- |
| `miniatureSurfacePositionCm` | `(-30, -142.9, -474)` | Sunlit Room tabletop surface top, not model centre |
| `miniatureYawDegrees` | `0` | Align the level 42 × 34 cm model with the measured sideboard |
| `fullSizeStartPositionCm` | `(-92, -172.7, -175)` | Place the unchanged journey start on Sunlit Outdoor ground |
| `fullSizeYawDegrees` | `0` | Supplied room orientation in that open space |
| `fullScaleOverlay` | `false` | Option C: show the supplied room's solids and low cutaway bounds |
| `placementConfirmed` | `true` for the measured-pose G1 pass | Explicit manual placement; set false separately to test live surface confirmation |
| `placementDescription` | `Placed by hand · supplied room · no scanning` | Provenance shown briefly and retained in verification state |

The miniature remains level. Its 1.1 cm plinth rests on the configured surface; the model floor is therefore at y = −141.8 cm. The measured board fit was checked separately from the WorldQuery hit. A horizontal point alone does not prove tabletop extent. These are the actual scene inputs; older serialized scenes or script defaults must be assigned explicitly when integrating this configuration.

At full size, the mathematical start `(1.18, 1.45)` m maps to the supplied floor anchor. The helper computes model centre `(0, -172.7, -200)` cm for yaw zero; it also handles other configured yaws. Its footprint spans x = −210…210 cm and z = −370…−30 cm. The floor uses a 0.1 cm display surface centered on the ground plane because Preview does not occlude a thick slab's below-ground sides. Miniature thickness and all checked geometry are unchanged. The exact 420 × 340 cm room is **not** registered to environment furniture; full solids intentionally represent the supplied model.

`configurePlacement(json)` changes only presentation. Its object keys are `miniatureSurfaceCm`, `miniatureYawDegrees`, `fullSizeStartCm`, `fullSizeYawDegrees`, `confirmed`, `description` and optional `overlay`. It does not move the viewer or change any model dimensions, poses, profile, task or revision.

`More → Room tools → More → Details → Place model` starts a single horizontal WorldQuery hit along the viewer's gaze. A normal within the implemented horizontal tolerance and a hit 35–250 cm away produces a world marker; **Place here** explicitly confirms it. **Look again** requests another hit. **Use supplied pose** is the labeled manual fallback. A four-second timeout and request serial discard obsolete results. This places the display; it is not room scanning.

## Runtime behavior to inspect

- Overview: **Find changes · Rehearse · More**. No permanent header or coordinate readout. A compact disclosure appears briefly; About retains provided-model, geometric-only and untested-hardware scope.
- Furniture: persistent SIK targets accept direct and indirect input. The near hand position or far ray is projected into the level, yawed model floor. During a drag only `placementIssue` runs. Release queues one validated revision; a `RevisionEvaluation` slice advances the unchanged generator on Update. The chair shimmers while checking; partial results are never displayed or exported. The time budget is cooperative, not a hard bound on an atomic generator step.
- Obstructions: actual witness IDs drive amber outlines and object-attached text. No missing-clearance amount is inferred. A blocked Rehearse displays the verified collision witness; it does **not** invent a verified prefix leading to that pose.
- Chair: wheels, seat, backrest, arms and footplate are a decorative schematic constrained to the supplied occupied envelope. The numerical rectangle is unchanged. The label says **Example wheelchair footprint**. On a verified rehearsal, the chair uses the actual sampled trajectory, rolls its wheels, plays a quiet spatial loop and ends with a mint color pulse and chime.
- Alternatives: all returned ghost sets appear together, with up to three selectable tags and no simultaneous primary dock actions. Pinch a tag to reveal **Use this layout · Showing: Before/After · Cancel**. Furniture edits are rejected throughout proposal review; a tag is not a source furniture object. Cancel restores the source. The tight option remains explicitly under 1 mm; other tags round certified reserve downward.
- Before never carries the candidate's reserve. The label reads **Before · current room**. A separately clear Door swing ends with **Door clear**, not Turn clear. Find changes on the current fully verified model reports **No changes needed** without changing the input or making another request.
- Locks: hover or select a piece to reveal its padlock. The bed remains locked. Fine adjust and Undo remain contextual; no Select item cycle is shown.
- Profile: a compact card stays by the chair. Width and buffer each have a two-target −/+ adjustment state plus Done. Rehearsal acknowledgment is one **OK** and resumes the real task.
- Detail: approach/hover reveals labels with distance hysteresis. A display-only line joins the nearest **sampled** footprint/furniture edges for an accepted/previewed repair. The adjacent number is the independently certified **layout reserve**, not a new pointwise clearance measurement or a claim that the sampled location is the continuous global minimum.
- Full size: the model is floor anchored. Controls stay below eye level with a 35 cm lazy-follow dead zone and bounded catch-up, freezing during a furniture drag or control hover. World objects do not follow the head.
- QR: Save & share produces an adjacent tag while leaving the model visible. Existing model-only URL and separate complete JSON evidence semantics are unchanged.

Persistent primary slots, lock targets, option targets and furniture colliders survive refreshes. UIKit's explicit `initialize()` and guarded setters are used for dynamic buttons. FlexLayout has manual item discovery and defers forced layout until its replaying `onInitialized` event; it must not assume dynamically created components have already awakened.

Persistent controls also capture their action identity on trigger-down. Release runs it only if the same enabled action/context is still present; cancel, hover exit or a replacement clears the press. The miniature dock is narrower and follows the camera-facing edge of the model, freezing during a drag or control hover. Its buttons retain 6 cm base height and an enlarged collider; tag sizes reduce on close approach. The first-use hint is compact, time-bounded, dismissed by dragging and available again on hover until the first drag.

Audio uses one persistent component per cue, with each track assigned once during startup and only its playback position reset on reuse. This follows the installed UIKit audio stream pattern and avoids stop/reassign/play on one native stream. Audible spatial playback still requires the native check; typechecking does not prove it.

## Preview gates

1. Compile and save the coordinated source. At the measured table, capture front, side and approach views plus Spectacles simulation Center view. Check plinth contact, level alignment, depth, body below eye level, no unreadable/occluding text and the three-control progression. Inspect actual render materials, not only screenshots of code.
2. Use actual SIK far drag, then near drag after approaching the miniature. Confirm source inputs/history stay unchanged during the drag, one revision arrives after release, invalid drops roll back and the locked bed refuses movement. Measure evaluation `maxStepMs` from `getVerificationState()`; no Node-to-Preview timing extrapolation.
3. Run Find, Cancel and retry. Inspect all ghost sets; choose the returned +3 cm option, toggle Before/After, Apply, acknowledge once and watch the full trajectory. Check lock/profile/start/goal invariants and Undo.
4. Test proximity detail, controls at full size, side walk-around, door sweep, optional audio inputs and surface confirmation/failure. The supplied model must not visually imply a match to unmeasured environment furniture.
5. Run `open-door-blocked-to-clear` from a fresh baseline. It uses actual named SIK controls, waits on current verification state, selects a genuinely returned reserve ≥3 cm, checks one revision and preserved profile/locks, then checks the actual endpoint.
6. Run `open-door-surface-reach` from a genuinely far viewing pose with `expectedStrategy=indirect`, then after a real camera approach with `expectedStrategy=direct`. UIKit may use either Direct or Poke for the direct-family expectation; the actual enum/strategy is recorded separately and Poke never counts as Indirect. IK diagnostics use fail-fast and no functional fallback. The first nominal far camera actually routed as Poke and correctly failed the old indirect expectation; that is a recorded pose/routing finding.
7. Decode the final full native QR and verify the exact existing HTTPS companion handoff. Run the fresh log audit; retain actual audio/visual evidence before final design acceptance or new film claims.

The checks above describe reproduction gates. Current native observations and independent G2 review are accepted at the scope recorded in [spatial acceptance](../../spatial-release.md); typechecking alone is never evidence of execution. Optional WorldQuery and unfilmed proximity/lazy-follow transitions remain unverified.

## Follow-up scenario set

`open-door-drag-transactions` starts at a settled overview with the table unlocked. It chooses a small legal displacement from the actual input snapshot, then uses real SIK drag events. The default `expectedStrategy=indirect` uses the bounded functional ray interactor; `direct` uses IK with fail-fast and no fallback for the legal move. It observes unchanged source state during the drag and at queued release, waits for one evaluated revision, uses the actual Undo menu, then performs labeled far-ray locked-bed and invalid-boundary stress gestures. Those stress gestures do not claim human reachability. All operations have time limits.

`open-door-full-size-anchor` uses actual More → Full size → Miniature → Back controls. It checks unchanged input/hash/revision/camera, unit display scale and the task start mapped to the configured anchor. It does not prove that the assigned anchor lies on the environment's physical floor; that remains a visual/WorldQuery gate.

The first spatial source (`30219d10…`) compiled and completed `open-door-blocked-to-clear` in actual Preview in **13.746 s**. The follow-up-2 runtime (`3e17061b…`) then passed the expanded journey in **14.058 s**, including neutral Before labeling and the already-clear success state. Its actual search plus local checks took 3.951 s; three local candidate checks totaled 72 ms, with a maximum step of 31 ms. The applied model was revision 1/hash `d6a6c870b981f880` and the chair reached the exact bedside endpoint. All three audio cues were configured, three play calls completed and no product/audio exception was reported; counters alone are not an audible-output audit.

The complete 64-case source suite passes across eight files, including sixteen presentation cases. Application TypeScript, native/LEAF TypeScript and the original fixture regression also pass. The complete numerical engine is unchanged.

Near-control failures were retained: a camera aimed at the room left the dock outside the frustum and produced no events. A properly aimed near repeat passed; the bare-IK repeat then passed in **7.788 s**, observing actual UIKit **Poke** mode. Direct furniture dragging was subsequently accepted in the final Direct05 run with exact Direct mode, unchanged source during preview and queued onTriggerEndOutside release, one evaluated commit, actual Undo, locked-bed refusal and invalid-boundary rollback. Both hand tracking parents were restored. Direct04 failed IK diagnostics remain historical failures; no requirement was relaxed.

The unpadded [paced rehearsal](../../../lens-src/leaf/FILM-REHEARSAL.md) passed in **65.556 s**, reaching the real chair endpoint at **59.047 s**. Native v5 miniature and thin-floor outdoor support views were independently accepted for filming. These are rehearsal and staging observations, not acceptance of a recorded or edited video. The subsequent source-clock, capture, scoped Center, full-size03 journey and exact share handoff records are now accepted. Center shows the initial arrangement with unverified exact input identity, so it supports contrast/framing only. Final encoded-film QA remains pending.
