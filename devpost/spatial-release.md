# Native experience

Open [`lens/OpenDoor.esproj`](../lens/OpenDoor.esproj) in Lens Studio 5.23.2. The miniature begins with two separate obstructions: the table blocks the chair’s turn and the bench blocks the door. The original example remains unchanged at startup.

A pinch drag previews an unlocked furniture move. Release validates the placement and checks the updated model; Undo restores the old layout. Suggest fixes searches actual geometry with the bed locked, then locally checks its returned alternatives. Point at a colored ghost, compare Before and After, and choose Use. Align back is a later real edit, so its fresh result replaces the earlier extra-space certificate.

## Measured Preview arrangement

| View | Placement |
| --- | --- |
| Miniature | Sunlit Room sideboard, surface center `(-30,-142.9,-474)` cm, yaw 0, scale 0.1 |
| Indoor bedside corner | Colorful Home floor y `-135.78` cm; world x `[-300,-150]`, z `[-350,-150]` cm |
| Original room center in indoor view | `(-155,-135.78,-185)` cm, yaw 0, scale 1 |
| Displayed model area | x `[0.65,2.15]`, y `[1.35,3.35]` m, exactly 1.5 × 2.0 m |

These measurements place the example on the floor; they do not register it to the environment’s furniture. The indoor view clips ghost boxes, edges and route lines. It never rescales the 4.2 × 3.4 m input room to fit the patch.

On device, a fresh surface hit and explicit confirmation are required. The editor’s saved pose cannot bypass that branch. A real-size placement asks for its own horizontal floor hit. The primary controls remain nearby during placement; afterward the model stays anchored and the real-size dock follows below eye level.

## Inspect and reproduce

[Native setup](../lens-src/SPATIAL-INTEGRATION.md) lists packages, script inputs and the separate LEAF test workflow. [Verification](verification.md) distinguishes source tests, actual Preview checks and physical hardware. Current film/gallery captures are in progress; the [previous spatial report](archive/2026-11-08/spatial-release.md) retains its own observed scope.
