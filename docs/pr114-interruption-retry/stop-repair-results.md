# PR #150 STOP repair — results (2026-10-13)

Starting HEAD: `062ba9b3f43c3a37628e9758abd20fe1a761e0e9`.
Main: `22c07ae94d7491c3818b57574da7ee3af12edfc4`.
Contract: `stop-repair-contract.md`. Risk HIGH.

## Precise analysis and repair

1. Stage3 preload and VisionWorld used separate Image caches. A pending second
   load/decode could prevent abort from reaching run's recovery. Stage3 now
   passes its decoded image and session signal. The fallback loader observes
   abort, has a 10-second load/decode deadline, removes observers/handlers and
   invalidates its token. The awaited begin continuation also checks signal and
   generation before activating scenery. Late completion cannot mutate newer
   cache, vision or scenery. Ordinary entry parameters remain supported.
2. Camera fallback cleanup previously ran even after failed P0 recovery.
   Cleanup now applies only to completed/restored sessions. Recovery failure
   keeps its control/camera/audio ownership for manual recovery. Independent
   review additionally found the armed-return-handoff + foreign-takeover path.
   Camera generations now distinguish unlock/freeze/restore/pan/release and
   arm/take/abandon. An obsolete matching handoff is discarded without releasing
   a foreign scene or newer camera; normal unclaimed handoff still returns to
   the ordinary camera. Fallback release requires a positively free camera and
   scene. No blanket camera ownership claim is inferred from a session id.
3. The 500ms entry echo and 760ms entry wait now start together under Promise.all.
   Both rejections are observed on cancellation; normal durations are unchanged.

The old audit failures were inherited from PR114, not introduced by PR150.
The old audit reproduced them with controlled dependencies rather than physical
iPhone failure. Its camera finding did not mean player input was unlocked:
controls/audio remained held. This repair preserves all three ownership domains.

## Independent and implementation verification

| Check | Result |
|---|---|
| Current main suite | 341/341 PASS (independent reviewer) |
| PR114 base suite | 447/447 PASS (independent reviewer) |
| Starting PR150 suite | 461/461 PASS (independent reviewer) |
| Final candidate suite | 478/478 PASS (implementation and independent reviewer) |
| Failure / skip / cancelled / todo | 0 |
| Runtime JS syntax | 47 PASS |
| Asset / background / audio validators | PASS |
| Diff check | PASS |
| Registered Stage3 preflight | PASS; productionEnabled=false |
| Independent read-only review | CODE / local TEST PASS; no remaining code blocker |

Added coverage: pending load/decode abort, timeout, cached/prepared normal entry,
invalid image/error cleanup, supersession, late callback against a newer entry,
actual Stage2 -> actual run/recovery lifecycle, failed and manual recovery,
both echo waits and cancellation at 0/250/499/500/759ms, real armed camera
handoff with foreign scene/freeze/pan/release, combined normal finalizer with
real adapter/scene/camera, and normal unclaimed handoff cleanup.

Tests execute real function bodies in deterministic Node VM fixtures. These are
not full browser/device measurements. Original tests remain; the one historical
unconditional-camera-release regex is strengthened to the corrected completion
and free-owner conditions. No guard, workflow or known-failure baseline changed.

Independent review runtime SHA-256:
- game.js: `afcc4bcc4a10fea4f1df03223b565ae25bf747a82b85371e51f8e51ced0bfbc5`
- star-gate-anomaly.js: `5eab71e46c4dac223b9a8a25c01bb795369fb564bcf5c6d92bbc3d68c3c1d13f`

## Preservation and device boundary

No dialogue, story order, visual asset/CSS, normal authored timing, Lumiere sprite
or hover, music source/mix/cue, Aftermath script, Save/Continue, Progress/Journey,
route/collision/movement or production exposure was changed. game.js changes
are the isolated VisionWorld and camera ownership bookkeeping. Stage3 remains
developer-only; normal gameplay is covered by unchanged production suppression.

Chromium installation was attempted but the environment returned HTML instead
of browser ZIPs; installation failed. No new independent browser PASS is claimed.
This limitation is separate from successful local tests and remote CI.

New-runtime DEVICE_RESULT remains PENDING. The owner-confirmed runtime
`5b89db82209c1e1a1a14bc628c68982883d1adae` remains historical scoped PASS.
It is not transferred to changed code. Required iPhone smoke on the new SHA:
Home-return/explicit reapproach/retry, early Future Shion interruption, camera/
blackout interruption, successful full finish with audio/Aftermath/control/follow.
No full unrelated Title/Alenon/Save retest is requested by this repair.

CODE GO and automated TEST GO do not mean DEVICE or INTEGRATION GO. Device
Registry Guard is expected to remain blocked until exact new-runtime human
evidence exists. Do not weaken it or change DEVICE_RESULT merely for green CI.
No PR114 integration, main merge or production publication was performed.
