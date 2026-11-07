# Verification record

Recorded on 7 November 2026. Logic, browser behavior, native Preview and physical hardware are separate evidence.

## Numerical and state checks

`npm test` passes **34 tests** across four files. Independent numerical cases cover polygon geometry, intermediate collision, uncertainty, movement restrictions, final heading, fixture edits and coordinate mapping. Contract cases cover cancelled identical-input retries, stale revisions/profiles, duplicate responses, malformed model output, impossible placements, shared-plan round trips, export mismatch rejection and HTTP limits. Six focused navigation/lifetime tests cover same-tab fragments, back/forward/canonical transitions, captured input, stale success/failure completion and disposal.

Two independently found defects were fixed and retained as regressions: an empty trajectory originally skipped initial occupancy validation; conservative-only interference originally failed to distinguish uncertainty from nominal collision.

`npm run typecheck`, `npm run lens:bundle` and `npm run build` pass. The production build uses Next.js 16.4.5. The portable bundle has no browser/Node runtime dependencies. Source-only native checks were supplemented by the actual Lens compilation and interaction evidence below.

The pinned dependency state (including esbuild 0.28.2 and Node.js 22) passed the original 28 tests, TypeScript, portable bundle and production build. After the final web navigation change, the expanded 34-test suite, TypeScript and a fresh production build passed. Native/core source was unchanged by that web fix. Node.js 22 is the supported judging/deployment runtime.

## Actual signature sequence

| Revision | Edit | Bedside | Door | Witness |
| --- | --- | --- | --- | --- |
| 0 | Provided model | `blocked_witness` | `blocked_witness` | Table and bench respectively |
| 1 | Table → (3.88, 2.85) m | `verified_feasible` | `blocked_witness` | Bench |
| 2 | Bench → (3.56, 0.48) m | `verified_feasible` | `verified_feasible` | Both modeled checks clear |

The bed's pose/lock stay unchanged. An arbitrary bench edit into the goal causes a fresh blocked result. The valid route has 49 visualization poses derived from checked motion primitives.

## Browser and HTTP evidence

The development browser exercised the full sequence, route playback, a live `gpt-6-astra` proposal, application of a 5 cm buffer, fresh revision, disabled bed controls while locked, direct X/Y editing, JSON download, reset and reimport. The imported final model reevaluated as two checks clear.

Responsive inspection prompted larger/darker labels, viewport-fit cameras and clamped annotations. Nested Drei HTML roots were replaced after React unmount warnings. The fresh production browser session on port 3104 reported no error-console entries, passed the two edits, resumed replay after profile confirmation, and opened a copied plan link in a fresh tab with revision 2 and two checks clear. The mobile viewport was rechecked after the camera fix.

The deployed companion at https://open-door-weld.vercel.app also passed the geometry flow and a live language proposal in a clean browser.

Final local production regression on port 3104 passed canonical → shared revision 11 → same-tab revision 14 → Back to 11 → Forward to 14. Navigating while the export dialog was open closed it and cleared old history; removing the fragment restored revision 0 with Undo disabled. No error-console entries were observed. The fix listens to fragment/history changes, captures the fragment before asynchronous parsing and invalidates older model work, including errors and completion callbacks.

Reviewed captures: [desktop companion](media/companion-desktop.jpg) shows revision 3 with a reviewed 5 cm buffer and both modeled checks clear; [mobile companion](media/companion-mobile.jpg) shows the fitted room at a 390 × 844 viewport. These are web captures, distinct from native Preview or hardware evidence.

The production HTTP sequence returned 200 for all three evaluations and matching revision-2 export. One loopback run took 15/27/17 ms end to end; these are single-run observations, not hosted latency or percentile claims. The SVG included the door dimension.

The earlier two-suggestion fixture share at the test base URL was 270 characters and a 65 × 65 QR matrix; decoding restored its identical fingerprint. The final native arbitrary-edit share is a separate 311-character production URL, described below.

## Native and hardware boundary

The actual project is `lens/OpenDoor.esproj`, with the installed SIK/UIKit packages. Final compilation, fresh startup, rendering and native save succeeded in Lens Studio 5.23.2.26081320 / SPECS 27 Interactive Preview. Twelve observed assertions passed through the real installed SIK mouse/far-ray interactor: profile review, the two independent fixes, axis/rotation/undo controls, miniature and 1:1 drag transactions, boundary/overlap rollback, bed locks, playback, scale and comparison. Full-scale input tests used one disclosed setup call to move the bench into the unchanged viewport before actual injected gestures; that setup is not counted as a gesture.

The final native session's revision **11**, fingerprint **`851f354fb4fef3b3`**, was encoded in the actual rendered QR and decoded from the full screenshot with ZXing. The decoded model matched exact native input; public companion HTML and JSON/SVG export returned 200 with matching revision/hash. Numerical evaluations matched within `1e−12`, excluding timing. Separately, an earlier native revision **14** was imported in a fresh browser tab and downloaded through the UI with matching fingerprint **`72b5dad200d31552`** and a clean browser console. These are distinct evidence runs.

Native Preview found and fixed the MeshBuilder upload format and stale SIK target-wrapper lifetime issues. The accepted controller preserves interaction-target identities. Its final QA interval examined **810,745 log bytes** with no E/F/W diagnostics or Preview error/exception prints, excluding editor transport/analytics payloads. One editor-only QTcpSocket disconnect warning followed debugger cleanup; subsequent Preview error prints were empty. The clean claim is scoped to that QA interval.

[Native Preview evidence](native-preview.md), [sanitized measurements](media/native-verification.json) and [integration](../lens-src/INTEGRATION.md) provide the exact source hashes, captures, runtime boundaries and setup steps. Physical phone scanning and additive-display QR contrast remain untested; an earlier OpenCV detector failure is disclosed alongside the successful ZXing evidence.

No LEAF run is recorded as passed here. No physical glasses, on-device frame-rate evidence, long-term comfort study or external user feedback have been obtained. Preview success does not establish those outcomes.
