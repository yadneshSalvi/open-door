# Open Door — design brief

## The task

Before moving furniture, try a change that lets an example wheelchair turn beside the bed. A tabletop miniature gives an overview; a bedside corner on the floor shows the same dimensions at real size. The person choosing the dimensions and priorities stays in control.

Pinch the table, drag it and release. The old outline stays behind while a live readout shows the actual distance moved. A legal release makes one edit, checks it, then plays the verified chair trajectory. The door is an independent check: clearing the table does not clear the entry bench.

## Why glasses

The model remains anchored while the viewer changes position. That makes the space around the full-size turn inspectable from more than one view. The web companion handles text entry and files; the Lens makes the object, gesture and resulting movement visible together.

## What informed the design

The [Devpost Learn plan-lens framework](https://github.com/challengepost/learn-specs) structured the original brief: one room task, a body-scale question and explicit Preview constraints. This was planning from a brief, not a user interview or user study.

Subsequent design reviews drove the larger changes: the floating panel became a level surface model; the blocking dimensions dialog became a pinchable chair; the outdoor platform became an indoor corner. Further review led to a continuously visible chair, one route ribbon, actual drag snapping, and controls that must clear the projected room. Those decisions are credited to the design review process, not retroactively to plan-lens.

## Interaction and recovery

The ordinary overview offers Suggest fixes, Try the route and More. A contextual command consumes one of the same three available UI targets. If an object command has no clear projected position, it moves to a reserved dock slot. Undo remains the first More command while history exists, including after the five-second shortcut expires. Back is counted, and temporary menus close after inactivity.

Repair choices use one selectable ghost, Next option and Cancel. Its nearby colored label is not another hit target. After selection, Use, Compare and Cancel replace them. Compare exposes Before, After and Back. The original layout never inherits the selected layout’s extra-space number.

Furniture has real near and far interaction paths. Locks remain binding. The table snaps only when a valid drag comes within 2 cm of the wardrobe rear plane. A dashed guide and click explain the snap. Release commits once, clears the prior repair certificate and checks both tasks again. There is no separate alignment button.

## Composition

Dark furniture and low rims leave the evidence legible. Mint means a checked route or valid placement; amber means an obstruction. Layout alternatives use separate colors. The door is a thin outline with a restrained fill, not a solid colored wall.

Fixed and optional labels use the same projected bounds test. They face the actual camera, remain close to their anchor and use short leaders with endpoint dots. The dock includes the floor and door in its exclusion test. A required label or dock that cannot be placed is recorded as a composition failure to resolve in native Preview, rather than being allowed to cover the subject.

Only the tabletop reduces to a distant status glyph. The chair-size hint is contextual on the chair, with a first-placement introduction. The door and furniture glow on hover. Official hand hints remain eligible until their relevant action succeeds.

## Placement and real size

A fresh device session starts with placement. WorldQuery follows the actual pitched gaze, at two queries per second. A confirmation requires a recent horizontal hit within the allowed distance; a nominal aim is not enough. Saved staging is editor-only. Real size asks for its own floor placement on device.

The checked indoor setup displays model x `[0,2.2]`, y `[1.4,3.4]` m. It is a true **2.2 × 2.0 m** corner, with two wall traces, a wardrobe outline, the side table, a bed corner and a neutral marker toward the omitted door. Furniture and the single route ribbon are clipped to this display area. Every chair pose stays visible; a pose whose complete buffered footprint leaves the area is outlined rather than hidden. None of this changes the original model or verification.

The measured Colorful Home placement is documented in [native setup](native-setup.md). Its finite multi-view floor/ghost checks, fresh model identity and actual camera walk during the complete chair rehearsal are separately recorded. These checks do not certify physical accessibility.

## Computation

The shared engine checks an oriented 66 × 105 cm example footprint and a separate door sweep. The finite repair search preserves dimensions, locks, start, goal and uncertainty. It ranks fewer moved pieces first, then displacement and rotation. It reports what it found, not a global optimum.

HTTPS supplies candidate layouts; the native Lens independently checks each before display and again before Use. Cancel or a newer edit invalidates pending results. Network failure offers retry or an explicit slower offline search. A shared QR carries the model, which the companion evaluates anew.

[Method and limits](repair-search.md) · [Verification](verification.md) · [Scope](../README.md#scope)
