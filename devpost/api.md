# HTTPS and revision contract

Routes use JSON. Computation is synchronous and bounded; no fabricated jobs or process-local job persistence.

| Endpoint | Contract |
| --- | --- |
| `GET /api/health` | Service/solver version and language availability, without keys. |
| `GET /api/v1/fixture` | Provided room, profile and journey. |
| `POST /api/v1/evaluations` | `{room,profile,journey,requestId,generation}` → echoed identity and evaluation. |
| `POST /api/v1/exports` | `{input,expectedHash,baseline,requestId}` → matching JSON plan and SVG. |
| `POST /api/v1/preferences/parse` | `{text,objects:[{id,name}],requestId}` → unapplied proposal. |

Models are limited to 64 KB, 24 objects, unique IDs and finite bounded dimensions. Furniture must remain within the room without overlap. Results carry settings, revision, deterministic fingerprint, evidence and limits.

The fingerprint identifies input; it is not authentication. The client also checks monotonic generation and active request ID. Cancelling then retrying identical input cannot resurrect an old response. Duplicates are consumed once. Changes mark results pending immediately. Undo uses a new revision and recomputes.

Export verifies the expected fingerprint and recalculates that model. The client rejects responses after model/export-generation changes. Imported/shared plans are schema-validated and reevaluated.

## Language proposals

One OpenAI Responses request has no retry, a 24-second timeout, 1,200-character input and 1,400 output-token limits. `gpt-6-astra` availability was verified in the account and with a live browser request. `OPENAI_MODEL` may select another supported model.

Structured output receives runtime validation. Unknown IDs, duplicate locks, invalid dimensions and fabricated feasibility fields are rejected. Only reviewed locks, explicit dimensions, buffer and reverse permission can apply. `store:false` is sent. The service receives supplied preference text and object names/IDs only.

Per-instance burst protection is not a durable global rate limit or spend cap. Public traffic should use appropriate provider/platform controls. There are no automatic agent loops; geometry works without language service.

## Shares

Explicit sharing compresses the exact model or a validated fixture delta into a URL fragment. No database is needed. The initial page request omits the fragment; the browser validates it and sends the model to its geometry API. Large custom rooms can use JSON rather than QR.

Native sharing requires HTTPS. The web helper permits HTTP localhost solely for local testing. No link or native asset contains vendor credentials.
