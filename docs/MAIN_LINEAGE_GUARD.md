# TAROT BREAKER — Main Lineage Guard v1

Status: ACTIVE after merge to `main`.

## Purpose
Prevent a pull request from being accepted by the Main Merge Gate when its head does not contain the current `main` tip.

This is a machine-enforced companion to `MAIN_LINEAGE_INCIDENT_2026-09-22.md`. It does not recover missing historical gameplay by itself.

## Contract
For pull requests targeting `main`:

1. Fetch the current base and PR head refs.
2. Require the current base tip to be an ancestor of the PR head.
3. If ancestry fails, emit `MAIN LINEAGE GUARD: FAIL` and stop the required Main Merge Gate.
4. The branch must then be updated from current `main` and the gate rerun.

GitHub Ruleset additionally requires branches to be up to date before merging. The guard intentionally duplicates that critical invariant inside CI so repository safety is visible, testable, and version-controlled.

## Scope
This guard changes no gameplay, events, dialogue, assets, audio, save data, collision, routes, or player-visible UI.

## Limits
This guard proves ancestry from the current base tip for the candidate PR. It cannot prove that an older feature which had already disappeared before the current base was preserved. Historical recovery remains a separate reviewed recovery task.
