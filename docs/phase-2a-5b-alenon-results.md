# Phase 2A-5b — Alenon Continue implementation evidence

Baseline: `aa3e221c65fe8e07c039aae057ec6507c7fd71ad` (230/230 tests).
Branch: `phase-2a-5b-alenon-resume`. Risk: HIGH.
Implementation contract: `docs/phase-2a-5b-alenon-implementation-contract.md`.
Candidate SHA, independent review and remote CI: recorded by the coordinator after freezing this diff.
Device: **PENDING** for both isolated and ordinary integration routes. No merge authorization is inferred from automated results.

## Actual scope

Four registered `alenon.html?dev=alenon-resume-*` entries execute the actual Alenon runtime: intro incomplete, intro complete, ground PAD return, and PAD return with the companion waiting at Landing. Production title/ordinary return/editor branches retain their existing boot path. No public Continue button, Landing/Garden integration or arrival-handoff activation is included.

The receiver uses only a checkpoint-specific injected session key and immutable valid v1 fallback bytes. Loading does not seed or rewrite storage. Only the existing authored prologue completion calls Progress persistence. Existing production Progress, Journey, editor and settings bytes receive no writes. Invalid development entries return before gameplay/ordinary Progress fallback. The compatibility history is exact, detached and never written into the Journey singleton.

Continue boot keeps input, prologue and Orb/PAD triggers locked until authored layout, successful required image loads/decodes, finite nondegenerate collision polygons and a walkable authored candidate are proven. The actual player is placed and camera synchronized before control begins. Intro uses `(716,330)`; PAD return uses `(730.9,789.3)` behind the PAD, ground/lift zero with existing 900ms cooldown. No landing sound or flight animation is used to obtain this checkpoint.

Errors expose retry/title controls without overwriting evidence. Successful repeated boot cannot duplicate listeners or ready signals. Sandbox PAD departure ends verification locally, stops movement sound and clears held movement input; it does not enter ordinary Landing. Existing native Wind/Orb functions and local gesture retry remain the playback path; Orb inspection remains transient and retains actual 118/154 exit/reentry hysteresis.

## Automated evidence

- `node scripts/test-regression-baseline.mjs`: **243/243 PASS**, zero failures, skips or known exceptions. Baseline was 230/230; 13 meaningful Continue tests added.
- Targeted Continue, Progress, ordinary Alenon, map-roundtrip and event/development/merge contracts are included in that full run.
- New real-page VM harness executes the actual inline Alenon script and shared receiver. DOM/media/network scheduling are explicit doubles, not device evidence. Required image URLs come from actual Alenon markup.
- Coverage: all four fixtures; zero boot writes; stale Journey contradiction; valid other-map and forged authority rejection; unknown/conflicting development query rejection; collision-first/image-first/deferred-decode readiness; image/decode/fetch/unsafe/empty/nonfinite/degenerate collision failure; retry and boot idempotence; real authored Devil prologue through completion and reload; failed dev persistence; actual keyboard/joystick/reset; native gesture retry; Orb outer exit/inner reentry; sandbox departure containment.
- JavaScript and Alenon inline syntax: PASS.
- `validate.mjs`, `validate-background-assets.mjs`, `validate-audio.mjs`: PASS.
- `git diff --check`: PASS.
- Entry preflight: PASS, target `alenon-resume-entry`, production disabled, baseline SHA above. No guard/test baseline weakening.

## Remaining release gates

Exact-candidate independent review and remote automated CI must pass before immutable device URLs are presented. The Device Registry release guard remains correctly blocked with `DEVICE_GATE_REQUIRED: YES` and `DEVICE_RESULT: PENDING` until human evidence exists. Do not replace this with FOUNDATION/NO or manufacture a device record.

On that exact candidate, the human verifies four isolated checkpoint entries (including unfinished prologue completion/reload, ground spawn, waiting companion absence, touch, Wind/Orb and no production data pollution) and the ordinary title → fresh prologue/Orb → PAD → Landing → mounted Alenon return route. These are focused checks; cross-map Continue remains deferred.
