# Native Preview acceptance

These are observable acceptance scenarios, not claims of completed LEAF runs. Use native Lens tooling and UI Kit interaction. Record the release build, simulator mode and observed outcome.

1. **Profile and witness:** Rehearse opens the provided-profile review. Accept it. Confirm journey `blocked_witness` against the table and door `blocked_witness` against the bench. Amber geometry must match the actual witness.
2. **First fix:** Edit room → Move table. Confirm revision increases, table pose becomes (3.88, 2.85) m, journey clears, door remains blocked and bed pose/lock stay unchanged.
3. **Second fix:** Move bench to (3.56, 0.48) m. Both checks clear. Rehearse follows the actual returned path to the permitted goal position/heading.
4. **Arbitrary edit and undo:** Select a movable piece; use both axis directions and rotation. Confirm new pose, revision/hash and recomputation. Reject overlap/out-of-room edits. Undo restores geometry under a new revision. The locked bed cannot move.
5. **Context and scale:** Check the three overview actions, contextual modes and readable task names in miniature/1:1. Scaling must not move the camera. Comparison must distinguish baseline/current.
6. **Keep:** Show the current QR. Scan/decode into a fresh companion tab, confirm model fingerprint/revision, recalculate and download SVG/JSON. After edits, an older share/result must not appear current.

The component's `getVerificationState()` provides compact revision, task, pose and lock assertions for compatible test harnesses. A clicked button alone does not prove its result. Never mark a scenario passed from a syntax check alone.

Inspect recording-resolution legibility and both light/busy Preview backgrounds. Note clipping, control placement and QR contrast independently. Physical comfort remains untested.
