# East passage durable proof repair — v1.2-C

Status: STOP / Draft / no main merge / no production release / new iPhone and independent Astra audit pending.

## Baselines and scope

Fetched main: `4d95d98bcac7723dfd006931400bf8b86ad212e0` (506/506 local regression).
PR154: `021ecc841cce18f48e5db1a1b5c7d5c257aeff22` (525/525 local regression).
PR156: `30f1973a85d8ed46a481ab9bd07347da1d138009`.
GitHub PR heads matched both requested SHAs at task start. Neither original branch is updated.

HIGH risk. WORKING: east B durable authorization, route-fact readback/migration, intersection-first call order, relevant regression tests. LOCKED: common Progress Core/schema, all story/Aftermath completion prerequisites/dialogue, rendering/actors/camera, input mechanics, collision JSON/assets, audio, title/Runtime Entry/Continue, authored B `(1398,740)→(1398,844)`, and existing route ownership. Preflight `garden-east-passage`: PASS (registration only).

## Confirmed cause and reproduction

`progress.js.persist()` treats a successful `setItem()` as confirmed memory; it intentionally does not read back. This core behavior is unchanged. Old `garden-east-passage.js.routeKnown(progress)` incorrectly treated `getCurrentState().persisted === true` and its in-memory route event as durable evidence. `ensureRouteKnown()` also returned immediately on an in-memory route flag.

Independent baseline failure injection: valid completed-gate bytes → load live Progress → complete route fact → setItem accepts → subsequent getItem throws. Result: `writeReportedPersisted=true`, `independentLoad=unavailable`, `memoryPersisted=true`, **`passageOpened=true`**. A stale read returning the pre-route save has the same incorrect authorization path.

## Repair

`routeKnown(storage)` creates a fresh read-only Progress reader on each actual B crossing. It requires a validated v1 record containing both gate completion and route knowledge. The live writer object is never its authority. No permission cache exists. Read exceptions, old/missing/invalid bytes and absent Progress Core close only B; diagnostics cannot stop movement.

`game.js.segmentClear()` now checks base collision, then B intersection, then durable authorization. Non-crossing movement never reads storage. The authored navigator, other actors and geometry remain unchanged.

`ensureRouteKnown()` independently reads/validates the saved completed gate before either accepting an existing route event or attempting its write, and retains independent post-write verification. Existing live Progress remains the writer so later normal route/checkpoint writes keep the new fact. Unconfirmed writer memory never grants passage. Verified already-migrated bytes incur no write.

## Evidence and integrity

Eight new cases: five durable-proof/game-guard tests and three public-observer readback/migration tests. Existing assertions/counts are retained; relevant fixtures now supply independent storage instead of memory-only writer snapshots. Write-success/read-throw is a separate regression. Old-save one-time migration, actual unfinished Aftermath, real completion, reload and typed Garden↔Landing routes remain covered. Actual game guard rejects repeated taps and sustained joystick after revocation. 1,000 non-crossing probes produce zero save reads; crossings reread and immediately reject revoked facts.

Local repair regression: 533/533, failures 0, skipped 0. Asset/background/audio validators PASS. CI exact-HEAD evidence is recorded in the Draft PR; do not infer an iPhone PASS from Node tests. No historic device record is upgraded. New iPhone persistence/reload, interrupted completion, migration, map roundtrip and repeated physical input remain required. QA WebKit diagnosis is independent and cannot be inferred from this repair.
