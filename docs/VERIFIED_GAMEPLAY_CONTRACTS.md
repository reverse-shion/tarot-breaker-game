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

## Contract VGC-001 — Star Gate unfinished-event suppression
Status: ACTIVE — current product decision until the Star Gate event is explicitly approved as complete.

Preconditions:
- map: Star Gate Garden
- Star Gate Anomaly is not yet approved as complete/released

Observable contract:
1. Approaching or touching the Star Gate does NOT display the "星門を調べる / 離れる" choice UI.
2. Normal gameplay movement remains unaffected by a hidden/incomplete Star Gate interaction.
3. The unfinished Star Gate anomaly must not start from normal gameplay.
4. Development/test harnesses may exercise the event only through an explicit developer-only path that cannot activate during the normal route.

Forbidden regressions:
- normal gameplay loads or creates #star-gate-interaction-choice;
- normal gameplay loads star-gate-interaction.js or star-gate-anomaly.js before release approval;
- touching/approaching the gate exposes unfinished interaction UI;
- a feature branch re-enables the old PR #36 interaction foundation merely because the code still exists in history.

Activation change rule:
This contract may be replaced by the completed Star Gate interaction contract only after an explicit product decision that the full event is complete, automated tests pass, and the Device Gate passes. The replacement must happen in the same reviewed PR that enables the completed event.

## Device Gate for VGC-001
On iPhone/iPad normal gameplay route verify:
- approach/touch the Star Gate -> no choice prompt appears;
- unfinished anomaly does not start;
- ordinary movement remains available;
- no Star Gate development UI leaks into the normal route.

Record the verified commit SHA after PASS.
