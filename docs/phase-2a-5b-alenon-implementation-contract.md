# Phase 2A-5b — Alenon resume implementation contract

Date: 2026-10-01 JST. Baseline main: `aa3e221c65fe8e07c039aae057ec6507c7fd71ad`.
Branch: `phase-2a-5b-alenon-resume`. Risk: **HIGH**.
Status: design handoff; implementation/CI/device evidence is not yet recorded.

## FACT / UNKNOWN / PROPOSED

FACT: main passes all 230 tests with zero known exceptions. `progress-resume.js` validates all five Continue checkpoints but no production page imports it. Current `alenon.html` supports implicit completed `alenon/intro` resume; it resets first-play Progress on an ordinary none/unavailable load. It does not support safe ground `pad_return` Continue. Its ordinary Landing return arrives mounted and uses the existing landing/dismount animation. Sprite preloading currently resolves on image failure, and ordinary movement intentionally starts without waiting for collision. These ordinary behaviors are preservation constraints, not readiness evidence for new Continue.

FACT: Alenon itself does not read Journey facts. Landing reads `landingMemoryDone` and `companion`; Garden reads `gardenStory`. The Journey singleton persists to production sessionStorage. A global restore previously suppressed fresh-route events and was reverted. Continue hydration must therefore be scoped, exact and isolated.

UNKNOWN: exact candidate iPhone/iPad spawn, sound and touch behavior until human device verification. No historical PASS transfers to this build.

PROPOSED: implement only the real Alenon Continue receiver, exercised through registered development checkpoints and injected sandbox storage. Do not enable a public Continue URL or title button. All checkpoints execute the actual Alenon player, prologue, Orb, PAD and audio runtime, not a recreated preview.

## WORKING and LOCKED scope

WORKING: registered isolated Alenon Continue context; exact v1 history/companion projection; strict readiness; ground spawn; dev-only diagnostics/error/retry; real-runtime tests and developer checkpoint registration.

LOCKED: normal Title→Alenon boot, ordinary implicit intro resume, normal Landing→Alenon mounted return, all Landing/Garden runtime, native Wind/Orb playback and gesture retry, authored story/dialogue/timing/Devil asset, Orb 118/154 hysteresis, normal PAD animation/900ms cooldown, movement/camera/collision/layout, VGC-001 through VGC-007. No global hydration, cross-map source activation or public persistence changes.

Out of scope: Landing/Garden Continue, title selection/New Game UI, arrival handoff activation, schema migration, Progress core retry API, legacy cleanup and Star Gate activation. User authorized the next incremental Alenon phase; public Save release remains a later phase.

## Entry and storage isolation

Before gameplay edits, register event `alenon-resume` and segment `alenon-resume-entry` as NOT TESTED, `productionEnabled:false`, in `event-contracts.json` and document it in `docs/EVENT_CONTRACTS.md`. Do not alter the preflight guard. Run `node scripts/event-preflight.cjs --target alenon-resume-entry` after registration, record output, and only then edit runtime. Checkpoint registration must describe actual entry action/signal/receiver and first runtime state, required modules, spawn, temporary state and forbidden production writes.

The Alenon page may load the checkpoint registry and resume adapter to detect an explicit registered `?dev=` request. These imports must have no browser-storage, navigation or clock side effect. Unknown dev identifiers and combinations with `from`, `skipPrologue`, edit/objects/collision must not fall through to ordinary boot or reset production data; show a bounded verification error. No dev request must retain its exact current boot path. Do not load the registry in normal `index.html`.

Provide at least four real checkpoints:

| id | valid temporary v1 facts | initial behavior |
|---|---|---|
| `alenon-resume-intro-incomplete` | intro; no completed events; not_joined | spawn locked; run authored prologue from its beginning after existing local gesture |
| `alenon-resume-intro-complete` | intro; alenon_prologue; not_joined | ground spawn, no prologue; normal ambience requested through existing functions |
| `alenon-resume-pad-return` | pad_return; alenon_prologue; not_joined | stable ground behind PAD; no landing replay |
| `alenon-resume-pad-return-waiting` | pad_return; all four current event ids; waiting_at_landing | same Alenon ground state; Shiopon absent locally; exact waiting/history preserved |

Every fixture passes `validateRecord()` and `resolveContinue()` independently. The adapter accepts an injected Progress load result/storage; URLs choose a registered temporary scenario, never grant production event completion. The receiving context must be `entryKind:continue`, map alenon, allowed spawn and exact normalized history. Other-map contexts fail before input/trigger.

Use a distinct dev session namespace per checkpoint, with an injected key-remapping storage backend. Seed bytes may be supplied by an immutable in-memory fixture fallback without writing storage on boot. A real completed event may write the dev namespace at the existing completion boundary, so reloading that checkpoint exercises real saved completion. Reading Continue does not setItem/removeItem/resetGame/commitArrival in either dev or production storage. Production Progress bytes, production Journey bytes, settings and editor keys remain untouched, including failure paths. Dev storage read failures must not silently reset or switch to a production backend. Failed dev writes report nonpersistent status; no production retry/reset is allowed.

Create a detached receiver-local compatibility projection only in explicit Continue verification. Alenon imports `map-journey.js` but does not consume its facts, so do not replace its global singleton or write it merely to prepare future pages. Do not change `map-journey.js` normal semantics or production session state. Derive exactly:

* `landingMemoryDone = completedEvents.includes('landing_devil_memory')`;
* `gardenStory = {shioponDone: has('garden_shiopon_meet'), lumiereDone: has('garden_lumiere_gate'), joined: has('garden_shiopon_meet')}`;
* `companion = null` for not_joined, `{mode:'waiting'}` for waiting_at_landing. Alenon joined_with_shion is rejected by the v1 validator. Do not carry arbitrary old coordinates or unrelated Journey fields into this new context.

Stale legacy true values must become false/null in this local projection when v1 says incomplete; no OR merge. Complete the projection before the first trigger evaluation. The receiver itself must accept a detached validated context, not legacy state. Local `story.completed` follows only `alenon_prologue`; `orbInteraction.hasInspected` is transient inspection state and must not be invented from the prologue completion. The projection is coverage for exact Continue authority, not a claim that later pages have been wired.

Isolated verification must not escape into a normal page and pollute progression. At the dev-only cross-map departure boundary show an explicit verification-complete/status notice and keep the sandbox on Alenon; normal departure URL/timing remains unchanged. This boundary guard applies only to sandbox departure, after testing local PAD controls, not normal routes. This phase does not claim a complete cross-map Continue experience.

## Readiness and spawn

Continue remains locked until authored layout is applied, required world images and actor sheets have actually loaded/decoded successfully, collision JSON yields valid nonempty finite polygons, and the selected authored spawn is walkable. Use separate strict Continue readiness helpers; do not change the existing ordinary sprite-error tolerance or prologue/collision boot sequence. Image error, empty/invalid collision, failed fetch and unsafe spawn must leave controls/triggers locked and display an observable retry plus ordinary title link. Do not mark readiness after a timer or merely after Promise settlement.

`intro` uses current `SHION_SPAWN` (716,330). `pad_return` uses the existing post-dismount candidate `{x:layout.pad.x, y:layout.pad.y-PAD_DISMOUNT_OFFSET_Y}`. Require this candidate itself to be walkable; no arbitrary nearest point or authored collision edits. Reset target, stick/key movement, frame/animation and ride state. PAD Continue starts ground with lift zero, homeArmed false and existing cooldown. Do not call finishPadLanding to obtain spawn because it plays landing audio. Reuse constants and coordinate semantics without executing flight/landing effects.

At resolved spawn, initialize Orb armed to distance>=154. Inside154 remains unarmed indefinitely until a real exit>=154; entry<=118 thereafter prompts normally. Preserve existing proximity code and never add timer re-arm. Place/render player and sync existing camera before unlocking. `intro` incomplete remains story-locked until the authored prologue completes. Complete Continue and pad_return request ambience through existing start functions and local gesture unlock handlers; do not create replacement media/AudioContext paths.

## Arrival and retry decision

Defer the 5a arrival-handoff activation. Landing has no integrated sender in this task, and an artificial isolated receiver would not prove real Landing arrival. Existing normal return continues with existing ownership and no new Progress arrival write. Do not expose or describe that missing connection as completed. Continue never commits arrival. The 5a volatile-arrival retry limitation is consequently unreachable here; no core retry API or Progress schema change is justified.

## Expected files and tests

Expected runtime diff: `alenon.html`, new `alenon-resume.js`, `dev-checkpoints.js`, `event-contracts.json`. Documentation: this contract, `docs/EVENT_CONTRACTS.md`, concise actual evidence/results. Tests: new `tests/alenon-resume.test.cjs`, new real-page/runtime harness if needed, registry/entry coverage, and narrowly updated prior dormant-only import assertion in `tests/progress-resume.test.cjs` to permit the authorized dev-gated Alenon import while proving other pages remain unconnected. Existing Alenon Progress assertions may be updated only to express preservation of ordinary branches plus new explicit Continue isolation; keep every meaningful regression requirement. Do not broaden source edits into `progress.js`, `map-journey.js`, Landing, Garden, audio or collision JSON.

Automated acceptance must execute production page functions or their shared receiver, not only string matches:

1. All four checkpoints, v1 validation, non-Alenon/malformed/unsupported/unavailable rejected; load alone performs zero writes.
2. Stale legacy conflict ignored/cleared exactly in receiver-local projection; production Journey singleton and Progress bytes unchanged.
3. Deferred collision/images keep controls, Orb, PAD and prologue locked; failures observable, no reset; resolved safe spawn precedes first trigger.
4. Complete intro/pad never replay prologue; incomplete intro executes real runPrologue and persists only at its existing authored completion boundary to dev storage. Reload reflects that completion without a production write.
5. pad_return starts ground at authored safe location without land audio, flight animation or immediate boarding; reset retains safe Continue spawn.
6. Orb inside154 waiting then exit>=154 and entry<=118; no time re-arm. Native ambience and gesture-local retry preserved.
7. Unknown dev/combined bypasses fail safely; ordinary Title, return, skip/editor routes remain unchanged. Sandbox departure cannot become ordinary Landing boot.
8. Instrument production storage access during dev path: no production Progress read/write fallback and zero production writes. The existing Journey script may still perform its unchanged read on import; that read supplies no Continue authority and does not authorize a write. Throwing production setters must not disrupt sandbox gameplay. Invalid data/readiness retry does not manufacture history or overwrite bytes.

Run new tests, Progress/core/legacy/resume, Alenon audio/trigger/Progress, map-roundtrip, gameplay/event/development/checkpoint/integration/merge contracts and full suite. Main is 230/230, so any failure is a new failure. Run syntax, asset validators and `git diff --check`; compare actual candidate to refreshed main and independent Reviewer must inspect the real diff and error paths.

## Device / integration / merge gates

Device Gate **REQUIRED**, exact candidate SHA. No AI-generated PASS. PR metadata: `SCOPE: PHASE_2A_5B_ALENON_RESUME`, `DEVICE_GATE_REQUIRED: YES`, `DEVICE_RESULT: PENDING` until human evidence. Do not use FOUNDATION or change the guard. Prepare the complete tested/CI-green candidate and immutable URLs before requesting human confirmation.

Isolated iPhone/iPad Safari check: four dev entries; unfinished intro Devil prologue and its reload suppression; completed intro no replay; pad ground safe and no landing replay/immediate reboard; waiting companion absent; tap/joystick functional; Wind audible and Orb hall-only with existing balance after local gesture; Orb inside154 stays silent/prompt-free until real exit and reentry; dev reload, error/retry and no production-data pollution. Verify candidate viewport visually. No unfinished Star Gate UI may appear.

Integration check on the same exact candidate: ordinary title→fresh Alenon Devil/prologue/Orb→PAD→Landing and return to Alenon; mounted arrival/dismount, lockout and ambience preserved; no unintended replay. Use a fresh normal session separate from sandbox. This focused integration is required; unrelated Garden event replay is not requested unless actual diff can affect it.

Independent code review and every executable automatic check precede Device URLs: syntax/assets, all tests, gameplay/event/checkpoint/integration contracts and applicable validation workflows must pass on the exact candidate. The Device Registry release guard is a separate human-evidence gate: a draft PR correctly marked `DEVICE_GATE_REQUIRED: YES` and `DEVICE_RESULT: PENDING` is expected to remain BLOCKED there until human verification. This expected pending-evidence block is not a runtime/test failure and must not be represented as overall release CI PASS. Do not change/weaken the guard, fabricate registry evidence, mark NO or declare PASS to break this dependency cycle. Review may conclude CODE/AUTOMATED PASS with RELEASE STOP: DEVICE PENDING, then present immutable candidate URLs for the human checks.

Merge waits for explicit isolated and integration human PASS records, the now-satisfied Device Registry/release checks and applicable merge authorization under repository contracts. Contract/status locks may only be upgraded using that evidence. No unresolved product decision exists in this limited isolated Alenon implementation; technical isolation does not approve public title/Save UX.
