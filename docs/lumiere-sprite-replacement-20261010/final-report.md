# 最終報告 — 正規4方向画像差し替え

判定: 画像差し替え実装済み、Draft PR作成済み。iPhone確認・Device Registry登録前のため統合STOP。全CI PASS／実機PASS／マージ許可とは扱わない。

1. **4枚の取り込み元と変更前後SHA**: [READMEの全SHA表](README.md#素材と配置)、[registration.json](registration.json)、[baseline-input.json](baseline-input.json)。指定入力4Blobすべて完全一致。PNG実体をロスレスWebPへ変換し、必要な画像側配置調整のみ実施。再生成・別素材採用・コミットの丸ごと取り込みなし。
2. **透過・サイズ・アンカー**: 4枚とも1254×1254、RGBA、透過対応VP8L。背景透過と正規入力の輪郭半透明を保持。指定12アンカー、files対応、render全値はmainと同一。[transparency-checks.json](transparency-checks.json)。正規入力の内部alpha255と旧alpha252/253の差は記録し、推測で透過を足していない。
3. **身体サイズの証拠**: 基準63.984375px。4方向とも旧版と新候補の頭頂y・足先y・身体高さが一致。最大内部ランドマーク差0.710005基準px。[身体実測](final-candidate-landmarks.json)、[実庭園4方向](garden-four-directions.png)。シオンのコード・素材・描画スケールは変更なし。
4. **lumiere-sway.js**: 変更なし。実画像で髪・裾領域を再検査し、顔・胴体・脚・翼を除外する既存座標が適合。周期5.2秒、振幅2.4px、既存の局所強度を保全。新画像4方向の画素検査、独立領域検査、各10.5秒の実ゲーム制御時計証拠を作成。
5. **変更ファイル**: [全一覧](changed-files.txt)。ゲーム配布対象は4画像＋manifestのみ。その他はリュミエール専用テスト・歴史的preview fixture・検証資料・固定プレビュー。game.js、index.html、audio.js、既存エディタ、他キャラクター、マップ・セーブ・会話・イベント・カメラ・検証ルールは無変更。
6. **自動検証**: 基準main337/337 PASS、候補342/342 PASS、揺れ8/8 PASS、追加専用5/5 PASS。validate・背景・音声・差分検査PASS。GitHub通常検証CI PASS、Main Lineage PASS。Device Registry Guard FAIL（正確なruntimeの実機記録未登録）。[CI証拠](ci-checks.json)。342件には揺れ8件と専用5件を含むので合算しない。
7. **独立レビュー**: [independent-review.md](independent-review.md)。画像再現・領域・保全を実装担当と別に検査。実機と既存音声例外を統合判定の未解決事項として保持。
8. **Draft PR**: https://github.com/reverse-shion/tarot-breaker-game/pull/135 。作業ブランチ `fix/lumiere-official-sprites-20261010`。
9. **iPhone候補**: [固定commitの確認ページ](https://raw.githack.com/reverse-shion/tarot-breaker-game/8eb3840278aa0b9026eecdc5d3102c9c193c5d6b/docs/lumiere-sprite-replacement-20261010/lumiere-official-4357584.html?dev=garden-resume-after-lumiere)。配布runtimeは `43575846ece577693c26cc4ac1910e15336ecd92` に固定。実ゲームのG3星門庭園、同画面のシオン、4方向と揺れON/OFF、小さな下端ボタン。診断パネル・位置調整エディタなし。公開ページと37種類の参照素材をHTTP200・実バイトSHAで検証した。Safari実機はPENDING。
10. **main未変更**: 開始・最終リモート確認とも `aa65642bd9cfb771ea06f1a5ad3c9e6d1dbfddac`。mainへのpush・merge・resetなし。Production公開なし。

追加タッチ試行では移動とtouchCancelは成立したが、既存audio.jsで負のvolume例外を観測したため試行全体をFAIL記録した。mainと候補のaudio.jsはバイト同一で、開始時刻より古いRAF時刻を入力すると両方で同じ例外を再現する。[比較証拠](audio-timestamp-diagnostic.json)、[追加試行](fixed-preview-touch-checks.json)。対象外の音声変更は行わない。iPhone確認とこの事項の扱いが確定するまで統合判定を進めない。
