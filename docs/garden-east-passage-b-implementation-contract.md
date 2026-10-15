# TAROT BREAKER — 東側通路B案・実装引き継ぎ契約 v0.1
Date: 2026-10-15
Base main: `4d95d98bcac7723dfd006931400bf8b86ad212e0`
Feature branch: `feature/garden-east-passage-b-foundation`
Risk: HIGH once integrated (Progress / Save / collision / Tap-to-Move / iPhone)
Status: FOUNDATION ONLY / NOT WIRED / DEVICE PENDING

## Author decision / accepted scope
- 「庭園右側の旧道」＝「東側通路」＝「星砂方面の出口」。写真内でシオンが立っていた柱の脇にある封鎖位置、**B案**を採用。庭園の東側全域を封鎖しない。
- 東側通路の解放条件は **「星砂に行くと分かった」** 専用の進行事実。`garden_star_gate_anomaly` の完了フラグへの直結を禁止。
- 会話前・調査待ち・ルート判明前は封鎖。押し続けても台詞を連打しない。星砂に行く必要が判明した後、通れるようにする。
- 未来を決め付ける台詞や既存星門演出・音声・キャラ・保存/復旧を変更しない。

## Verified repository facts
- Garden map collision JSON is `assets/maps/star-country-gate-garden-collision.json`: v6, 1448×1086, 17 polygon walkAreas, 0 blockedAreas.
- Current eastern road comprises multiple authored polygon walkAreas; replacing the entire right side with an opaque blocked area would break legitimate garden navigation.
- `game.js` creates a collision + navigator + controls once in `loadCollision()`, and both direct movement and tap navigation share these. Production has an independent south exit to Landing, which must remain untouched.
- `star-gate-aftermath.js`: GROUP[15] / C16 says「……星砂を使おう。あそこから地上へ降りられる。」, followed by C17–C25 and Lumiere's departure/return to player control. The knowledge line exists already; no dialogue retcon is needed.
- `star-gate-public.js` saves `garden_star_gate_anomaly` only after a validated Aftermath completion; Progress v1 only accepts registered semantic events and validates dependency ordering.
- Existing users may have completed Star Gate in their durable save. Transition to a new independent knowledge fact must preserve their progress safely; do not lock prior completed saves on update.

## Technical design (foundation only)
- New **unwired** pure module `garden-east-passage.js` exports `KNOWLEDGE_EVENT= garden_star_sand_route_known`, `routeKnown(progress)`, `wouldBlock(from,to,line,known)`, `createFeedbackThrottle(ms)`.
- It contains **no guessed map coordinates, no storage writes, no DOM, no collision mutations**, and is not included in the live HTML.
- The map-authoring B-line geometry is `{a:{x,y}, b:{x,y}}` in the original 1448×1086 reference coordinate system, with the precise endpoints deliberately **PENDING**: the screenshot is not stored in the repository as an anchored coordinate. Do not infer them from viewport pixels or invent a pillar coordinate.
- Never turn this module on for production before that geometry is verified against both the image and the v6 collision walk graph.

## Remaining integration
1. Fix B-line endpoints by comparing the user-selected screenshot with map-authoring reference coordinates and path intersections. Confirm a single reachable choke and no route around either endpoint before gating.
2. Register a separate durable `garden_star_sand_route_known` event with explicit prerequisites. Record it when the C16 knowledge is genuinely delivered, using a safe durable boundary in the Aftermath completion/observer; prevent aborted/cancelled/partial runs from setting it. Preserve preexisting completed saves via verified backward-compatible migration or equivalent typed restoration; never infer unknown future flags from mere event success in general.
3. Integrate boundary with **both** `collision.isWalkable` / `collision.segmentClear` and the tap-to-move navigator. Replan after unlocking without introducing a stuck route, teleport, or phantom blocked zones. Test foot-point handling and obstacle corner bypass.
4. Add a short Shion-only one-time-per-attempt line (provisional wording 「この先は、しばらく使っていない道だ。今は引き返そう。」) as independent non-event dialogue; preserve event dialogue/gesture routing.
5. Add explicit isolated checkpoint only with real runtime and no production save writes, then affected regression suite, GitHub CI, independent read-only review and iPhone B-line device checklist.
6. No star-sand map transition in this ticket; new scene creation follows as a separate task. main merge and publication prohibited until all gates pass.

## Acceptance checklist
- Before Lumiere: locked at B; controls elsewhere function
- After Lumiere but before route decision: locked, no false unlock
- During Future Shion / failed Aftermath / retry: locked, no stale persisted fact
- After explicit C16 knowledge, once control returns: open and Tap-to-Move can cross
- Repeated joystick/tap: no repeated dialogue, no invisible wall elsewhere
- Pre- and post-completion reload/Continue, Landing roundtrip: correct durable state; older valid completed save not stranded
- Existing Star Gate normal/corrupt, animations, music, dialogue, companion, south return unchanged

## Evidence boundary
No preflight run or full Node regression was executed locally: there is no checkout or Git network in the current worker container. GitHub Actions may independently validate this proposed branch. Tests in `tests/garden-east-passage.test.cjs` are newly authored, not yet asserted PASS. This PR is not a finished gate.
