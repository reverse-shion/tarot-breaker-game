# Main Lineage Incident — 2026-09-22

## Finding
PR #36 ("Star Gate Anomaly v1.2 — interaction foundation") is recorded by GitHub as merged on 2026-09-21, with head `5a4e3c02bc58d80a2bfad9fa5671c156c8d6873c`.

Current `main` does not contain that Star Gate interaction runtime. GitHub comparison reports the PR #36 head and current main as **diverged**, with merge base `e079d10653a4dd9db9ee3d4cb2ebfd8fdbf3b14c`.

Current main history proceeds from that older merge-base through later asset/Asset Studio commits instead of containing the merged Star Gate line.

## Consequence
This is not an ordinary local regression inside the Star Gate code. A previously merged line is absent from current main, so later feature branches can still contain behavior that main no longer has.

This explains why repeatedly editing the Star Gate feature branch did not repair the authoritative main runtime.

## Release safety rule
- main is the only release authority.
- A feature is not considered preserved merely because its PR says "merged".
- Before new gameplay work, verify that the expected merged commit is an ancestor of current main.
- Unexpected main divergence is a STOP condition.
- Never repair unexpected divergence by copying arbitrary files from a feature branch. Identify the intended recovery set and re-integrate through a reviewed PR with gameplay contracts.

## Administrative protection required
GitHub branch protection/rulesets should disallow force pushes to `main` and require PR + required status checks.

The connected GitHub integration cannot read or change repository branch-protection administration (GitHub returned 403 for the protection endpoint), so this repository-setting guard must be enabled by the repository owner in GitHub.

## Recovery plan
1. Land the contract/AI safety infrastructure.
2. Build a dedicated Star Gate recovery branch from current main.
3. Recover only the intended PR #36 foundation plus the subsequently verified anomaly work after causal review.
4. Activate VGC-001 in that recovery PR.
5. Require automated PASS.
6. Require iPhone/iPad Device Gate PASS.
7. Merge to main.
8. Verify the recovered commit is in main before any new gameplay feature begins.
