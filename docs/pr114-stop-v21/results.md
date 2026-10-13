# PR #114 STOP修復 v2.1 — Astra再監査引継ぎ

Status: IMPLEMENTATION / Draft維持。mainマージ・Production公開なし。
コード上の統合／テストSTOP要因を修復。実機未確認によるDevice Gate STOPは維持する。

## SHAと統合

- 修正前PR: `ee6ee0992652660dfb8398ddb33c14a7c252cb22`
- 取得した最新main: `22c07ae94d7491c3818b57574da7ee3af12edfc4`
- 統合・修正runtime: `b8cd71755f7eafabf7c23fc3c85c779f345ea948`
- 通常の二親merge。親は上記PR/main。履歴削除、reset、force pushなし。
- 作業開始と修正終了時の再取得で両リモートに監査SHA以後の変更なし。
- evidence-only commitがruntimeの上に追加される場合、最新PR HEADはPR本文／Checksで確認する。旧候補の実機PASSを転記しない。

## 競合と変更理由

game.jsの9競合を各箇所の役割で照合した。旧wing-hold定数／固定ポーズ表を最新mainのmanifest契約へ更新、dev専用asset-base条件を残してmainのlocal fallbackを維持、compositor初期化とdrawActor連携を復旧した。ファイル全体のours/theirs採用はしていない。Aftermathの退場用矩形だけが旧ポーズ表を参照していたため、同じmanifestと約63.984375pxの人物高さへ合わせた。

| 今回の修正ファイル | 理由 |
|---|---|
| audio.js | pagehide明示停止状態、pageshowとeventSession中の復帰、解放後の通常再開、古いplay Promiseと新しい再生の競合防止、既存操作からの再試行 |
| game.js | mainのLumiere描画をPRへ安全に統合、Aftermathの描画範囲を実描画と整合 |
| tests/audio-lifecycle-recovery.test.cjs | native play完了時の遅延状態変化／拒否／timeout／背景復帰／ミュート／正常releaseの13件追加 |
| tests/af-scene-adapter.test.cjs | 4方向の実manifestに基づく描画範囲・画面外退場の追加検証 |
| tests/stage3-card-detail.test.cjs | CSSStyleDeclaration APIを追加。承認済みの3鼓動中の通常カード保全、縁→中心侵食、軟らかい境界、Re保持に再照合。途中サンプルを増やして検証 |
| tests/lumiere-b-preview.test.cjs / tests/lumiere-release-preview.test.cjs / tests/fixtures/lumiere-preview-sources-9e8a85d.json | 固定SHAの過去プレビューを元Gitソースへ照合。全固定ハッシュを保持して現在のイベント差分と区別 |
| docs/pr114-stop-v21/* | 作業契約、実行結果、再監査証拠 |

mainから採用したtests/game.test.cjs、tests/garden-arrival.test.cjs、tests/artwork-alignment.test.cjs、tests/audio-fade-timestamps.test.cjsは最新mainと同一。これにより古い2172×724画像モックを現行4方向RGBA WebP／manifestへ整合。main由来のindex loader、検証器、sprites、manifest、Lumiere sway、device evidenceも保全した。

## 保全確認

- Lumiere素材／manifest／lumiere-sway.js／scripts/validate.mjsはmainと同一。新規生成・素材差替え・サイズ変更なし。compositorの4方向、髪／裾の局所揺れ、翼／顔／胴体保全、約64px、bob 2.4px・5.2秒を既存mainテストで確認。
- 通常BGMフェードの進捗／音量clampと4境界テストを保全。正常transportはrelease時に停止せず、追加playを呼ばない。再開拒否後は許可された移動操作で再試行できる。
- ブラックアウトのnative mutedを保全。revealはplayを呼ばず、pagehide復帰でも黒中にunmuteしない。
- star-gate-anomaly.js/css、future-stage3.js/css、star-gate-aftermath.js/css、future-vision-audio.js、scene-preview41-fix.js、single-map-occlusion.js、dev-checkpoints.js、stage3-dev-bootstrap.jsは監査PRと同一。星門二状態／gate-void／内光4値／侵食・境界ぼかし／3鼓動／Re保持／亀裂→渦→白→黒／R06後1550ms／R01〜R14／両会話順／グループ条件／Lumiere先行退場／しおぽんFollowを変更していない。
- Save/Continue/Title/Progress/Journey、通常ルート、dev分離、collision/navigation、Alenon native audio、既存Device Registryとbaseline契約を変更・弱体化していない。星砂の道の通行制限は未実装。

## 自動検証結果

| 対象 | 結果 |
|---|---|
| 最新main全Node | 341/341 PASS、fail/skip/cancelled 0 |
| 最新main regression baseline | PASS、新規失敗0 |
| 修正前PR全Node | 417件中388 PASS／29 FAIL。古い画像モック系24、card-detail DOM API不足5 |
| main統合直後 | 432件中425 PASS／7 FAIL。固定過去プレビュー2、card-detail DOM API不足5 |
| 修正候補全Node | 446/446 PASS、fail/skip/cancelled 0 |
| 修正候補 regression baseline | PASS、known-current 0／new 0／resolved 0 |
| Stage3関連8ファイル | 64/64 PASS、fail/skip/cancelled 0 |
| main由来音量境界4件＋追加復帰13件 | 17/17 PASS |
| Lumiere描画関連6ファイル | 49/49 PASS |
| 構文 | root JS／scripts 57ファイル、失敗0 |
| game assets/manifest | PASS、現在採用済み検証器を維持 |
| background assets | PASS |
| audio validator | PASS |
| Device Registry Guard（PR環境） | **STOP、exit 1**。新runtime SHAは人間確認済みRegistryに存在しない。保護を維持 |

Stage3対象8本: stage3-audio、stage3-background-coverage、stage3-card-detail、stage3-timeline、future-vision-audio、future-present-audio-preparation、future-present-presentation、star-gate-front-integration（各tests/*.test.cjs）。Aftermath両順／14Box／Follow、Save/Continue、VGC、route、dev隔離も全Nodeに含まれる。

初回の制限sandboxではchild_process spawnSyncがEPERMで失敗し、Nodeの内訳がfile-levelへ崩れた。権限付きsandboxで再実行して上記の実テスト件数を取得した。環境由来の初回結果をゲームの失敗やPASSへ流用していない。

新規修正ファイルのdiff --checkはPASS。全差分では既存PR文書2件のEOF空行とmainから取り込んだ固定プレビュー5箇所の末尾空白が警告される。固定プレビューはmainの同一バイトを保全し、警告を隠すための書換えは行っていない。

## ChromiumとCIの境界

ローカルChromium、390×844と844×390でStage3 boot／実compositor／Aftermath矩形を確認。通常Garden G3にはdev旗／StarGate runtime／選択UIが漏出しない。実HTMLAudioElementを使い、accepted keyboard操作から再生、pagehide停止、pageshowの黒中hard-mute復帰、表示後reveal、健康なreleaseの追加play 0を確認。pageErrors 0。詳細はbrowser-smoke.json。

これはローカルsimulation。可変main画像URLの試験transportは同一チェックアウト資源に解決した。物理Safari、スピーカー聴感、OS復帰／実BFCache、配信URLでの通し動作をPASSにしない。イベント全編の新Chromium通しは未実施であり、今回の全編検証は自動runtimeテストの範囲。

最新HEADのCIはpush後のPR Checksで別途確認する。Validate TAROT BREAKER 2DとEvent Safety / Main Merge Gateを区別し、Device stepによる失敗とその後の未実行stepをPASSにしない。CI結果と最新SHAはPR本文／最終引継ぎへ記録する。

## iPhone確認待ち

1. 4方向、髪／裾の局所揺れ、翼／顔／胴体、約64pxとbobを縦横で確認。
2. 星門Normal／Corruptedとgate-void内光4値、縁侵食と3鼓動、Re保持、亀裂→渦→白→黒、R06後1550msを確認。
3. BGM Garden→未来ruins→fix→白無音→低音量ruins→黒完全無音→現在BGMを聴く。二重再生・無音残留を確認。
4. 通常、イベント中、黒中、復帰後で背景化／復帰・画面回転を確認。自動再生拒否時は次の許可された操作で安全に再開し、黒中に鳴らないことを確認。
5. R01〜R14、個別会話の両順→2人後のグループ、Lumiere先行退場→しおぽんFollow、操作返却を確認。
6. 通常Save/Continueと通常Gardenへのdevイベント非漏出を確認。

既存の廃墟下端境界などの視覚残件について、この修正だけで実機合格としない。Astra再監査待ち、Device Gate PENDING、ユーザーの明示承認までmainマージ／本番公開禁止。
