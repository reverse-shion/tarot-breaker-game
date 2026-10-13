# Lumiere -> Star Gate checkpoint validation

Base PR114: dad86541bfd00fd70439b542c01d7c9fbd302bb2.
Latest main fetched 2026-10-13: 22c07ae94d7491c3818b57574da7ee3af12edfc4.
Candidate branch: feat/pr114-lumiere-star-gate-route; Draft targets PR114 only.

New isolated entry: dev=star-gate-from-lumiere. Starts at (810,400) with
Shiopon joined and Lumiere unfinished. Actual existing dialogue and mandatory
guard complete the meeting; a memory-only observer copies their real facts to
Journey. Existing inspect/leave logic requires completion and free controls.
Stage3 and Aftermath use the existing runtime and interruption recovery.

Independent review caught conflicting editor switches and titlePreview URL
rewriting before the initial admission check. Fixed with a minimal earliest
index script: only this new dev route is validated; valid links and ordinary
routes are untouched. Invalid requests strip conflicting switches, display
an error, and cannot boot the game/editor. Tests execute real conflicting
editor/title scripts with storage traps and check actual index order.

Automated evidence: targeted dialogue/handoff tests 16/16 PASS (8 existing,
8 additional); full baseline suite 486/486 PASS, zero failures/skips/cancels;
syntax, assets/background/audio validation, preflight and diff-check PASS.
Existing tests and regression baseline were not weakened. Dialogue text and
staging, story guard, existing Audio, controls/collision/navigation, Stage3
recovery/timing, Aftermath runtime, save/progress/Journey and assets/CSS remain
byte-identical to the PR114 base. New runtime admissions are dev-specific.

Independent read-only Reviewer / QA inspected the repaired actual diff and independently ran targeted16/16 and full486/486 tests. CODE and local TEST: GO. Earlier conflicting-entry defects were returned to implementation and re-reviewed after repair; reviewer did not edit the candidate. No remaining code blocker found.
Remote CI is recorded in the Draft PR after publication. DEVICE PENDING;
INTEGRATION PENDING until this changed checkpoint has exact-SHA human PASS.
Earlier runtime88c6114 device PASS does not certify this added route.
No main merge, production activation or publication was performed.

Browser limitation: agent Chromium unavailable; raw.githack requests previously
returned403. Node VM integration uses actual dialogue/guard/interaction source
with simulated scene motion, not browser/device evidence. Stage3 lifecycle and
Aftermath have separate actual-runtime regression tests; the new route test
simulates the Stage3 session-ended report to check the handoff/retry protocol.

## Focused iPhone check

1. Open the immutable link given in the Draft PR; start below Lumiere.
2. Walk north. The original first meeting plays, without an early gate choice.
3. After the meeting, approach the gate. Inspect/leave becomes available.
4. Inspect and finish Stage3/Aftermath. Movement and companion follow return;
   approaching again does not duplicate the completed event.
5. On a fresh page, finish the meeting, inspect, switch Home and return.
   Move away and reapproach, explicitly retry and finish. Lumiere does not replay.

Report device/browser, exact runtime SHA and PASS/FAIL. This is a local authored
Lumiere-to-StarGate handoff check, not a full Title-to-Garden production route,
reload persistence test or release authorization.
