> Historical r003 source and observations. This page is preserved for that revision.

# Open Door — design brief

## One room task

Before moving heavy furniture, compare changes that let an example wheelchair turn toward the bed. A tabletop miniature gives an overview; the bedside corner on the floor shows the same dimensions at real size. A person using a mobility device could work with a designer or trusted collaborator and choose the dimensions and priorities that matter to them.

The first move has a visible consequence. Pinch the table, drag it and release. The footprint is green or amber during the move. A clear release starts the checked chair route; a blocked result identifies the obstruction. Undo sits beside the piece. The door is a separate check, so clearing the table does not imply that the bench no longer blocks it.

## Why glasses

Stand beside the full-size turn and inspect the space around the chair, with the model anchored to the floor. The small room remains useful for the whole arrangement; the indoor bedside corner makes its local scale tangible. The web companion supports text entry and files, while the Lens supports spatial inspection and hand input.

## What the planning framework changed

The [plan-lens skill in challengepost/learn-specs](https://github.com/challengepost/learn-specs) supplied the design questions and Preview constraints used to write this brief. This was a design exercise; user research remains future work. Three decisions followed that framework and the subsequent design reviews:

| Earlier direction | Current choice | Reason |
| --- | --- | --- |
| A floating room with a permanent panel | A level model on a surface, with labels on the relevant pieces | Keep the room and the action in the same place |
| A wheelchair-size confirmation dialog | A compact chair tag; pinch the chair to edit its size | Explain the shape without covering the problem |
| The whole room staged on an outdoor platform | A measured 1.5 × 2.0 m indoor bedside crop, with outlined furniture | Show true local scale without shrinking the room or hiding the real floor |

## Interaction

The overview offers Suggest fixes, Try the route and More. Hovering a piece reveals its contextual action and reduces the dock’s other controls so no more than three UI buttons are active. More exposes Place immediately. Back is included in the count; short menus close after inactivity. A five-second Undo chip follows an edit. Locked pieces stay fixed.

Suggest fixes returns up to three checked layouts. Colored ghost sets have separate labels and leaders; hovering isolates one. Pinching its geometry or label selects it. Use, Compare and Cancel then replace the choices. Compare exposes distinct lit Before and After buttons. The original layout never inherits the selected layout’s extra-space number.

The example table can be lined up with the wardrobe using Align back. That is a real furniture edit: it adds one history entry, clears the earlier repair certificate and checks both tasks again. The reviewed destination is (0.91, 3.01) m, with a 1 cm side gap and aligned rear edges. Its current extra-space reading is much smaller than the earlier 3 cm alternative; the old number must not survive the edit.

The room uses dark low rims, desaturated furniture, bright text and restrained cyan/amber feedback. An outlined chair collision accompanies an on-object explanation. Labels keep their physical size and seek a clear position beside the objects, with a short leader. Far away, one status glyph replaces controls and detail. Close approach reveals the measured geometric gap. Official hand hints appear in context and remain eligible until the relevant gesture succeeds.

## Placement and real size

A fresh device session starts with placement. A horizontal WorldQuery hit along the actual gaze is queried every half-second and confirmed with a pinch. A mint reticle means a current real hit; an estimated aim has only neutral instructions. Saved editor staging cannot confirm a device placement. Real size requests a separate floor hit on device.

In the measured Preview arrangement, the bedside crop covers room x [0.65, 2.15], y [1.35, 3.35] m. It maps to an indoor 1.5 × 2.0 m floor patch. Furniture boxes, edges and route lines are clipped and faded rather than resized. The chair is shown only when its complete expanded footprint fits within that patch. All original room dimensions and route checks remain unchanged. The controls follow below eye level; the room stays anchored.

## Computation and recovery

An oriented 66 × 105 cm example footprint moves through a complete bedside trajectory with a chosen 3 cm gap. A separate door-leaf sweep checks furniture through 0–90°. The finite repair search preserves dimensions, locks, start, goal and uncertainty. It ranks fewer pieces moved first, then movement and rotation. “Least movement found” describes a bounded search result, not a global optimum. [Method and limits](../../repair-search.md) give the numerical definitions.

The native Lens requests repairs over HTTPS, then independently checks each result before display and again before Use. Ordinary edits and checks remain local. Cancel, a newer edit or a changed chair size invalidate pending results. Network failure offers explicit retry or slower offline search. A saved QR carries only the model, which the companion checks again.

See [verification](../../verification.md) for tested behavior and [Scope](../../../README.md#scope) for the boundaries of this prototype.
