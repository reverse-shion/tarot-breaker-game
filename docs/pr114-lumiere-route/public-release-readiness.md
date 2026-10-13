# PR114 public-release readiness audit — 2026-10-13

Audited GitHub candidate: 9af2fe4881537e178665d65394e76568f4564b2d.
Latest main fetched: 22c07ae94d7491c3818b57574da7ee3af12edfc4.
Tested local handoff runtime: 90fc05ea00c92406366e1d18b3ea34ae02282d29.
Scope: release-readiness audit and proposed next implementation contract only.
No gameplay edits, production activation, main merge or publication.

## Current gates

| Gate | Isolated event / PR151 integration | Public Star Gate release |
|---|---|---|
| CODE | GO, independent review | STOP: public adapter absent |
| TEST | GO, full486/486 with no skips/cancels/failures, validators PASS | PENDING: public activation/persistence tests not implemented |
| DEVICE | GO: actual Lumiere meeting and Home same-page retry/finish | PENDING: no new public-route candidate to verify yet |
| INTEGRATION | GO: merged into PR114, identical reviewed tree | STOP: VGC001 approval plus public implementation missing |

Existing automated normal-route regression tests pass. This is not an agent
browser measurement or a new human full-route PASS. Prior scoped device results
remain valid and must not be repeatedly requested merely for documentation.

## Concrete public release blockers

| File / lines at audited SHA | Reproduction / consequence |
|---|---|
| index.html166-181; stage3-dev-bootstrap.js6-11/86-89 | Load without a dev checkpoint, use the official Title -> Alenon -> Landing -> Garden route: event scripts/CSS/markup are not bootstrapped; completing Lumiere does not enable gate choice. This is the intentional VGC001 contract, not a regression. |
| star-gate-interaction.js4,9-10; star-gate-anomaly.js3; future-vision-audio.js3; star-gate-aftermath.js4 | Even adding ordinary script tags is insufficient: modules return without developer flags; interaction hardcodes DEV_HARNESS=true. No released activation owner exists. |
| game.js2008-2013,2106,2272 | Scene/Aftermath/cinematic APIs are exported only in stage3Dev; capture reads TarotStage3DevFixture.context. Ordinary entry has neither API nor fixture. Must derive production state from real actors/story, not fabricate a dev fixture. |
| route-registry.js25-44; garden-progress-observer.js83-108; star-gate-interaction.js181; star-gate-aftermath.js319 | Star Gate completion event is not registered. Only prior meetings are saved. Stage3 completion is page-local, Aftermath emits a notification without a durable observer. A gate-only toggle cannot guarantee one-time behavior after reload/Continue/map return. Executing Progress.isEventCompleted/completeEvent with garden_star_gate_anomaly throws ProgressValidationError unknown-event (progress.js173/177). |
| event-contracts.json1; docs/VERIFIED_GAMEPLAY_CONTRACTS.md VGC001/VGC006 | productionEnabled=false and unfinished-event suppression are still authoritative. Human completion of the isolated checkpoint is recorded in the Device Registry, not an implicit replacement of public activation contracts. |

## Proposed next implementation contract — awaits explicit product decision

Risk HIGH. Implement on a separate reviewed candidate targeting PR114; keep
main and deployment untouched. Request product-owner approval to treat the
Star Gate event as complete and replace VGC001 in the same reviewed change
that enables its normal-route implementation. A general instruction to move
on is not recorded as an explicit replacement of this locked contract.

Recommended player-visible behavior:
1. Existing Title/Alenon/Landing/Garden progression and initial dialogues stay
   unchanged. After real Shiopon/Lumiere completion and free controls, proximity
   offers the existing inspect/leave choice. Investigation requires explicit tap.
2. Preserve the verified event/Aftermath text, visuals, sound, timings, camera
   leases, recovery, delayed-callback guards and failure locks.
3. Mark durable garden_star_gate_anomaly completion only after the full
   Aftermath ends, departure is verified and controls/follow are restored.
   Stage3-session-ended alone must never prematurely consume durable completion.
4. Before that final completion, a full reload may restart from investigate
   after already-completed Lumiere. It does not resume an animation mid-frame.
   Home same-page recovery retains the existing explicit-retry safety protocol.
5. After final completion, reload/Continue/map return must suppress replay and
   restore the changed gate and Lumiere departure consistently with companion
   state. Old saves without the new event remain valid and unfinished.
6. Failed/unavailable storage must not strand scene/input/audio/camera ownership
   or falsely claim a durable save. Page-local completed state still prevents
   duplicate play; readback is validated before recording save success.

Minimum working scope: explicit normal-route entry owner and runtime bootstrap;
production Scene/P0 adapters without developer fixture authority; existing
interaction prerequisite/completion projection; registered stable completion ID
and observer-only save/readback at the final authored boundary; consistent
completion restoration; same-PR VGC001 replacement and release registry update;
new adversarial integration tests and isolated storage-safe candidate links.

Locked: all unrelated main gameplay, title/new-game reset, save migration/version
policy, Alenon/PAD/Landing route ownership, audio assets/mix, dialogue/story
content, collision/navigation, Lumiere art/hover, star-sand passage restriction,
baselines/validators/workflows. No unrelated refactor or normal-route dev flags.

Checks before integration: independent code review; full regression vs latest
main; old fixture isolation; fresh and already-completed route; missing/conflicting
entry/prerequisites; start/load failure; interruption and expired callbacks;
recovery failure; duplicate reports; Stage3 success with unfinished Aftermath;
completion write failure and readback; reload/Continue and map roundtrip;
then a focused iPhone check on the changed normal-route candidate. Previously
verified unchanged dev smoke is not requested again.

No public enabling implementation has been performed in this audit. Approval
of this implementation intent is separate from main merge/production publication.

## Independent read-only audit result

Reviewer independently confirmed full486/486 and targeted route/audio/Continue/contracts65/65 PASS, validators and checked runtime syntax PASS. No new normal-route regression found. Public-release readiness STOP for the concrete missing implementations above; this docs-only report GO. Two historical documentation EOF warnings exist in the full main diff and are unrelated to the new report. Recommended completion/reload behavior remains an explicit proposal, not adopted policy.
