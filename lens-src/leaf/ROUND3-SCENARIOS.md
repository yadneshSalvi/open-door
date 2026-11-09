# Round 3 native scenarios

These instructions describe frozen [LEAF008](ROUND3-LEAF-SOURCE-008.json) with [product008](../ROUND3-PRODUCT-SOURCE-008.json), and supersede the preserved r002 `FILM-REHEARSAL` capture sequence. Source checks do not establish native execution, visual acceptance, physical reach or hardware testing. The root operator owns synchronization, camera framing, scene inputs and recording. Keep both scenario registries and the private test runner out of the release scene.

The visible input helper uses the installed LEAF 2.0.2 extension point: a directly constructed domain subclass of `LeafSingleHandInteractor`. Each run owns its wrapper; it does not reuse the shared singleton that survives after SDK cleanup has destroyed its tracked-hand wrapper. Guarded disposal restores tracking, followed by a 650 ms wait for the documented implementation's 500 ms restart. No package source is edited. Every visible press and drag asserts actual SIK Direct input. The independent far-ray tests continue to require Indirect; near UIKit reach records Direct/Poke separately.

The real tracked hand approaches from the lower right. Its finger direction is measured, then its index-to-pinky radial axis is rolled toward the actual camera to expose the thumb/index silhouette. The pinch midpoint is measured again after rotation. The hand retains its actual dimensions. Release clears the test channel, retreats 350 ms, then calls `hide(1)`; no default hide sweep crosses the room. No product handler or private input state is invoked.

| Runtime target | Purpose |
| --- | --- |
| Example room | Actual model-to-world transform; input unchanged by display scale |
| Furniture names from current input | Persistent SIK furniture targets; release queues one real edit |
| Pinch chair to size | Width / Extra room / Back; successful use dismisses its hint |
| Pinch door to try it | Try the door / Back |
| Undo edit; Align table | On-object Undo and real Align back edit |
| Layout option 1–3; Layout ghost 1–3 | Actual returned choices through label or moved-furniture geometry |
| Suggest fixes; Try the route; More | Online repair, collision pose/verified playback, shallow menu |
| Compare; Before; After; Back; Use | Neutral Before, checked After, one fresh application |
| Place; Place here | Horizontal WorldQuery candidate and explicit confirmation |
| Real size; Table view | True-scale bedside crop / miniature |
| Save; Send to phone | Current-input QR; no paired-phone API claim |

`open-door-paced-preview` starts from the unchanged blocked fixture, confirmed miniature and revision 0. Aim the camera **after** reset. It shows a checked collision pose, a visible table drag that clears the chair route while the door remains blocked, Undo, actual HTTPS alternatives/local verification, Compare → Before → After → Back, Use with its full verified playback, and a real Align back edit with a fresh check/playback. The four revisions are drag, Undo, Use and Align back. The final table is `(0.91,3.01,0)` and the old 3 cm certificate is cleared. The final extra-room claim must use the fresh result. There is no duration padding; accept the actual continuous clock and footage before narration.

`open-door-full-size-clear-film` repeats that exact input journey, then More → Real size. Its declared `expectedInputHash` defaults to an empty string for setup QA; pass the **actual main-take hash** for filming. It requires root `(-155,-135.78,-185)` cm, yaw 0, scale 1, room crop x `[.65,2.15]`, y `[1.35,3.35]`. The root operator has 10 seconds to position the camera, followed by a bounded check that the naturally following dock has settled. Accepted standing camera `(-225,20,-30)`, look-at `(-225,-135.78,-250)`. The scenario never moves it. Exactly 26 complete buffered chair footprints are visible within the measured 1.5 × 2.0 m patch; all 49 route poses remain part of the original whole-model check. Do not describe this as the full route displayed indoors.

`open-door-share-film` repeats the same four revisions, requires a nonempty 16-character `expectedInputHash` from the accepted main take, and performs Save → Send to phone. It asserts complete input equality, cleared old certificate and current URL. Native QR-pixel decoding and a fresh companion recheck are separate root acceptance gates. The parameter is declared in the registry so the native runner accepts it; there is no stale hardcoded hash.

Main/full/share logs contain wall epoch, native time, source state and actual button/grab/release events. A read-only observer stamps changes to `audio.count` and `audio.lastCue`, plus observed playback stop. The recorder is video-only: these are scheduling receipts, not captured or listened-to native audio. A later soundtrack may reconstruct only the original licensed product cues at those observed times, with provenance recorded.

Functional registry: `open-door-visible-drag-transactions` (Direct), `open-door-drag-transactions` (Indirect), `open-door-surface-reach` (default Indirect; direct family is a separate explicit parameter), `open-door-worldquery-placement`, `open-door-object-menus`, `open-door-chair-sizing`, `open-door-ghost-choice`, `open-door-blocked-to-clear`, and `open-door-full-size-anchor`. Ghost QA selects a real moved-furniture collider, verifies source identity and hint success, then cancels. Drag QA accepts exactly one end/endOutside release, never cancellation; source/hash/history stay unchanged through preview/release, then exactly one commit and Undo. Locked and invalid drops remain separate genuine far-ray gestures.

`open-door-full-size-film` is only the retained scale/anchor inspection helper. It does not establish a clear route. Device placement is covered separately by explicitly simulated SDK-boundary tests and native Preview WorldQuery tests; neither is a physical Spectacles test. Old r002 evidence and films remain untouched.

## Placement and size reproduction

`open-door-worldquery-placement` declares `verifyMovingHit: 'false'`. With the default, it opens Place using the visible SIK hand, waits for a genuine ready horizontal candidate and confirms it. With `'true'`, it records the first candidate, emits a five-second operator camera window and requires at least two additional queries plus a fresh ready candidate displaced by at least 0.5 cm. It then waits one second before the actual Place here gesture. The scenario never injects a hit or changes the camera. The accepted native run moved 1.958 cm, with query count 2 → 12, then confirmed without changing room inputs.

For the accepted Sunlit Room placement, the camera is `(-30,-101.1,-424.2)` cm, aimed at `(-20,-142.9,-474)` cm. The recorded valid hit was approximately `(-20.199,-142.068,-473.008)` cm. Re-aim at a genuinely queryable surface if the current ray has no result; do not authorize placement from an absent hit. Editor manual staging is not a device fallback.

`open-door-chair-sizing` uses the actual visible controls: chair → Width → +5 cm → fresh check → −5 cm → fresh check. It requires width 66 → 71 → 66 cm, exact preservation of other dimensions/room geometry, and a revision for each edit. The full native QA passes; the film accepts only its stable-camera 66 → 71 segment. Object-menu inspection alone does not establish dimension editing.

## Current acceptance and shipping boundary

Native acceptance covers the continuous blocked → drag/Undo → HTTPS options → apply/rehearse → aligned-table fresh check, actual ghost selection, near/far gestures, placement and moving reticle, actual size changes, the 26-pose bedside subset, and exact QR/model equality with a fresh companion check. The final main, bedside and share input is `23bff2355c471375` at revision 4. Center and separate feature inserts retain the original blocked example unless their own record explicitly states otherwise.

Remove both registries, the official bridge, private launchers and probes from the release scene. The current saved scene has completed that cleanup and a fresh native compile/runtime check. The local source verification passed 100 tests / 12 files, web/native typechecks, fixture regression and an unchanged canonical core bundle. These are Preview and simulated SDK-boundary tests, not physical Spectacles validation. See the public [native verification](../../devpost/verification.md) for curated evidence.

Post-capture product008 acceptance confirmed the official hint's held pose over 27 idle samples, followed by actual drag dismissal; the aligned Undo target was fully visible among three controls and a real Undo restored the preceding proposal. This final runtime check does not replace the product006 protected film. Source tests explicitly cover non-enumerable native vector getters and the official hint's completion callback; mocked boundary tests alone are not the basis of the native visibility claim.
