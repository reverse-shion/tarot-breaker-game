# Audit and repair of 27 known regression test failures

Baseline main: `bd00fc6c10f292c75ef0fa4f79b77796ca458165`.
Branch: `fix/audit-27-regression-tests`.
Implementation authority: `docs/audit-27-implementation-contract.md`, including the narrowly documented reset and Landing amendments.

## Result

The unchanged baseline produced 229 tests, 202 passes and 27 failures. The repaired candidate produces **230 passes, zero failures, zero cancelled, zero skipped and zero todo**. One new negative test proves an incomplete Landing Journey is not silently marked completed by a Garden-return URL. All 27 original tests remain exercised; four obsolete titles are explicitly mapped below.

No production JavaScript, HTML, CSS, assets, collision data, dialogue or gameplay behavior was changed. No production defect was established after faithful DOM, RAF, official asset inputs and current phase expectations were supplied. The defects repaired are in test harnesses and obsolete test assumptions. This automated result is not a claim of physical-device verification.

Known-failure exceptions were removed only after the entire suite actually passed. `expectedMinimumTestCount` increases from 151 to 230. The regression runner explicitly requests TAP because Node 24 defaults to a different child reporter while its existing parser requires TAP; all existing failure identity/count/process checks are retained.

## Per-case audit

Titles in the first column identify the original exception exactly. File abbreviations: A=artwork-alignment, C=cloud-runtime-fix, G=game, M=map-roundtrip, S=scene-effects, N=star-country-gate-garden-collision (all `tests/*.test.cjs`).

| # | Original failing title | Cause and concrete repaired assertion |
|---|---|---|
| 1 | latest uploaded artwork URLs are cache-busted independently | A: outdated hash/version literals. Current islands `asset=34856728cf2b`, transparent foreground `v=cca8dd37b9`, layout `native-foreground-v7`, game `garden-arrival-v1`; renderer/preload URL pairs must agree and revisions remain independent. |
| 2 | replacement islands fit completely inside the canonical scene | A: stylesheet link creation was incorrectly forbidden as if it were an edge-copy canvas. Allow only a link and head append; still require exactly one draw, x≈0/y=0, width1448 and contained height1055–1086. |
| 3 | replacement foreground restores authored scale, keeps the approved +4px nudge and is drawn only once | A: retired scale/nudge/source raster. Renamed **native transparent foreground uses the canonical zero-origin scale and is drawn only once**. Assert one draw at0,0 with1448×1086, zero offset and native mode/version. Actual official WebP is1469×1071 with VP8X alpha flag; verify those bytes separately from canonical draw dimensions. |
| 4 | Preview 46 uses one three-copy buffered cloud track | C: preload was counted as a fourth rendered image. Require exactly three track image src values equal to the literal dedicated cloud URL, plus exactly one matching preload; retain CSS motion/Safari protections. |
| 5 | 390x844 boots with Shion + Shiopon + Lumiere, DPR cap, corrected spawn and actor sizes | G: raw1015 spawn predated current authored pavement, and lost RAF prevented draws. Require actual724,944 Landing spawn, legal collision, ≤80 displacement from authored default, south-exit clearance, exact810,800 Shiopon home, world/DPR and every actor dimension. |
| 6 | Lumiere replaces the old torso once and draws one cached silhouette per tick | G: single RAF slot overwritten by arrival probe. Queued frame snapshots now require exactly one composite draw each of420 ticks and four cached surfaces with exact draw/clear/draw torso replacement operations. |
| 7 | Lumiere bobs as one body while slow wing frames change independently | G: same lost loop. Require fixed810,212 home, no movement, changed frame/bob, bob≤2.4 and independent wing-hold bounds. |
| 8 | Lumiere has solid collision while remaining fixed at the gate | G: lost loop. Real taps through current route must stop npc-blocked, stationary, with gap32–40 and unchanged Lumiere810,212. No collision-distance tolerance was relaxed. |
| 9 | canvas tap uses camera/zoom/element offset and does not jump the camera to the destination | G: lost loop and companion-obstructed old target. Literal reachable790,330 destination preserves requested coordinate conversion and <8 camera change, proves movement, then reason=arrived and distance<8 (production arrival radius), route empty, idle stable and capture released. |
| 10 | real event bindings: drag/keyboard/reset cancel and reset clears held stick | G: reset UI deliberately retired. Renamed **real drag/keyboard bindings cancel movement and production reset clears held input**. Real drag proves active stick/visible joystick; exact production reset closure is test-exposed, then keys/gesture/route/stick clear, joystick hides, movement stops and spawn/home stay legal. Official HTML must lack reset UI. Real key bindings still cancel routes and stop after release. |
| 11 | four directions use all four Shion walk frames then the matching idle frame | G: lost loop and old target stopping near NPC. Real Stage move/skip establishes exact independently reviewed 80px cardinal segments: right740,330; up810,365; left830,330; down810,290. Every one of25 ticks must move in the requested direction, all four frames occur, then matching idle source column is exact. |
| 12 | future interaction lifecycle cancels and suspends player movement | G: lost loop. Existing real event handlers must cancel route, suspend player/NPC movement, reject a suspended tap and accept a route after interaction-end. |
| 13 | stage commands face actors, animate safe steps and expose a skip-to-end handle | G: lost loop. Require Shiopon→flower right, Lumiere→gate up including up sprite draw, observable active movement, then exact12px upward step and cleared stage after skip. |
| 14 | Shiopon bounce is visible mid-action and returns to its exact baseline | G: lost loop. Require active bounce, observed offset<-1 at six ticks, then exact0 offset/null stage after finishing. |
| 15 | PAD return enters the real north path, does not replay memory or immediately leave | M: missing DOM replaceChildren, fallback collision and invalid empty completed-return fixture. Model real SVG/DOM and load official collision/passage JSON; completed Journey literal=true yields legal257 north spawn, zero dialogue replay, no immediate URL transition, then real north walk returns to Garden. Added fresh incomplete fixture proves URL alone cannot complete/suppress the five-line memory event. |
| 16 | companion farewell finishes before boarding, stays on ground during flight and rejoins on return | M: same DOM/input fixture gaps plus revised authored lines/greeting. Assert both current literal farewell lines/speakers, ground until both advances, separated companion fixed throughout flight/Journey waiting, actual Alenon route, rejoin on finishArrival, three literal greeting lines/speakers, suspended movement until all advance, final movement release and no duplicate greeting. |
| 17 | solo boarding has no farewell; walking at the south edge cannot teleport off the island | M: DOM gap. Official loaded map/completed Journey; ground south-edge movement must keep URL empty; real solo boarding has zero dialogue. |
| 18 | PAD accepted pointer and keyboard gestures invoke the shared manager | M: DOM gap. Official loaded map/completed Journey; accepted pointer starts shared BGM once, later keyboard retains playback position12 and does not restart. |
| 19 | Alenon return bypasses prologue and spawns behind its authored PAD; title still starts prologue | M: landing and dismounted phases conflated. First require landing mode/xPAD/yPAD−20, completed/unlocked hidden prologue; finish actual landing then ground/yPAD−68 and legal collision. Fresh title still starts prologue at716,330. |
| 20 | gate opening aligns with stair centre; standalone gate is mask-only and foreground is refined left | S: retired unpatched offset/back layer. Renamed **gate opening aligns with stair centre; standalone gate is mask-only and foreground uses the native zero-origin placement**. Official patch yields offset0,0, gate axis800, x520/w560/bottom210; legacy gate stays hidden mask-only, transparent foreground scene-front, legacy mask containment retained. |
| 21 | local physical bases remain solid for manual movement and pathfinding without editing authored areas | S: old illegal raw spawn/targets and omitted layout patch. Compose actual patch; use724,944 and seven independently legal destinations, require exact route target/every segment clear, fountain and gate base blocked, fountain crossing false, authored blockedAreas unchanged and17 walk areas retained. |
| 22 | rear actor is alpha-masked in an isolated surface; front actor draws directly | S: missing location.pathname/image.closest, and old depth zone. Correct DOM/dependency context; reviewed rear420,435 must use isolated surface, destination-out and actual foreground mask; front569,470 draws directly; scaled rear840,870 atscale2 maps back to same polygon. |
| 23 | scene and actors share the current camera; event FX is opt-in | S: same DOM gaps. Exact world transform/current object transform atorigin610,280/zoom1.22 and canonical size required; normal/event/unknown state handling and hidden event CSS retained. |
| 24 | official collision v5 preserves the latest six authored walk areas | N: retired v5 representation. Renamed **official collision v6 preserves the seventeen authored walk areas**. Require v6, correct map/reference,17 polygons,0 authored blocks and finite valid polygon coordinates. Runtime solids remain separately tested. |
| 25 | spawn, Shiopon and the Lumiere gate approach stay walkable | N: raw default rather than production projection/composition. Raw724,1015 must be illegal; reviewed entrance724,960 and arrival724,944 are legal with clear joining segment/bounded displacement.810,800 home and810,240 gate approach legal. Actual game spawn independently tested in G. |
| 26 | fountain, flowerbeds and far map edges remain blocked | N: old flowerbed/exterior coordinates became authored walk areas. Current fountain800,533, west650,700/east920,700, real four map exteriors remain blocked; every placed solid base center blocked and manual fountain-crossing segment rejected. |
| 27 | the intended paved route remains connected from spawn to the Star Gate | N: illegal raw start/legacy western waypoint. Require literal legal570,500 western path,1040,520 eastern path and810,300 stairs; navigate724,944→570,500→810,300→810,240 with nontrivial paths/exact targets/every segment clear and11 walkable samples per segment. |

## Revision provenance

- `33b7320`: replaced the retired rescaled/nudged foreground with canonical native-reference placement; current HTML loads the transparent foreground, not the old foreground plate. `db0bb8c`: latest uploaded transparent asset. Its actual1469×1071 source dimensions are verified separately from1448×1086 drawing.
- `c78d472`: retained17 authored walk areas and reverted automatic pillar zones; `0208674`: refined the gate walk area. `docs/NAVIGATION_COLLISION_SOURCE_OF_TRUTH_AUDIT.md` requires runtime layout solids/projection and preserves connected-route/obstacle safety.
- `4476cd6`: current explicit authored behind-foreground polygons replace old inferred depth zones.
- `c08ffb0`: decoded-scene arrival readiness schedules a separate two-RAF probe; the old single-callback harness lost the live loop. Queue snapshots match browser RAF semantics (callbacks scheduled within a frame execute next frame).
- `fc72375`, `aebbae8`, `fc77cff`: intentional reset-control/listener removal and official no-reset page. Test exposure calls the unchanged boot reset closure; it restores no UI.
- `5750ae7`: deliberately removed URL-only Landing completion inference. `46bf804`: reverted the unsafe Progress restore bridge after a fresh-start regression. Completed fixtures supply an actual Journey fact; the fresh negative advances the real event and verifies durable completion only after its fifth line.
- `4b32b7b`, `709569c`: authored farewell update, two-line split and three-line return greeting. No dialogue wording/order was changed by this repair.

## Adversarial verification

Mutations ran only in a disposable full repository copy, restored after each case; production workspace source remained untouched. Every mutant failed the targeted tests:

| Mutant | Rejection evidence |
|---|---|
| Replace RAF queue push with overwrite | Eight failures, including per-tick cached draw, bob/wing, NPC collision, tap arrival, four-direction frames, interaction, stage and bounce. |
| Add fourth cloud track image | Exact three-copy test fails. |
| Shift foreground draw x from0 to4 | Canonical single draw placement test fails. |
| Make blocked collision segmentClear always true | Physical base/manual crossing, blocked fountain/flowerbeds and connected safe route tests fail. Sampled path legality also rejects obstacle shortcuts. |
| Change actor mask operation destination-out to source-over | Isolated rear-mask test fails. |

## Validation and Regression Lock

Six-file targeted suite:49/49. Full suite:230/230. Regression runner without NODE_OPTIONS:230/230, no exception accepted. JavaScript syntax, asset/background/audio validators and diff whitespace checks: PASS. Independent review and exact-head GitHub CI remain parent-agent gates; this document does not predeclare them.

Locked systems touched: NO. New failures: NO. Existing failures resolved:27. Audio/Trigger/Route automated regression: PASS via full suite. Device validation: NOT APPLICABLE to this test/process/documentation-only diff; no DEVICE VERIFIED record is created. Save integration remains dormant. **REGRESSION LOCK PASS** for automated implementation validation, subject to independent review/CI before merge.
