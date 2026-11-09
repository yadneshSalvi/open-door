# Open Door

I need to know whether a wheelchair can turn beside this bed. Open Door lets me try furniture moves before anyone has to lift them.

## What it does

Pinch a tabletop piece, move it and release. The old outline and a live distance readout show the change. A legal release checks the whole footprint, then plays the actual chair route. Amber marks an obstruction; mint shows a checked route. The door is checked separately, so a successful bedside turn never implies that the entry bench is clear.

Suggest fixes searches unlocked furniture while preserving the chair dimensions and task. One colored ghost appears at a time. Next option and Cancel keep the choices small; pinching the ghost opens Use and Before/After comparison. Moving the table again replaces the old result with fresh checks. A real rear-edge snap lines it up with the wardrobe without an alignment button.

At real size, wall tape, outlined furniture and a bed corner make the local scale tangible. A single ribbon traces the checked motion. The chair stays visible as an outline when it moves outside the displayed corner. The entered room is never shrunk to fit a convenient floor patch.

## Designed for glasses

The room stays anchored while I inspect it from another position. Controls belong to the action: pinch the chair to change its size, the door to try its swing, and furniture to move it. No more than three UI targets appear at once. Settings use the dock; nearby labels must clear the actual projected room. Only the tabletop uses a distant status glyph.

## How we built it

The [Devpost Learn plan-lens framework](https://github.com/challengepost/learn-specs) structured the original [brief](design-brief.md), room task and Preview constraints. Later design reviews drove the surface staging, pinchable chair, indoor corner and presentation refinements. This was a design exercise, not an invented interview or user study.

CLAD and Lens Studio MCP supported implementation and inspection in Lens Studio 5.23.2. SIK 2.0.0 and UIKit 2.0.0 provide actual hand/ray interactions and persistent controls; official 3D Hints 2.0.0 introduce the gestures. LEAF 2.0.2 runs exercise that same SIK path. The [verification record](verification.md) identifies which source and native results are accepted.

A shared TypeScript engine checks complete oriented footprints and continuous motions. Repair candidates arrive over HTTPS, then are independently verified inside the Lens. The search is bounded and preserves all input dimensions and locks. Small remaining margins are reported honestly.

Send to phone displays the current-model QR. The [companion](https://open-door-weld.vercel.app) reconstructs that model, checks it again, and provides dimension editing and downloads. It does not inherit the chosen native route or its repair certificate.

## What we learned

The result matters when a viewer can see which move caused it. Source tests established numerical and input invariants; native Preview exposed different failures, including clipped controls, overlapping plates and a hand covering its own action. Those require visual checks, not stronger claims from the same tests.

The next step is testing real tracking, readability, placement and comfort on Spectacles with people who can judge the task from their own experience. The current dimensions are synthetic, input is scripted in Preview, and a geometric pass is not accessibility certification. [Scope](../README.md#scope) describes these boundaries.

Lens project: [`lens/OpenDoor.esproj`](../lens/OpenDoor.esproj). [Watch Open Door](https://youtu.be/eqarlEEm_Vk). [Gallery](gallery.md). [Licenses](attributions.md).
