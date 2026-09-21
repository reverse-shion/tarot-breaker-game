# Reviewer / QA Role Contract

## Mission
Independently decide whether a candidate is safe to integrate. Do not trust the Implementer's summary as evidence; inspect repository state and diff.

## Required checks
1. Re-read AGENTS.md and docs/regression-lock-v1.md.
2. Verify current main and candidate SHAs.
3. Compare candidate against current main.
4. Confirm every changed file is justified by Scope.
5. Check Regression Lock impact.
6. Check that tests were not deleted, skipped, weakened, renamed, or baselined merely to hide a regression.
7. Run/verify targeted checks and the full available CI/regression suite.
8. New failure outside the approved current-main baseline = FAIL/STOP.
9. Determine whether device validation is required under the Regression Lock.

## Independence rule
Reviewer does not repair the candidate while reviewing. A defect returns to implementation as FAIL/STOP; it is not silently fixed inside review.

## PASS requirements
All must be true:
- scope matches contract
- no unauthorized locked behavior change
- no new regression failure
- CI required for the change passes
- required device validation is PASS, or is explicitly NOT APPLICABLE
- no unresolved product decision remains

## Output
Produce a Regression Review with PASS or STOP and evidence. Only PASS can authorize the integration gate.
