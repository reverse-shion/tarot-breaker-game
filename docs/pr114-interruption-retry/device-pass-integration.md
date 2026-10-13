# PR150 device PASS and PR114 integration contract — 2026-10-13

User: `実機確認した。何も問題なかった。次に進んでほしい`.
Exact tested runtime: `88c61140763f24aac41eceb8ab1e9d5bb2ddb531`.
Main: `22c07ae94d7491c3818b57574da7ee3af12edfc4`.
PR114 integration target: `d8bf38d93fd1676c75432e411b6d683e9f0a6846`.

WORKING: record human PASS within the presented fixed-SHA smoke scope; update
PR150 metadata; integrate the reviewed repair into PR114; compare integrated
executable bytes against the tested runtime; full regression, independent
read-only review and applicable remote CI. Risk HIGH for event integration.

LOCKED: all runtime code, assets, CSS, production suppression, normal gameplay,
Progress/Save, story, timing, audio/camera behavior, tests, guards and baselines.
This step introduces no new runtime change. Runtime changes or conflicts require
returning to implementation review and applicable device validation.

PR150 isolated CODE/TEST/DEVICE gate evidence now exists. The repair is based on
the exact current PR114 HEAD; integration should therefore introduce only this
candidate, with no unrelated change. Both histories should be preserved. Keep
PR114 Draft and do not merge main or publish production.

The user's smoke acceptance is not a normal non-dev initial Lumiere route test,
not an injected-failure trace, and not blanket main-release approval. Do not turn
the broader PR114 DEVICE_RESULT into PASS merely to satisfy a guard. Record the
remaining release conditions explicitly in its final integration review.

Do not request a duplicate device replay solely for an evidence-only commit or
an integration whose executable tree is identical to the tested SHA. Any later
production-enabling/normal-entry work requires its own route contract and gate.
