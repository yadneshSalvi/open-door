# Paced Preview rehearsal

This is an automated native **rehearsal**, not accepted footage or a physical reach test. It sends actual SIK events through LEAF's invisible `CustomController`; the product performs its real HTTPS search, local verification, release-only edit and trajectory playback. No product action, geometry, placement or export handler is called by the scenario. Camera movement belongs to the editor/capture operator.

In a **separate development scene copy**, copy `OpenDoorFilmScenario.ts` and `OpenDoorFilmIndex.ts` into `Assets/Scripts/leaf/`, then attach `OpenDoorFilmIndex` to a separate scene object. Use compatible official LEAF 2.0.2. The official LEAF panel owns MessagingBridge; do not create a duplicate. Attach `OpenDoorLeafIndex.ts` once if functional scenarios are needed. Do not attach the scenario itself. This separate index leaves the functional scenario index unchanged. The coordinated delta also includes the trace-only reach scenario and the scale scenario's optional retained-full-size branch; hashes are in `FILM-REHEARSAL.json`.

## Miniature

Run **`open-door-paced-preview`** from a fresh Preview with the measured miniature pose confirmed, both tasks blocked, revision 0 and the profile not yet acknowledged. Set the camera and recording first. The scenario waits 1.5 seconds, then checks those conditions. It rejects a stale/repaired model instead of silently resetting it. Separate reach/drag acceptance is required; a functional ray interactor cannot establish human reachability.

Registered runner settings are `WARN`, fail-fast diagnostics, report duration `0`, and a 120-second overall timeout. On a fresh reset this avoids LEAF's INFO overlay while preserving errors and console evidence. It does not hide or clear an existing product warning. Any film using the take must disclose **Lens Studio Preview · automated SIK input** and the supplied-room scope. Invisible scripted input is not a recorded human hand gesture.

The current scenario has no fixed-duration padding. Actual network, evaluation and interaction time determine its duration; the accepted-picture builder allows a complete 58–85-second protected interval. Meaningful reading pauses and the complete trajectory remain intact. The historical 72.007-second rehearsal used the earlier padded version and is not a timing claim for this revision.

| Beat | Actual interaction and hold |
| --- | --- |
| Blocked room | 4-second opening, then Rehearse |
| Supplied footprint | 3.5-second profile acknowledgment, actual OK, 4.5-second checked collision witness |
| Reversible edit | Table hover, 900 ms actual far drag, one released revision, 3-second fresh-result hold |
| Restore | More → Room tools → More → Undo → Back, then 2.5 seconds on the restored room |
| Computed alternatives | Actual Find changes and HTTPS/local checks; seven seconds with the three returned spatial options |
| Review | Select the greatest independently certified reserve returned; six seconds After, 4.5 seconds Before, 4.5 seconds After |
| Apply and rehearse | Actual Use this layout, one revision, uninterrupted complete trajectory, at least 6.5 seconds at the endpoint |

The drag direction is selected from legal bounded displacements in the unchanged current geometry. LEAF 2.0.2 advances its vector per actual Update, so the nominal 30 cm is not presented as the measured distance. The trace records actual displacement and unchanged source state during preview. Undo restores furniture, profile and task settings while advancing the revision. The search operates on that current restored revision; it does not reuse a baseline response.

Every `OPEN_DOOR_FILM` record has wall epoch milliseconds, elapsed wall time, native time and an event sequence. Action start/end, actual targeting mode, scene state, input hash, revision and audio counters are retained. Distinct observed playback poses have separate records; the actual endpoint is recorded separately. Footage still requires decoded-frame timing and crop review at rate 1. A passing scenario does not establish recording acceptance.

Keep the whole causal segment continuous, including the supplied footprint, reversible drag/Undo, real search, option review and complete rehearsal. Preserve at least two genuine seconds before the first causal action and after the endpoint. If a take fails, retain the evidence and record a new accepted take after correcting the cause. Do not replace a failed interaction with a developer handler call.

## Separate full-size scene

Run **`open-door-full-size-film`** at a settled miniature overview in the separately selected, measured environment. It uses actual More → Full size controls, checks the unchanged input and exact start-to-anchor transform, waits two seconds and leaves the full-size experience running for the camera operator. The ordinary `open-door-full-size-anchor` scenario still returns to miniature by default. The optional behavior is `retainFullSize=true`.

The retained scene does not move the camera, calculate a new floor plane, or claim alignment to the background's furniture. Disclose the separate Preview environment and manual placement. Visible floor contact, walk-around parallax, full-size framing and controls remain native visual gates.

For a complete checked chair journey, use **`open-door-full-size-clear-film`** from a fresh miniature baseline in the intended full-size environment. Its excluded setup performs an actual small SIK drag, actual Undo, a fresh HTTPS search, selection of the greatest independently certified reserve, Apply and the full miniature rehearsal. That sequence reaches revision 3 through the same number of real transactions as the miniature film; exact model/hash equality must still be checked against both actual run records.

It then enters Full size through real SIK controls, checks the unchanged model and configured start-to-anchor transform, and emits `full-size-ready`. The camera operator has 12 seconds to move. The scenario then waits, with a 20-second bound, until the ordinary lazy-follow dock is within 4 cm of its intended pose. It does not teleport the dock or accelerate follow. Actual Rehearse then runs the full-size chair to its endpoint, holds three seconds and leaves the model running. `OPEN_DOOR_FULL_FILM` records provide separate real clocks and observed poses for this sequence.

The miniature uses the accepted Sunlit Room sideboard framing. The previous Colorful Home full-size anchor was rejected because a wider view showed a wall intersection. Independent review accepted the thin-floor Sunlit Outdoor support views as a separately staged supplied-room showroom. Its configured start is `(-92, -172.7, -175)` cm, yaw zero; all placement inputs remain configurable. The full-size floor is a 0.1 cm display surface at that ground plane; miniature floor thickness and all checked geometry are unchanged. A support-view pass does not establish the full-size film's source clock or model equality.

## Fresh share take

Run **`open-door-share-film`** from the fresh, confirmed miniature. Its `expectedInputHash` must be the independently observed main take value; the current index binds take 01's `d80f2566c8606cae`. It reproduces the complete real drag → Undo → HTTPS options → strongest reserve → Apply/rehearse prelude and refuses to continue unless the resulting revision-3 model matches that hash. No product handler is called directly, and no input field is injected.

After `share-shot-ready`, a three-second untouched hold precedes actual More → Room tools → Save & share → Show QR. The scenario records the exact URL, complete input snapshot and retained repair evidence, then holds the actual QR for eight seconds. `OPEN_DOOR_SHARE_FILM` retains wall/native clocks and action modes. This is explicitly a separate fresh take of the same supplied model, not an edited continuation of the main recording. Pixel decoding and a fresh companion's exact input equality/re-evaluation remain independent gates.

## Near-input diagnostic delta

The reach scenario records raw SIK HoverEnter/Exit, TriggerStart/End/EndOutside/Canceled and UIKit down/up/hover-exit events, with actual target poses, scale, input mode, menu state and timestamps. The accepted near-control repeat observed Poke mode after the camera was aimed at the actual dock; the prior zero-event failure had the dock outside the frame. Poke is reported as Poke, never indirect. Furniture still requires exact Direct mode.

Both near scenarios use the supported `IKBodyInteractor` without a Bitmoji visualizer or functional fallback. They explicitly dispose IK and restore both hand tracking parents before a 650 ms tracking restart wait. The drag scenario additionally emits a bounded `drag-gesture-trace` before transaction assertions, including actual targeting modes, preview count, release/commit state and LEAF diagnostics. These observers do not change product or SDK behavior.

## Current acceptance and production cleanup

Native/LEAF TypeScript and the 64-test source suite pass. Final exact Direct05 furniture transactions and the far repeat passed in actual Preview; Poke controls remain a distinct observation. Direct04 failed IK diagnostics and other failed takes remain historical failures. The accepted main take contains the complete 65.100-second scenario and 84 moving chair poses in a protected 69.5-second uncut source interval (16.8–86.3 seconds). Accepted main/full-size03/share inputs and accepted repair deeply equal at revision 3/hash `d80f2566c8606cae`. Actual source QR decoding and fresh production companion input reconstruction passed. [Current source and G2 acceptance](../r003/devpost-spatial-release.md) records the scope.

Center is actual initial-arrangement contrast/framing evidence only; its exact input identity is unverified. Optional WorldQuery placement, unfilmed proximity/lazy-follow transitions and physical glasses remain untested. Final film encoding, caption/sound QA and user approval are separate pending gates.

The production scene was cleaned of active functional/film indices, LEAF bridge and temporary helpers, restarted and saved with clean compile/runtime observations. To repeat QA, work in a development copy. Remove both indices, bridge and temporary helpers from production after QA, restart Preview, inspect compilation/runtime and save cleanly. Do not ship automatic scenario execution.
