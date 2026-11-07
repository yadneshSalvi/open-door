# Open Door — design brief

## The spatial moment

All the furniture fits, yet a chosen bedside pose meets the table. The person inspects the actual occupied footprint, moves the table and sees a route become possible. A separate door-swing check remains unresolved until the bench moves. The locked bed stays where it belongs.

Open Door is a planning aid for a person using a mobility device, optionally with a designer or trusted collaborator. It makes a modeled constraint visible while leaving choices with the person.

## Why glasses

A miniature supports inspection and editing of the whole arrangement. Intended-scale inspection makes the same geometry legible from different viewpoints. The Lens changes model scale without moving the viewer's camera. Standard SIK/UI Kit interactions keep attention on the spatial task.

The companion supports dimension entry, import/export and reviewed language preferences. The native SPECS Lens is the spatial experience; the website does not replace it.

## Provided geometry

The example room is 420 × 340 cm. Furniture, door and profile are authored test data. The profile occupies 66 × 105 cm, permits pivoting and reverse, and uses an explicit 3 cm clearance buffer. These values are not an accessibility standard or a claimed average of wheelchair users.

The route begins on the entrance landing inside the room and ends at a specific bedside pose and heading. It does not show entering from outside. The independent door calculation checks leaf/furniture clearance through 0–90°. Reach, opening force, transfers and comfort are unassessed.

## Interaction and visual language

The overview has three primary actions; editing and details appear contextually. The workflow includes item selection, both floor-axis movements, rotation, locks, undo, comparison and profile review. Preview mouse interaction uses standard UI Kit/SIK controls.

The visual language is an architectural model: pale timber, linen, chalk lettering, mint verified geometry and amber interference. Text accompanies color. Meshes are schematic cutaways; numerical footprints remain explicit. Only a verified route receives playback.

Changes invalidate results and stop playback. The revision accompanies computation and export. A QR handoff carries the exact model into the companion for fresh evaluation and downloads.

## Observable criteria

1. Review the profile and inspect the actual table/footprint interference.
2. Move the table: the route clears and the door remains blocked.
3. Move the bench: both checks clear while the bed is preserved.
4. Make an arbitrary edit, recompute and undo under a new revision.
5. Keep a plan whose model, evidence and revision agree.

Numerical checks, Preview, feedback and hardware are distinct evidence. No glasses or external user study have been part of this build. No testimonials, accessibility certification or live recognition are claimed. The planning structure follows the [Learn AR with SPECS resources](https://learn-specs.devpost.com/resources).
