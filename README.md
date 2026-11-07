# Open Door

Make a room work for the person using it.

Open Door is a planned SPECS Lens for activity-based room-layout rehearsal. Users specify a room, relevant device dimensions and personal priorities, inspect geometric obstacles, compare furniture changes and export a dimensioned plan.

The product is being developed for **Learn AR with SPECS** using Lens Studio, CLAD and the Lens Studio MCP. Its core workflow will run in Lens Studio Preview with an explicitly provided virtual room, without requiring physical glasses. Supporting AI and computation services will use an HTTPS backend.

**Status:** concept selected; detailed implementation plans prepared locally. No working Lens or deployed service is included yet.

## Configuration

`.env.example` lists the expected configuration names. Real API credentials belong in a local ignored `.env` and the backend's environment settings. Never embed credentials in Lens assets, scripts or a public client.

Private implementation and submission planning is maintained locally in the ignored `plans/` directory. It is intentionally absent from GitHub.

## Submission

The final repository will contain the Lens Studio project, publishable Devpost planning documents, reproducible examples, verification instructions and a link to the actual Preview demonstration. Incorporated assets and libraries will be attributed. The repository will be made public for judging when the submission is ready.

The intended product is a planning aid with explicit geometric assumptions. Device validation and user feedback will be documented separately from simulation results.

See the [hackathon requirements](https://learn-specs.devpost.com/rules) and [official resources](https://learn-specs.devpost.com/resources).
