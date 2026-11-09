# Open Door

Try furniture moves on a tabletop, then see a wheelchair turn at real size.

[Demo film](devpost/film-review.md) · [Lens gallery](devpost/gallery.md)

![Open Door’s aligned table and checked chair route in Lens Studio Preview](devpost/media/native-tabletop-aligned.png)

## Designed for glasses

- **Touch the piece you want to change.** Pinch furniture to move it; pinch the example chair to change its size. Locks and Undo sit beside the affected piece.
- **See the consequence in the room.** An amber outline identifies a collision. After a clear edit, the chair follows the checked route in cyan.
- **Keep choices small.** Up to three buttons appear at once. Point at a layout ghost, compare Before and After, then choose Use.
- **Keep attention on the space.** The model stays on its surface. Nearby detail appears beside the chair; real-size controls follow below eye level.

Glasses let you stand beside the full-size turn and inspect the space around the chair, while the model stays anchored to the floor.

## Open the Lens

Open [`lens/OpenDoor.esproj`](lens/OpenDoor.esproj) in **Lens Studio 5.23.2** and start Interactive Preview. The project includes the installed SIK, UIKit and compatible official hand hints. The example begins with a table blocking the chair and a bench blocking the door.

Pinch the table and move it. A legal release makes one edit, checks the room again and shows the result. Undo restores the old layout. **Suggest fixes** searches for furniture changes while keeping the bed locked and the chair dimensions unchanged. The Lens checks each returned layout locally before showing it and again before Use.

**More → Place** accepts a horizontal surface hit after an explicit pinch. A saved spot is available in the editor. Device startup requires a fresh surface hit. **More → Real size** shows a 1.5 × 2.0 m bedside corner at its actual dimensions; furniture and motion are clipped at that corner’s edge. It does not squeeze the whole room into the patch.

See [native setup and testing](lens-src/SPATIAL-INTEGRATION.md) and the [current verification record](devpost/verification.md).

## Companion

[Open the companion](https://open-door-weld.vercel.app) for dimension entry, room editing, computed alternatives and JSON/SVG downloads. The Lens’s **Save → Send to phone** displays a QR carrying the current model. The companion reconstructs that model and checks it again. A shared model does not transfer a selected route or its repair certificate.

For local development, use Node.js 22:

```sh
npm ci
npm run dev
```

Open [localhost:3102](http://localhost:3102). Geometry and editing work without an AI key. Optional language preferences use a server-side `OPENAI_API_KEY`; models never decide geometry results.

```sh
npm test
npm run typecheck
npm run verify:fixture
npm run build
```

Canonical native source is in `lens-src/`. `npm run lens:bundle` regenerates its portable numerical engine; copy changed native source into the project only as a coordinated editor update. Do not edit generated caches. HTTPS evaluation, repairs and exports are Vercel-compatible Route Handlers.

## Built with

- [Devpost Learn’s plan-lens framework](https://github.com/challengepost/learn-specs) informed the [design brief](devpost/design-brief.md): a task in the room, controls on the objects and explicit Preview limits.
- **CLAD and Lens Studio MCP** built and inspected the native Lens in Lens Studio 5.23.2.
- **SIK 2.0.0 and UIKit 2.0.0** provide actual hand/ray input and persistent controls; **official 3D Hints 2.0.0** teach the first gestures.
- **LEAF 2.0.2** exercises that same SIK path. On 9 November 2026, visible-hand runs completed real surface placement, furniture drag/Undo, 3D layout selection, 66→71→66 cm chair-width changes, and the checked route. See the [current verification](devpost/verification.md).
- **TypeScript, Next.js and Three.js** power the shared geometry engine and companion. [Attributions](devpost/attributions.md) include fonts, packages and original sound cues.

## Scope

The example room, furniture and chair dimensions are synthetic. Testing uses Lens Studio Preview and scripted SIK input; physical Spectacles, human hand tracking and comfort have not been tested. A surface hit places the model but does not scan or recognize the room. The indoor display is a bedside subset of the entered room, not a match to the background furniture. A clear geometric result does not establish transfer ability, complete door operation, comfort or accessibility certification. The QR works in Preview; sending a link directly to a paired phone is future work. The companion always performs fresh checks.

[Design, methods, API and verification](devpost/README.md) · [Historical records](devpost/archive/README.md)
