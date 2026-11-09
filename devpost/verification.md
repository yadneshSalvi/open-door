# Verification

Updated 10 November 2026. Source tests, actual Lens Studio Preview observations and physical hardware are different forms of evidence. [Scope](../README.md#scope) defines the prototype’s limits.

## Source and saved project

The current source passes **140 tests across 16 files**, application TypeScript and native TypeScript, including the optional scenarios. All 36 saved native mirrors match their frozen source. The numerical engine, portable core and HTTPS/export/share contracts are unchanged. Fixture regression and portable bundle checks retain the three separate outcomes: chair and door blocked; table-only move clears the chair while the door remains blocked; moving both relevant pieces clears both tasks.

SDK-boundary tests execute mandatory device placement, horizontal and stale-hit checks, release-only commits, repair invalidation, held action identity, three-target accounting and persistent Undo. Presentation tests cover physical text and collider sizes, projected exclusions, short leaders, a single route ribbon, mesh batching, drag snapping, all 49 chair poses, changed-state caching and the 300 ms dock fade. These are source checks; native readability is reviewed separately.

After filming, the temporary registry, messaging bridge, frame sampler and floor probe were removed through the editor. The saved project was closed, reopened, compiled and started successfully. The [current native summary](evidence/native-r004.json) records its exact scene hash. Optional scenarios remain in the Tests folders and are not attached to the shipping scene.

## Current Preview interactions

The miniature was recorded in Sunlit Room using the SPECS 27 preview. The real-size corner uses Colorful Home. Visible synthetic hands take the actual SIK hover, pinch, drag and release paths.

| Interaction | Observed result |
| --- | --- |
| Furniture move | The actual table drag showed a live centimetre value, original-position outline and release. It cleared the chair turn while the door remained blocked. |
| Undo and search | Undo restored the original arrangement. A genuine HTTPS request produced three alternatives, each checked locally against the complete input. One selectable ghost plus Next and Cancel keeps the three-target cap. |
| Compare and use | The hand selected an option and used Before/After before applying it. The chair then followed the checked route. |
| Rear-edge snap | A later table drag snapped its rear edge to the wardrobe. Release cleared the old repair certificate and checked the changed room again. Both tasks passed. |
| Chair size | Actual controls changed width 66 → 71 → 66 cm, with a visibly changing footprint and fresh checks. Other input fields remained unchanged. |
| Placement | A real horizontal WorldQuery hit was followed by a SIK confirmation and model placement. |
| Real size | The same complete final input was shown at scale 1. The chair stayed rendered through 48 observed moving poses; 24 actual camera changes occurred while it was rolling, ending inside the turning circle. |
| Share | The original Send gesture is followed by a clearer native close view of the same saved room. All 150 frames of that five-second hold decode to the identical 282-character URL, with the complete phone caption visible. The companion reconstructed the exact revision-4 model and freshly checked both tasks as clear. |

The continuous main run ends at revision 4, input hash `23bff2355c471375`. The table is at `(0.91, 3.01)` m and the wardrobe at `(0.35, 2.66)` m: both rear edges are **3.26 m**, with a **1 cm side gap**. The bed remains locked. The chosen **3 cm gap is kept**; extra lower bounds beyond it are about **0.1506 cm for the chair** and **0.2197 cm for the door**, not an additional 3 cm.

Dense image review confirms the live movement values and held snap endpoints. One source frame has a blank label while its position changes, followed by a short fade; fully readable values resume within about 0.133 seconds. That brief transition is retained in the evidence rather than described as uninterrupted readability.

## Indoor corner and floor

The scale-1 display covers model x `[0, 2.2]`, y `[1.4, 3.4]` m. Wall tape, the wardrobe, bedside table, bed corner and a door-direction marker establish the room. A single ribbon replaces the stack of chair outlines. The chair remains visible as an outline when outside the displayed corner. The actual additive Center image preserves the checked route and furniture.

Across 9,486 original observations and a 78-observation supplement, all **980 in-use buffered chair-floor targets** had positive support from at least one measured view. Two unresolved expanded-grid targets lie outside the used chair sweep. This is finite sampled support, not a continuous floor survey, room scan or whole-volume certificate. The moving-camera view shows the actual rendered chair; it does not promise that the entire conservative 1.1 m profile box stays inside the field of view at every close pose.

## Host Preview frame times

The recorded real-size window contains 3.600 seconds of chair playback and 1.453 seconds after stopping. Its 224 host UpdateEvent intervals measured median **21.903 ms**, p95 **24.857 ms** and maximum **62.788 ms**. The preceding start window had 187 intervals: median **22.216 ms**, p95 **26.110 ms**, maximum **490.347 ms**. The startup stall is retained in the report.

These are recorded host intervals under diagnostic logging and screen capture, not playback-only quantiles, physical SPECS FPS, GPU timings or script self-time. They describe the measured source and context, not a guarantee for future runs.

## Practical limits

The room, furniture and chair are entered example geometry, not recognized background objects. Geometric clearance does not establish transfer ability, comfort, full door operation or accessibility certification. Physical glasses and human tracking have not been tested. The QR is a link fallback; direct paired-phone sending is future work.

Native recordings have no microphone track. Reconstructed product sounds in the film must use the original assets and actual logged event times. The [previous verification](archive/verification-before-r004.md) and [r003 film review](evidence/film-review-r003.md) remain historical records. Current film checks are separate from these native results.
