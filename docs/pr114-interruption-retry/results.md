# PR #114 interruption/retry — candidate results

Status: implementation candidate; integration STOP. Astra audit and physical
iPhone Safari portrait verification of the new runtime remain PENDING.
No change to PR #114, main, Device Registry or production deployment.

## Cause and transitions

At fetched HEAD `d8bf38d93fd1676c75432e411b6d683e9f0a6846`, real Stage3
visibility cancellation restores P0 and releases player/NPC/audio ownership,
then emits a session-ended report with `completed:false`, `restored:true`,
`reason:background`, `error:AbortError`. Interaction incorrectly sets its
independent `completed:true`, permanently making dev `progressReady()` false.
This exactly reproduces free Shion movement and Shiopon follow with no choice.

Before: RUNNING → background abort → verified restore/unlock/audio release →
interaction COMPLETED → reapproach permanently ineligible.

After interruption: RUNNING → background abort → hidden wait → verified P0
restore/paint → unlock/audio release → WAITING_REAPPROACH (`completed:false`,
`armed:false`) → safe exit ≥96 → reapproach ≤46 → choice → explicit inspect →
fresh RUNNING session. No timer or lifecycle event automatically starts it.

After success: completed/restored/clean report agreeing with live state →
interaction COMPLETED → unchanged one-shot Aftermath → permanently no choice.

After failure: restore verification/dependency failure → original recovery alert,
scene/input/audio lease retained, interaction STOP. Explicit recovery retry must
restore/verify/paint/unlock/release before spatial rearm. Clearing the old recovery
error after actual success permits that same session's recovered report.

## Changed files and preservation

| File | Reason |
|---|---|
| `star-gate-interaction.js` | Strict completion proof, live report agreement, safe scene/control/camera/dialogue/overlay gates, audio-lease release prerequisite for retry, spatial rearm, duplicate/stale report and click prevention; protect foreign interaction ownership |
| `star-gate-anomaly.js` | Report audio lease release, clear stale recovery error only after successful recovery, reject duplicate/obsolete recovery button callbacks |
| `tests/star-gate-front-integration.test.cjs` | Preserve lock-before-P0/no-autoreplay checks; replace explicitly superseded interruption-consumes expectation with success/retry/failure/lock/report integrity assertions |
| `tests/stage3-interruption-lifecycle.test.cjs` | Execute actual recovery/finalizer/report functions with dependency fixtures; test hidden wait, failed/manual recovery, second run and stale button |
| `tests/star-gate-aftermath.test.cjs` | Exercise interaction retry and real Aftermath together, one handoff and successful final follow restoration; existing tests retained |
| `docs/pr114-interruption-retry/*` | Contract, exact tested source fingerprints, results and independent review evidence |

Compared with PR #114, `star-gate-aftermath.js`, `stage3-dev-bootstrap.js`,
`audio.js`, `future-vision-audio.js`, `future-stage3.js`, `game.js`, all CSS/assets,
Save/Continue, event contracts, workflows, guards and baselines are byte-identical.
Current main is already an ancestor of the candidate's fetched PR baseline.

## Automated results

| Check | Result |
|---|---|
| Latest main `22c07ae94d7491c3818b57574da7ee3af12edfc4`, full regression runner | 341/341 PASS |
| Original PR #114 fetched HEAD, full regression runner | 447/447 PASS |
| Final candidate, full regression runner | 461/461 PASS; fail/skip/cancelled/todo 0 |
| Candidate front interaction tests | 14/14 PASS |
| Top-level JavaScript syntax | 47 files PASS |
| `validate.mjs`, `validate-background-assets.mjs`, `validate-audio.mjs` | PASS |
| Event preflight `star-gate-anomaly` | PASS, productionEnabled=false |
| `git diff --check` | PASS |
| Supplemental independent code review | PASS, integration STOP |

Commands: `node scripts/test-regression-baseline.mjs`, `node --test tests/*.test.cjs`
through that unchanged runner; `node --check` on all top-level JS; the three
validators; `node scripts/event-preflight.cjs --target star-gate-anomaly`.
No baseline/validator weakened, no test deleted/skipped. The old interrupted
completion expectation is changed only because the owner's v1.0 contract
explicitly supersedes that behavior; stronger replacement checks are retained.

## Real browser runtime simulation

Chromium, 390×844, touch/mobile viewport; real index, scene adapter, story sequence,
audio elements, interaction and Aftermath. Used synthetic `document.hidden` +
visibilitychange; actor movement used existing stage APIs. This is not physical
Safari, native Home switching or actual BFCache. Restoration failure was injected
in the browser dependency fixture only, without changing candidate source.

Confirmed original missing-prompt failure; candidate safe recovery and deliberate
retry; retry session ID 2 completes the whole event; return dialogue/camera,
individual Shiopon→Lumiere talks, group, departure and restored following; completed
choice cannot repeat; failed restoration holds input and alert; explicit manual
recovery clears the error and reapproach offers choice. Existing automated tests
cover both Aftermath conversation orders. No JS page error; sampled fully opaque
blackout checks found zero playing/unmuted/nonzero-volume media violations.
Media sampling is not a listening test or exact continuous silence measurement.
Final source fingerprints and compact observed states are in `browser-evidence.json`.

## CI and release gates

The independent Draft PR targets `fix/star-gate-front-stage3-integration` so only
this repair is reviewed. Validate workflow is triggered by any pull request.
Event Safety / Main Merge Gate is configured only for PRs targeting main, so that
workflow is NOT RUN on the stacked candidate. No workflow trigger/guard is changed.
Its contract tests are included in the local 461 tests. Device Registry Guard must
remain FAIL for the new runtime with no exact-SHA human record; this is recorded
in the candidate PR body along with actual remote CI run URLs/conclusions.
Never transpose historical iPhone PASS onto this new runtime.

## Independent audit / device risks

1. Capture physical Safari visibility/pagehide/pageshow ordering, BFCache eviction
   and hidden reload. The reproduction is confirmed for JS visibility cancellation;
   a hidden reload is still unproven and must not be marked handled.
2. Confirm free controls and Shiopon follow after Home-return, deliberate exit/reapproach
   discoverability at 96/46 boundaries and one intentional fresh attempt.
3. Confirm native autoplay rejection, audio OFF/ON, silent black, user-gesture audio
   recovery and absence of duplicate media after repeated interruptions. Audio-ready
   means event lease released; actual audible transport is a separate device check.
4. Exercise interruption during preload, dialogue, Future view, absorption, white,
   black and return, repeated switches/resize and recovery timeout/failure; verify no
   late restore/audio callback changes a newer session or releases a foreign lock.
5. Preserve successful event completion, both Aftermath talk orders, camera return
   and cancellation after actual completion; inspect raw fixed-SHA hosting/CORS.

Historical owner-verified uninterrupted event/music/blackout/Aftermath/both talk
orders remain valid for runtime `948fed1dbd214af86c2aeadfcdee811dd701217b`.
New exact-SHA Device result is PENDING. REGRESSION LOCK: automated checks PASS,
protected systems unchanged outside the explicit dev retry correction; device/
integration/release gate STOP.
