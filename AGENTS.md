# TAROT BREAKER — Repository Working Rules

Before changing any code, configuration, assets, routes, tests, or gameplay behavior in this repository:

1. Fetch and inspect the latest `main`.
2. Read `docs/regression-lock-v1.md` completely.
3. Treat every listed Regression Lock as a preservation contract unless the user's current task explicitly authorizes changing that lock.
4. Define the current task scope before editing.
5. Do not perform unrelated refactors, cleanup, renames, architectural rewrites, or "while here" changes.
6. Work on a feature/fix branch, not directly on `main`.
7. Compare the candidate branch against current `main`.
8. Run the relevant targeted tests plus the available regression suite.
9. If the candidate introduces a new failure, changes a locked behavior, or requires an out-of-scope locked-system change, STOP and report the evidence instead of continuing.
10. Device revalidation is required only when the change can affect browser/device behavior listed in the Regression Lock; do not request full-game retesting for every small change.

For Progress / Save work specifically:
- Progress may record and restore state.
- Progress must not rewrite Audio, Collision, Movement, Dialogue, Story, Trigger, or Route behavior merely for implementation convenience.
- Integrate incrementally by map/phase.
- Preserve the currently validated Alenon audio path and Orb Trigger Re-arm contract.

Source of truth for protected behavior:
`docs/regression-lock-v1.md`
