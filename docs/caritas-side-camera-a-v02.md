# Caritas side camera A v0.2 — implementation contract

User-approved intent: Caritas left, Shioriel front-right, Shion rear-right; horizontal camera as the delivery of words. No main merge.

Baseline main: b554f66 (current main inspected before edits).
Development baseline: 6354aadff0908833fa6c2759ffd5e76a91418232 / PR221.
Target: EC-006 caritas-heart-resonance, NOT TESTED, productionEnabled false.
Risk: HIGH (camera, visual layout, iPhone IME/visualViewport).
Preflight: PASS on development baseline.

WORKING: isolated opt-in `camera=a02`, world wrapper containing background / existing five actor-effect nodes, presentation controller READING / REACTION / SPECIAL / INPUT_LOCK, lower command-field framing of existing UI, keyboard crop and return, additive tests.
LOCKED: main, shared dialogue code/styles/markup, ordinary fixed mode, card choices, numbers, core, AI request/response contract, action settlement/timing, save/Progress, map actors/camera/companion/collision, BGM, all special/cut-in artwork and sequence.

Existing full-screen reading/writing/confirmation surfaces necessarily receive **mode-scoped position/size overrides only**, so the battlefield remains visible while selecting. Buttons, tarot, gauges and contents are reused. Card detail scrolls within the lower field. Existing fullscreen special overlays take priority.

Assets: exact byte copies from current main `assets/battle/character/{shion,shioriel}.webp` to `assets/battle/camera/`. These copies keep PR221 fixed-mode art unchanged while the camera trial uses the latest owner-selected poses. No image generation/recompression or wing separation.

Camera transforms only `.cb-battle-world`. Actor anchors belong to layout CSS, independent of camera state. Field width 2.2 viewport widths; Shioriel 84%, Shion 82% of stage height. READING shows allies and left-edge beast; REACTION pans left; SPECIAL fits occupied field. Normal duration .5s; reduced motion immediate. No new action delays or camera-await callbacks.

Keyboard: freeze the currently rendered camera matrix (including mid-pan), keep world dimensions frozen, follow visualViewport height/offset with the outer frame/composer, crop to upper bodies; extremely short viewports prioritize input/send/status. Delay unlock until the closing viewport settles, with 700ms hardware-keyboard fallback. No focus/value recreation. AI send blurs only in this opt-in mode, then waits in REACTION without repetitive pan.

Acceptance: observe beast's face/darkness in A; no allied-face overlap; input/send visible with IME; lower-field UI usable at320–430px; no added action delays; no drift after resize/keyboard/re-entry; exact gameplay preservation.

Automated baselines before edits: main536/536 PASS; development779/779 PASS. Existing tests/validators/baseline are unchanged. Required final checks: camera state/lock tests, existing full regression, asset/background/audio checks, syntax, diff, independent read-only review.

Device status: PENDING. iPhone Safari seven owner acceptance checks, keyboard/IME and actual optical framing require human confirmation at final SHA. Browser evidence must not be labeled device PASS. Keep draft, no production/integration activation, no main merge.

## Candidate verification

- Final transport-fenced full regression: **789/789 PASS**, failures/skips 0. Camera controller + mount lifecycle **10/10 PASS**. JavaScript syntax, asset/background/audio validators and diff whitespace PASS.
- The inherited API cache-header test has an unstubbed POST (its key is a test-only literal). Final local suite uses a scratch-only preload which disables real fetch and HTTP(S) transport before request data is read. Existing tests and production API are not modified; no live Gemini call is needed for this camera validation.
- Independent read-only review found the below350px/hardware-keyboard compact-flag return bug. Implementation moved close completion ahead of compact calculation; mount-level tests cover it, delayed viewport close, offset restoration and rapid refocus.
- Short special playback selects immediate camera framing. A static existing cave background fills the viewport behind the scaled world.
- No optical render evidence: local Chromium cannot launch because AF_UNIX sockets are denied; shared browser inspection could not access the preview under its URL authority policy. Do not infer character overlap, face visibility, scroll usability, IME, performance or sound acceptance from these unit/DOM tests.
- All seven owner iPhone acceptance items remain PENDING. Existing registered `preview=encounter` real runtime is reused; no new checkpoint, production state or route is introduced. Open the fixed-SHA hoshisuna-main.html with `dev=hoshisuna&battle=tactical&preview=encounter&camera=a02` for the camera candidate; omit camera=a02 for the unchanged fixed-mode comparison.

REGRESSION LOCK RESULT: no new automated failures; scoped code review clear, device validation PENDING. Integration/main merge remains STOP pending human device and separate integration gates.
