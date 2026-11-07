# Verification record

Recorded on 7 November 2026. Logic, browser behavior, native Preview and physical hardware are separate evidence.

## Numerical and state checks

`npm test` passes **28 tests** across three files. Independent numerical cases cover polygon geometry, intermediate collision, uncertainty, movement restrictions, final heading, fixture edits and coordinate mapping. Contract cases cover cancelled identical-input retries, stale revisions/profiles, duplicate responses, malformed model output, impossible placements, shared-plan round trips, export mismatch rejection and HTTP limits.

Two independently found defects were fixed and retained as regressions: an empty trajectory originally skipped initial occupancy validation; conservative-only interference originally failed to distinguish uncertainty from nominal collision.

`npm run typecheck`, `npm run lens:bundle` and `npm run build` pass. The production build uses Next.js 16.4.5. The portable bundle has no browser/Node runtime dependencies. The native controller passes an esbuild syntax check; this does not substitute for Lens compilation.

The final committed dependency state (including esbuild 0.28.2 and the Node.js 22 engine pin) was rechecked with the same 28 tests, TypeScript, portable bundle and production build. All passed. Node.js 22 is the supported judging/deployment runtime.

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

The production HTTP sequence returned 200 for all three evaluations and matching revision-2 export. One loopback run took 15/27/17 ms end to end; these are single-run observations, not hosted latency or percentile claims. The SVG included the door dimension.

At the test base URL, the final model's share was 270 characters and a 65 × 65 QR matrix. URL decoding restored the identical fingerprint. Native QR scanning and display contrast remain separate checks.

## Native and hardware boundary

The actual project is `lens/OpenDoor.esproj`, created through the native Lens workflow with SIK/UI Kit 2.0.0. Controller and core are under `Assets/Scripts`. Release-build integration, native compilation, complete Preview interaction and QR scanning must be confirmed before those criteria are marked passed. [Integration](../lens-src/INTEGRATION.md) lists the exact acceptance sequence.

No LEAF scenario is recorded as passed here. No physical glasses, on-device frame-rate evidence, long-term comfort study or external user feedback have been obtained. A Preview success would not establish those outcomes.
