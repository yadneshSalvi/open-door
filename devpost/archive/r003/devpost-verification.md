> Historical r003 source and observations. This page is preserved for that revision.

# Verification

Updated 9 November 2026. Numerical tests, native Preview observations and physical hardware are separate kinds of evidence. Modeling and testing limits are collected in [Scope](../../../README.md#scope).

## Current source

The numerical engine, continuous motion verifier, portable core and HTTPS/export/share contracts are unchanged. The final source run passed **100 tests across 12 files**, application TypeScript, native TypeScript and the original fixture regression. The web production build passed before these native-only changes.

The unchanged fixture regression confirms three distinct states: original chair/door blocked; moving only the table clears the chair while the door remains blocked; moving the bench as well clears both modeled tasks. A table move is never used as proof of door clearance.

The new tests execute actual authored native methods against an explicitly mocked SDK boundary. They check the false-isEditor startup branch, blocked Back and saved-spot bypass, fresh floor placement, real-hit-only confirmation, 2 Hz requery, stale/no-hit handling, the pitched gaze intersecting a tabletop before its back wall, placement-only labels, physical UI sizes, held-action identity and aggregate target counts. They are simulations of those branches, not physical Spectacles tests.

Annotation tests cover projected bounds, obstruction avoidance, stable eligible positions and required-label fallback. Undo placement also tests the full target rectangle against furniture bounds and uses native-style non-enumerable vector getters to catch SDK interop errors. They cannot establish rendered readability or native field of view; those need actual camera checks.

## Table alignment and indoor crop

Align back uses the real edit path. For the reviewed repaired example, table `(0.91,3.01,0)` aligns rear edges at 3.26 m and leaves a 1 cm side gap beside the wardrobe. Both tasks are recalculated and the earlier repair certificate is cleared. The resulting input hash is `23bff2355c471375` at revision 4. The fresh route extra-space lower bound is `0.0015062914311184186 m`; the door bound is `0.0021967573465547785 m`. The conservative display is **At least 0.1 cm extra room**, never the earlier 3 cm choice.

The indoor display clips to room x `[0.65,2.15]`, y `[1.35,3.35]` m. It retains the true dimensions and checks the complete original model. Only **26 complete expanded chair footprints** out of the 49-pose aligned path fit inside the measured patch. Testing only pose centers would incorrectly show all 49; the actual implementation checks the whole footprint.

## Native Preview

The 9 November 2026 runs used **Lens Studio 5.23.2, SIK 2.0.0, UIKit 2.0.0, official 3D Hints 2.0.0 and LEAF 2.0.2**. CLAD and Lens Studio MCP supported scene integration and inspection. Native SIK logging uses an internal version string; the versions here are the installed package versions.

| Interaction | Observed result |
| --- | --- |
| Surface placement | The real WorldQuery reticle received a horizontal hit, a visible hand pinched Place here, and the miniature unfolded. Display placement changed; all model inputs stayed equal. |
| Moving reticle | Changing actual camera aim moved the genuine hit by 1.958 cm while the query count advanced from 2 to 12. Confirmation then completed through the normal hand control. |
| Furniture edit and Undo | A real drag/release committed once and checked the new position. The chair cleared while the separate door stayed blocked; Undo restored the earlier model. |
| Checked layouts | Fresh HTTPS proposals were verified locally. Actual 3D ghost selection isolated the selected layout; Before/After and Use ran through the visible controls. |
| Chair sizing | Actual +5 cm and −5 cm controls changed 66→71→66 cm, one commit per press. Normalizing only the edit counter restored the exact original input hash. |
| Undo visibility | The aligned table keeps its Undo chip fully visible. A visible pinch restored the prior proposal’s furniture and chair profile, with the edit counter advancing normally; the aggregate stayed at three controls. |
| Hand hint | The official move animation played once and its pose stayed visible through 27 idle observations. The actual first furniture drag dismissed it. This is representative Preview timing. |
| Final alignment | Align back committed the requested table position, cleared the obsolete proposal certificate, and produced fresh chair and door checks. The complete route replay finished. |
| Real size | The same final model ran at scale 1 on the measured indoor floor patch. All 26 displayed complete expanded footprints fit inside it. |
| Distance and menus | A continuous walk-in crossed far, middle and near bands. Contextual chair/door controls, Back, Undo and the aggregate three-target limit were exercised. Actual Center simulation was inspected separately. |
| Share | The QR decoded from recorded pixels to the final model. Opening that exact URL in the companion reproduced its inputs and fresh checks; it did not transfer the old route certificate. |

The [recorded interaction receipt](../../evidence/native-recorded.json) and [gallery source manifest](../../evidence/native-gallery.json) bind the concrete results and frames. The film's 66→71 cm insert is a separate feature demonstration; it does not claim to show the return to 66 cm. The later continuous main explicitly uses the original chair.

Visible input uses an SDK-permitted LEAF hand subclass with a measured pinch midpoint and camera-relative palm roll. Every gesture follows real SIK interaction modes; teardown restores tracking. The saved production scene has no active test indices, temporary runner, ray probe or LEAF bridge. It compiled and started cleanly after removal. An unrelated host-authentication analytics warning is not a product runtime result.

Native recording is video-only. The film uses narration and original music, plus original product-cue assets aligned to logged actions. [Film review](../../evidence/film-review-r003.md) records the exact encoded file checks separately from native behavior.

## Numerical and browser foundations

The retained suite covers independent interval/rotation/arc expectations, intermediate collisions, start occupancy, final heading, turning radius, reverse permission and conservative uncertainty. Repair tests preserve locks/dimensions/task inputs, reject invalid final placements, discard canceled or stale work and verify all supplied motions. Certificate tests bind the source and result hashes and independently recheck the selected extra space. Browser regressions cover same-tab/back-forward shared models and an actual playback race that once produced an undefined pose.

The production companion and APIs have earlier complete browser/HTTP evidence. A shared link carries the model and triggers new evaluation; it does not preserve the selected native path or optimization certificate. [Repair method](../../repair-search.md), [geometry](../../geometry.md) and [API](../../api.md) document those contracts.

## Earlier evidence

- [8 November spatial build](../2026-11-08/spatial-release.md): near Direct and far transactions, 14.058-second blocked-to-clear test, outdoor full-room playback and matching QR. Those are the previous presentation.
- [8 November film](../2026-11-08/film-review.md): the unchanged 149.5-second file and its complete playback/encoded checks.
- [7 November remote repair](../2026-11-07/native-repair-preview.md) and [original native release](../2026-11-07/native-preview.md): separately retained source hashes, assertions and handoffs.

Test indices, the LEAF bridge and temporary scenario runners are absent from the saved release scene. [Reproduction instructions](../integration-r003/SPATIAL-INTEGRATION.md) keep testing separate from normal startup.
