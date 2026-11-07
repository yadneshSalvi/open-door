# HTTPS and revision contract

Routes use JSON. Computation is bounded. Repair search cooperatively yields within its request; there is no process-local job persistence.

| Endpoint | Contract |
| --- | --- |
| `GET /api/health` | Service/solver version and language availability, without keys. |
| `GET /api/v1/fixture` | Provided room, profile and journey. |
| `POST /api/v1/evaluations` | `{room,profile,journey,requestId,generation,preferredMotions?}` → echoed identity and independently verified evaluation. |
| `POST /api/v1/exports` | `{input,expectedHash,baseline,requestId,preferredMotions?,repairEvidence?}` → matching JSON plan and SVG, with a reverified repair certificate when supplied. |
| `POST /api/v1/repairs` | `{room,profile,journey,requestId,generation}` → source identity, finite scope/progress counts and up to three verified layout proposals. |
| `POST /api/v1/preferences/parse` | `{text,objects:[{id,name}],requestId}` → unapplied proposal. |

Models are limited to 64 KB, 24 objects, unique IDs and finite bounded dimensions. Furniture must remain within the room without overlap. Results carry settings, revision, deterministic fingerprint, evidence and limits.

The fingerprint identifies input; it is not authentication. The client also checks monotonic generation and active request ID. Cancelling then retrying identical input cannot resurrect an old response. Duplicates are consumed once. Changes mark results pending immediately. Undo uses a new revision and recomputes.

Optional preferred motions are never trusted: every interval, movement restriction, initial pose and goal must verify, otherwise ordinary planning runs. Existing requests without preferred motions remain compatible.

Export verifies the expected fingerprint and recalculates that model. The client rejects responses after model/export-generation changes. Imported/shared plans are schema-validated and reevaluated.

The repair job bounds candidate generation, selected objects, moves, beam width, evaluations and route nodes. Request cancellation is checked between cooperative steps and before returning success. Browser search uses the same engine in a dedicated worker and terminates that worker on cancellation. The native controller uses `InternetModule.fetch`, checks its request token/generation/hash/revision before processing, and independently verifies returned candidates locally before display. It times out after 25 seconds. The installed native fetch API cannot abort transport; canceled responses are discarded. Retry and slower offline search are explicit choices. See [computed repair](repair-search.md) for exact search restrictions.

`repairEvidence` identifies the source/proposal/accepted fingerprints, source revision, moves, reserve target and certified bound. Exports reconstruct the source and reverify the atomic repair and reserve instead of accepting client annotations. A valid response adds `plan.repair.selection`, `plan.repair.verification` and the search scope. This extra certificate explains why ordinary adaptive lower bounds can be smaller than the selected reserve. Protected profile values stay unchanged.

## Language proposals

One OpenAI Responses request has no retry, a 24-second timeout, 1,200-character input and 1,400 output-token limits. `gpt-6-astra` availability was verified in the account and with a live browser request. `OPENAI_MODEL` may select another supported model.

Structured output receives runtime validation. Unknown IDs, duplicate locks, invalid dimensions and fabricated feasibility fields are rejected. Only reviewed locks, explicit dimensions, buffer and reverse permission can apply. `store:false` is sent. The service receives supplied preference text and object names/IDs only.

Per-instance burst protection is not a durable global rate limit or spend cap. Public traffic should use appropriate provider/platform controls. There are no automatic agent loops; geometry works without language service.

## Shares

Explicit sharing compresses the exact model or a validated fixture delta into a URL fragment. No database is needed. The initial page request omits the fragment; the browser validates it and sends the model to its geometry API. Large custom rooms can use JSON rather than QR.

Share fragments contain model inputs, not selected repair provenance or a prescribed trajectory. Fresh evaluation may choose another valid route; keep the complete JSON for the accepted reserve certificate.

Native sharing requires HTTPS. The web helper permits HTTP localhost solely for local testing. No link or native asset contains vendor credentials.
