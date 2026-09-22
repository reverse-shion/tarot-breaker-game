# AI Change Safety — Gameplay Protection

Before changing gameplay code, every agent must:
1. read docs/VERIFIED_GAMEPLAY_CONTRACTS.md;
2. identify which contracts the proposed files can affect;
3. preserve existing assertions and add coverage for newly VERIFIED behavior;
4. run all verified gameplay contract tests before requesting merge;
5. stop instead of weakening a contract to accommodate a feature.

A feature is not complete when its new behavior works. It is complete only when new behavior works AND all previously VERIFIED gameplay contracts still pass.

If implementation and a VERIFIED contract conflict, the implementation changes. The contract changes only after an explicit product decision.

For regressions, do not patch the symptom first. Identify the last known-good commit and first known-bad commit, document the causal diff, then make the minimum fix and add/strengthen a contract test that would have caught it.

## Event-development mandatory gates
Before any gameplay/event change, also read:
- docs/EVENT_DEVELOPMENT_CONTRACT.md
- docs/DEVICE_VERIFICATION_REGISTRY.md

Event work must use a non-main sandbox/checkpoint branch first. Do not merge event work to main before both isolated and integration Device Gates pass.

Do not continue feature work after a DEVICE VERIFIED regression. Stop, report the affected locked behavior, identify the causal commit range, and repair the regression without weakening its contract/test.

A developer checkpoint must execute the real event runtime, not merely reproduce its UI. It must not write production durable Progress/localStorage.

## Mandatory repository preflight
Read docs/EVENT_DEVELOPMENT_SYSTEM.md and docs/EVENT_CONTRACTS.md in addition to the existing safety documents, then run `node scripts/event-preflight.cjs --target <event-or-segment>` before gameplay/event edits. Declare WORKING and LOCKED scope. A LOCKED target is a stop condition unless explicitly reopened by the product owner.

Do not invent a working Dev Checkpoint when its real runtime is absent. Do not present a checkpoint URL until its runtime chain is registered and CI-covered. Integration PASS and isolated PASS are separate gates.
