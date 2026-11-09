# Verification

Updated 9 November 2026. Source tests, actual native Preview observations and physical hardware are different forms of evidence. [Scope](../README.md#scope) defines the prototype’s limits.

## Current source checks

The round-four source passes **136 tests across 15 files**, application TypeScript, native TypeScript including the optional scenarios, and authored whitespace checks. The numerical engine, portable core and HTTPS/export/share contracts are unchanged. The original fixture regression and portable bundle check passed on this unchanged core. The last production web build belongs to the unchanged web implementation.

The fixture retains three separate results: chair and door blocked; moving only the table clears the chair while the door remains blocked; moving both relevant pieces clears both modeled tasks. One table edit is never evidence of door clearance.

The SDK-boundary tests execute the authored methods. They cover mandatory non-editor placement, blocked saved-spot bypass, pitched gaze, horizontal normal and range checks, repeated queries, pending/stale-hit rejection, release-only furniture commits, stale repair invalidation, native vector getters, held action identity, three-target accounting and persistent Undo. These are explicitly simulated boundaries, not Spectacles tests.

Presentation tests cover physical text and hit-target spacing, the full camera-facing plate plane, projected subject exclusions, short leaders, a contextual control’s dock fallback, compact single-ribbon geometry, mesh batching, real drag snapping, and all 49 chair poses remaining visible. Cached leader endpoints, changing dock actions and the 300 ms distance fade have separate checks. Recorded native camera/object bounds exercise the wide full-size dock, the safely hidden close-view dock, the low floor sign and a leader that ends on an actual chair part. These tests cannot establish native readability or field of view.

## Native acceptance in progress

The source003 native run completed the actual table drag, Undo, HTTPS search, option selection, Compare, Use and later rear-edge snap in 51.518 seconds. Its final revision 4 input hash was `23bff2355c471375`; both modeled tasks passed. The separate same-session menu test also passed. This established behavior, while pixel review still found missing movement labels and leaders that did not reach their objects.

Source004 corrected the plate plane, preserved resolved leader endpoints and used a genuinely held snap before release. Independent review of its first drag saw the readout progress from 14 to 71 to 72 cm, the leader reach the table, and the mint guide remain visible during the 500 ms hold. The table move and chair turn were visible; the door remained blocked. This is a bounded first-drag pass, not acceptance of the whole film.

That run then exposed a test-driver race between the temporary object Undo and the settled dock Undo. The driver now waits for the actually enabled target or opens the persistent More → Undo action. Source006 completed the fresh continuous journey in **54.460 seconds**, with **172 observed moving poses**, revision 4 and the same final input hash. The two real drags, Undo, three actual HTTPS options, Compare, Use and final snap all passed; every recorded state stayed within three UI targets.

Its bounded pixel review found clear move readouts at both held snap endpoints and visible options/comparison. Part of the second travel had no safe readout slot, and the final chair-status plate remained unplaced. The actual wide real-size dock was clear, while the low scope sign was unplaced. Source007 addresses those two status-label failures using recorded native bounds and actual backrest corners; its native pixel check is still pending. Required labels and docks that cannot be placed remain explicit diagnostics and may not cover the subject.

A separate source006 visible-hand sizing run passed **66 → 71 → 66 cm**, with fresh checks, one revision per change and all other input fields preserved. Its pixel inspection and the fresh placement, share, Center, performance and final scene-cleanup gates remain separate from these functional observations.

## Alignment and margins

Alignment now comes from the actual drag. The snap accepts only a valid placement within 2 cm of the wardrobe rear plane. Release creates one revision, clears any earlier repair certificate and independently checks the route and door.

For the retained numerical example, table `(0.91,3.01,0)` has rear edge 3.26 m and a 1 cm side gap. With the corresponding bench and revision, its hash is `23bff2355c471375`. Its fresh route extra-space lower bound is about **0.1506 cm** and its door bound about **0.2197 cm**, beyond the unchanged chosen 3 cm gap. This is not “3 cm to spare.” A new recorded gesture must establish its own exact input and hash.

## Indoor corner

The current display covers model x `[0,2.2]`, y `[1.4,3.4]` m at scale 1. It contains floor tape, furniture outlines, a bed corner and a neutral marker toward the omitted door. The ribbon is one display surface, not a stack of footprint outlines.

Every chair pose remains present. A complete buffered footprint inside the corner uses the solid schematic chair; an outside pose uses a wire outline. The former 1.5 × 2.0 m display’s 26-visible-pose behavior is historical and is not the current implementation.

The Colorful Home floor mapping is in [native setup](../native-setup.md). The fresh actual input and scale-1 root matched the miniature. The supplemental floor audit found positive support for all **980 in-use chair floor points** from at least one measured view; two unused grid issues remain recorded. This is finite sampled evidence, not a scan of the environment or proof about unsampled geometry. The final moving-camera composition and current-source label checks remain native acceptance gates.

## Retained evidence

The unchanged numerical suite checks interval motion, oriented rectangles, intermediate collisions, final heading, turn radius, reverse permission and conservative uncertainty. Repair tests preserve locks, dimensions and task data, reject invalid placements, discard stale work, and independently verify supplied motion and extra-clearance certificates. Earlier browser regressions cover same-tab/back-forward share navigation and complete model re-evaluation.

The [r003 native receipt](../evidence/native-recorded.json), [r003 gallery manifest](../evidence/native-gallery.json) and [r003 encoded film review](../evidence/film-review-r003.md) remain evidence for their dated source. They include real visible SIK input, genuine moving WorldQuery hits, 3D ghost selection, 66→71→66 cm sizing and QR/companion equality. They do not establish the redesigned r004 presentation.

[Historical r003 verification](r003/devpost-verification.md) preserves the prior accepted source and cleanup results. Earlier [8 November](2026-11-08/verification.md) and [7 November](2026-11-07/numerical-review.md) records remain separate.

Physical glasses, human tracking, user comfort and accessibility outcomes have not been tested. Native recordings are video-only; any reconstructed product sound in the film must be tied to actual logged cue scheduling and its original asset.
