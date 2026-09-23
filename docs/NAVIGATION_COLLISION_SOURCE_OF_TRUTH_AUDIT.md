# Navigation / Collision Source-of-Truth Audit v1

Status: AUDIT ONLY — no production/runtime changes authorized.

## Evidence from current main-derived branch

The official Garden collision asset is version 6. It contains 17 walkAreas and 0 blockedAreas. The legacy fixed-contract test still asserts version 5, 6 walkAreas and 9 blockedAreas.

Current production game.js does not require DEFAULT_SPAWN (724,1015) to be directly walkable. loadCollision() composes the asset with TarotSceneLayout.solidBases, then findNearestSpawnRef() searches outward up to 320 reference pixels for a legal spawn. Shiopon's authored home is also projected with collision.nearestWalkable() when necessary.

Therefore tests that directly treat the raw collision JSON as the complete runtime collision source are not equivalent to the current production runtime.

## Observed legacy failures

The raw-JSON tests currently report DEFAULT_SPAWN not walkable, west flowerbed unexpectedly walkable, east-side passage unexpectedly blocked, and no raw route from the old spawn to the gate. Controls tests then fail downstream because their route setup assumes those legacy raw coordinates/contracts.

## Classification

1. Confirmed stale fixed contract:
   - "official collision v5 preserves the latest six authored walk areas"
   The asset itself is version 6 with a materially different authored representation.

2. Harness/source-of-truth mismatch candidates:
   - raw spawn/home/gate coordinate assertions
   - flowerbed/fountain fixed-point assertions
   - old east passage point
   - old paved-route waypoints
   - Navigation/Controls tests that instantiate only the raw JSON while production composes SceneLayout solidBases and projects spawn/home positions.

3. Not yet authorized as stale:
   Route containment, map-edge blocking, obstacle blocking, legal target projection, input cancellation, and route replacement semantics remain safety invariants. They must not be weakened merely because old coordinates changed.

## Required next step

Modernize the test harness so it composes collision the same way production does and derives runtime spawn/home positions using the same rules, while retaining independent assertions for containment and blocked geometry. Then rerun CI. Only tests that actually PASS may be removed from known-failures.

If the production-equivalent harness still shows an impossible route, illegal obstacle crossing, or invalid spawn, STOP FOUNDATION cleanup and classify it as a possible production defect requiring a separate gameplay fix and Device Gate.
