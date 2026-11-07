# Reviewed interface and Preview captures

Captured from the working Open Door companion and native Preview on 7 November 2026 and reviewed before inclusion. These screenshots contain the application only, without browser account panels or developer credentials.

- `companion-repair-preview.png`: actual deployed computed-repair preview at source revision 0, with the 3 cm reserve alternative selected. No source move is committed; the compact inspector and spatial displacement arrows are visible. Full application frame, unchanged.
- `companion-repaired.png`: actual deployed accepted repair at revision 1, both checks clear and footprint playback at its end. Full application frame, unchanged.
- `companion-desktop.jpg` (original release): the deployed companion, revision 3 after the table/bench edits and a reviewed 5 cm clearance buffer. Both modeled checks are clear.
- `companion-mobile.jpg` (original release): the responsive room view at 390 × 844, after the camera-fit correction.

- `native-overview.png`: the accepted native Preview at revision 11, with both modeled checks clear. Empty outer margins were trimmed from the 1392 × 1910 original; no application content was changed.
- `native-drag-preview.png`: actual SIK placement preview, with the numerical model unchanged until release. Empty outer margins were trimmed; no application content was changed.
- `native-plan-qr-r11.png`: the original, full-frame native QR capture. ZXing decoded its production URL exactly. It is not reconstructed or cropped.
- `native-handoff-browser-r14.jpg`: the independent fresh-browser handoff from an earlier native revision 14, with both checks clear. This is distinct from the final revision-11 native run.
- `native-verification.json`: sanitized source hashes, observed assertions, log scope and QR/export comparisons. Machine paths and raw editor transport logs are excluded.

Native images came from SPECS 27 Interactive Preview with its Plane scene. None of these images is physical-device evidence or independently sufficient proof of interaction behavior; the [verification record](../verification.md) and [native record](../native-preview.md) describe the checks separately.

## Current accepted native repair

- `native-repair-preview.png`, `native-repair-original.png`, `native-repair-playback.png` and `native-repair-overview-r9.png`: actual +3 cm proposal, Original view, turning footprint and final accepted overview. Only outer margins were trimmed using the rectangle x=90, y=380, width=1212, height=1060 from 1392 × 1910 captures. No application content was changed.
- `native-repair-preview-full.png`: the complete original proposal capture for comparison with its crop.
- `native-repair-full-scale.png`: complete actual stationary 1:1 view. It intentionally shows only the current field of view, not the entire room.
- `native-repair-qr-r9.png`: complete, unmodified native QR capture, decoded full-frame by ZXing.
- `native-repair-browser-r9.png`: actual independent browser handoff of that exact URL, revision 9 / two checks clear.
- `native-repair-plan-r9.png`: rendered actual production SVG from the captured native model/certificate, not a native screenshot.
- `native-repair-verification.json`: sanitized current hashes, observed assertions, instrumented timings, QR/export/browser proof and scoped diagnostics.

The earlier `native-*` captures listed above remain historical direct-edit evidence. The [current accepted report](../native-repair-preview.md) distinguishes real gestures from pointer setup and supplemental transport/diagnostic calls. No image is physical-glasses or physical-phone evidence.
