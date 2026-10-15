# TAROT BREAKER — 東側通路B案・実装引き継ぎ契約 v0.1
Date: 2026-10-15
Base main: `4d95d98bcac7723dfd006931400bf8b86ad212e0`
Feature branch: `feature/garden-east-passage-b-foundation`
Risk: HIGH once integrated (Progress / Save / collision / Tap-to-Move / iPhone)
Status: IMPLEMENTED CANDIDATE / POSITION ACCEPTED / remaining Device Gate PENDING / NO MAIN MERGE

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
- Shared pure module `garden-east-passage.js` exports `KNOWLEDGE_EVENT= garden_star_sand_route_known`, `routeKnown(progress)`, `wouldBlock(from,to,line,known)`, `createFeedbackThrottle(ms)`.
- Geometry is an explicit provisional candidate derived from the image + existing v6 polygon walk graph. The pure module itself never writes storage/DOM and does not mutate map collision.
- `index.html` loads it before `game.js`; the **player's movement collision only** is guarded in `loadCollision()`, while the canonical navigation graph, NPC paths, map solids and Landing return remain unchanged.
- Near an actual blocked crossing, `game.js` uses the existing shared Dialogue UI to show Shion's short one-line reaction; repeated contact is throttled and controls resume after dismissal.
- `route-registry.js` registers independent typed semantic event `garden_star_sand_route_known` without modifying Progress v1 schema. `star-gate-public.js` writes it only after actual validated Aftermath completion + persisted Gate event (when C16 has been seen). For older saves already containing completed Gate event, it performs explicit legacy migration on Gate restore. Only durable confirmed knowledge opens the line.
- The user supplied an updated iPhone screenshot showing Shion on the lower-right platform at the east passage. Candidate crossing line in 1448×1086 reference coordinates: **B_LINE (1398, 740) → (1398, 844)**. This is a geometrically tested candidate, NOT pixel-exact iPhone calibration. The author photograph is not a reproducible ref-point acquisition trace.
- Polygon walkability sampling and coarse route BFS found the far-east walkable endpoint unreachable through the B-line when locked, without modifying the upper east courtyard. Exact artwork/footpoint alignment remains DEVICE PENDING.
- **The branch is testable but NOT released**. Production main stays unchanged until the user confirms B-line placement and behavior on iPhone, and the independent integration/merge gates pass.

## Current scope and remaining work (2026-10-15)
1. Code candidate now includes B-line crossing, Shion's dialogue, independent durable knowledge fact, and old-save migration. No new map/scene transition has been created.
2. **Position confirmed**: on 2026-10-15 the owner answered 「位置は問題ないよ」 after the fixed candidate URL was supplied. Keep B_LINE (1398,740)→(1398,844) unchanged. This feedback verifies location only; it does not verify event-state release, interruption or Save/Continue on iPhone.
3. Run an independent read-only diff review against main. Verify player manual/tap blocking, dialogue closing/press-hold throttling, unrelated Garden walkability, event interruption, old/new Save/Continue, Landing roundtrip, star-gate visual/Audio and character movement.
4. Run the complete baseline CI and targeted tests; preserve all locked contracts. The Main Merge Gate is expected to remain blocked while DEVICE_RESULT: PENDING. Never forge the Device Registry.
5. Owner iPhone isolated and integration Device PASS at **exact tested runtime SHA** is required before merge. Do not merge or publish without the owner's explicit authorization for this HIGH gameplay change.

## Automated evidence
- Earlier candidate runtime `312d749dcf57707e78f92f8cee59002b0462471b`: [Validate #38737649188](https://github.com/reverse-shion/tarot-breaker-game/actions/runs/38737649188), **514/514 PASS**, failures 0, skips 0, known failures 0; this does **not** certify later changes.
- Added fail-closed guard for nonpersistent Progress and legacy-write-failure regression test in subsequent runtime commits; re-run CI for the final exact SHA and record the result.
- Main Merge Gate remains pending until independent review and user Device PASS; a failing device-registry check must not be presented as a code regression.
- B-line **position-only owner acceptance** recorded 2026-10-15. Do not upgrade this to full Human Device Gate PASS without the remaining checks.
- Main baseline remains `4d95d98bcac7723dfd006931400bf8b86ad212e0`.

## Acceptance checklist
- Before Lumiere: locked at B; controls elsewhere function
- After Lumiere but before route decision: locked, no false unlock
- During Future Shion / failed Aftermath / retry: locked, no stale persisted fact
- After explicit C16 knowledge, once control returns: open and Tap-to-Move can cross
- Repeated joystick/tap: no repeated dialogue, no invisible wall elsewhere
- Pre- and post-completion reload/Continue, Landing roundtrip: correct durable state; older valid completed save not stranded
- Existing Star Gate normal/corrupt, animations, music, dialogue, companion, south return unchanged

## Evidence boundary
The initial 515/515 candidate was verified by GitHub Actions. A later test-only update must be checked again. The user accepted the selected warning position; all other human Device Gates are pending. Candidate remains Draft and is not a finished Main Merge Gate.
