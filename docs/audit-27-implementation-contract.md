# Audit of 27 regression failures — Implementation Contract

Baseline: `bd00fc6c10f292c75ef0fa4f79b77796ca458165` (current main).
Branch: `fix/audit-27-regression-tests`.
User goal: audit and repair all 27 known failures before Save integration continues.
Risk: NORMAL for test/harness/CI corrections; any proposed production correction is HIGH and requires a new scoped decision and affected Device Gate.

## FACT

- Baseline full suite has 229 tests, 202 passes and the same 27 named failures recorded in `tests/known-failures.json`.
- `game.js` begins a live RAF loop and separately schedules a two-RAF arrival readiness probe. `tests/game.test.cjs` stores only one callback, so the probe overwrites the live loop. Its later ticks repeat a stale readiness callback rather than advancing production movement/animation. `tests/garden-arrival.test.cjs` already uses a frame queue.
- Current authored collision is version 6 with 17 walk polygons and no authored blocked polygons. Production additionally composes SceneLayout solid bases, searches for a safe spawn and projects Shiopon's home. `docs/NAVIGATION_COLLISION_SOURCE_OF_TRUTH_AUDIT.md` records why raw-v5 coordinates are not the runtime source of truth and explicitly retains collision safety invariants.
- Current foreground uses a transparent 1469×1071 source raster drawn at canonical reference 1448×1086, at zero offset, with scene-front placement and alpha masking. `scene-preview41-fix.js` defines `native-foreground-v6`; the official HTML loads `native-foreground-v7`. Old tests instead expect an older raster, scaled by 1/0.81, at -11px, drawn behind actors.
- Cloud HTML has exactly three track image copies plus a fourth URL occurrence in preload. The test counts all URL occurrences.
- Landing harness lacks `replaceChildren`, which current passage-occlusion rendering invokes before the four route tests reach their behavioral assertions.
- Alenon PAD return deliberately starts mounted at pad.y − PAD_LIFT − 2, then `finishPadLanding()` dismounts at pad.y − 68. The failing test asserts the dismounted position immediately after reset; an existing passing test already protects landing/dismount/reboard/Orb behavior.
- Scene-effects harness omits `location.pathname` and image `closest`, both required by current production dependency selection.

Source history supporting intentional replacements: `33b7320` introduced native 1448×1086 foreground alignment; `c78d472` explicitly reverted automatic pillar collision zones and kept the 17 authored walk areas; `0208674` refined the Star Gate walk area; `4476cd6` simplified scene depth to explicit behind zones; `c08ffb0` added decoded-scene arrival readiness and the separate two-frame probe.

## UNKNOWN

No production defect is established by these baseline failures. Downstream assertions must be rerun after correcting harnesses. An unreachable production-equivalent route, unsafe spawn, illegal obstacle crossing, stuck input or missing animation is a possible genuine defect, not authorization to relax that assertion.

## PROPOSED scope

Repair the six failing test files, their necessary test-only helpers, this contract/audit evidence, and resolved baseline entries. Explicit TAP selection in the regression runner is allowed if Node 22/24 default-reporter incompatibility is confirmed; retain all parser, count and failure checks. Remove exceptions only after their repaired tests pass. Set the minimum count to at least the baseline 229. Preserve all original behavioral coverage; obsolete test titles may be renamed with an explicit audit mapping.

Expected touched files: `tests/artwork-alignment.test.cjs`, `tests/cloud-runtime-fix.test.cjs`, `tests/game.test.cjs`, `tests/map-roundtrip.test.cjs`, `tests/scene-effects.test.cjs`, `tests/star-country-gate-garden-collision.test.cjs`, `tests/known-failures.json`, optional test-only helper files, `scripts/test-regression-baseline.mjs`, audit documentation. Production JavaScript, HTML, CSS, assets and collision/depth JSON are out of scope.

## Per-failure handoff

| # | Baseline test (distinctive title) | Initial classification | Required repair and retained protection |
|---|---|---|---|
| 1 | latest uploaded artwork URLs | Obsolete asset/version expectations | Check official current assets, independent revision tokens and preload/src consistency; retain cache invalidation protection. |
| 2 | replacement islands fit completely | Harness rejects stylesheet creation | Model link/head DOM, still prove one contained background raster within canonical reference bounds. |
| 3 | foreground authored scale +4px | Obsolete foreground contract plus DOM gap | Assert current native 1:1 zero-origin single draw and transparent asset; preserve canonical alignment. |
| 4 | Preview46 three-copy cloud track | Preload counted as rendered copy | Count track images only, assert exactly three identical dedicated cloud src values, separate preload. |
| 5 | 390x844 boot corrected spawn/sizes | Old raw spawn plus lost live loop | Queue RAF; assert legal production spawn and entrance clearance, canonical world/DPR and all actor dimensions. |
| 6 | Lumiere cached silhouette per tick | Lost live loop | Queue RAF, retain per-tick one composite and cached body operations checks. |
| 7 | Lumiere bob/wing independence | Lost live loop | Queue RAF, retain fixed home, bounded bob and independently changing wing frames. |
| 8 | Lumiere solid collision | Lost live loop/legacy route setup | Queue RAF, use reachable current route and retain NPC distance/stop/fixed-home guarantees. |
| 9 | canvas tap camera/offset | Lost live loop/legacy target | Queue RAF, assert conversion, requested target, traversable route, arrival and no camera jump. |
| 10 | drag/keyboard/reset | Lost live loop and retired public reset control | Queue RAF; retain actual drag/key bindings, active-stick precondition, cancellation/reset and key-release assertions. Assert official reset UI absent; invoke production reset closure through a test-only exposure to verify held-stick lifecycle. |
| 11 | four walk frames / idle | Lost live loop/legacy movement location | Queue RAF and choose safe bounded movement area; retain all four directions, all four frames and exact idle column. |
| 12 | interaction lifecycle | Lost live loop | Queue RAF; retain suspended movement/NPC state and successful resume. |
| 13 | stage facing/steps/skip | Lost live loop or current projected home | Queue RAF, compare direction to independent actor/landmark geometry; retain safe step distance, moving state and skip completion. |
| 14 | Shiopon bounce | Lost live loop | Queue RAF; retain observable mid-action negative offset and exact baseline restoration. |
| 15 | PAD north return/no replay | Missing DOM method | Model real DOM APIs, then retain reachable north return, no immediate transition and no replay. |
| 16 | farewell/flight/rejoin | Missing DOM method | Model DOM; retain dialogue order, grounded wait, boarding ordering, flight, route and reunion. |
| 17 | solo/south edge | Missing DOM method | Model DOM; retain no farewell and no ground south-edge teleport. |
| 18 | PAD gesture shared audio | Missing DOM method | Model DOM; retain accepted pointer/key invocation and uninterrupted BGM position. |
| 19 | Alenon return bypass/spawn | Mounted vs dismounted phase conflation | Assert mounted reset and landing state first, then dismount −68 and legal ground position; preserve fresh title prologue. |
| 20 | gate/foreground layering | Obsolete foreground depth contract | Assert current native foreground, zero offset after official layout patch, mask-only legacy gate and current centered assembly. |
| 21 | solid bases/manual/pathfinding | Legacy spawn/home/route setup | Compose official layout patch and collision, legal runtime spawn, independent blocked bases and connected safe paths; assert every segment clear and no authored mutation. |
| 22 | rear actor isolated mask | Missing location/image DOM APIs | Complete harness, use current authored depth polygons and explicit outside points; retain isolated surface vs direct foreground draw and mask operation. |
| 23 | scene camera/event opt-in | Missing location/image DOM APIs | Complete harness, preserve exact world/object camera transforms and normal/event state behavior. |
| 24 | collision v5 six areas | Confirmed obsolete authored representation | Assert v6/17/0 plus finite valid polygons/map/reference; do not alter asset. |
| 25 | spawn/home/gate walkability | Raw data vs runtime projection | Compose official solid bases/layout patch, assert projected production spawn/home legal and gate approach reachable; independently bound displacement. |
| 26 | fountain/flowerbed/edges blocked | Old obstacle coordinates | Use current authored solid bases and actual map exterior; retain manual/segment/path obstacles, forbid crossing blocked geometry. |
| 27 | connected paved route | Legacy spawn/waypoints | Start at production safe spawn, traverse independently selected current paved waypoints to gate; require nontrivial path and all segments clear. |

## Protected systems and STOP conditions

All Regression Locks A–L remain preserved: official title/prologue, native audio and Orb re-arm, PAD route/landing, event duplication, companion, movement, collision, dialogue and story. Save remains dormant. No test skipping, deletion, blanket mock success, catch-and-ignore, widened tolerance to mask behavior, new exception, or production substitution to match an old test.

STOP test-only cleanup and report concrete evidence if production-equivalent harness still violates a protected behavior. Do not quietly change runtime or declare the assertion obsolete. Do not claim device verification from automated tests.

Expected values must be independent of the observed production result. Use literal reviewed placements or independently selected positive/negative geometry points and bounds. Reading source configuration to compose the real system is permitted; deriving every expected answer from the same function under test is not. Exact draw counts/placements, cache revision consistency, rear-mask/direct-front behavior, obstacle negatives and connected clear route segments remain mandatory.

### Narrow amendment: retired public reset control

History establishes that reset UI removal is intentional: `fc72375` removed `resetButton` and both reset event listeners from the production runtime; `aebbae8` hides `.reset`; `fc77cff` restored the approved Garden page and removed the reset button from official HTML while loading `no-reset-hard-v2` CSS. Current runtime retains the real `reset()` closure for boot/begin lifecycle, including `controls.clearInput("reset")` and `syncStick()`.

Test-only exposure of that exact closure is permitted to replace synthetic clicks on a nonexistent button. It must not alter the closure, production startup, controls, routing or reset behavior. Retain real drag and keyboard handler coverage, prove the stick is active before reset, then assert keys/gesture/route/stick clear, joystick hides, movement stops and projected spawn/NPC state is valid. Add an official-HTML absence assertion so the test does not accidentally restore a retired UI contract. No production or product change is authorized by this amendment.

### Narrow amendment: realistic Landing Journey and authored companion lines

`5750ae7` deliberately removed URL-only completion inference: current `devilEventStarted` is initialized only from Journey `landingMemoryDone === true`. A real Garden return carries this completed Journey fact; an empty Journey with `?from=garden` is an incomplete synthetic route. `46bf804` reverted a Progress-to-Journey restore bridge after a fresh-start regression. Tests must not restore that bridge or make a URL imply completion.

The normal completed-return/farewell/solo/gesture tests may seed a literal `landingMemoryDone: true` Journey fixture. A separate fresh/incomplete negative must prove that the URL alone does not mark memory completed or suppress the real memory event, and that durable completion is written only after the event's actual dialogue advances. Retain completed-return no-replay and navigation assertions; do not mock the memory handler or set completion during the test to escape a blocking event.

`4b32b7b` intentionally changed the farewell and added a return greeting; `709569c` split farewell into two readable lines. Tests must assert the current literal two-line farewell and speakers, not remove dialogue assertions. Boarding stays ground and companion waits until both lines are advanced. Preserve companion ground coordinates throughout flight and Journey waiting state. On `finishArrival()`, production rejoins the companion first, then starts the three-line greeting, which suspends movement while active; test these exact phases, greeting text/speakers/order, no duplicate greeting, and final control release. No dialogue, event prerequisite, ordering or route change is authorized.

## Acceptance and gates

1. An audit maps every original 27 title to causal evidence and retained assertions, including any rename.
2. At least 229 tests pass; failures, cancelled, skipped and todo are zero. Empty known-failure list is backed by actual successful runs.
3. Six-file targeted suite, full suite, regression runner, syntax, asset/background/audio validators and `git diff --check` pass.
4. Candidate diff compared to current main contains only authorized test/process/docs changes. Independent Reviewer confirms no protection weakened and examines downstream assertions after harness repair.
5. Required GitHub CI passes at exact candidate head, and main compatibility is checked again before merge.

Device validation: NOT APPLICABLE for the proposed test/process/docs-only diff. If actual runtime/browser/gameplay changes are necessary, this exemption ends; classify HIGH, read Event Development entry documents, run applicable preflight, obtain required isolated/integration human Device PASS before merge.

Unresolved product decisions: none within this test-only contract; runtime failures discovered during verification must be escalated with evidence.
