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

次の品質ゲート:
1. iPhoneで通常プレビューを起動
2. 噴水の奥側へ移動し、シオンの下半身が手前縁に自然に隠れるか確認
3. 左右の柱・花壇沿いを歩き、背景オブジェクトの裏に入る感覚があるか確認
4. 噴水・柱へ入り込めないか確認
5. 不自然な遮蔽がある場合は `?depthDebug=1` で境界を確認して座標調整

Phase 1実機確認後、遮蔽マスク座標を微調整し、Phase 2（奥行きスケール／NPC Y-sort）へ進む。