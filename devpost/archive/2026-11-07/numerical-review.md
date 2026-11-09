> Historical record of the earlier build. Start with the [current documentation](../../README.md).

# Independent numerical review

On 7 November 2026, a separate implementation reviewer derived tests in `tests/geometry.test.ts` and `tests/planner.test.ts` without editing production engine code. The command `npm test -- tests/geometry.test.ts tests/planner.test.ts` passed all 18 tests on Node's Vitest 4.1.12 runner (123 ms reported total duration; this is test-run duration, not an application performance benchmark).

The independent oracles include a 150-case deterministic axis-aligned rectangle corpus using closed-form interval gaps, diagonal Euclidean separation of √13 metres, the corner extent of a rectangle rotated 45°, and exact forward/reverse quarter-circle endpoints. These expectations do not call the production collision function to decide the expected answer. Rigid-transform invariance and fixed-trajectory obstacle/buffer monotonicity add metamorphic checks.

Adversarial checks exercise translation and rotation with clear endpoints but an intermediate collision, a hinged leaf sweep, a near-grazing unresolved interval, oriented room bounds, uncertainty inflation, metre/centimetre frame conversion, final heading, motion continuity, minimum turning radius and reverse permission. The fixture test evaluates the actual table-then-bench sequence, preserves the bed lock, and makes a further unscripted obstructing edit.

Review found two defects that the implementation owner corrected: an empty trajectory could bypass initial-pose occupancy, and conservative-only interference lacked the nominal/conservative uncertainty distinction. Both have passing regression tests.

This evidence covers the supported rectangle-based 2D model. It is not a proof of planner completeness, a formal verification of floating-point predicates, a physical accessibility certification, or evidence of Lens Preview or hardware performance. Door checks cover leaf/furniture geometry; approach comfort, handle operation, reach and transfer tasks remain outside these tests. Boundary tolerance decisions intentionally permit an `uncertain` result rather than certifying an unresolved passage.
