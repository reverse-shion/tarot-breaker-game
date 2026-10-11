# TAROT BREAKER — 星門二状態・帰還後表示の実測手順 v1.1

- 監査ブランチ: `audit/star-gate-visual-trace-20261011`
- 調査元PR: #114（Draft / 未マージ）
- 固定調査元: `ceb7f64c50d426ba975f5f1e4a825935db3d8a2b`
- 以前の比較基準: `02a0a5c359dae9e977f556f956b3a28cf40817ab`
- 性質: **監査専用・opt-in**。演出・画像・フィルターの修正ではない
- 使用条件: `?dev=star-gate-full&gateAudit=1`（`gateAudit=1` がない通常devには未ロード）
- main / Production: 変更なし

## 新たに確認した事項

1. `02a0a5c...` の `star-gate-anomaly.css` にも `scene-gate-inner-backing` 指定があり、CSS全体を巻き戻す基準には使えない。基準→HEADの差分は `star-gate-anomaly.css` と `tests/star-gate-front-integration.test.cjs` のみ。
2. HEADの正常内光の親は元HTMLでも `opacity:1; mix-blend-mode:normal; filter:none`。過去の `.42/screen` が今の直接原因だとする根拠はない。
3. 通常内光のWebP `assets/maps/star-country-gate-garden-star-gate-inner-light.webp` は RIFF/WEBP VP8X のアルファフラグを保持する。CSS `opacity:1` は画像の透過画素を不透明にできない。ただし**この事実だけでは**目標見た目との差の原因と断定できない。
4. `assets/events/gate-vision/garden-star-gate.webp` は侵食時に別画像として表示される。紫模様は内光のCSS効果だけではない。
5. `sga-anomaly-rest` でDark Energy 01–04は非表示指定済み。既存のCSS文字列テストは復帰後の画面描画を保証しない。
6. 内光と星門の重なり・アルファ・after/before・CSS適用元と、イベントの解除タイミングを実機で追跡する必要がある。**filter値の変更は禁止。**

## 取得するチェックポイント

| レコード | 状態 | 実測するもの |
| --- | --- | --- |
| `normal` | 星門イベント前 | 内光・外枠・重なり、opacity / blend / filter |
| `corrupted_pre_black` | Dark Energy 上昇完了後／未来暗転前 | 内光・外枠・Dark Energy非表示、画像のDOMソース |
| `present_return` | 現在帰還、Stage3後に描画済み | 侵食状態の保持と異常レイヤーの消滅 |
| `free_control_1/2/3` | Aftermath自由操作・会話復帰 | スタイルの継続と他クラスの上書き |
| `aftermath_completed` | 会話・先行退場後 | 終了後の星門、リュミエール退場後の表示 |
| `manual` | 手動 | 画面を見た時点のスタイルを補足 |

各レコードは状態クラス・画像URL・画像寸法・矩形・親子Computed Style・擬似要素・Dark Energy 01/04・Celestial layer・CSSの一致規則／宣言元をJSONで記録する。

## iPhone実機手順

1. **監査ブランチの固定コミットURL**をiPhone Safariで開く。通常入口とは別に `&gateAudit=1` を付ける。最終コミットSHAをURLに使用する（古いSHAのURLは自動更新されない）。
2. 通常の「物語をはじめる」から星門調査を選ぶ。画面右上に小さな「星門記録 N」ボタンが出る。
3. イベント前の正常な青白い星門、Dark Energy上昇完了後の侵食した星門、帰還後、自由操作後、会話終了後を**同一向き**で確認する。基準「左」「右」の添付画像とそれぞれ比較し、スクリーンショットを残す。
4. 最後に「星門記録 N」を開き「JSONをコピー」を押して記録を保存・共有する。コピーできない場合はテキスト欄を選択してコピーする。取り逃した場面は「今の画面を記録」で補う。
5. 異常が生じたときは場面名を添え、スクリーンショットとJSONレコードを対にして報告する。

画面の色・素材の一致はJSONだけでは確認できない。**CSS一致 = 画像一致ではない**。Chrome簡易模擬・iOS以外のPASSを物理iPhoneのPASSへ読み替えない。

## 判定条件

- Normal が元の左画像と一致（元素材、形、色、透明度）。
- Corrupted が右画像に一致。単色の黒紫ベタ塗り／透け／Dark Energy 04の残像なし。
- `corrupted_pre_black`、`present_return`、`free_control_1`、`aftermath_completed` でGateの表示が同一に保たれる。
- 差異があれば、最初に差異の起きたレコードと **該当CSS宣言元** を特定してから最小修正する。根拠がないバックプレーン復活・CSS丸戻し・filterの値変更は禁止。
- 安全テスト・iPhone実機Gate完了前の本番公開とPR #114 mainマージは禁止。

## 実施済みと未実施を区別する

監査実装で行うのは「記録を可能にする」こと。端末での一連の再生・画像比較・Computed Style採取は実機操作が完了するまで **UNPERFORMED**。監査ツールを追加したことを本体の表示不具合修正と扱わない。
