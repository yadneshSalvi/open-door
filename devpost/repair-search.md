# Computed room changes

**Find changes** searches the actual room geometry. It preserves the device profile, buffer, uncertainty, room dimensions, task poses and tolerances, and every lock. It can move several unlocked pieces together, then independently verifies the complete route and door swing before offering a preview.

The search ranks fewer moved pieces first, then total translation plus a rotation cost of 0.15 metres per radian. It compares all reserve domains before labeling the first result **Least movement found**. A higher-clearance alternative must demonstrate a larger certified reserve; the name of the search tier alone is not evidence of an improvement.

## Observed provided-room results

These are computed results from the unchanged provided profile, including its 3 cm buffer. The bed remains locked. They are not stored fixture answers.

| Alternative | Pieces moved | Total translation | Additional reserve certificate |
| --- | --- | --- | --- |
| Least movement found | 2 | 1.388 m | Under 1 mm; explicitly flagged as a small margin |
| Extra 1 cm target | 2 | 1.402 m | At least 1.004 cm |
| Extra 3 cm target | 2 | 2.227 m | At least 3.043 cm |

The first two alternatives place the table in a narrow slot derived from the furniture and requested footprint geometry. Another approximately 1.4 cm of total furniture movement yields the independently certified 1 cm reserve. The earlier authored table/bench example moved approximately 5.045 m in total. This comparison concerns these found layouts; it does not establish a global minimum.

The same search was tested with renamed furniture in a room rotated 90° and translated, including transformed door angles and task poses. It found corresponding verified repairs without recognizing fixture names. [The sanitized numerical record](examples/repair-search-verification.json) contains exact positions, fingerprints, invariants and measured timings.

## Finite search domain

- Select at most six unlocked movable objects nearest the start, goal or door hinge; move at most three.
- Generate geometry contact coordinates and their midpoints, plus radial destinations at 8 cm steps in 24 directions. Radial candidates stop at 6 m; contact destinations can be farther away. Orientations are the object's original heading and relative ±90°.
- Cap axis coordinates at 128 and candidate attempts at 48,000 per object per reserve tier. Retain at most 24 valid destinations per object. Other furniture's original occupied positions remain excluded, even if those pieces also move; coordinated swaps and moves into vacated original footprints are outside this domain.
- Search an eight-layout beam at reserve targets of 0, 1 and 3 cm, with at most 400 full evaluations, 300 expanded route states per candidate and 12,000 route states overall. Continuous verification remains required for every accepted motion.
- Reject invalid room placements, furniture overlaps, stale source identities and unverified routes/sweeps. No result means this bounded search found none; it does not prove infeasibility.

Reserve search may temporarily add a constraint to the route buffer and the door/furniture gap. The route certificate is beyond the device buffer and supplied uncertainty; the door certificate concerns leaf/furniture separation and does not apply the device buffer to the leaf. The proposal and accepted model retain the original profile. The final preferred trajectory is independently verified under that original model, and the extra-reserve certificate is separately checked. Model arithmetic does not make supplied dimensions physically accurate to fractions of a millimetre.

## Review, apply and keep

Amber outlines mark original furniture positions; arrows and centimetre labels show the proposed displacement. Original/Preview changes only the display. Furniture relocation trajectories are not checked, so these arrows are not claims that a piece can be carried along the straight arrow. The translucent ribbon and native outlines display sampled occupied footprints along a continuously verified device trajectory; the display samples are not the proof.

Apply revalidates the exact source hash/revision, protected inputs, locks, final placements, retained trajectory and claimed reserve. All moved pieces become one revision and one Undo step. The verified preferred trajectory is the one rehearsed. A profile or lock edit cancels/discards the proposal and requires a fresh search.

The browser runs search in a dedicated worker; cancellation terminates it. Native Find changes uses the HTTPS endpoint, then independently reconstructs and verifies all returned alternatives locally before display, one per Update. Request ID, generation, source hash/revision, size/shape checks and a 25-second timeout reject stale or invalid responses. The supported native fetch API has no abort option; canceled network work may finish but cannot affect the Lens.

The portable offline job yields during candidate generation and A*. It remains an explicit recovery choice with a slow-search notice. An actual local-only Preview run was incomplete after 312.07 runtime seconds; debugger instrumentation was present for most observations. It was not accepted as a successful search. `step(6)` is a cooperative target, not a hard realtime deadline. The source/HTTP adapter passed a real production response in 3.38 seconds in Node. The later [actual native pass](native-repair-preview.md) measured a final 3.249-second search, including 271 ms of local checks. These are separate instrumented observations; physical hardware timing remains untested.

The [actual browser-downloaded +3 cm plan](examples/repair-certified-plan-r1.json) records accepted revision 1 and fingerprint `d6a6c870b981f880`. The complete JSON export carries `repair.selection` and a server-reverified `repair.verification` certificate when the current revision was accepted from a repair. The handler reconstructs the original source from the moves, checks both fingerprints and the atomic revision, validates every move, and recertifies the retained trajectory and door at the selected reserve. It rejects altered or stale evidence. Ordinary task `minimumClearance` values can be looser adaptive lower bounds; they do not contradict the separately checked reserve-target certificate. Later model edits discard the certificate.

A shared URL contains the model, profile and tasks. Opening it performs a fresh evaluation and may choose another valid route; it does not preserve optimization provenance or the selected reserve certificate. Keep the complete JSON when that evidence matters.

## Verification scope

Source tests cover arbitrary transformed geometry, cancellation, stale revisions/profiles/locks, protected-input preservation, final placement validity, independent route/door/reserve checks, atomic application, reserve-domain ranking, invalid preferred motions and export-certificate rejection. Local production browser checks cover source-preserving preview, three alternatives, Original/Preview, Apply/profile review/playback, Undo, cancellation, locking a blocker, stale completion after profile/reset, model sharing and responsive layout.

The native source has additional state checks and an explicit regression contract in [integration](../lens-src/INTEGRATION.md). Its [accepted actual repair pass](native-repair-preview.md) records 28 assertions, production timing and exact revision-9 QR/export separately from the earlier direct-edit release. No physical glasses or accessibility certification are claimed.
