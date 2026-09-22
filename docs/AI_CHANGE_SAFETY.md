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
