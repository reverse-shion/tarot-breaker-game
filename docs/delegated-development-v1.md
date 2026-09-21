# Delegated Development Contract v1.0

## Purpose
Allow routine technical execution to proceed from a human product decision through branch, implementation, independent review, CI and merge without requiring the user to approve technical details they cannot meaningfully inspect.

This is delegation, not unlimited autonomy.

## Human authority
The user remains the authority for:
- product intent and player experience
- story/dialogue/canon decisions
- accepting a change to a Regression Lock
- destructive or irreversible product decisions
- choosing between materially different product/UX alternatives

Technical implementation choices may be delegated when they stay inside an already-approved intent and Scope.

## Standard pipeline

Human intent
→ Architect
→ Implementation Contract
→ Implementer on dedicated branch
→ Reviewer / QA independent review
→ GitHub Actions / regression gate
→ required device validation, if any
→ PR
→ merge to main when all gates PASS

## Automatic merge authorization
A task may be merged without a second human approval only when ALL conditions below are true:

1. The user's request already authorizes the product behavior being implemented.
2. Architect found no unresolved product decision.
3. Work is on a dedicated branch and PR.
4. Reviewer returns PASS.
5. Required CI is successful under the repository's current regression-baseline policy.
6. No new test failure exists relative to current main.
7. No Regression Lock is changed, weakened, removed, or reinterpreted.
8. No test/validator/baseline is weakened merely to make CI pass.
9. Any required device validation has PASS evidence. If device validation cannot be performed by the agent, merge waits for the human result.
10. Candidate is still based on/compatible with current main at merge time; if main moved materially, re-review first.

## Mandatory human escalation
STOP and return to the user before merge if any of these apply:
- product intent is ambiguous
- two or more viable choices materially change UX/gameplay/story
- Regression Lock must change
- story, dialogue, canon, visual direction, difficulty, pacing, monetization, privacy, or other product policy must be newly decided
- destructive migration or data-loss risk
- unexplained test/CI/device discrepancy
- required iPhone/device validation is pending
- candidate needs unrelated refactor or scope expansion
- reviewer cannot establish PASS from evidence

## Merge rule
No direct commits to main for delegated development. Merge occurs only through a PR after all applicable gates PASS.

The merger must re-check PR head, current main compatibility, and required status checks immediately before merge. A stale PASS is not sufficient after material branch/base changes.

## Failure loop
Reviewer or CI FAIL
→ no merge
→ return evidence to Implementer
→ new candidate
→ Reviewer starts again
→ CI again

Do not convert a failure into a new product decision without human input.

## Roles
- Architect: docs/agents/architect.md
- Implementer: docs/agents/implementer.md
- Reviewer / QA: docs/agents/reviewer.md

## Principle
Automate execution after human intent, not human intent itself. Escalate decisions; automate repeatable work and verification.
