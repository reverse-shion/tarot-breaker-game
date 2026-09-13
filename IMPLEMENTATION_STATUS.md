# TAROT BREAKER 2D implementation status

## 2026-09-13 continuation

Astraの既存2Dプロトタイプを監査し、専用リポジトリへ正式プレイヤー実装を継続した。

実装済み:
- 星門庭園マップ表示
- カメラ追従
- キーボード移動
- iPhone/iPad向け仮想スティック
- 正式シオン idle / walk_down / walk_up / walk_left / walk_right の読み込み
- 方向に応じた歩行シート切替
- 歩行中4フレームアニメーション
- 停止時は方向別idle表示
- manifestの384x512セル / baseline_y=480を使用した足元基準描画
- マップ実寸に合わせた座標スケール補正
- シオン表示サイズ 78px
- カメラ最小ズーム 1.0
- 足元影・輪郭補助・進行方向look-ahead
- GitHub Actionsによる自動品質チェック

## Star Gate Garden 2.5D Phase 1

2026-09-13: IMPLEMENTED / DEVICE TUNING PENDING

実装内容:
- 1枚絵マップを維持したまま前景遮蔽レイヤーを追加
- 描画順を `背景マップ → 影 → シオン → 前景遮蔽` に変更
- 噴水手前縁を前景として再描画し、奥側を通る時にシオンが隠れる構造を追加
- 左右の庭園縁・柱周辺にも前景遮蔽領域を追加
- 各前景に depthY を設定し、シオンの足元Y座標で前後関係を判定
- 当たり判定を足元1点から7点サンプルへ強化
- 噴水・左右柱に明示的な障害物判定を追加
- `?depthDebug=1` で当たり判定／前景マスクを可視化できるデバッグモードを追加
- 公開プレビューを preview-6 に更新

Phase 1の目的:
- シオンが常に背景の最前面に表示される問題を解消する
- 柱・花壇・噴水の裏へ回った時に自然に隠れる2.5D表現を成立させる
- 足元基準の移動と障害物判定で「絵の上を滑る」感覚を減らす

## Automated quality gate

2026-09-13: PASS

確認済み:
- game.js JavaScript構文
- 必須ゲームファイルの存在
- 正式シオン5シートのPNG形式
- idle / walk 4方向が各1536x512
- manifest cell_size = 384x512
- manifest baseline_y = 480
- idle / walk 4方向が各4フレーム
- index.htmlからgame.css / game.js / 星門庭園マップへの参照
- 2.5D Phase 1実装後のGitHub Actions `Validate TAROT BREAKER 2D` run #16: success

未確認（実機調整）:
- 噴水手前縁の遮蔽範囲が実画像と完全に一致しているか
- 左右柱／花壇の遮蔽範囲が自然か
- 柱周辺の当たり判定が厳しすぎないか／緩すぎないか
- iPhoneで前景再描画による性能低下がないか

## 操作系 Phase 2 — Tap-to-Move + improved floating stick

2026-09-13: IMPLEMENTATION COMPLETE / IPHONE UX CHECK PENDING

実装内容:
- `feature/tarot-breaker-tap-to-move` を作成
- 手動作成した `star-country-gate-garden-collision.json` をNavigationの唯一の歩行ソースとして使用
- 16px Navigation Grid生成
- 8方向A*経路探索
- Line-of-Sightによる経路短縮
- 歩行不可地点タップ時の最近傍歩行可能地点への補正
- Tap-to-Moveを主操作として追加
- 左側ドラッグ時のみフローティングスティックへ切替
- 12 CSS px / 250msによるTapとDragの判定
- スティック半径64px、15%デッドゾーン、指数1.4の速度カーブ
- スティック／キーボード入力で自動移動を即キャンセル
- 会話・調査イベント用の入力suspend/resumeイベントを追加
- タップ地点へ控えめな星光フィードバックを追加
- `?navDebug=1` でNavigation Grid・経路・Waypoint・入力状態を表示
- PCのWASD / Arrow Keysを維持
- 正式シオン78px、4方向4フレーム、方向別idle、影、カメラを維持
- 公開プレビューをTap-to-Move版へ更新

仕上げ修正:
- 最新の手動当たり判定22範囲を取り込み
- 右側横通路と本線の間に残っていた約3〜4pxの編集誤差を、8×8pxの極小接続ポリゴンで補正
- 右側横通路もNavigation上で到達可能になることを自動テスト対象へ変更
- 公開プレビューを `preview-10` へ更新

自動テスト:
- JavaScript syntax check
- PNG / manifest / required assets validation
- collision JSON validation
- A* route generation
- fountain detour
- nearest walkable projection
- route smoothing safety
- Tap / Drag arbitration
- floating-stick response curve
- manual input cancellation
- game integration
- east passage route connectivity

残る確認:
- iPhone SafariでTap-to-Moveの体感が自然か
- タップとドラッグの12px閾値が誤操作を起こさないか
- スティックのデッドゾーンと速度カーブが使いやすいか
- 右側横通路を実際に最後まで歩けるか

Phase 2判定:
- 技術実装: PASS
- 自動検証: PASS（最新Actions結果で最終確認）
- 実機UX: PENDING
- Phase 3には進まない
