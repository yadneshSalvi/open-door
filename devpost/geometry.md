# Geometry and result semantics

The mathematical frame uses metres: horizontal `x,y`, vertical `z`, and heading radians, zero facing +x. Lens converts `(x,y,z)` into `(100x,100z,-100y)` centimetres. Centering and miniature scale are display transforms only.

Furniture and occupied-device footprints are oriented rectangles. Furniture occupies the floor-level height range. Under-table and multi-height movement are not modeled. The profile specifies footprint, buffer, uncertainty, pivot/minimum-radius movement and reverse permission. Goals include position and heading tolerances.

Convex collision uses separating axes. Separated polygon distance uses minimum point-to-edge Euclidean distance. Every occupied corner participates in boundary clearance. Furniture edits crossing boundaries or overlapping another piece are rejected.

Motion primitives contain signed distance and heading change. Rotation in place is allowed only by the pivot model. Curved motion follows analytic arcs and respects minimum radius. Reverse is excluded when disallowed.

Returned trajectories receive conservative continuous verification. Each footprint point moves at most `|arc length| + footprint radius × |angular change|` over an interval. Distance to a fixed obstacle is 1-Lipschitz: a midpoint gap larger than the maximum motion from that midpoint certifies the interval. Otherwise it is subdivided. A sampled collision yields a witness. An interval unresolved within 1 mm remains uncertain; dense sampling alone is not a proof.

Minimum clearance is a certified lower bound **after buffer and uncertainty**, not an exact physical measurement. Centimetre input estimates do not become millimetre-accurate measurements.

Pivot profiles first try checked rotate/translate and orthogonal-waypoint routes. Fallback search uses constant-curvature/permitted pivot primitives, 16 cm steps, quantized visited states and at most 8,500 expanded nodes. Its result must pass trajectory validation and the goal predicate. Table/bench suggestions are authored fixture choices followed by real computation, not global optimization.

| Status | Meaning |
| --- | --- |
| `verified_feasible` | The returned route/sweep passed the explicit model and continuous check. |
| `blocked_witness` | A requested pose or sweep has supported interference; not proof against all alternate routes or nearby goals. |
| `no_path_found` | The bounded search found none; not global infeasibility. |
| `uncertain` | An interval remained unresolved, or nominal dimensions passed while measurement uncertainty prevented conservative verification. |

Invalid payloads receive HTTP 422 rather than fabricated results. Missing dimensions are not silently inferred. Independent tests are recorded in [numerical review](numerical-review.md) and [verification](verification.md).
