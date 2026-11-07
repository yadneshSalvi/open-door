# Open Door — design brief

## The spatial moment

The room looks plausible, but the occupied footprint meets the bedside table and the door meets the bench. **Find changes** turns those two obstructions into a spatial choice: move less furniture, or make a larger change that leaves more modeled clearance. Original positions remain as amber outlines; centimetre arrows show each proposed move. The person compares the alternatives, accepts one revision and watches the actual footprint follow its verified route. The bed stays locked.

Open Door is a room-layout rehearsal prototype for a person using a mobility device, optionally with a designer or trusted collaborator. Dimensions and priorities come from the person. The prototype does not infer their needs or speak for their lived experience.

## Why glasses

A miniature makes the entire arrangement editable. A 1:1 view exposes the same occupied footprint, turn and final heading in space. Scale changes the model, never the viewer's camera or the numerical dimensions. Furniture, ghosts, displacement arrows and sampled swept footprints explain the choice where it occurs.

The SPECS Lens is the spatial deliverable. Its companion supports comfortable dimension entry, import/export, a separate browser repair worker and reviewed language preferences. A website alone would not demonstrate the intended spatial interaction.

## Provided geometry and scope

The example room is 420 × 340 cm. Furniture, door and profile are synthetic test data. The profile occupies 66 × 105 cm, permits pivoting and reverse, and uses an explicit 3 cm clearance buffer. These are neither an accessibility standard nor a claimed average of wheelchair users.

The journey begins on the landing inside the room and ends at a specified bedside pose and heading. The separate door check verifies leaf/furniture clearance through 0–90°. It does not establish outside entry, reach, opening force, transfers, comfort or complete door operation.

The repair searches finite destinations and orientations for unlocked furniture. It preserves the profile, buffer, uncertainty, locks, start, goal, tolerances and furniture dimensions. It ranks pieces moved first, then translation plus rotation cost. **Least movement found** describes the retained search result; no global minimum is claimed. Additional reserve is independently checked beyond the unchanged buffer and uncertainty for the route, and as extra leaf/furniture separation for the door. The under-1-mm alternative is visibly marked as a small margin, not treated as a robust real-world fit. [The method and limits](repair-search.md) give the numerical details.

## Interaction and visual language

The room dominates the interface. The native overview has three actions: Find changes, Rehearse, and Room / plan. Editing, profile assumptions, search scope and export details appear contextually. The web proposal inspector is compact enough to keep the spatial changes and Apply action together. Redundant taglines, section eyebrows and repeated explanatory paragraphs were removed.

Pale timber, linen, bright chalk text and mint/amber evidence form a warm architectural model. Decorative bedding, lamp and trim never affect collision geometry. Text accompanies color. Light native lettering is intentional for an additive display; physical readability still needs hardware testing.

Standard SIK far-ray pinch-drag edits unlocked furniture on the model floor. Preview positions do not mutate the source. Release queues one validated commit; illegal drops roll back. Search and proposal review temporarily disable furniture dragging so a ghost can never become an unintended source edit. Fine adjust, locks and Undo remain available in contextual modes.

An online native search has a timeout and explicit retry/offline recovery. Every returned alternative is independently rechecked locally before display and again before Apply. Direct editing and evaluation remain local. A canceled or superseded response cannot change the room.

## Observable criteria

1. Review the provided profile and inspect the actual table/footprint and bench/door witnesses.
2. Find computed alternatives without changing the source; compare displacement and certified extra reserve, including the small-margin warning.
3. Toggle Original/Preview, choose an alternative, preserve the bed lock and commit all moves in one revision. Rehearse the retained verified trajectory after profile acknowledgment.
4. Change a profile, lock or arbitrary furniture pose; invalidate old proposals, recompute and Undo. Canceled and superseded requests cannot reappear.
5. Keep the exact committed model through a QR handoff and matching downloads. A model-only share is distinguished from the complete repair certificate retained by a repair-aware JSON export.

The web flow, source checks and [current native repair acceptance](native-repair-preview.md) pass. Actual native search, spatial comparison, atomic Apply, playback, cancellation and production handoff were observed. Numerical checks, Preview behavior, feedback and hardware are distinct evidence. No glasses, external user study, testimonial, accessibility certification or live recognition is claimed.

The planning follows the [Learn AR with SPECS resources](https://learn-specs.devpost.com/resources). The four equally weighted criteria are addressed through spatial clarity, reproducible geometry, computed choices and an actual working journey; Design is also the first published tie-break criterion. [Official rules](https://learn-specs.devpost.com/rules).
