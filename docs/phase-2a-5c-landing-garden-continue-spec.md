# TAROT BREAKER — Phase 2A-5c Landing / Garden Continue Receiver

**Version:** v1.0 — handoff / pre-audit specification  
**Status:** NOT STARTED  
**Previous phase:** Phase 2A-5b COMPLETE  
**Baseline main SHA:** `50950d5ebdaaf414dae8a7cb3b322d78ffca74bf`  
**Next action:** Phase 2A-5c implementation pre-audit  
**Implementation authorization:** NOT YET — audit first, then revise this document to v1.1

> ## RESTART HERE
> In a new ChatGPT conversation, say:
>
> **「TAROT BREAKERの次のフェーズに進んで。GitHubの `docs/phase-2a-5c-landing-garden-continue-spec.md` を確認して、Phase 2A-5c実装前監査から続きから開始して。」**
>
> The first task is **not implementation**. Read current `main`, inspect the actual Landing/Garden runtime and event contracts, compare them with this v1.0 document, identify contradictions or stale assumptions, and publish/commit a v1.1 implementation contract before changing runtime code.

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

These are candidate scenarios only. The pre-audit must confirm that they match the current runtime and canonical event ordering before v1.1 freezes them.

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

The pre-audit must verify these against current code and contracts before implementation.

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

These names are **not frozen** until the pre-audit checks the current Dev Checkpoint Registry.

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

## 16. Next-session handoff

**Current project state:** Phase 2A-5b is merged and its exact post-merge main CI passed. Phase 2A-5c has not started.

**First action next time:** implementation pre-audit. Do not start coding first.

**Copy/paste restart command:**

> **TAROT BREAKERの次のフェーズに進んで。GitHubの `docs/phase-2a-5c-landing-garden-continue-spec.md` を確認して、Phase 2A-5c実装前監査から続きから開始して。**

That sentence plus this repository document is the handoff point.
