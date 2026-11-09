# Open Door native setup

The numerical engine and API contracts are unchanged. Canonical authored source is in `lens-src/`; the Lens project imports matching files under `lens/Assets/Scripts/`. Use the native editor to import and save changes. Never edit package caches or scene serialization to bypass editor lifecycle.

## Project and packages

Open `lens/OpenDoor.esproj` with Lens Studio 5.23.2. Retain installed SIK 2.0.0 / UIKit 2.0.0, the camera/world setup and authored mesh/material/font inputs. Official **3D Hints 2.0.0** is compatible with this package set; the newer renamed InteractionKit package family is not a drop-in replacement. Keep the official prefab’s guide child disabled and autoplay off. Its illustration is separate from the actual tracked test hand.

The controller uses the authored cube/material/font, three original [audio cues](Audio/provenance.json), a camera AudioListener, and the HTTPS companion base `https://open-door-weld.vercel.app`. No API credential belongs in native source or the scene.

Current source lists: [product008](ROUND3-PRODUCT-SOURCE-008.json) and [test-only LEAF008](leaf/ROUND3-LEAF-SOURCE-008.json). These bind the accepted runtime and reproduction source. Lens Studio Preview acceptance is recorded separately from physical-device testing, which has not been performed.

## Editor staging

Set the miniature surface center to `(-30,-142.9,-474)` cm, yaw 0. The 1.1 cm plinth rests on that measured Sunlit Room sideboard; miniature scale is 0.1. The inspector’s confirmed placement is only an editor convenience. A device always begins unplaced and needs a fresh horizontal WorldQuery hit. A no-hit/timeout/retry cannot confirm it.

For the indoor bedside inspection, use Colorful Home and these display inputs:

```text
fullSizeStartPositionCm = (-247,-135.78,-160)
fullSizeYawDegrees = 0
fullScaleOverlay = true
cornerMinM = (0.65,1.35)
cornerMaxM = (2.15,3.35)
```

The original room center becomes `(-155,-135.78,-185)` cm. The 1.5 × 2.0 m crop maps to world x `[-300,-150]`, z `[-350,-150]` cm. This is a measured open patch, not a twin of nearby furniture. The original room and furniture keep their true dimensions. Lines and transparent boxes are clipped; the chair appears only when its whole expanded footprint fits. Only 26 of the aligned path’s 49 poses qualify.

A device’s real-size mode requests a separate floor hit and places the crop center there. It does not reuse the editor’s distant floor coordinates. WorldQuery follows actual gaze, re-queries at 2 Hz and rejects stale, non-horizontal, out-of-range or absent hits. Mint confirmation feedback requires a ready real candidate. During placement, room annotations and hints are hidden and the dock stays below the gaze point.

## Interaction and geometry boundaries

The starting room is still genuinely blocked. Use the real table drag or Suggest fixes to change it. Align back places the table at `(0.91,3.01,0)` in the reviewed example, adding one history entry and recalculating both tasks. It clears any old repair certificate, share URL and export. Do not visually offset the mesh away from its checked pose.

Furniture, button and option targets persist across rebuilds. A held pinch cannot dispatch a replacement action. Drag preview leaves the source untouched; a legitimate release queues one commit and sliced evaluation. Invalid and locked moves preserve the source. Actual expanded-footprint and door motions come from the unchanged verifier, not a new visual path.

The dock uses 10.5 × 6 cm buttons and a 2.2 cm gap between horizontal hit regions. Labels and controls retain physical scale. The current working and Center views were inspected in native Preview. The physical sizes are not inferred from a projected-box unit test. Full-size controls use their nearby following dock for availability; furniture detail still uses actual eye-to-object distance.

## LEAF development workflow

Use a separate development scene for automation. Install compatible **LEAF 2.0.2**, attach `OpenDoorLeafIndex` once, and optionally attach `OpenDoorFilmIndex` for capture. The official LEAF panel owns its bridge. Do not create duplicate bridges or bind individual scenario scripts as active startup components. See [scenario instructions and parameters](leaf/ROUND3-SCENARIOS.md).

The visible hand uses a fresh SDK-permitted `LeafSingleHandInteractor` subclass for each run. Its pinch midpoint and palm roll are measured; it is not scaled or composited over the product. Every scenario checks actual SIK modes. Teardown restores tracking and waits before another wrapper starts. Logs distinguish real interaction from read-only state assertions. Main/full/share logs also record actual product audio scheduling for video-only capture.

Before shipping, remove or deactivate both indices, the LEAF bridge and private scenario runner. Restart Preview, confirm compilation/runtime, and save. Keep scenario source for reproduction. Never turn a failed gesture into a pass by calling its product handler.

## Checks

```sh
npm test
npm run typecheck
npx tsc -p tsconfig.native.json --pretty false
npm run verify:fixture
npm run lens:bundle
```

`npm run lens:bundle` regenerates only the canonical portable core. Do not run it or copy sources while another native integration is in progress. The current local run passed 100 tests across 12 files, web and native typechecks, fixture regression and the canonical bundle check. The bundle reproduced the existing core bytes; no Assets sync was performed by that command. The [verification record](../devpost/verification.md) records completed native checks and film evidence. [Scope](../README.md#scope) covers physical-device and modeling limits.

## Accepted Preview behavior and release scene

The 9 November visible-hand runs exercised real furniture drag/Undo, the three HTTPS alternatives, Before/After, Use, and Align back. The aligned result is revision 4, input hash `23bff2355c471375`; both checks pass after the last real edit. Its conservative extra room is about 1.51 mm for the route and 2.20 mm for the door, beyond the unchanged requested 3 cm buffer. The earlier selected 3 cm repair certificate does not describe this later layout and is cleared.

Separate native checks passed actual ghost-collider selection, width 66 → 71 → 66 cm with a fresh check each time, and genuine WorldQuery placement. The moving-hit test observed a 1.958 cm candidate movement and query count 2 → 12 before confirmation. Only the 66 → 71 portion is used in the accepted film; the full return-to-66 is a functional QA result. A valid adjacent gaze hit was measured before filming; a no-hit gaze is not replaced with a nominal pose.

The indoor film uses the same complete aligned input and the measured bedside crop. Its standing camera is `(-225,20,-30)` cm, looking at `(-225,-135.78,-250)` cm. All 26 included buffered chair poses remain within the patch and in frame. The actual QR decodes to the same final model and a fresh companion tab rechecks both tasks; this is a model handoff, not a claim that a selected trajectory or optimization certificate transfers.

The saved release scene has no active LEAF index, bridge, private runner or ray probe. Its SHA-256 after native cleanup is `ccec448382cf8d34780f0f33eaa4b91e8da37c97bfe7ae166506b9428add2d6b`. The source remains available for deliberate development-scene reproduction. Preview input is scripted through real SIK interaction; it is not a recorded physical Spectacles test.

Product008 also closes two presentation findings from final review. A fully occluded Undo hit rectangle now receives a bounded camera-facing position; native verification confirmed all three controls, the complete readable Undo target at the aligned pose, and a real Undo restoring the previous proposal at revision 5. Native vector getters are copied explicitly. The official hint now holds its single-animation end pose through 27 observed idle samples and dismisses after a successful actual drag, using the public AnimationPlayer API. The release scene was cleaned, recompiled and saved again with the same scene hash. Protected film footage remains its accepted product006 source, with the brief older Undo occlusion disclosed in the film technical record.
