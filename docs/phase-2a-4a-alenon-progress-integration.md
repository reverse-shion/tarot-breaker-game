# TAROT BREAKER — Phase 2A-4a Alenon Progress Integration

Status: DESIGN / ARCHITECT COMPLETE — IMPLEMENTATION NOT AUTHORIZED BY THIS DOCUMENT

Risk: HIGH — Persistence / Progress / Save, reload behavior, Alenon entry behavior

Architect baseline at authoring: 26ccdff31d2509f687ef9c68d0e723c2d0f95dc4

Important: the SHA above records the investigated baseline only. Before implementation, fetch latest main, re-read AGENTS.md, docs/regression-lock-v1.md, docs/delegated-development-v1.md, and docs/change-risk-device-gate-v1.md, then revalidate every FACT and expected touchpoint below. Never implement against this historical SHA if main has moved.

## 0. Purpose

Phase 2A-4a is the first atomic runtime integration of the already-built Progress v1 core.

It has one product goal:

Persist completion of the Alenon prologue and let Alenon restore that completed state after reload without replaying the prologue, while preserving all existing Alenon gameplay, audio, Orb trigger, PAD return, route, collision, movement, dialogue, and story contracts.

This phase is intentionally Alenon-only. It is not the general Save/Continue release.

## 1. FACT — current repository state at the Architect baseline

### 1.1 Progress Core exists but is dormant

progress.js explicitly declares itself dormant and no map currently imports it.

Progress v1 storage contract:
- key: tarot-breaker:progress-v1
- version: 1
- initial checkpoint: { mapId: "alenon", spawnId: "intro" }
- initial completed events: []
- initial companion: not_joined

Existing API:
- load()
- getCheckpoint()
- getCurrentState()
- isEventCompleted(eventId)
- completeEvent(eventId, checkpoint)
- commitArrival(edge)
- setCompanion(status, checkpoint, reason)
- resetGame(actionToken)

Storage failure already degrades to volatile in-memory progress; diagnostics must not stop gameplay.

### 1.2 Route Registry already defines the Alenon semantic contract

route-registry.js already defines:
- map: alenon
- spawn: intro
- event: alenon_prologue
- event checkpoint: alenon / intro
- prerequisites: none

The title → Alenon route is already represented as source title, destination alenon, spawn intro, reason title_start.

Phase 2A-4a must reuse these semantic IDs. Do not create duplicate IDs or coordinate-based save schema.

### 1.3 Current Alenon completion is runtime-only

In alenon.html, the prologue currently becomes complete only at the authored end:
- final scripted walk completes
- story.completed = true
- story.locked = false
- story-running is removed
- control returns to the player

There is currently no Progress v1 write at that boundary.

This exact true end of the authored prologue is the only approved Phase 2A-4a event-completion boundary.

Do not save alenon_prologue when the page loads, tarot overlay closes, map first becomes visible, Orb anomaly changes, audio starts, a timer expires, or the player merely spawns.

### 1.4 Existing bypass authority is URL/runtime based

Current Alenon storyBypass includes Landing return, edit/object/collision modes, and skipPrologue=1.

skipPrologue=1 is an existing runtime/debug bypass and is explicitly not durable completion authority in current tests.

Phase 2A-4a must not turn skipPrologue=1, from=..., editor modes, or legacy journey state into proof that alenon_prologue was completed.

### 1.5 Existing Orb Trigger Re-arm is protected

Current constants:
- enter radius: 118px
- re-arm radius: 154px

At intro position (716,330), Shion begins inside the outer Orb radius. resetPlayer() therefore disarms the Orb until the player physically exits beyond 154px.

Existing contract:
- spawn inside → disarmed
- waiting → no prompt
- exit >=154px → armed
- re-enter <=118px → prompt
- no time-based re-arm

Phase 2A-4a consumes this behavior; it does not rewrite it.

### 1.6 PAD return remains separate

?from=landing-return currently bypasses the prologue, enters mounted/landing at the lower PAD, restores normal Alenon Wind and Orb ambience, and reuses landing/dismount behavior.

Progress integration must not replace or reinterpret this return path in 2A-4a.

### 1.7 Legacy progress remains non-authoritative

Existing progress-legacy-guard tests establish that URL query parameters and legacy journey data do not become Progress v1 authority and do not write Progress v1.

## 2. Approved product behavior

### A. First play / no valid Progress v1

Existing Alenon prologue behavior remains visually and narratively unchanged.

Initialize Progress only through the existing Progress Core contract; do not create another save schema.

At the true end of the prologue, mark:
- completed event: alenon_prologue
- checkpoint: alenon / intro

### B. Reload after durable completion

When valid Progress v1 says alenon_prologue is complete at checkpoint alenon / intro:
- do not replay the prologue
- restore normal post-prologue Alenon state
- restore normal ambience through existing validated playback paths
- use existing semantic intro spawn; invent no new coordinate/spawn ID
- Orb begins suppressed when spawn is inside its protected radius
- waiting does not open Orb
- physical exit >=154px then re-entry <=118px opens Orb

This is a resume, not a new story branch.

### C. Storage unavailable / write failure

Progress failure must not make the map unplayable.

If completion cannot be durably written:
- current play may continue using existing volatile Progress behavior
- do not claim durable Continue/save authority
- do not block controls or map transition solely because persistence failed
- do not destroy older confirmed durable bytes

### D. Invalid / unsupported Progress

Do not guess, migrate, repair, or reinterpret the record in 2A-4a.

Invalid/unsupported data is not completion authority. If current architecture cannot safely choose entry behavior without a new product decision, STOP rather than invent one.

## 3. Explicitly OUT OF SCOPE

This phase does not authorize:
- Continue button or Save UI
- title-screen UX changes
- save slots or manual save
- exact coordinate saving or interval autosave
- Landing/Garden/Companion Progress integration
- landing_devil_memory, garden_shiopon_meet, or garden_lumiere_gate integration
- route architecture rewrite
- removal/replacement of map-journey.js
- legacy journey migration
- story/dialogue/camera/timing changes
- collision/navigation changes
- PAD mechanics changes
- Orb audio proximity changes
- Orb interaction radius/re-arm changes
- Audio element/source/native playback/mix changes
- refactoring alenon.html merely because it is large
- new spawn IDs/checkpoint schema
- Regression Lock changes

If implementation appears to require any of these, STOP.

## 4. Integration boundary

Implementation should be an adapter between existing Alenon runtime state and existing Progress v1.

Progress owns durable/volatile progress, completed-event state, and checkpoint state.

Alenon continues to own story playback/timing, audio, movement, Orb interaction, PAD behavior, collision, and visuals.

Progress observes/restores semantic state; it must not take control of those systems.

Expected minimum touchpoints, subject to latest-main revalidation:
1. Load route-registry.js before progress.js on Alenon.
2. Create one Progress instance for the page.
3. Resolve Progress v1 authority before deciding whether normal Alenon entry plays/bypasses prologue.
4. At true prologue completion call completeEvent("alenon_prologue", {mapId:"alenon", spawnId:"intro"}).
5. On valid completed resume initialize existing post-prologue state and normal ambience without replaying prologue.
6. Leave Landing-return on its existing dedicated path.

Do not duplicate progress.js validation inside alenon.html.

## 5. Entry authority matrix

| Entry | Authority | Required behavior |
|---|---|---|
| valid Progress; prologue incomplete | Progress v1 | normal prologue |
| valid Progress; prologue complete; checkpoint alenon/intro | Progress v1 | completed resume; no replay |
| no Progress v1 | none | first-play behavior; initialize only through Progress Core |
| storage unavailable | durable unavailable | playable; no false durable authority |
| invalid/future Progress | invalid | never infer completion; existing guard contract or STOP |
| skipPrologue=1 only | NOT durable | preserve debug bypass; no completion write merely from query |
| from=landing-return | existing route | preserve PAD return; no reinterpretation |
| edit/object/collision | tooling | preserve bypass; no durable completion |

Do not introduce a second source of truth where URL/query state overrules valid Progress v1 for normal gameplay.

## 6. New Game boundary

progress.js exposes resetGame(actionToken), but 2A-4a does not authorize title New Game/Continue redesign.

Therefore:
- do not invent title interaction
- do not clear a durable save merely because title route opens
- do not call resetGame() on every Alenon load
- if an unambiguous deliberate New Game action requires title UX changes, keep that wiring outside 2A-4a and STOP/report the dependency

The goal is Alenon event persistence/resume, not title save management.

## 7. Required automated tests

At minimum:
1. First play: no completion at load; prologue required; completion written only at true end.
2. Completed reload: no replay; post-prologue/unlocked; checkpoint remains alenon/intro.
3. Orb: initial disarm; waiting silent; 154px exit re-arm; 118px re-entry opens; no timer re-arm.
4. Audio: completed resume requests normal Wind + Orb through existing paths; existing prologue audio tests unchanged; no duplicate audio path.
5. PAD return: landing/dismount, bypass, audio restore, no immediate Orb/reboard regression.
6. Authority: skipPrologue alone cannot create durable completion; legacy cannot create Progress completion; malformed/future save cannot become authority.
7. Storage failure: gameplay continues; volatile contract applies; prior durable bytes remain.
8. Full current regression gate.

Never delete, skip, rename, weaken, or baseline a test merely to pass.

## 8. Required adversarial Reviewer questions

Reviewer must try to disprove safety:
- Can reload replay the prologue after durable completion?
- Can reload auto-open Orb?
- Can waiting re-arm Orb?
- Can skipPrologue accidentally create a save?
- Can Landing return be mistaken for intro resume?
- Can Progress load happen after prologue scheduling already starts?
- Can resume start audio twice?
- Can localStorage failure leave controls locked?
- Can invalid/future data look completed?
- Can Progress bypass existing iPhone audio unlock?
- Did implementation touch story, timing, collision, movement, route, PAD, or protected audio outside Scope?
- Did a known failing test retain its name while its failure mode worsened?

Unresolved locked-behavior risk = STOP.

## 9. Device Gate — HIGH

Target: iPhone Safari / same class of iPhone environment as existing Alenon PASS.

Device A — first completion:
1. Official Title → TOUCH TO START → Alenon.
2. Existing prologue plays normally.
3. Wind / Orb / anomaly / gust / restoration remains normal.
4. Finish prologue and regain control.
5. Reload after completion.
6. Prologue does not replay.

Device B — resumed Orb:
1. After completed reload, wait at least 5 seconds without moving.
2. Orb interaction does not open.
3. Walk outside re-arm boundary.
4. Return to Orb.
5. Interaction opens normally.

Device C — resumed ambience:
1. Wind audible after completed reload.
2. Orb resonance follows existing hall/proximity behavior.
3. Relative balance remains acceptable; no obvious duplicate playback.

Device D — PAD return:
1. Alenon → Landing → Alenon through existing route when reachable.
2. Landing/dismount normal.
3. Wind and Orb restore.
4. No immediate Orb interaction or PAD reboard.

Record device/browser, short route, PASS/FAIL, and observed difference.

No merge while required Device Gate is PENDING.

## 10. STOP conditions

STOP if:
- latest main invalidates FACT assumptions
- a Regression Lock must change
- title/New Game product decision becomes necessary
- Progress must rewrite Audio/Trigger/Route/Collision/Movement/Dialogue/Story/PAD
- resume requires a new spawn/coordinate
- candidate adds a new test failure
- known-failure evidence worsens
- unexplained iPhone audio/trigger difference appears
- storage failure blocks gameplay
- query parameters would become durable authority
- Scope expands to Landing/Garden/Companion

Do not solve STOP by broadening Scope.

## 11. Delegated execution when activated

When the user later starts Phase 2A-4a:

1. Architect revalidation: latest main, repository contracts, compare code to this spec, update FACTs, STOP on product change.
2. Implementer: dedicated branch, smallest diff, required tests, no merge authority.
3. Reviewer/QA: independent adversarial review, full applicable regression checks, no silent repair.
4. CI: targeted + full available suite; no new failure.
5. Device Gate: HIGH persistence/reload checks above.
6. Merge: only Reviewer PASS + CI PASS + required Device PASS; re-check main compatibility immediately before merge.

## 12. Definition of Done

DONE only when:
- progress.js is genuinely used by Alenon runtime
- alenon_prologue persists at true completion
- completed reload does not replay prologue
- resume uses existing alenon/intro checkpoint
- Orb re-arm unchanged and device-PASS
- Wind/Orb/prologue audio unchanged and device-PASS
- PAD return unchanged
- storage failure does not stop gameplay
- URL/debug/legacy state never becomes durable completion authority
- no Landing/Garden/Companion Progress work enters Scope
- no new regression failure
- Reviewer PASS
- CI PASS
- Device Gate PASS
- PR merged through delegated workflow

## 13. Non-goals reminder

This phase answers only:

"Has the Alenon prologue been completed, and can that completed Alenon state safely survive reload?"

It does not decide title save selection, save slots, exact player position, every-map resume, or whole-game companion restore.

## 14. Architect conclusion

At baseline 26ccdff31d2509f687ef9c68d0e723c2d0f95dc4, the repository already contains the semantic Progress v1 core, route/event IDs, storage-failure behavior, and protected Orb re-arm behavior needed for an Alenon-only integration.

The main risk is not creating Progress state. It is connecting durable completion early enough to control Alenon entry without changing protected audio, trigger, PAD-return, or title semantics.

Phase 2A-4a is feasible as an atomic HIGH-risk phase, but implementation must begin with latest-main revalidation and must STOP rather than invent a title/New Game policy.
