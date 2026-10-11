# Star Gate void inner-light correction

Scope: PR #114, `fix/star-gate-front-stage3-integration`, Draft only.
No main merge, automatic merge, normal-route activation or Production publication.

## Baselines and implementation contract

- Current main inspected: `22c07ae94d7491c3818b57574da7ee3af12edfc4`.
- PR starting HEAD: `ceb7f64c50d426ba975f5f1e4a825935db3d8a2b`.
- HIGH risk: visual layout / mobile rendering. Physical iPhone verification is PENDING.
- WORKING: import only `assets/events/gate-vision/gate-void.webp` from main; existing inner-image source and rest-only styles; focused regression tests and evidence.
- LOCKED: outer-frame bytes, DOM, placement and animation; map; Stage3/Future/Present/Aftermath sequence and durations; actors; audio; save/load; input, Follow, routes and production/dev guards.
- The repository independently requires reviewer inspection; a separate read-only reviewer inspected the actual diff, tests and failure identities.

## Source and switching boundary

`gate-void.webp` is copied without conversion from the named main HEAD. Git blob
`8f017ab7519ffe4d25bc9365e5103131596e845a` matches main exactly. SHA256:
`aed6e265d1571c70ea4459d7e6ba6cc6a9f6522f5d1d5ade331f783197291cca`.
It is 1024×1536 RGBA with genuine transparent pixels. No black backing or synthetic darkness is added.

The existing `.scene-gate-inner-light > img` changes source only when
`resonance()` enters `sga-anomaly-rest`, after `await playDarkEnergyReverse()`.
That existing function includes all four 600ms phases, 850ms ascent and 420ms
afterglow (3670ms total); none of these waits, effects or audio calls changed.
The new asset is included in the existing decoded-image preload.

Normal/corruption/ascent/afterglow keep the original blue-white source.
The exact original source, including its query string, is retained for the existing
normal reset/recovery path. Successful `cleanupGateState({preserveFinal:true})`
keeps the new source without duplicate source writes or new DOM. Existing Future
and Present restore adapters do not change it. Recovery/cancellation still clears
cinematic gate state and restores normal; replay starts from normal again.

## Aperture fit

The outer frame stays at reference `(520, -163.3333333)`, size `560×373.3333333`.
Its 1536×1024 source has substantial transparent margins; the full image rectangle
is not the opening. The inner arch is traced within source x620..916, y140..735.
That registration gives reference top-left `(746.0416667, -112.2916667)`,
size `107.9166667×216.9270833`, center x800.

The existing inner element stays at `(684.57, -136.0645508)`,
size `230.86×346.0645508`. Only its child image gets aperture-relative percentages,
derived from both unchanged scene elements' world coordinates. Existing camera
and resize transforms then scale the whole assembly together.

`object-fit: cover` applies a uniform scale to the 2:3 source: the painted source
is approximately `144.6180556×216.9270833` in reference space, with symmetric
horizontal cropping to fill the narrower opening. A 17-point pointed-arch
`clip-path` restricts smoke/energy to the actual opening. The source is never
stretched independently on x/y. Existing image animation, recoloring, bottom fade
and blue contact-light pseudo-elements are disabled only in final rest.
Transparent source pixels remain transparent. Inner z-index4 / outer frame5 are
unchanged; the existing world remains behind the opening.

Outer-frame SHA256 before/after:
`7eafea253a7ff3cf3ceef544d1653358adcb3963435cf9b87baf8179738f150a`.
`scene-preview41-fix.js`, `scene-layout.js`, `index.html`, layer ordering and all
frame CSS rules are unchanged by this correction. Focused real-browser evidence
also asserts identical frame dataset, bounding rectangle and z-index before/after.

## Automated results and unresolved PR blockers

- Targeted inner-light and front-integration tests: 8/8 PASS.
- Current main full regression suite: 341/341 PASS.
- PR starting HEAD: 397 tests, 361 PASS, 36 FAIL.
- Candidate: 400 tests, 364 PASS, 36 FAIL, zero skipped/cancelled.
- Independent comparison: zero new failure names, zero changed normalized error
  payloads across all36 existing failures. These are unresolved PR failures,
  **not** an approved known-failure baseline and **not** a green full suite.
- Failures include prior Present/Aftermath v1.3 expectations, prior card-detail
  expectations, and game/Garden-arrival Lumiere dimension expectations.
- `validate.mjs` FAILS both before and after: `Unexpected Lumiere frame count: idle`.
- Event preflight, changed JS syntax, background-asset validation, audio validation
  and `git diff --check`: PASS. No tests, baseline or validator were weakened to
  conceal an unrelated failure. The changed old filter assertion is replaced by
  the explicitly authorized raw-image/clip/animation expectations.

REGRESSION LOCK / integration gate: STOP for inherited PR failures and pending
physical-device evidence. The inner-light delta has no new automated failure.

## Browser evidence and limits

[Evidence directory](gate-void-inner-light-evidence/).

- Chromium,393×631 CSS px / DPR1, real approach choice→event: blue source remains
  during ascent/afterglow, then void source appears at rest and stays through
  Future Vision up to RIFT_SMALL. Rest raster shows the new purple energy confined
  within the existing frame with no rectangular backing.
- That accelerated-clock full-route attempt later aborts with
  `Fixed geometry changed: y` and two Future audio seek failures. Recovery restores
  normal. It does not establish successful Present Return or audio PASS.
- Focused actual DOM/rendering at393×631 CSS px / DPR3 and844×390 / DPR3 confirms
  aperture alignment at two camera scales, raw1024×1536 source, cover/arch clipping,
  no image filter/transform/mask/animation, z4 behind framez5 and no frame geometry
  change. This harness exposes existing runtime helpers only for measurement;
  it is not a complete event route or physical Safari verification.
- Successful final-state preservation/reset/replay is covered by the actual
  runtime-helper regression tests, but successful end-to-end current return is
  not established by this browser attempt.

Physical iPhone: PENDING. Check normal blue-white light; no early switch; ascent
ending; fit/no gaps/no spill/no black rectangle; Future/current-return persistence;
replay/cancellation; portrait and rotation. Existing event/audio quality remains
subject to its existing gates. No final implementation-candidate PASS is claimed.

Device URL uses the immutable final branch SHA:
`https://raw.githack.com/reverse-shion/tarot-breaker-game/<SHA>/index.html?dev=star-gate-full`.
Remote delivery must be checked separately; an HTTP/image load alone is not a
visual or device PASS.
