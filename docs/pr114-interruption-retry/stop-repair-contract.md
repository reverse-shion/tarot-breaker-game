# PR #150 independent audit STOP repair — implementation contract

Risk: HIGH. User authorization: 2026-10-13, analyze and repair the reported
issues accurately until the automated gates are green.

Main: `22c07ae94d7491c3818b57574da7ee3af12edfc4`.
Starting candidate: `062ba9b3f43c3a37628e9758abd20fe1a761e0e9`.
Base PR #114: `d8bf38d93fd1676c75432e411b6d683e9f0a6846`.
Branch: `fix/pr114-star-gate-interruption-retry` (Draft PR #150).

FACT: the first VisionWorld.begin waits on a separate Image/decode despite
Stage3 preload. Its wait neither observes abort nor has a deadline; its await
continuation can activate scenery after token invalidation. The failure
finalizer releases a camera even when P0 restoration failed. A parallel echo
promise can reject without an observer while the sibling wait enters recovery.
These paths exist in the base PR and were independently reproduced with
controlled dependencies. They are not observed physical iPhone failures.

WORKING: dev-only Stage3 image entry cancellation/deadline/late callback safety;
retention of camera ownership on failed recovery; release only of an owned
normal-completion return handoff, using camera-generation identity across
freeze/pan/restore/release and the handoff; collection of concurrent echo rejections;
regression tests and evidence for those repairs. Reuse the already decoded
Stage3 image while keeping the asynchronous fallback safe.

LOCKED: story/dialogue, all normal durations, card/rupture/absorption visuals,
normal successful audio/camera/Aftermath flow, Lumiere sprite/hover, assets/CSS,
ordinary gameplay and production suppression, Save/Continue, Progress/Journey,
routes/collision/movement, guards/workflows/baselines and historical Device PASS.

Expected files: game.js (isolated VisionWorld loading/API), star-gate-anomaly.js,
targeted tests, this contract and results. No unrelated refactoring.

Acceptance: abort and timeout do not wait for pending load/decode; late completion
cannot mutate cache/vision/scenery or a newer session; valid cached/decoded image
and normal entry remain successful; failed recovery keeps camera/control/audio
until verified manual recovery; stale/foreign camera ownership is not released
by finalization; successful handoff/no-receiver cleanup remains correct; abort
during parallel Future Shion echo produces no unhandled rejection.

Validation: reproduce old failures; targeted executable regression tests; full
available suite versus current main and original candidate; syntax and asset/
background/audio validators; applicable contract tests; independent read-only
Reviewer per AGENTS.md delegated workflow; browser simulation where available;
remote Validate CI. Do not weaken a test/guard to obtain green status.

Device gate: new-runtime iPhone Home return and explicit retry to completion;
repeat interruption at early Future Shion entry and camera/blackout phases;
audio restoration, camera framing, Aftermath and control/follow smoke. Prior
5b89db8 PASS stays historical and is not transferred to changed runtime.
No unresolved product choice. No main merge, PR114 integration or production
publication is authorized by this repair task. Device/integration remain pending
until their actual evidence exists, even if all automated tests are green.
