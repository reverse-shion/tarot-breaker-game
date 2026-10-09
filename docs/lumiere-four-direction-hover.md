# Lumiere four-direction hover — Phase 1 implementation contract

Status: IMPLEMENTED / DEVICE PENDING / NOT RELEASED
Risk: HIGH (visual layout, image decode and Safari rendering)
Baseline main: `cf9e8363575e6d96f458d870cbbdefbd96ef197f`
Branch: `fix/lumiere-four-direction-hover`
Device: iPhone Safari

## Authorized scope

The user selected four directional base poses, continuous whole-body hover, followed by hair and garment motion in a later phase. This candidate implements the first step only. No main merge or production release is granted by automated evidence.

WORKING: Lumiere single-pose asset selection, decoding/readiness, anchors and full-source hover rendering, fixed-wing phase, manifest provenance, related tests and asset validation.

LOCKED: Shion and Shiopon rendering/movement; logical Lumiere x/y/home/direction stage commands; existing shadow; actor sorting and masking; collision/navigation; camera; routes/spawns; Save/Continue; dialogue/audio; Star Gate / Future Fixation; checkpoint registry and historical Device evidence.

## Phase 1 runtime

| Meaning | Asset | body_top | baseline_y | center_x |
|---|---|---:|---:|---:|
| down / front | lumiere_idle.webp | 60 | 1168 | 620 |
| up / rear | lumiere_hover-back.webp | 74 | 1127 | 628 |
| left | lumiere_hover_left.webp | 97 | 1144 | 480 |
| right | lumiere_hover_right.webp | 58 | 1158 | 785 |

All four are 1254×1254 lossless alpha WebP. Encodings are copied from clean PR122 SHA `85caa984dddf54280de0be30ef2cc782d00bf1a3` only after an independent decode comparison proved identical dimensions and full RGBA bytes against the named main baseline. This changes the encoding, not the illustration. Manifest records original/current SHA256 and decoded RGBA SHA256. Every unused PNG/WebP candidate stays untouched. Neither PR122's swapped down/up files nor its two-state/crossfade code is copied.

Uniform scale is `(78 * 420 / 512) / (baseline_y - body_top)`, so the calibrated person height is 63.984375 reference px. Full-source image aspect is preserved. The anchor maps to logical x and logical y − 2.7 plus continuous bob and existing stageOffsetY. The quoted anchors are prior calibration values; ±0.5px anatomical alignment and four-direction visual consistency are not independently Device PASS.

Keep amplitude 2.4 reference px, period 5.2 seconds and the existing dt-driven sine phase. Do not round visual coordinates, write the bob to logical y or reset the phase on facing changes. Fixed single poses mean no whole-body shape blending, random wing frames, hysteresis, phase-dependent pose changes, extra effects or animation cache. The hover draw branch alone uses high-quality interpolation and existing shadow; non-hover sprite/outline/glow behavior stays unchanged. Existing foreground mask, actor depth, public Stage commands and visibility handling stay unchanged.

Before readiness, fetch the same-candidate relative manifest, validate file mapping, direction, dimension and anchor contracts, and decode all four adopted images using existing waitImage. A missing/broken/mismatched manifest/image enters the existing load-error path, never scene-ready. Offline validator checks lossless WebP container, dimensions, alpha bit, selected anchors and SHA256. Do not perform decoding/getImageData or allocate canvases per frame.

## Phase 2 blocking prerequisite

Hair/garment sway is not implemented here. Layer or mask source assets must first define per-direction root/attachment points, overlap coverage, draw order and the unchanged face/body/legs/wings. Boundaries must be visually approved at actual display size on light/dark backgrounds. Do not manufacture layers by blindly shearing the whole illustration or apply unapproved nonrigid distortion. No arbitrary fallback sway is permitted. The existing twelve images remain candidates, not a mandatory twelve-frame animation.

## Regression evidence and device gate

Tests verify one full-source draw per frame, four-direction anchors/person scale, two complete continuous bob periods per direction, phase preservation across facing/stage offset, reset, invalid dimensions/manifest readiness and existing collision/stage/movement behavior. Existing readiness tests retain delayed decode, dependency and failure handling coverage. Full regression and validators are recorded at handoff; CI is not Device PASS.

Required short iPhone Safari checklist: each direction for two periods; normal/low-power view; direction changes; camera movement; foreground clipping/mask; existing Lumiere event movement; hide/restore tab and reload. Confirm no clipping, pose deformation, double images, halos, phase jump or unintended changes to adjacent Shion/Shiopon. Use existing admitted checkpoint G3 (`garden-resume-after-lumiere`) without new registry records; published exact SHA must be recorded by the parent workflow before human Device confirmation. Device status remains PENDING until explicit human exact-build evidence. No full-game replay is required solely for this isolated visual change.

## Local verification record

Clean main regression: 326/326 PASS. Phase 1 candidate: 327/327 PASS. Asset, background and audio validators, JavaScript syntax and diff whitespace checks PASS. Independently decoded all four adopted encodings and compared every RGBA byte to the untouched main baseline; all equal. Four decoded images total 25,160,256 RGBA bytes (about 24 MiB, excluding decoder/GPU overhead).

Full-alpha silhouette bounds mapped into the existing actor mask, including bob ±2.4 and the existing upward 14px stage bounce, are below. Reference mask bounds are x [-84,84], y [-110,32]. All four fit; shared masking geometry is untouched. These are local geometric checks, not Safari screenshots.

| Direction | Left | Top | Right | Bottom |
|---|---:|---:|---:|---:|
| Front | -35.80 | -85.86 | 34.30 | 3.28 |
| Rear | -38.16 | -87.03 | 35.36 | 6.44 |
| Left | -26.58 | -87.12 | 45.10 | 3.98 |
| Right | -44.44 | -85.47 | 26.23 | 4.35 |

The fixed preview builder embeds exact-commit script/style sources, pins assets to that commit and exposes direction controls only for the existing G3 dev query. Preview staging uses the existing public Stage API, not production spawn changes. Its source manifest is embedded as `lumiere-preview-source`; preview-only transforms are listed there. Neither the controls nor generated page is loaded by the production entry. Browser executable installation failed in this environment; no local browser or iPhone run is claimed.
