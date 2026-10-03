# TAROT BREAKER — Phase 2A-5c Landing / Garden Continue Receiver

**Version:** v1.1 — audited implementation contract  
**Status:** IMPLEMENTATION + DEVICE VERIFICATION COMPLETE / FINAL MAIN GATE  
**Previous phase:** Phase 2A-5b COMPLETE  
**Baseline main SHA:** `0958b445442645321264f4a724fbef2f7b2e885c`  
**Next action:** run final main-target CI / review gates on PR #85; merge only after explicit product-owner authorization  
**Implementation authorization:** CONTRACT READY — runtime implementation remains blocked until this v1.1 contract is reviewed

> ## RESTART HERE
> In a new ChatGPT conversation, say:
>
> **「TAROT BREAKERの次のフェーズに進んで。GitHubの `docs/phase-2a-5c-landing-garden-continue-spec.md` v1.1を確認して、Phase 2A-5c実装契約レビューから続きから開始して。」**
>
> Pre-audit is complete on main `0958b445442645321264f4a724fbef2f7b2e885c`. The next task is to review this v1.1 contract. Do not change runtime code on the audit branch.

---

## 1. Purpose

Extend the Continue foundation completed in Phase 2A-5b so saved progress can safely reconstruct Landing and Garden state.

Target flow:

`saved progress → destination validation → state projection → asset/collision readiness → safe spawn → event/companion restoration → input unlock`

This phase does **not** publicly enable the Title-screen Continue flow.

Continue is state reconstruction, not a mechanism for replaying a map from its beginning.

## 2. Baseline and regression lock

Phase 2A-5b was squash-merged to `main` at:

`50950d5ebdaaf414dae8a7cb3b322d78ffca74bf`

Post-merge GitHub Actions for that exact SHA completed successfully:
- Validate TAROT BREAKER 2D
- Event Safety / Main Merge Gate
- pages build and deployment

Treat the following existing behavior as locked unless the v1.1 audit proves a narrowly-scoped change is required:
- Title → Alenon normal route
- Alenon prologue
- Alenon movement
- Orb interaction and current hysteresis
- PAD boarding/return behavior
- Alenon → Landing
- existing Landing events
- Landing → Alenon return
- Phase 2A-5b Alenon Continue receiver
- Progress v1 / Journey authority boundaries
- Device Registry Guard / Main Merge Gate
- existing dialogue, timing and event presentation

Do not rewrite a working normal route merely to make Continue easier.

## 3. Scope

### 3.1 Landing Continue

A valid Landing checkpoint must restore the saved Landing state, including as applicable:
- safe player spawn
- PAD state
- `landing_devil_memory` completion authority
- suppression of already-completed event replay
- movement/camera/collision readiness
- audio lifecycle

Candidate audit scenarios:
- **L1 — Landing arrival / Devil Memory incomplete**
- **L2 — Devil Memory complete**
- **L3 — companion waiting at Landing**

These scenarios are frozen by the v1.1 pre-audit. Their exact fixtures are defined in §16.

### 3.2 Garden Continue

A valid Garden checkpoint must restore the saved Garden state, including as applicable:
- safe Shion spawn
- Shiopon state
- Lumiere-related state
- Garden event completion state
- Star Gate-related state without accidentally starting new content
- movement/camera/collision readiness
- audio lifecycle

Candidate audit scenarios:
- **G1 — before Shiopon meeting**
- **G2 — after `garden_shiopon_meet`**
- **G3 — after `garden_lumiere_gate`**

These scenarios are frozen by the v1.1 pre-audit. Their exact fixtures are defined in §16.

## 4. Authority rules

### 4.1 Completed events

`completedEvents` is event-completion authority. Do not infer completion from actor position, visible sprites, map location, or a convenient runtime condition.

Continue must not:
- replay an event already recorded complete;
- manufacture completion of an event that is not recorded complete;
- silently repair contradictory history by guessing.

### 4.2 Companion

Continue restores companion authority; it does not advance it.

Examples:
- do not convert `not_joined` to joined merely because Garden is loaded;
- do not convert `waiting_at_landing` to following merely because Continue is used.

The audit must confirm the current canonical companion values and their legal transitions.

## 5. Fail-closed behavior

Malformed, unsupported, contradictory, wrong-map, unsafe-spawn, failed-asset, failed-decode or failed-collision states must not fall through into ordinary gameplay.

Development behavior:
- remain locked;
- expose a diagnostic;
- allow a controlled retry where appropriate;
- provide a safe route back to Title where appropriate;
- never guess a replacement checkpoint or completion state.

Production-facing recovery UX is outside this phase unless v1.1 explicitly adds it.

## 6. Scene Ready Gate

The Continue receiver must not unlock player input or event triggers until the required scene is ready.

At minimum verify:
- required background/map assets;
- required character assets;
- image decode where applicable;
- collision data;
- valid safe spawn;
- projected event/companion state.

A previously observed presentation issue can reveal the scene in stages (for example background → map → completed scene). That visual loading polish is **deferred** from Phase 2A-5c unless it blocks safe Continue behavior. Do not broaden this phase into a loading-screen redesign.

## 7. Spawn safety

Each Continue spawn must be explicitly authored and audited.

A valid spawn must:
- be inside the correct walkable collision region;
- not overlap a blocking object;
- not begin inside an unintended trigger;
- not immediately retrigger PAD/transition behavior;
- preserve the intended camera and movement state.

If an authored spawn is unsafe, fail closed. Do not search for a nearby fallback point automatically.

## 8. Development isolation

Continue development checkpoints must remain isolated from production player data.

Dev execution must not mutate:
- production Progress;
- production Journey;
- settings;
- editor data;
- unrelated storage.

Reuse the isolated-session pattern established by Phase 2A-5b unless the v1.1 audit identifies a concrete incompatibility.

Candidate dev entries:

```text
?dev=landing-resume-arrival
?dev=landing-resume-memory-complete
?dev=landing-resume-waiting
?dev=garden-resume-before-shiopon
?dev=garden-resume-after-shiopon
?dev=garden-resume-after-lumiere
```

These IDs are frozen for Phase 2A-5c by §16. They must be added to the existing registry without changing the Phase 2A-5b Alenon IDs.

## 9. Automated verification requirements

The v1.1 implementation contract must define executable checks covering at least:
- every registered 2A-5c checkpoint;
- zero production-storage writes from dev checkpoints;
- exact map authority;
- exact authored spawn;
- collision safety;
- preservation of `completedEvents`;
- preservation of companion authority;
- no replay of completed events;
- no fabricated completion of incomplete events;
- fail-closed malformed/unsupported/contradictory state;
- image/decode/fetch/collision failures;
- unsafe spawn;
- retry behavior;
- reset behavior;
- movement input;
- prevention of unintended PAD/transition/event trigger firing;
- all existing regression suites.

New tests passing while existing tests fail is not acceptable.

## 10. Device Gate

Automated tests do not constitute Device PASS.

After code/automated review, use exact-build dev URLs and obtain explicit human results for each required Landing/Garden checkpoint and for the ordinary integration route.

Inspect on-device:
- initial presentation;
- player position;
- movement;
- camera;
- collision;
- event replay/non-replay;
- companion state;
- PAD/transitions;
- audio;
- page/background/close lifecycle where relevant.

Only an explicit human confirmation for the exact tested runtime may be entered as PASS in the Device Verification Registry. Do not infer PASS from CI, screenshots alone, a later build, or silence.

## 11. CI and merge gate

Before merge, require the applicable repository checks, including:
- Validate TAROT BREAKER 2D;
- Event Safety / Main Merge Gate;
- Main Lineage Guard;
- Device Registry Guard;
- existing contract/regression gates.

Merge eligibility requires all applicable items:

```text
Implementation PASS
Automated Test PASS
Regression PASS
Independent Review PASS
Device Gate PASS
Integration Route PASS
CI PASS
Device Registry PASS
Main Lineage PASS
Explicit product-owner merge authorization
```

Do not treat PR CI as post-merge main CI. After merge, verify the exact resulting main SHA separately.

## 12. Explicitly out of scope

Do not include the following in Phase 2A-5c unless the v1.1 audit demonstrates they are strictly necessary for safe Continue:
- public Title Continue activation;
- New Game UI changes;
- Save Slot UI;
- autosave UI;
- full loading-screen/presentation redesign;
- save-data migration;
- new Star Gate story events;
- STAGE 1–3 presentation changes;
- new story content;
- character art changes;
- Garden map redesign;
- unrelated Alenon behavior changes.

## 13. Definition of done

Phase 2A-5c is complete when Landing and Garden can reconstruct their approved saved states safely, preserve event/companion authority, avoid unintended replay, keep the normal route intact, pass automated/CI gates, and pass exact-build human device verification.

Public Title Continue routing remains a later phase.

## 14. Required execution order

1. Read this document and current `main`.
2. Confirm the actual current main SHA; do not assume the baseline SHA above is still HEAD.
3. Audit current Landing/Garden runtime, event contracts, checkpoint registry, Progress/Journey integration, collision/spawn behavior and relevant tests.
4. Compare real code with every assumption in this v1.0 specification.
5. Record contradictions, stale assumptions and unresolved decisions.
6. Produce **v1.1 implementation contract** with exact event IDs, legal state transitions, checkpoint IDs, spawn coordinates, locked/out-of-scope files/behavior, risk level and executable acceptance criteria.
7. Only after v1.1 is reviewed, create the implementation branch and change runtime code.
8. Implement Landing receiver and tests.
9. Implement Garden receiver and tests.
10. Run full regression and independent diff/error-path review.
11. Run exact-build Device Gate.
12. Record human evidence without inference.
13. Run final PR CI/Merge Gate.
14. Merge only after explicit product-owner authorization.
15. Verify exact post-merge main CI.
16. Update this document/status or the successor results document so the next phase has a clear handoff.

## 15. Stop conditions

Stop and ask for a decision instead of inventing behavior if the audit finds:
- multiple plausible canonical event orders;
- conflicting Progress/Journey authorities;
- an undefined companion transition;
- no safe authored spawn;
- a change that would alter locked normal-route behavior;
- a need to expand into public Continue/UI/migration;
- evidence requirements that cannot be satisfied without human device verification.

## 16. v1.1 pre-audit result and frozen implementation contract

### 16.1 Audit baseline and result

Pre-audit inspected current main at `0958b445442645321264f4a724fbef2f7b2e885c`, including:
- `route-registry.js`;
- `progress.js`;
- `progress-resume.js`;
- `dev-checkpoints.js`;
- `star-country-landing.html`;
- `game.js`;
- `dialogue.js`;
- `garden-progress-observer.js`;
- Landing/Garden collision data;
- existing Landing/Garden Progress integration tests;
- Phase 2A-5b Alenon Continue tests.

Result: no Phase 2A-5c stop condition was found. Runtime implementation may proceed after review of this contract.

This contract-only PR is classified as `SCOPE: FOUNDATION` with `DEVICE_GATE_REQUIRED: NO` because it changes documentation only. The later runtime implementation PR is not covered by that exemption and must satisfy the Phase 2A-5c Device Gate defined in §10.

### 16.2 Frozen authority and event order

The current registry is authoritative for Phase 2A-5c:

1. `alenon_prologue`
2. `landing_devil_memory`
3. `garden_shiopon_meet`
4. `garden_lumiere_gate`

Exact event ownership:
- `landing_devil_memory` → `star_country_landing / pad_ground`
- `garden_shiopon_meet` → `star_gate_garden / south_gate`; completion joins the companion
- `garden_lumiere_gate` → `star_gate_garden / south_gate`; requires `garden_shiopon_meet`

Continue must project Progress facts into the existing legacy runtime guards before triggers are allowed. It must not infer Progress facts back from Journey mirrors.

### 16.3 Frozen legal companion states and transitions

Legal durable states remain:
- `not_joined`
- `joined_with_shion`
- `waiting_at_landing`

Legal transitions relevant to this phase remain:
- `joined_with_shion → waiting_at_landing` by `board_pad` at `star_country_landing / pad_ground`
- `waiting_at_landing → joined_with_shion` by `rejoin_after_arrival` at `star_country_landing / pad_ground`

Continue restores the recorded state and never executes either transition merely because a map was loaded. `waiting_at_landing` is legal once `garden_shiopon_meet` is complete; `garden_lumiere_gate` is not a prerequisite for the waiting state.

### 16.4 Frozen Continue fixtures

All fixtures are Progress v1 records. Production storage is forbidden for dev execution.

| Dev checkpoint | Map / spawn ID | Authored Shion spawn | Required completedEvents | Companion | Expected story projection |
|---|---|---:|---|---|---|
| `landing-resume-arrival` | `star_country_landing / pad_ground` | `725,716` | `alenon_prologue` | `not_joined` | Devil Memory incomplete; trigger remains eligible |
| `landing-resume-memory-complete` | `star_country_landing / pad_ground` | `725,716` | `alenon_prologue, landing_devil_memory` | `not_joined` | Devil Memory suppressed |
| `landing-resume-waiting` | `star_country_landing / pad_ground` | `725,716` | `alenon_prologue, landing_devil_memory, garden_shiopon_meet` | `waiting_at_landing` | Devil Memory suppressed; Shiopon restored as waiting, not following; Lumiere remains incomplete |
| `garden-resume-before-shiopon` | `star_gate_garden / south_gate` | `724,944` | `alenon_prologue, landing_devil_memory` | `not_joined` | Shiopon meeting remains eligible; Lumiere gate ineligible |
| `garden-resume-after-shiopon` | `star_gate_garden / south_gate` | `724,944` | previous + `garden_shiopon_meet` | `joined_with_shion` | Shiopon meeting suppressed; following restored; Lumiere gate eligible |
| `garden-resume-after-lumiere` | `star_gate_garden / south_gate` | `724,944` | all four registered events | `joined_with_shion` | both Garden story events suppressed; following restored |

The Landing `pad_ground` coordinate is the current authored PAD dismount point: PAD home `725,788` minus dismount offset `72`.

The Garden Continue coordinate `724,944` is the already-reviewed Landing-arrival spawn asserted by the official collision regression. Continue must use this exact authored coordinate. It must not call `findNearestSpawnRef()`, `nearestWalkable()`, or another nearby-point search to repair an invalid Continue spawn.

The existing normal Landing→Garden route may keep its current projection behavior. This contract changes Continue only.

### 16.5 Audit contradictions resolved

The following v1.0 assumptions required clarification:

1. **Garden normal boot uses a fallback/projection search.** This is acceptable for the locked normal route but prohibited for Continue. The Continue receiver gets the exact `724,944` authored spawn and fails closed if it is not valid.
2. **Garden story replay guards currently restore from `TarotJourney.gardenStory`.** Continue must project validated Progress `completedEvents` and companion authority into the legacy mirror before input/event observation is enabled.
3. **Landing Devil Memory replay guard currently reads `TarotJourney.landingMemoryDone`.** Continue must set the mirror true only when Progress contains `landing_devil_memory`; it must never clear or fabricate the durable Progress event.
4. **Waiting companion legacy state can contain runtime coordinates, while Progress stores only the durable companion status.** Continue must restore the durable waiting state using a deterministic Continue-only placement validated by collision tests; it must not pretend Progress saved the old runtime coordinates. The exact waiting actor placement is an implementation detail only if it does not alter the frozen Shion spawn, companion authority, trigger safety, or normal route. If no deterministic safe placement exists, stop before Device Gate.

### 16.6 Runtime change boundaries

Expected implementation surface:
- add Landing/Garden definitions to `dev-checkpoints.js`;
- add narrowly scoped Continue receiver module(s), following the Phase 2A-5b isolated-session/readiness pattern;
- wire those receiver modules into Landing and Garden only for registered Continue dev/receiver entry;
- add dedicated Phase 2A-5c tests.

Locked unless a concrete blocker is demonstrated:
- normal Title → Alenon route;
- Alenon prologue and Phase 2A-5b receiver;
- normal Alenon ↔ Landing ↔ Garden transitions;
- authored dialogue text/timing;
- PAD flight/boarding behavior;
- Garden movement/follow behavior outside receiver restoration;
- Star Gate STAGE 1–3 presentation;
- Progress v1 schema and route/event IDs.

Do not modify `progress.js` or `route-registry.js` merely to make receiver implementation easier. A required authority/schema change is scope expansion and must stop for a decision.

### 16.7 Readiness and fail-closed contract

Before input, movement, PAD/gate transitions, or story observation can run, the receiver must prove:
- registered checkpoint and isolated dev envelope are valid;
- Progress v1 record validates;
- requested map/spawn exactly matches the receiver;
- collision JSON validates;
- exact authored Shion spawn is walkable and trigger-safe;
- required images/assets decode;
- legacy story mirror has been projected from validated Progress;
- companion placement/state is safe and consistent;
- arrival state has settled.

Failure keeps gameplay locked, preserves the original fixture bytes, exposes a diagnostic, and offers controlled retry / Title return where applicable.

### 16.8 Executable acceptance criteria

Implementation is not complete until tests prove:
- all six checkpoint IDs boot to their exact map/state;
- dev checkpoints perform zero production Progress/Journey/settings/editor writes;
- Landing incomplete memory remains eligible and completed memory never replays;
- Garden incomplete events remain eligible in canonical order;
- completed Garden events never replay;
- companion authority is preserved for all six fixtures;
- Continue never manufactures an event completion or companion transition;
- exact Shion spawns are asserted and collision-safe;
- Continue does not use nearby-spawn fallback;
- malformed, unsupported, wrong-map and contradictory records fail closed;
- asset/decode/fetch/collision/unsafe-spawn failures remain locked;
- retry and reset do not mutate history;
- no unintended PAD, gate or event trigger fires during readiness;
- existing Phase 2A-5b and full repository regression suites remain green.

### 16.9 Risk

Risk level: **MEDIUM**.

Reason: no schema or canonical route change is required, but both target maps still use legacy Journey mirrors for authored story presentation. The main implementation risk is unlocking input/event observation before validated Progress has been projected into those mirrors.

### 16.10 Review gate

This audit branch contains documentation only. Runtime implementation must use a separate implementation branch created from the reviewed baseline. Do not merge runtime changes into this audit branch.

---

## 18. Phase 2A-5c final verification status

Verified runtime SHA: `96edc22bcc4d1f1ae7a988a8726217dfccecd7fa`.

Human Device PASS is recorded for L1, L2, L3, G1, G2, G3, and the ordinary Title → Alenon → PAD → Landing → Garden → Landing → Alenon route in `docs/DEVICE_VERIFICATION_REGISTRY.md`.

PR #86 was independently diff/error-path reviewed and merged into the Phase 2A-5c feature branch at `3bfca901efa1b247e009f1d7309bd4e2c4236bc5`. No production/runtime file changed after the verified runtime SHA; later commits are evidence/documentation only.

Remaining work is final PR #85 main-target CI / merge-gate verification and explicit product-owner authorization. Public Title Continue activation remains out of scope for this phase.

---

## 17. Next-session handoff

**Current project state:** Phase 2A-5b is merged and its exact post-merge main CI passed. Phase 2A-5c pre-audit is complete; v1.1 implementation contract is ready for review.

**First action next time:** review the v1.1 contract. After review PASS, create a fresh implementation branch from the approved main baseline and begin Landing receiver/tests.

**Copy/paste restart command:**

> **TAROT BREAKERの次のフェーズに進んで。GitHubの `docs/phase-2a-5c-landing-garden-continue-spec.md` を確認して、Phase 2A-5c実装前監査から続きから開始して。**

That sentence plus this repository document is the handoff point.
