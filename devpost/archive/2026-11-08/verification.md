> Historical record of the earlier build. Start with the [current documentation](../../README.md).

# Verification record

Updated 8 November 2026. Numerical logic, browser behavior, native Preview and physical hardware are separate evidence. The web repair flow and [7 November remote-search native release](../2026-11-07/native-repair-preview.md) have accepted evidence. The spatial revision has accepted native transactions, G2 presentation and recorded source evidence; [current spatial acceptance](spatial-release.md) records the closure and remaining encoded-film/user-review gates.

## Numerical and state checks

The suite contains **64 tests across eight files**: the earlier 48 geometry/planner/contracts/navigation/repair/certificate/playback cases plus sixteen native-presentation cases. A fresh complete run passes, as do application TypeScript and the unchanged fixture regression. Native TypeScript, including the new LEAF sources, passes against installed Lens/SIK/UIKit declarations and the compatible Leaf 2.0.2 package. The previous production web build remains the accepted unchanged build on Node.js 22 / Next.js 16.4.5. The portable core and numerical engine have no changes in this spatial revision.

The sixteen presentation cases verify that every schematic chair solid stays inside the supplied envelope; yawed full-size placement maps the real task start to its floor anchor; contextual action counts remain bounded; obstruction labels use actual witness IDs without invented deficits; reserve labels round down; proximity hysteresis behaves consistently; the illustrative gap line touches actual edges; and cooperative evaluation publishes only a complete, current result, stops between expensive steps and discards canceled work. Focused regressions cover candidate-only reserve labels, independently clear door feedback, an already-clear zero-move result, action replacement during a held pinch, duplicate blocked-feedback suppression and the thin full-size floor with unchanged miniature thickness. These checks do not establish native rendering or frame time.

Independent geometry expectations include analytic interval gaps, diagonal separation, rectangle rotation, arc endpoints and rigid-transform invariance. Intermediate collisions, minimum turning radius, reverse permission, final heading and uncertainty are checked. The numerical reviewer found and retained regressions for initial occupancy on empty trajectories and nominal/conservative uncertainty classification.

Repair cases include renamed/rotated/translated rooms, immutable source snapshots, lock/profile/task preservation, final placement validity, continuous route and door verification, stale/canceled work, atomic application and ranking across all reserve domains. Independent probing also rejected a forged preferred route with a full colliding 360° pivot appended at its final pose. A found proposal must pass the actual motion verifier, not merely match its endpoint.

Export-certificate tests reconstruct the source model, check both fingerprints and the one-revision transition, preserve original profile values, and recertify the retained route and door at the selected reserve. Altered reserve/move/identity evidence is rejected. Playback cases cover negative first-frame elapsed time, nonfinite progress and an empty or replaced path; these are regressions from an actual browser crash, not just defensive assertions.

## Spatial revision Preview progress

The follow-up-2 controller (`3e17061bf11384b37990306c2155598c3e6f53cd2f0fb25d028f45dcfdc335d7`) compiled and completed `open-door-blocked-to-clear` in **14.058 seconds** in native Preview. The actual HTTPS search and local checks took 3.951 seconds, including 72 ms of local candidate validation across three steps, with a maximum measured step of 31 ms. It applied one revision, retained the profile/locks and reached `(1.52, 2.63, π/2)` at revision 1/hash `d6a6c870b981f880`. Before showed the original blocked model without the candidate's reserve; a subsequent Find correctly showed No changes needed without another search or source edit.

Independent front/side screenshots passed table grounding, readable three-button controls and reduced clutter. Subsequent v5 miniature and thin-floor Sunlit Outdoor support views were accepted for filming. A near IK failure was traced to the dock lying outside the camera frustum; a properly aimed repeat passed. The later bare-IK run passed in 7.788 seconds with actual Poke mode, reported separately from Direct. Far drag/Undo/locked-bed/invalid-drop transactions passed; the final exact Direct furniture run subsequently passed preview/release/one-commit/Undo/locked-bed/rollback checks with both tracking parents restored. Earlier failed attempts remain failures. Three configured audio play calls completed without a reported product/audio exception, but counters do not establish audible output or spatial quality.

The unpadded paced rehearsal passed in 65.556 seconds and reached the chair endpoint at 59.047 seconds. The subsequent recorded take's native scenario passed in 65.100 seconds, observing 84 distinct moving poses and the final revision-3 model hash `d80f2566c8606cae`. These are actual scenario observations. Independent source-clock/crop review, scoped Center contrast/framing, full-size03 and exact shared input/repair equality are now accepted; the [149.5-second film](film-review.md) also passed independent encoded QA and complete browser playback. User approval remains pending.

The [paced Preview scenario](../integration-r003/FILM-REHEARSAL.md) executed in the accepted main source with disclosed automated SIK input. Native recording clocks are accepted; physical glasses reach remains untested.

## Computed fixture results

The unchanged baseline is revision 0, fingerprint `157d458020a00d14`, with table and bench witnesses. No furniture is moved while searching or comparing.

| Found alternative | Pieces | Translation | Certified extra reserve |
| --- | --- | --- | --- |
| Least movement found | 2 | 1.387926273 m | 0.000055610 m; the UI warns that it is under 1 mm |
| 1 cm reserve target | 2 | 1.401773548 m | 0.010043655 m |
| 3 cm reserve target | 2 | 2.227285052 m | 0.030426875 m |

Accepting the third proposal produces revision 1, fingerprint **`d6a6c870b981f880`**, two modeled checks clear, and one history entry. The original 0.03 m profile buffer, task poses/tolerances and bed lock are unchanged. The certificate uses the retained continuously verified motions and complete door sweep. It does not claim physical measurement precision at the displayed arithmetic precision.

[Exact search measurements](../../examples/repair-search-verification.json) include the transformed-room experiment and finite scope. Representative loaded Node runs took 3.379 s for the baseline and 4.622 s for the altered room; those are single source measurements, not native/hardware or percentile claims. The bounded candidate search is heuristic and excludes destinations occupied by other furniture's original footprints.

The original authored table-then-bench sequence remains an independent engine regression: table `(3.88, 2.85)` m clears the route while the door remains blocked; bench `(3.56, 0.48)` m clears the door. Those diagnostic fixture moves are no longer the primary repair UI or evidence of optimization.

## Actual browser and HTTPS checks

The frozen local production browser on port 3104 passed baseline → Find changes → three alternatives, with source revision 0 unchanged. The +3 cm option showed Original 0/2 versus Preview 2/2. Apply plus profile acknowledgment produced revision 1 and playback reached the end of the retained trajectory. The [actual downloaded JSON](../../examples/repair-certified-plan-r1.json) contained the exact accepted fingerprint, two moves totaling 2.227285 m and independently reverified reserve 0.030426874516801088 m. Undo returned to blocked geometry under a new revision.

Further browser checks passed cancel without a source edit; locking the bedside table produced an honest no-proposal result with the lock intact; changing width to 70 cm, starting search and resetting discarded stale work and restored the 66 cm profile. The repaired model's share imported revision 1 and reevaluated both checks clear. At 390 px width, document scroll width remained 390 px with no horizontal overflow. Proposal controls and spatial arrows stayed visible together.

A real production-bundle regression exposed an undefined footprint pose after Apply: the first animation timestamp could precede the captured start time, yielding a negative path index. Finite, nonnegative progress and safe path selection fixed it. The repeated apply/profile/playback/download/Undo flow passed without new console errors. The native controller now uses the same finite/nonnegative elapsed-time guard, with source regression coverage.

The deployed repair endpoint returned HTTP 200 with the same three alternatives in a measured **4.26 s** round trip; production export independently reverified the selected certificate and exact accepted hash. A separate source-only native adapter harness fed a real production response through all local proposal checks in **3.38 s** in its latest Node run. These are distinct observations, not native request timing or an SLA.

[Current proposal preview](../../media/companion-repair-preview.png) and [accepted footprint playback](../../media/companion-repaired.png) are actual deployed-browser captures. Earlier first-release desktop/mobile captures are retained and labeled separately in [media notes](gallery.md).

Existing shared-plan navigation remains compatible: canonical → revision 11 → same-tab revision 14 → Back/Forward, navigation with an open export dialog, and fragment removal all reset the appropriate model/history/proposal/export/playback context. The accepted original browser run had no console errors. Legacy revision-11/14 model/evaluation fingerprints remain unchanged by the repair API additions.

Live structured language preference parsing was also exercised in the original release, including a reviewed 5 cm buffer and a preserved locked bed. Geometry is deterministic and does not rely on that service.

## Spatial revision — native gate

The frozen source manifest and [integration contract](../integration-r003/SPATIAL-INTEGRATION.md) specify the measured table pose, full-size supplied-room floor anchor, audio inputs, live surface confirmation and LEAF registration. Source-only changes add near/far editing, release-time sliced evaluation, object feedback, spatial alternatives, contextual controls and a footprint-constrained chair. The engine, solver, verification rules, dimensions and HTTPS/QR contracts are unchanged.

Actual multi-view staging, scoped Center contrast/framing, SIK exact Direct/far releases, LEAF and exact QR handoff now have accepted evidence. Optional WorldQuery, unfilmed proximity/lazy-follow transitions and physical glasses remain untested; recorded native sources contain no audio. The authored functional scenario selects a returned reserve ≥3 cm and checks one revision, unchanged profile/locks and the real endpoint. The IK scenario requires the requested direct/indirect strategy and uses fail-fast diagnostics without a functional fallback. A source typecheck is not a LEAF run.

## Accepted native repair — 7 November release

The local-only repair revision compiled and rendered in SPECS 27 Interactive Preview. Actual SIK Find/Cancel interactions preserved the model and target identities. A later run was deliberately interrupted while still incomplete after **312.07 runtime seconds**, at 2,661 cooperative steps. Debugger instrumentation was present for most observations; this is not an isolated production benchmark. It was too slow for the intended interaction and was not accepted as a completed repair flow.

The replacement controller uses supported `InternetModule.fetch` against the deployed geometry endpoint. Before display it checks the request ID, generation, source hash/revision, envelope/scope/size, at most three candidate shapes and all motion/metric constraints; it reconstructs each candidate and rechecks protected inputs, placements, route, door and reserve locally. Server display paths/results are replaced by fresh local results. One alternative is checked per Update; Apply rechecks the selected proposal again.

The [source-only harness record](../../examples/native-remote-source-checks.json) passes 12 transaction scenarios, 16 remote/state scenarios and 16 malformed-response variants. Cancellation, identical-input retries, source/profile changes, stale completions, a 25-second timeout, partial verification and explicit offline fallback are covered. TypeScript against the actual installed Lens/SIK/UI Kit declarations passes. HTTP or verification failure never silently starts the slow local search; Try offline is an explicit action with a minutes-long notice.

The final actual native pass completed the full flow and 28 assertions over its recorded observations. Final ordinary search elapsed **3.248663 s**, HTTPS/body **2.998103 s**, local checks **271 ms total / 108 ms maximum** in instrumented SPECS 27 Preview. Actual gestures covered comparison, one-revision Apply, profile/resumed playback, Undo, changed profile/lock results, direct drag/refusal, cancel/retry and Keep. Supplemental held-real-response, timeout and simulated-failure checks are explicitly distinguished from normal requests. Full-scale inspection used a stationary limited viewpoint, not a view of the whole room.

That release's controller is **`29c94a1b7f538f2350cac24b629b034c64d7f02483e174514b7fa8ce1542494b`**, differing from its source-harness revision only by removal of a redundant normal footer. Its final native compilation and save passed. Its QA interval examined **1,118,880 log bytes** with zero Lens W/E/F diagnostics or unexpected Preview error prints. One controlled fault-injection print and one editor-only Qt cleanup warning are disclosed.

The actual full-frame QR, independent browser download and certified backend export all preserve final **revision 9 / `e0c04348bacddd78`**. Independent route/door checks reproduced **0.030426874516801088 m** reserve and exact native evaluation, excluding timing. The browser share correctly omits the selected repair certificate; the [certified native JSON](../../../examples/native-repair-plan-r9.json) retains it. [Current native report](../2026-11-07/native-repair-preview.md) and [sanitized measurements](../../media/native-repair-verification.json) give the complete boundaries.

## Accepted original native release

The original direct-edit project compiled, started, rendered and saved in Lens Studio 5.23.2.26081320 / SPECS 27 Interactive Preview with installed SIK/UIKit. Twelve observed assertions used the real installed SIK mouse/far-ray interactor, covering profile, table/bench fixes, axis/rotation/Undo, miniature and 1:1 drag transactions, invalid-drop rollback, bed locks, playback, scale and comparison. Full-scale input checks used one disclosed setup call to bring the bench into the unchanged viewport before actual injected gestures; the setup is not counted as an interaction.

Its final native revision **11**, fingerprint **`851f354fb4fef3b3`**, was decoded with ZXing from the full actual QR screenshot. Exact inputs and public JSON/SVG export matched, with numerical differences below `1e−12` excluding timing. Separately, an earlier revision **14** opened in a fresh companion tab and downloaded through the UI with fingerprint **`72b5dad200d31552`** and a clean console. These are distinct original-release evidence runs.

Native Preview corrected MeshBuilder's flat interleaved upload and stale SIK target lifetimes. Persistent menu/furniture targets replaced destructive rebuilds. The final original-source QA interval examined **810,745 log bytes** with no E/F/W or Preview error/exception prints after excluding editor transport/analytics payloads. One editor-only QTcpSocket disconnect warning followed cleanup; subsequent Preview error prints were empty. That clean claim applies only to the recorded original interval.

[Original native evidence](../2026-11-07/native-preview.md), [sanitized measurements](../../media/native-verification.json) and [integration](../integration-r003/INTEGRATION.md) preserve source hashes and boundaries. No LEAF pass was part of that original release. Physical glasses, phone QR scanning, on-device performance, comfort studies and external user feedback remain untested; Preview success does not establish those outcomes.
