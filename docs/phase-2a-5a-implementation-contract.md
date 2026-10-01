# Phase 2A-5a — Dormant resume and arrival foundation

Baseline main: `f1688abc89f82ef159c7de88e21fbfb821fd4aeb`  
Branch: `phase-2a-5a-resume-foundation`  
Architect contract, 2026-10-01. Parent specification: `phase-2a-5-save-resume-spec-v1.md`.

## FACT / UNKNOWN / PROPOSED

FACT: `progress.js` validates schema v1, checkpoints, event dependencies and companion location. Its durable checkpoint and volatile current state are distinct. Duplicate arrival/event operations do not retry a failed write. `route-registry.js` defines five checkpoints and four non-title edges. No current page uses the proposed foundation.

FACT (history audit by coordinating agent): PR #33 bridge was added in `5775e7` and explicitly reverted in `46bf804` after a fresh-start regression. Its absence is deliberate; never reintroduce a global v1→Journey bridge. Attach the audited diff evidence to the implementation/PR report.

UNKNOWN: Actual safe coordinates, scene-ready boundaries, audio recovery and contextual old Journey hydration require each map integration. This dormant module does not repair Landing.

PROPOSED: Add one dependency-free UMD module, `progress-resume.js`, following existing exports. CommonJS imports existing registry/core; browser export `TarotProgressResume` requires explicit script inclusion. No storage access, random generation, clock call, navigation or other browser operation on import. All handoff storage/time/token dependencies are injected. No page includes this script in 2A-5a.

## Scope and protected systems

WORKING: Pure validated Continue contexts, an injected session handoff state machine, safe arrival orchestration, behavioral tests and documentation.

LOCKED: All existing runtime files, schema v1, route registry, HTML and production script imports, title UI, Journey, triggers, coordinates, dialogue, audio, camera, collision, controls, assets and event behavior. Do not edit `progress.js`. Do not change guards or baselines. Add `tests/progress-resume.test.cjs`; no existing test weakening.

This phase defines semantic state and coordinates no actual player/companion. Page hydration and real scene readiness belong to 2A-5b. New Game and temporary cross-page play are deferred. A future map integration must not activate the new path without satisfying the parent spec.

## Resume API

`resolveContinue(loadResult)` returns `{ok:true, context}` only for `status:"valid"` after independently calling `validateRecord(loadResult.state)`. All other statuses return `{ok:false, reason}` without a write. A forged `valid` label cannot bypass record validation.

Context is a detached deeply frozen object: `{entryKind:"continue", mapId, spawnId, entryFile, completedEvents, companion}`. It contains exact normalized v1 facts only. All five checkpoint pairs map through registry; Garden resolves `index.html` with explicit `mapId:"star_gate_garden"`, not a guessed title mode. Unknown inputs fail closed. Legacy Journey and URL input are not accepted. Reading never changes durable bytes.

## Handoff API and envelope

`createHandoffStore({storage, now, createToken})` returns frozen methods `issue({edge,state})`, `claim({token,destinationMapId,spawnId,state})`, and `commit({token,destinationMapId,spawnId,progress,readiness})`.

Dependencies: storage implements `getItem/setItem`, now returns finite millisecond timestamps, createToken returns an opaque nonempty string of at most 128 characters. Missing/throwing dependencies yield structured failure; never fall back to globals. Export one new isolated `HANDOFF_KEY`, not the production Progress key. Token is an attempt identity, not authentication or a source of event facts.

One envelope slot per tab session contains exact keys `{version:1, token, phase, issuedAt, expiresAt, edge, sourceState}`. Phase is `pending`, `claimed` or `committed`. Use a fixed exported TTL of 10 minutes, measured from issue; reject clock-before-issued, nonfinite timestamps, expiresAt not matching TTL, and expired envelopes. TTL is a technical stale-navigation guard and never a timer for gameplay/Orb. Validate all loaded envelopes, their sourceState with Progress validator, and full non-title edge with registry prerequisites. Canonical edge contains exactly its four identifying fields. The source checkpoint map must match the edge source. Validate the prospective destination record (same facts, destination checkpoint) before issue; do not implicitly change companion mode.

`issue` rejects a live pending/claimed slot, rejects token reuse, and never overwrites corrupt/unreadable evidence automatically. A committed/expired valid slot may be replaced by a new distinct token. Inputs and returned receipts are detached/frozen. A successful setItem is necessary for issuing usable handoff evidence.

`claim` requires exact token and destination/spawn, plus independently validated current durable source state equal to envelope sourceState. It writes `claimed` before reporting claim success. Re-claim after reload is idempotent. Do not delete the slot at claim. Committed replay may be acknowledged only when current state exactly equals the validated expected destination state; no route/trigger/companion side effect repeats. A mismatching token, destination, prerequisite, source or record returns a failure without modifying Progress.

Session scope deliberately supports one logical transition in one tab. Separate sessionStorage tabs have separate evidence; a tab without the copied envelope cannot claim an URL token. Browsers may clone sessionStorage into a duplicated tab, so this is not a cross-tab exactly-once transaction or security boundary. Both copies may independently validate the same logical attempt; identical destination acknowledgements are harmless. Do not invent global locking or claim replay prevention across cloned tabs. Actual integration must re-read durable state before commit and reject competing changed state. Cross-tab atomic coordination is out of this phase.

## Arrival readiness and commit

`readiness` requires all explicit booleans true: `assetsReady`, `collisionReady`, `spawnResolved`, `historyRestored`, `companionPlaced`, `arrivalSettled`. These are caller attestations of real readiness; the module does not discover coordinates or simulate readiness with elapsed time. Future map tests must prove their actual callback ordering. Missing or false readiness returns `not-ready` and never calls Progress.

`commit` requires a valid matching claimed envelope, a Progress instance exposing `getCurrentState()` and `commitArrival()`, and a persisted current state. Validate the returned current record independently. It must equal sourceState before the first arrival call, or expected destination for idempotent recovery after Progress persisted but writing the committed receipt failed. No event history/companion OR merge. Revalidate destination before proceeding.

At source, call existing `progress.commitArrival(edge)` only after readiness checks. Only `persisted:true` plus a validated exact expected destination state authorizes marking the session envelope committed. A false persisted outcome keeps evidence claimed, old durable checkpoint unchanged and returns a structured nonpersistent outcome. Never infer success from volatile state. A thrown validation/storage exception returns a bounded failure without destructive reset.

If Progress write succeeds but session committed write fails, return a result that distinguishes durable arrival success from receipt failure. The next claim/commit with persisted exact destination recovers by finishing the receipt without calling commitArrival again. Do not describe this as an atomic write across storage systems.

## Failure/retry boundary

No temporary state is transferred across pages in 2A-5a. Same-page failure followed by a volatile current state returns `persistence-retry-required`; it does not call duplicate `commitArrival`, resetGame or load (which would erase temporary state). Retry of the entire volatile candidate requires a narrowly validated core API in 2A-5b before activating pages. A page reload can load unchanged durable source state and retry the same unexpired claimed attempt after actual readiness. Mid-event/pad partial states remain unsaved. This is a deliberate deferred portion of parent section 9, not a claim that full Save/Continue recovery is complete.

## Acceptance tests

- Five checkpoint contexts, event prerequisites, all three companion states, detached/frozen objects, independent validation and no writes for Continue.
- Invalid/unsupported/unavailable/none load statuses; malicious status label, extra fields, contradictory history/location and legacy/URL omissions.
- Four allowed non-title handoff edges; invalid title/edge/source/destination/spawn/prerequisite/companion combinations rejected.
- pending→claimed→committed; exact token/TTL constraints; claim reload before commit; changed durable state; competing issue, corrupt slot, throwing/unavailable storage and cloned versus independent tab stores.
- Each missing readiness fact prevents Progress invocation. First durable success; duplicate callback no Progress/storage rewrite; stale token replay rejected.
- Failed Progress write preserves durable bytes and claimed receipt; volatile retry reports deferred requirement; reload from source retries safely.
- Durable arrival with committed-receipt failure recovers from exact destination without calling Progress again.
- Module import performs no storage/clock/token/navigation access; repository pages and production modules never reference new module.

Run meaningful new behavior tests, existing Progress/core/legacy/route tests, available full regression suite, JavaScript syntax, and diff check against latest main. Report existing failures separately. New failures STOP.

## Risk / device / merge contract

Risk: HIGH because the APIs concern Progress/Save. The full delegated pipeline and adversarial review apply. Device Gate is **NOT APPLICABLE to this exact dormant diff** only if review proves no production import, no existing runtime change and no browser operation on import. There is no reachable affected event to complete/reload or new player-visible route to smoke-test. This does not transfer Device PASS to later integration. All 2A-5b runtime connections require exact-candidate human device evidence under repository rules.

PR metadata must use `SCOPE: PHASE_2A_5A_DORMANT`, `DEVICE_GATE_REQUIRED: NO`, with this dormant rationale. Do not use `SCOPE: FOUNDATION`: `DEVICE_VERIFICATION_REGISTRY.md` and `device-registry-guard.cjs` classify root JS as runtime, even if dormant. Do not add a fabricated Device PASS or modify the guard. If actual implementation becomes reachable, writes browser storage by default or changes any existing runtime path, Device Gate becomes required and merge waits for real evidence.

No unresolved product choice exists in this limited scope. TTL, envelope version and injected technical APIs are implementation choices. Title selection/UX remains unapproved and untouched. This phase does not finish the full parent specification.
