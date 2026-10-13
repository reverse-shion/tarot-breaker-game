# PR150 -> PR114 final technical integration review (2026-10-13)

Decision: **technical integration GO**. Main release remains PENDING.

| Item | Evidence |
|---|---|
| main | `22c07ae94d7491c3818b57574da7ee3af12edfc4` (unchanged) |
| Tested / owner-accepted runtime | `88c61140763f24aac41eceb8ab1e9d5bb2ddb531` |
| PR150 evidence HEAD | `d160f5e54b16de6367e8deb20e61ebb4581e34ee` |
| PR114 integration merge | `cada09483d16505fc8b0288c370ab41ac611ce54` |
| Merge parents | `d8bf38d93fd1676c75432e411b6d683e9f0a6846`, `d160f5e54b16de6367e8deb20e61ebb4581e34ee` |
| PR150 and merge complete tree | both `d2cc6192f3093fe4ec656581d76dbed3a346c138` |
| Accepted runtime -> merge | only Device Registry and device-pass-integration.md differ |

Runtime, images/audio/assets/CSS, tests, scripts and workflows are byte-identical
to the accepted runtime. No conflict resolution or new runtime change occurred.
The normal two-parent merge preserved both histories. PR150 is merged into
PR114; PR114 remains Draft. No main ref or production deployment was changed.

## Gate results

- CODE: GO. Independent read-only integrated review found no tree/code blocker.
- TEST: GO. Implementation and independent Reviewer each ran integrated
  regression: 478/478 PASS, fail/skip/cancelled/todo 0. Assets/background/audio
  validators and diff-check pass. main remains an ancestor.
- DEVICE: GO within the exact-runtime repair smoke accepted by the owner.
  No duplicate physical replay is required for identical executable bytes.
- INTEGRATION: GO for PR150 -> PR114 technical integration only.
- Normal-route / main release: PENDING; not inferred from the isolated smoke.

Remote Validate:
- Runtime #1749: SUCCESS, run 38375751014.
- PR150 evidence #1750: SUCCESS, run 38387531133.
- Integrated merge #1751: SUCCESS, run 38387771250.

Local PR150 Device Registry Guard and base-lineage guard: PASS.
Integrated main-lineage guard: PASS.

Event Safety / Main Merge Gate #654 (run 38387771765) is not green. Its
event snapshot used the previous PR114 metadata runtime 948fed1... and failed
Device Registry Guard because game.js/anomaly/interaction changed afterward.
Main lineage succeeded; the contract steps after the device step were SKIPPED
in that job, not remote PASS. The matching contracts are included in the local
478 tests and the successful Validate suite.

PR114 metadata is now aligned to accepted runtime 88c6114, but deliberately
keeps broad DEVICE_RESULT PENDING. Running the guard with the current real
body fails with: `Runtime-SHA registry evidence exists, but PR body does not
declare DEVICE_RESULT: PASS.` Do not weaken the guard or mislabel the broader
normal-route gate to make this release check green.

## Remaining release work

The registered dev checkpoint pre-completes Shiopon/Lumiere progression.
Interaction is still dev-only / DEV_HARNESS=true; productionEnabled=false and
VGC-001 remain authoritative. The actual initial Lumiere meeting -> gate event
normal entry, production completion/Save observation and normal integrated
route are not established by this checkpoint. Prepare and independently review
that entry/completion contract, then implement in a separate candidate only
when the production-activation intent is authorized. Obtain the applicable
normal-route human evidence and release approval before main/publication.

This review adds evidence only. It does not reopen story, pacing, assets,
audio/camera behavior, Save/Continue or any Regression Lock. Historical device
records remain unchanged. Later evidence-only SHA changes do not require the
owner to repeat the same fixed-runtime smoke.
