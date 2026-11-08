# Open Door — design brief

## The spatial moment

The level miniature sits on a table. Its example wheelchair and outline make the task visible; actual collision witnesses light the bedside table and bench. Pinch the table, move it and release: the chair shows that the room is checking, then the current route and obstruction feedback update. **Find changes** adds up to three computed ghost sets. Pinch a tag, compare Before/After and use that layout. The chair follows the retained verified route and finishes at the bedside heading. The bed stays locked.

Open Door is a room-layout rehearsal prototype for a person using a mobility device, optionally with a designer or trusted collaborator. Dimensions and priorities come from the person. The prototype does not infer their needs or speak for their lived experience.

## Why glasses

A surface-placed miniature makes the entire arrangement editable. Full size exposes the same footprint, turn and final heading on open floor in a furnished Preview environment. The selected implementation is a supplied model placed by hand (Option C), not a measured twin of the surrounding furniture. One horizontal WorldQuery hit can place the miniature after explicit confirmation; it neither scans a room nor establishes table extent. Scale changes the display, never the viewer's camera or the numerical dimensions.

The SPECS Lens is the spatial deliverable. Its companion supports comfortable dimension entry, import/export, a separate browser repair worker and reviewed language preferences. A website alone would not demonstrate the intended spatial interaction.

## Provided geometry and scope

The example room is 420 × 340 cm. Furniture, door and profile are synthetic test data. The profile occupies 66 × 105 cm, permits pivoting and reverse, and uses an explicit 3 cm clearance buffer. These are neither an accessibility standard nor a claimed average of wheelchair users.

The journey begins on the landing inside the room and ends at a specified bedside pose and heading. The separate door check verifies leaf/furniture clearance through 0–90°. It does not establish outside entry, reach, opening force, transfers, comfort or complete door operation.

The repair searches finite destinations and orientations for unlocked furniture. It preserves the profile, buffer, uncertainty, locks, start, goal, tolerances and furniture dimensions. It ranks pieces moved first, then translation plus rotation cost. **Least movement found** describes the retained search result; no global minimum is claimed. Additional reserve is independently checked beyond the unchanged buffer and uncertainty for the route, and as extra leaf/furniture separation for the door. The under-1-mm alternative is visibly marked as a small margin, not treated as a robust real-world fit. [The method and limits](repair-search.md) give the numerical details.

## Interaction and visual language

The room dominates the interface. The native overview has three actions: Find changes, Rehearse and More. The option-selection state has only the up-to-three spatial tags; choosing one replaces them with Use this layout, Before/After and Cancel. Locks appear on pieces, the profile is attached to the chair, and a short About card contains the scope. There is no permanent header or raw coordinate display. The web proposal inspector keeps the spatial changes and Apply action together.

Pale timber, linen, bright chalk text and mint/amber evidence form a warm architectural model. Decorative bedding, lamp and trim never affect collision geometry. Text accompanies color. Light native lettering is intentional for an additive display; physical readability still needs hardware testing.

Standard SIK near and far pinch-drag edits unlocked furniture on the model floor. Preview positions do not mutate the source. Release queues one validated commit; illegal drops roll back. A cooperative slice advances the unchanged route evaluator after release, with a checking state until a complete result exists. Starting an actual edit cancels a pending search; proposal review refuses furniture edits so a ghost cannot become an unintended source change. Fine adjust, locks and Undo remain contextual.

The translucent chair is a schematic, with no human figure and no solid outside the supplied occupied envelope. Actual trajectory samples drive its motion and wheel animation. Spatial rolling, contact and completion cues supplement visible feedback. Close approach reveals a line between the nearest sampled footprint/furniture edges and the independently certified layout reserve. The line is an illustration; the reserve remains a whole-layout certificate, not a newly invented local deficit. Full-size controls use a bounded lazy follow below eye level while the room remains anchored.

An online native search has a timeout and explicit retry/offline recovery. Every returned alternative is independently rechecked locally before display and again before Apply. Direct editing and evaluation remain local. A canceled or superseded response cannot change the room.

## Observable criteria

1. Review the provided profile and inspect the actual table/footprint and bench/door witnesses.
2. Find computed alternatives without changing the source; compare displacement and certified extra reserve, including the small-margin warning.
3. Toggle Before/After, choose an alternative, preserve the bed lock and commit all moves in one revision. Rehearse the retained verified trajectory after one profile acknowledgment.
4. Change a profile, lock or arbitrary furniture pose; invalidate old proposals, recompute and Undo. Canceled and superseded requests cannot reappear.
5. Keep the exact committed model through a QR handoff and matching downloads. A model-only share is distinguished from the complete repair certificate retained by a repair-aware JSON export.

The web flow, earlier native release and current spatial native/source acceptance pass at their separately recorded scope. The spatial source passes 64 tests across eight files and application/native TypeScript. Exact Direct and far furniture transactions, Poke controls, complete rehearsal, observed G2 presentation and matching QR handoff have accepted evidence. [Current acceptance](spatial-release.md) preserves the failed takes and limits: optional WorldQuery, unfilmed proximity/lazy-follow transitions and physical glasses remain untested; the [149.5-second film](film-review.md) passed independent encoded QA and complete browser playback, with user approval pending. No user study, testimonial, accessibility certification or live recognition is claimed.

The planning follows the [Learn AR with SPECS resources](https://learn-specs.devpost.com/resources). The four equally weighted criteria are addressed through spatial clarity, reproducible geometry, computed choices and an actual working journey; Design is also the first published tie-break criterion. [Official rules](https://learn-specs.devpost.com/rules).
