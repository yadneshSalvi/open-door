# Open Door

Moving a bedside table is easy to suggest and harder to judge from a floor plan. Open Door lets someone try the move first: pinch a miniature piece, release it, and watch whether an example wheelchair can turn toward the bed.

## What it does

The Lens sits on a table in front of you. A chair outline and on-object amber labels show the two separate problems: the bedside turn and the door’s swing. A legal drag checks the new layout, then plays the actual chair route. Undo restores the old positions.

Suggest fixes searches the unlocked furniture while keeping the bed, chair dimensions and task fixed. Up to three colored ghost layouts show the choices. Point at one, compare Before and After, then use it. A later edit, such as aligning the table with the wardrobe, is checked again; it cannot keep the old result or its extra-space number.

Real size shows the bedside corner at its actual dimensions on an indoor floor. The transparent furniture and route are clipped to a measured 1.5 × 2.0 m patch. Stand beside that turn and inspect the space around the chair, with the model anchored to the floor.

## Designed for glasses

Controls belong to the objects: pinch the chair to change its size, the door to try its swing, and furniture to move it. No more than three UI buttons appear at once. Official hand hints introduce the gestures. Distant views reduce to a large status glyph; close views reveal gap detail. The room stays in place while the controls remain below eye level.

## How we built it

The [Devpost Learn plan-lens framework](https://github.com/challengepost/learn-specs) guided the [written design brief](design-brief.md). Its spatial-design questions led from a floating control panel to a surface-staged room, from a blocking size dialog to a pinchable chair, and from a full-room platform to a local indoor corner. This was planning from a design brief, not a user study.

CLAD and Lens Studio MCP supported implementation and inspection in Lens Studio 5.23.2. SIK 2.0.0 and UIKit 2.0.0 provide real hand/ray interaction and persistent controls; official 3D Hints 2.0.0 introduce the gestures. On 9 November 2026, LEAF 2.0.2 runs exercised that same input path: surface placement, drag/release, Undo, 3D layout selection, chair sizing, comparison and playback. The [verification record](verification.md) records the current checks.

A shared TypeScript engine checks the whole oriented chair footprint and the separate door sweep. Repair proposals arrive through HTTPS and are independently verified inside the Lens. The search is finite, with explicit no-result and small-gap outcomes. It never changes the chair or its task to manufacture a pass.

Save → Send to phone displays a current-model QR. The [companion](https://open-door-weld.vercel.app) opens that model, runs fresh checks and provides dimension editing and downloads.

## What we learned

A correct number is useful only when the viewer can connect it to a physical change. Putting the warning on the obstruction, giving the chair a recognizable shape and playing the route after release make that connection visible. Testing in Preview also exposed issues that source tests could not: out-of-view controls, overlapping labels and a hand pose that hid the pinch.

The next step is testing readability, real hand tracking, placement and comfort on Spectacles with people who can judge this task from their own experience. [Scope](../README.md#scope) explains the synthetic dimensions, Preview input, indoor subset and limits of a geometric result.

Lens project: [`lens/OpenDoor.esproj`](../lens/OpenDoor.esproj). [Film and gallery](gallery.md). [Built-with and licenses](attributions.md).
