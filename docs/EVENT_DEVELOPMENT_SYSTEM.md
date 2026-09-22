# TAROT BREAKER — Event Development System

Status: ACTIVE / SOURCE OF TRUTH

## Mandatory lifecycle
MAIN BASELINE -> EVENT SANDBOX -> DEV CHECKPOINT -> IMPLEMENT -> CI PASS -> HUMAN DEVICE VERIFY -> DEVICE VERIFIED -> CONTRACT LOCKED -> NEXT SEGMENT -> INTEGRATION BRANCH -> INTEGRATION CI -> HUMAN INTEGRATION DEVICE VERIFY -> MERGE APPROVAL -> MAIN -> MAIN VERIFIED.

## Preflight
Before editing, read AGENTS.md plus this document, VERIFIED_GAMEPLAY_CONTRACTS.md, EVENT_CONTRACTS.md, DEVICE_VERIFICATION_REGISTRY.md and AI_CHANGE_SAFETY.md. Run `node scripts/event-preflight.cjs --target <id>`. Record main HEAD, branch, target, WORKING scope, LOCKED scope, relevant contracts, device SHA and checkpoint. If target is LOCKED, STOP unless explicitly reopened by the product owner.

## Segment Lock
Lock observable behavior, not files. Only WORKING segments are authorized for feature edits.

## Dev Checkpoint
`dev-checkpoints.js` is the single registry. Each real checkpoint declares id, event, segment, map, spawn, temporary state, required runtime, entry action, emitted signal, receiving runtime, expected first runtime state and durable-write policy. UI-only imitations are invalid. Production Progress/localStorage writes are FORBIDDEN. A checkpoint whose real runtime is absent is BLOCKED and must not be presented as a working device URL.

## Device Verification
Only explicit human real-device confirmation may create DEVICE VERIFIED, CONTRACT LOCKED or MAIN VERIFIED. Records use exact commit SHA. CI PASS is never DEVICE PASS.

## Regression
If locked behavior breaks: STOP -> affected contract -> last known-good -> first known-bad -> causal diff -> report -> minimum repair -> CI -> required device re-verification -> resume. Silent repair while continuing feature work is forbidden.

## Integration
Isolated PASS is not merge permission. Integration verifies previous completion, next activation, state/Journey/Progress ownership, one-time behavior, return/re-entry, transitions, companion/dialogue ownership and absence of dev leakage.

## Main Merge Gate
Do not merge with CI FAIL/missing, verified regression, incomplete runtime checkpoint, durable-state pollution, missing isolated Device Gate, missing Integration Gate, missing Integration Device Gate, or missing explicit merge approval.

## Required CI
verified-gameplay-contracts, event-development-contract, event-contracts, dev-checkpoints, integration-contracts and merge-gate tests are mandatory.

## Status
NOT TESTED -> IMPLEMENTED -> CI PASS -> DEVICE VERIFIED -> CONTRACT LOCKED -> INTEGRATED -> MAIN VERIFIED. Only humans grant device statuses.

GitHub contracts/tests/device records are authoritative over conversation memory and AI assumptions.
