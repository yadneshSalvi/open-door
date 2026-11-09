# Native setup

Open [`lens/OpenDoor.esproj`](../lens/OpenDoor.esproj) in Lens Studio **5.23.2**. The installed packages are **SIK 2.0.0**, **UIKit 2.0.0**, **3D Hints 2.0.0** and **LEAF 2.0.2**. Later incompatible package majors are not part of this project.

## Normal Preview

Use **Sunlit Room** for the tabletop. Its saved surface center is `(-30,-142.9,-474)` cm, yaw 0. The model scale is 0.1 and its plinth rests on the surface. Set the Preview camera after a reset or project reopen; those operations can reset the camera independently of the Lens.

The wide Preview recording used `(-30,-75,-430)` cm, looking toward `(-30,-142.9,-474)` cm. The narrower SPECS 27 projection can leave no safe slot for the three-button row at that distance. For current inspection, move 10 cm back to `(-30,-66.608,-424.562)` cm with the same 302.94° pitch; the observed row is then placed and all three targets are available. Set the camera after reopening. These are projection-dependent Preview inspection poses, not physical glasses measurements.

The immutable example begins blocked. The chair is 66 × 105 cm with a chosen 3 cm gap, and the bed is locked. A clear table move proves the chair task only; the bench can still block the door. Suggest fixes, one-option paging, Compare and Use keep those checks separate.

The native branch implements mandatory placement outside the editor. The editor may use its saved spot. Device startup and device Real size require genuine horizontal hits; a nominal aim or saved Preview pose cannot confirm them. Physical device behavior is still untested.

## Indoor real size

Use **Colorful Home**. The checked setup is a measured living-room floor patch, not a scan or registration of the supplied furniture.

| Input | Checked Preview value |
| --- | --- |
| Original model crop | x `[0,2.2]`, y `[1.4,3.4]` m |
| Display dimensions | 2.2 × 2.0 m at scale 1 |
| Physical floor patch | world x `[-410,-190]`, z `[-640,-440]` cm |
| Start anchor | `(-308,-135.70,-635)` cm |
| Yaw | 180° |
| Original room center | `(-400,-135.70,-610)` cm |
| Mapping | world x = `-190 - 100 × model x`; world z = `-780 + 100 × model y` |
| Wide inspection camera C | `(-550,40,-875)` cm, looking toward `(-300,-95,-550)` cm |
| Close turn-circle inspection | `(-420,40,-635)` cm, looking toward `(-320,-112,-535)` cm |

Fresh model/root checks, finite floor/ghost-ray observations and the actual moving-camera rehearsal support this setup. All 980 in-use chair-floor points have positive support from at least one tested view; two unused grid issues remain in the evidence. This is a finite Preview check, not physical room recognition. At a close view with no safe projected slot, the dock hides; looking toward a clear patch edge restores it. The supplied model is not claimed to match the room’s existing furniture.

Furniture and the route ribbon are clipped at the display boundary. The chair remains visible: solid when its complete buffered footprint is within the corner, outlined outside it. The door marker reports direction and actual hinge distance from the corner edge; it is context, not a substitute door check.

## Source and optional tests

Authored runtime source is in [`lens-src/`](../lens-src/). Test drivers live in [`lens-src/tests/`](../lens-src/tests/) rather than beside the runtime scripts. Generated package caches are not source.

```sh
npm test
npm run typecheck
npm run verify:fixture
npm run lens:bundle
```

The Lens bundle is the same numerical code used by the companion. Native TypeScript can be checked with `npx tsc -p tsconfig.native.json --noEmit` after Lens Studio has generated the installed SDK declarations. Import a coordinated source revision into Assets; do not mix revisions in an active Preview.

For optional LEAF reproduction, temporarily attach `OpenDoorLeafIndex` or `OpenDoorFilmIndex` and register the desired scenario through the official LEAF workflow. The public test indices declare their own parameters. Examples include `open-door-menu-exits`, `open-door-visible-drag-transactions`, `open-door-ghost-choice`, `open-door-chair-sizing` and `open-door-worldquery-placement` with `verifyMovingHit=true`. Tests drive the actual SIK path; they do not call product handlers to fake a result.

A fresh miniature is required for the bounded menu and main journeys. Real-size and share scenarios must use the input hash actually observed in the new main run, not a historical hash copied into a parameter. Native vectors and camera rotations are logged as explicit numeric components.

Remove temporary test index instances, runners, ray probes and any LEAF bridge from the normal scene, then compile, restart Preview and save. The current shipping scene has completed that cleanup, save/reopen, compile and fresh-start check. [Verification](verification.md) records the saved scene and exact scope.
