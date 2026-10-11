# Lumiere hair/hem sway — Option B device candidate
Status: DRAFT / DEVICE PENDING / NOT RELEASED
Date: 2026-10-10
PR: #130
Base implementation: four-direction Phase 2; initial B runtime source: `454f85e8dc7adc98cbe3b905bffa3f911d62af58`

## Reason for revision
The initial local warp used a squared-sine weight on both axes; it peaked at the geometric center of each selection and approached zero near the visible free tips. Original maximum reference displacement was hair 0.4 px, hem 0.25 px, often imperceptible at normal iPhone game scale. Physical movement must be seen in the correct hair/hem silhouette, not merely in a pixel-difference count.

## Implemented changes (B)
- Keep all four source WebP images and all 13 selected, anatomy-screened terminal regions; keep the fixed full-body pose, map/event/movement/save interfaces, and the actor's 2.4 reference px / 5.2-second bob unchanged.
- Replace the symmetric central warp with a root-to-tip smoothstep envelope. Root and all four rectangle boundaries evaluate to exactly zero. The strongest influence is in the lower, free-tip band, approximately 80% down the region.
- Hair lateral envelope: max 0.85 reference px; vertical follow-through: 18% of lateral displacement (max ~0.153 reference px). Phase lag relative to bob: 0.28 seconds.
- Hem lateral envelope: max 0.55 reference px; vertical follow-through: 16% (max ~0.088 reference px). Phase lag: 0.47 seconds.
- Source-space local inverse warp now uses bilinear premultiplied-alpha sampling in both axes. The atlas retains 33 precomputed positions per region and smooth adjacent-sample interpolation. One-time cache generation has no per-pixel temporary-array allocation.
- Rendering remains one final whole-character draw per frame, using the same cache density and fixed-capacity Canvas objects; OFF preserves the unchanged hovering actor and animation phase.
- This is a visual candidate, not a demonstrated Safari-quality result. Amplifying tip motion increases the importance of examining seams, apparent stiffness, hair readability, feathered edges, and performance.

## Verification and acceptance
Automated coverage includes weight bounds, exact root/perimeter zeros, tip emphasis vs root, hair-vs-hem lag periodicity, source-region exclusions, cache reuse and A/B toggling. Existing integration tests must still pass. Automated tests cannot establish visible hair/hem movement or lack of Safari compositing artifacts.

Required iPhone verification (all four directions, at least two 5.2s periods):
1. View at actual play scale, first ON and then OFF, with the preview panel closed. Hair bundles and hem should be recognizable as moving, without the face/body/legs/wings moving relative to the fixed pose.
2. Inspect attachment edges, transparent pixels, anti-aliased colors, silhouette, background seams, and any double-image/warping artifacts.
3. Change directions and ON/OFF midcycle. Check no jump in bob phase, mask seam, freeze or flutter.
4. Test camera movement/occlusion, event return, tab restore/reload, and normal/low-power iPhone Safari.
5. If it still looks too small, record which direction and which tuft/hem; do not indiscriminately increase entire-source deformation or move into anatomically protected pixels.

Do not merge main, enable production, or record Device PASS without real-device evidence. Original pixel-proof metrics in `docs/lumiere-hover-evidence/sway-pixel-proof/` belong to the preceding Phase 2 runtime and are NOT validation of Option B.