# Final candidate anatomy / region Architect recheck

Role: read-only Architect; supporting evidence, not independent final Reviewer.

Result: PASS for measured placement and static protected-region exclusion. No unexpected >1-reference-pixel residual or protected anatomical overlap was found.

Reproduction: `python /workspace/lumiere-evidence/architect/measure-final-landmarks.py`

The script reads the final WebP files from the candidate repository, baseline files from `/workspace/lumiere-evidence/old`, actual current sway-region arrays, and fixed current manifest anchors. It writes evidence only under `/workspace/lumiere-evidence/architect`.

| Direction | Crown y before / after | Foot y before / after | Anatomical height reference px before / after | Face-axis x residual | Face-axis y residual | Foot x residual |
|---|---|---|---|---|---|---|
| down | 63 / 63 | 1165 / 1165 | 63.6378892148 / 63.6378892148 | -0.006817 | -0.586205 | -0.021686 |
| up | 74 / 74 | 1126 / 1126 | 63.9236111111 / 63.9236111111 | +0.014237 | +0.034702 | +0.017377 |
| left | 100 / 100 | 1142 / 1142 | 63.6788144699 / 63.6788144699 | -0.021501 | -0.710005 | +0.558547 |
| right | 61 / 61 | 1154 / 1154 | 63.5772017045 / 63.5772017045 | +0.019529 | -0.126680 | -0.117990 |

All crown/foot vertical and measured anatomical-height deltas are exactly zero using the same semantic ROIs and threshold algorithm. Largest interior-landmark residual is left iris vertical -0.710005 reference px; largest foot-axis residual is left +0.558547 reference px. Neither requires body-part deformation or region changes.

The fixed manifest anchor span renders at 63.984375 reference px. Opaque anatomical crown/plantar probes span slightly less than the manifest anchor span in the old artwork; these measured actual spans are preserved exactly. This report does not incorrectly equate the full transparent canvas or global alpha bounding box with person anatomy.

Visual inspection completed via view_image for `final-anatomical-contact.png`, `final-region-crops.png`, and all four `candidate-regions-{down,up,left,right}.png` full-size overlays. Existing regions include terminal curl/cloth art and their attached ornaments; tiny cloth corners can occur in the hair tile, still within permitted terminal garment art. No face, torso, leg or wing appears inside the selected regions. Conservative fixed-anatomy rectangle overlap count is zero in all directions. Every region has actual foreground alpha>32. Left hem occupancy is 3268 source pixels; its terminal fold crosses the upper/right region portion, so actual-motion proof should inspect it specifically, but it is not blank and does not justify a new region contract.

No change to `lumiere-sway.js` is justified by this final raster check. Dynamic changed-pixel/roots/perimeter evidence, independent final review, regression and device gates remain separate requirements. This evidence is not a Safari or real-device PASS.

Repository files were not edited by this Architect recheck.
