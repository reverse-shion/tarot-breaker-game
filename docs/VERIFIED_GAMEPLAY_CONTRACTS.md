# TAROT BREAKER — Verified Gameplay Contracts

Status: ACTIVE
Authority: Human device verification outranks implementation convenience.

## Purpose
A gameplay behavior marked VERIFIED is a release contract. Future work must preserve it unless the product owner explicitly changes the specification.

## Stable main baseline rule
The current merged `main` is the stable product baseline. New events, effects, story content, assets, or feature work must preserve existing main behavior and implementation outside the minimum scope required for that addition.

Non-negotiable rules:
- Do not refactor, reorganize, clean up, modernize, rename, replace, or otherwise modify existing main implementation merely because new work is being added.
- Existing title, Continue, save/progress, map traversal, event history, companion state, verified story flow, and deployment behavior must not be changed incidentally by feature work.
- A change to existing main is allowed only when (a) it fixes a confirmed defect, or (b) the new feature cannot be implemented without that specific change. In case (b), the PR must explicitly identify the required existing-main change, why it is unavoidable, and its regression scope before merge.
- No "while here" fixes or unrelated improvements are permitted in an event/feature PR.
- Product-owner explicit approval remains required for any intentional replacement of a verified contract or stable baseline behavior.

Baseline recorded when this rule was adopted: `d59daf271ea9b59a0dc729545acb84185b7d66c2`. This SHA is a historical reference for the adopted stable baseline; later explicitly approved merges become the new current main without weakening this rule.

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

## Contract VGC-001 — Completed Star Gate normal-route candidate
Status: ACTIVE on this candidate; explicit product decision that the full event is complete and normal-route/save implementation is authorized by the owner on2026-10-13 21:10JST: 「進めて」 in response to the public-integration proposal.

This replaces unfinished-event suppression in the same reviewed PR that enables the completed event. Main remains unchanged; this approval is not main merge or publication authorization. The specified normal-route Device Gate is now human-verified PASS at integrated fixed SHA `f4909bc17a2568101e277c2a8fb08b692c7d71f8` (four earlier checks at the unchanged runtime `f3b861098fa573f5b02ae60b3b02af8f0769fa3e`, plus three final integrated-route checks). Limits and direct owner reports are recorded in `docs/DEVICE_VERIFICATION_REGISTRY.md`.

Observable contract:
1. Only validated ordinary Garden arrival or Public Continue loads the approved event runtime. Title, conflicting entry and unrelated developer fixtures do not expose it.
2. Real Shiopon/Lumiere completion, joined companion, current Garden Progress and free scene/input/camera are required for the existing inspect/leave choice.
3. Investigation starts only on explicit input and cannot overlap or duplicate.
4. Stage3 success consumes the page attempt but never by itself writes final durable completion. Only actual full Aftermath completion with verified departure, restored controls and follower may persist garden_star_gate_anomaly.
5. Before final completion, reload restarts investigation after already-completed Lumiere. After completion, reload/Continue/map return suppresses replay and restores corrupted gate and departed Lumiere.
6. Failed save/readback never claims durable success or leaves event ownership locked; current-page consumption still prevents duplicates.
7. Existing isolated checkpoints remain memory-only; no developer fixture authority enters normal P0.

Device Gate: real normal entry -> meetings -> inspect -> Stage3/Aftermath -> save -> Continue/return without replay; Home same-page interruption -> explicit retry. Only changed-route checks, not repetition of unchanged dev certification.

Historical VGC001 unfinished-event suppression remains the contract on current main until this reviewed candidate is explicitly merged. The prior behavior did NOT display the "星門を調べる / 離れる" choice UI and is not retroactively treated as a regression.

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
4. Completing Lumiere does not automatically investigate the Star Gate. Approved candidate VGC-001 controls prerequisites and explicit player choice; historical main suppression remains unchanged until merge.

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
- no unfinished/developer Star Gate UI leaks; the approved candidate follows VGC-001.
