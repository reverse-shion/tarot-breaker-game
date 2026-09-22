# TAROT BREAKER — Main Merge Gate

Status: ACTIVE

Gameplay/event work is eligible for main only when all applicable automated contracts pass and required human Device Gates are recorded at exact commit SHAs.

Required evidence: WORKING scope; locked regression tests green; real-runtime Dev Checkpoint; durable-write policy FORBIDDEN; isolated human device PASS; Integration Contract PASS; integrated-route human device PASS; explicit product-owner merge approval.

Foundation/documentation-only PRs may use FOUNDATION scope and must prove no production gameplay/runtime files changed.

GitHub branch protection/ruleset should require the Event Safety / Main Merge Gate check before merging to main. If repository settings do not enforce required checks, this document and CI cannot technically prevent a repository administrator from bypassing GitHub.
