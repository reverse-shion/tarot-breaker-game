# TAROT BREAKER — Event Development Contract

Status: ACTIVE
Authority: Human device verification is the release gate.

## Goal
Develop and repair events independently without destabilizing device-verified behavior, then connect verified events safely before main.

## Mandatory pipeline
MAIN BASELINE -> EVENT SANDBOX BRANCH -> DEV CHECKPOINT -> CI -> DEVICE VERIFY -> DEVICE VERIFIED/LOCKED -> INTEGRATION BRANCH -> CI -> INTEGRATION DEVICE VERIFY -> MAIN.

No gameplay/event experiment is implemented directly on main. Main receives an event only after its isolated behavior and its integrated route both pass the applicable gates.

## Event Sandbox
Each event is developed on a non-main branch. A sandbox may expose developer-only checkpoints. It must not make unfinished UI or behavior reachable on the normal route.

## Dev Checkpoint Contract
A checkpoint is a reproducible developer-only entry into a specific event or event stage.
Every checkpoint must define:
- checkpoint id and owning event;
- required scene;
- spawn/actor state;
- prerequisite Journey/story state;
- runtime modules required by the event;
- expected first observable behavior;
- forbidden durable writes.

A checkpoint is INVALID if it only renders the entry UI but cannot execute the real event runtime.

Developer checkpoints MUST NOT mutate production Progress/localStorage. Temporary state must be session/dev-only.
Normal gameplay MUST NOT depend on a checkpoint.

## Device Verification
Only the product owner's explicit real-device PASS may change a behavior to DEVICE VERIFIED.
Record:
- event/checkpoint;
- exact commit SHA;
- device verification result;
- observable behavior that passed.

DEVICE VERIFIED behavior becomes CONTRACT LOCKED. Later work must preserve its observable behavior.

If a change breaks a DEVICE VERIFIED behavior:
1. STOP the current feature work;
2. report which verified contract broke;
3. identify last known-good and first known-bad commits;
4. do not weaken/delete the protecting test;
5. repair the regression minimally;
6. require the relevant gate again before continuing.

## Integration Gate
Passing an event in isolation is not permission to merge it to main.
After isolated DEVICE VERIFIED:
1. connect it to preceding/following events on an integration branch;
2. test prerequisites, one-time state, return/re-entry, dialogue ownership, transitions and save/progress observation;
3. run all existing verified contracts;
4. perform real-device integrated-route verification;
5. only then may the PR to main be approved/merged.

## Scope Lock
Every change must name its WORKING behavior. DEVICE VERIFIED/LOCKED behaviors are read-only constraints unless the product owner explicitly reopens them.
Sharing a file with a locked behavior does not authorize changing that behavior.

## Test integrity
Tests represent product contracts, not implementation obstacles.
Never modify a test merely to make a new implementation pass.
A contract change requires explicit product-owner approval and replacement coverage in the same reviewed change.

## Status vocabulary
NOT TESTED -> IMPLEMENTED -> CI PASS -> DEVICE VERIFIED -> CONTRACT LOCKED -> INTEGRATED -> MAIN VERIFIED

DEVICE VERIFIED and CONTRACT LOCKED require human confirmation. CI cannot grant them.

## Merge rule
No event change goes to main when any of these is true:
- applicable CI is failing or missing;
- a previously verified contract regressed;
- event checkpoint cannot execute the real runtime;
- sandbox writes production durable progress;
- isolated Device Gate is not passed;
- integration Device Gate is not passed;
- the product owner has not approved merge.

## AI startup rule
Before gameplay/event work, an agent must read:
1. docs/VERIFIED_GAMEPLAY_CONTRACTS.md
2. docs/EVENT_DEVELOPMENT_CONTRACT.md
3. docs/DEVICE_VERIFICATION_REGISTRY.md
4. docs/AI_CHANGE_SAFETY.md

Conversation memory is never authoritative over these repository contracts.
