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


## Contract VGC-002 — Alenon prologue / Devil card
Status: ACTIVE — device-verified gameplay baseline.

Observable contract:
1. The official title route enters Alenon.
2. The prologue tarot card is Major Arcana XV — The Devil (`assets/tarot/major/15-the-devil.webp`).
3. The prologue remains a one-time story sequence and must not be silently suppressed on a fresh route.
4. Existing completed-state restoration must not cause the Devil prologue to replay unexpectedly.

Automation boundary:
Static CI protects the official Devil asset and the fresh-route prologue implementation markers. Exact timing, animation, audio and tap feel remain Device Gate items.

## Contract VGC-003 — Alenon ORB anomaly / interaction
Status: ACTIVE — device-verified gameplay baseline.

Observable contract:
1. The Alenon ORB interaction/anomaly implementation remains present on the official Alenon map.
2. The ORB anomaly remains separate from ordinary free movement and preserves its one-time journey/progress behavior.
3. Future Progress/Save work must not silently remove the ORB trigger or turn it into a repeating event.

Device Gate:
Verify the ORB event on a fresh route and verify it does not unexpectedly replay after completion/return.

## Contract VGC-004 — Landing Devil memory and route progression
Status: ACTIVE — device-verified gameplay baseline.

Observable contract:
1. Landing keeps the Devil-memory sequence and `landingMemoryDone` one-time journey fact.
2. Completion is observed as `landing_devil_memory` in Progress when Progress is valid.
3. Returning from Garden must not re-arm the Devil-memory event merely because the map was reloaded.
4. Landing <-> Garden route ownership must remain independent of observer-only Progress persistence.

## Contract VGC-005 — Shiopon companion / return behavior
Status: ACTIVE — device-verified gameplay baseline.

Observable contract:
1. Shiopon remains part of the Landing/Garden route and companion state.
2. A Garden return can restore the companion as following/waiting from saved companion state.
3. Return greeting remains guarded against repeated playback in the same return flow.
4. Progress observation must not take ownership of the existing gameplay trigger.

## Contract VGC-006 — Garden Shiopon and Lumiere story progression
Status: ACTIVE — device-verified gameplay baseline.

Observable contract:
1. The Garden keeps both Shiopon meeting and Lumiere gate story sequences.
2. Garden Progress is observer-only: `shioponDone` observes `garden_shiopon_meet`; `lumiereDone` observes `garden_lumiere_gate`.
3. Progress restoration must not become a second trigger owner for either dialogue event.
4. Completing Lumiere does NOT by itself enable the unfinished Star Gate choice UI; VGC-001 remains authoritative.

## Contract VGC-007 — Cross-map round-trip preservation
Status: ACTIVE — device-verified gameplay baseline.

Observable contract:
1. Alenon, Landing and Star Gate Garden remain traversable through their existing route ownership.
2. Returning to an earlier map must preserve one-time story facts instead of blindly replaying completed events.
3. Observer-only Progress integration must not replace existing route/trigger ownership.
4. Save/Progress changes that alter a verified route require a replacement contract and Device Gate.

## Device Gate — VGC-002 through VGC-007
Before merging gameplay/progress/route changes, verify on iPhone/iPad as applicable:
- fresh title -> Alenon prologue;
- Devil card sequence;
- ORB anomaly and post-completion behavior;
- PAD/Landing progression;
- Landing Devil memory;
- Shiopon state on departure/return;
- Garden Shiopon event;
- Garden Lumiere event;
- Landing <-> Garden return;
- no unfinished Star Gate choice UI.
