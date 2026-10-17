# Phase B — legacy Continue evidence / rollback compatibility

Status: test-only evidence complete; Device Gate PENDING; RELEASE HOLD.

## Scope and fixed references

- Main baseline: `4d95d98bcac7723dfd006931400bf8b86ad212e0` (origin/main at inspection).
- PR #167 / fixed Runtime: `5a3499a6343a30885e042353e8fa921a63adc5c7`.
- Additive-test risk: NORMAL; runtime/device behavior unchanged. This does not discharge the existing runtime Device Gate.
- WORKING: one additive case in `tests/star-gate-public.test.cjs` and this report.
- LOCKED: all runtime, schema/key, QA saves/hosts, historical assertions, validators, Device Registry, main and PR #167.
- No recovery build is implemented or proposed for merge by this change.

## New evidence

`legacy completed save launches through Public Continue, rebinds Garden authority and migrates B exactly once`

Reuses the existing public-observer harness for old completed-save bytes and scene/image doubles. Executes actual `route-registry`, `progress`, `progress-resume`, `public-continue`, `garden-resume`, `garden-public-continue`, `map-journey`, `garden-progress-observer`, `star-gate-public` and `garden-east-passage` modules in a Node VM.

The case verifies, in order:

1. Gate completion exists and the independent Star Sand event is absent; routeKnown is false.
2. The real controller inspects and launches `./index.html?entry=continue`; navigation is captured, not performed.
3. Garden receive and fresh revalidate succeed; Progress instances differ.
4. Real Journey projection preserves an unrelated session field, restores history/companion, and authority rebind accepts only the fresh Progress.
5. Before restoration, durable bytes are unchanged and writes are zero.
6. prepareRestoration / restoreCompleted writes exactly once. A separate Progress reader confirms the exact old record plus the new event; only the rebound authority gains it. routeKnown is true.
7. Repeated restoration and a fresh observer do not add writes or alter migrated bytes.

All storage is memory-backed and key-checked. No real origin, localStorage, sessionStorage, QA save or browser is accessed. This is **Node module integration**, not browser E2E or Safari acceptance. Image, scene and navigation remain doubles; actual game boot is not executed by this case.

Validation: targeted file 15/15 PASS; full regression 537/537 PASS (536 existing + 1 new), failures/skips/cancellations 0; regression baseline new=0. Syntax and asset/background/audio validators PASS; diff check PASS. Local Node v24.19.0. The sandbox initially denied child-process spawning (EPERM); the unchanged regression runner passed with approved execution permissions. No validator or baseline was changed.

## Fixed-main rejection — read-only findings

Fixed main's `route-registry.js` does not register `garden_star_sand_route_known`. `progress.js.validateRecord()` rejects any unregistered completedEvents entry as `unknown-event`, before prerequisite normalization/checking. `load()` returns `status: invalid`; the Public Continue controller cannot launch. This applies at any otherwise valid checkpoint containing the ID, not only Garden. Other malformed fields can produce an earlier validation reason.

A disposable Node VM loaded the four unmodified fixed-main modules from `git show` (registry/core/resume/controller). The same valid old Garden record loaded successfully; adding only the new ID yielded `unknown-event`, Continue invalid, zero writes, zero navigations and unchanged bytes. This probe is not an added regression case or recovery-build validation.

The failure is strict recognition, not proven data deletion. A simple old-main redeploy leaves affected saves unreadable to Continue. Deleting, resetting, stripping the ID or falling back to legacy Journey is not an acceptable recovery.

## Smallest proposed compatibility-preserving recovery build

For separate authorization only: fixed main plus recognition of the existing new event in `route-registry.js`, using exactly the candidate metadata (map `star_gate_garden`, spawn `south_gate`, requires `garden_lumiere_gate`). Preserve existing IDs, schema v1, storage key, strict validation and unknown-ID rejection. `progress.js` itself need not change. Fixed main's exact-registry test would need the corresponding expected-ID update; compatibility checks belong to that separately authorized work.

This is the minimum **save-read compatibility** design, not an implemented or validated recovery artifact. It does not transplant the candidate B-line feature into old main or certify gameplay equivalence. Whether reverting feature behavior is acceptable remains a separate release/recovery decision.

## Compatibility HOLD removal conditions

Before treating recovery as available, separately authorize, build and identify an immutable recovery SHA/artifact, then:

1. Compare with fixed main; review the bounded registry/test delta and unchanged save format/key. Retain strict rejection for unrelated unknown IDs and invalid records.
2. In isolated disposable storage, verify old saves and new-ID saves at supported checkpoints/companion states load and resolve/launch through the official Continue flow without deleting or stripping history.
3. Verify normal writes, independent readback, reload and supported map roundtrips retain the new ID and old facts; write/read failure paths preserve evidence and do not claim success.
4. Run relevant and full regression/validation; review exact failures, not only counts. Document artifact identity, delivery/cache consistency, recovery operation and return-to-candidate procedure.
5. Obtain the applicable owner-observed device evidence using an approved isolated delivery path and explicitly approved synthetic saves; protect QA-A and production data. Obtain explicit recovery/release approval before deployment.

No recovery artifact, device compatibility result or deployment approval exists from this Phase B work. Keep compatibility unresolved until these conditions are met. PR #167 remains Draft; QA-B device acceptance remains pending. No merge, publication or Device Registry PASS is authorized by this report.
