# TAROT BREAKER — Verified Gameplay Contracts

Status: ACTIVE
Authority: Human device verification outranks implementation convenience.

## Purpose
A gameplay behavior marked VERIFIED is a release contract. Future work must preserve it unless the product owner explicitly changes the specification.

## Required lifecycle
IMPLEMENTED -> FIXED -> DEPLOYED -> VERIFIED -> CONTRACT LOCKED

A behavior is not CONTRACT LOCKED until:
1. it has passed device verification;
2. its observable behavior is recorded here;
3. an executable regression test protects the behavior where automation is practical.

## Non-negotiable rules
- Do not delete, weaken, skip, invert, or rewrite a verified test merely to make CI pass.
- A change to a verified contract requires an explicit product decision and a replacement contract in the same PR.
- Feature work must not silently change player control ownership, event prerequisites, route progression, dialogue completion, save/progress state, or scene transitions.
- Silent early-return paths in player-critical event starts are forbidden. Failure must be observable in tests.
- A PR that fails a verified gameplay contract is BLOCKED.
- Device-only behavior that cannot yet be automated remains a mandatory Device Gate and must be recorded as such.

## Contract VGC-001 — Star Gate interaction handoff
Status: RECOVERY PENDING — becomes ACTIVE only in the recovery PR that restores the verified runtime.

Preconditions:
- map: Star Gate Garden
- garden_lumiere_gate = completed
- garden_star_gate_anomaly = incomplete
- no dialogue/event currently owns input

Observable contract:
1. Shion enters the Star Gate interaction radius.
2. The choice UI becomes visible: "星門を調べる" / "離れる".
3. The moment the choice UI opens, player movement is locked.
4. Tap, stick, keyboard, route/autowalk, or already-held movement must not change Shion's position while the prompt owns interaction.
5. Choosing "星門を調べる" hides the prompt without releasing player movement.
6. The prompt lock transfers continuously to the Star Gate Anomaly runtime.
7. tarot-breaker:star-gate-investigate is dispatched exactly once.
8. StarGateAnomaly enters running state and cinematic camera ownership begins.
9. Player control is returned only after successful completion or explicit abort cleanup.

Forbidden regressions:
- prompt visible while Shion can move;
- an input frame between prompt and cinematic where movement is restored;
- inspect button does nothing;
- event start silently returns;
- stale progress prerequisites suppress a valid verified route without a visible failure;
- tests pass only because the contract assertion was removed or weakened.

## Device Gate for VGC-001
On iPhone/iPad Safari-compatible runtime verify:
- approach gate -> prompt appears;
- continuously drag/tap movement while prompt is visible -> Shion remains stationary;
- press "星門を調べる" -> prompt closes and Shion remains stationary;
- cinematic begins;
- no duplicate prompt/event;
- controls return at the defined event exit only.

Activation rule: VGC-001 MUST NOT be marked ACTIVE until the recovered runtime passes automated checks and the Device Gate. Once ACTIVE on main, it may never be demoted to PENDING to make CI pass.

Record the verified commit SHA in this file after PASS.
