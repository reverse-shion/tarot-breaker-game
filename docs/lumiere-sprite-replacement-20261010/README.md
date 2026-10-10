# リュミエール正規4方向画像差し替え — 2026-10-10

基準main: `aa65642bd9cfb771ea06f1a5ad3c9e6d1dbfddac`。
作業ブランチ: `fix/lumiere-official-sprites-20261010`。HIGH / Draft / iPhone実機PENDING。mainへのマージ・Production公開は禁止。

## 素材と配置

指定4コミットの該当ファイルだけを取得し、指定Git Blob SHAとの完全一致を確認した。アップロードは拡張子`.webp`だが実体は1254×1254 RGBA PNGだったため、現行仕様の透過対応ロスレスWebPへ変換した。画像生成、ブランチのマージ、チェリーピックは行っていない。

| 方向 / ファイル | 取り込み元コミット | 旧Git Blob SHA | 指定入力Git Blob SHA | 最終WebP Git Blob SHA |
|---|---|---|---|---|
| Down / lumiere_idle.webp | 925cf3a297874b15384fec86a2bdc8c38c536318 | c66c0aad1fc456a55744e8d5c766a7b745498b62 | 99579abeca9a2673b5785902f6fea27985d7b8e9 | 394df3b78a12b54a6b79a29ac074970f58b3c48f |
| Up / lumiere_hover-back.webp | f980b92706da9361f25e0195083f768b941ffcb8 | 48152b68ecf23944bacb286fa2cabc6087d0cf72 | d052a34cab6179e5dbb9dd5273cb5dc0190d0395 | 030b4f171001678f4702d766a9cb2c37eb7ee23a |
| Left / lumiere_hover_left.webp | ab3fc22d8128ff28432871f3a2fa00887bb88e21 | 541a45eb8166d597362ed669b2fdd015fc670eb7 | 378a91e0dbaa10b5226442f78fee0c0d6ead2b1c | 8cebb2b097e134dc2f883b6db10107ae433f802e |
| Right / lumiere_hover_right.webp | 559eba6d64b0fffb3cb0d7e28938bf0f62389ee3 | aa87b7a7469846e71ff21571e4a32b4a5a3b001f | 7e83bd65bdb13405d0ba226db9a92a05ecc3a41d | 0403fa3d04b9e69807c9b0448cbf32e310a1d606 |

新素材をそのまま置くと頭頂位置が最大約2.32基準pxずれ、身体高さが最大約4%増えるため、透明1254角キャンバス内で等倍率変換と平行移動だけを行った。身体の部分変形・アンカー変更はしていない。具体的な変換と全SHA256は[registration.json](registration.json)、旧SHA256と固定値は[baseline-input.json](baseline-input.json)に記録した。

入力にあった計4画素の独立した低アルファの点と、補間で生じた独立した微小な点147画素（アルファ最大2/255）を除去した。接続された髪・衣装・翼・星装飾はこの処理の対象にしない。全座標を記録し、WebP再デコードと調整後RGBAの完全一致を確認した。`source_sha256`はアップロードPNGのバイト列、`sha256`は最終WebPのバイト列、`decoded_rgba_sha256`は最終WebPのRGBA列を示す。

旧版の翼・肌・髪・布内部は一様にほぼ不透明なアルファ252/253、新入力の内部は255である。新入力の正規アルファを保ち、翼の半透明を推測で描き足していない。背景透過と半透明の輪郭は保持されている。チェック背景・実際の星門庭園で4方向を検査した。

## 身体サイズ・立ち位置・揺れ

manifestの`files`、12アンカー、幅高さ、render、phase、localized_swayは旧版と同一。身体基準は`78 × 420 / 512 = 63.984375px`、bottom_gap=2.7、上下振幅2.4px、周期5.2秒を保つ。`lumiere-sway.js`・`game.js`・`index.html`はmainとバイト単位で同一である。

| 方向 | 頭頂y 旧→新 | 足先y 旧→新 | 身体実測高さ 基準px 旧→新 |
|---|---|---|---|
| Down | 63→63 | 1165→1165 | 63.637889→63.637889 |
| Up | 74→74 | 1126→1126 | 63.923611→63.923611 |
| Left | 100→100 | 1142→1142 | 63.678814→63.678814 |
| Right | 61→61 | 1154→1154 | 63.577202→63.577202 |

透明余白・翼・星飾りを身体高さに数えず、同じ解剖学的ROIとアルファ閾値で測った。目や足の水平位置の残差は最大0.710005基準px。新イラストの内部比率の差は隠さず[final-candidate-landmarks.json](final-candidate-landmarks.json)に記録した。シオンの描画・素材・スケールは変更していない。

新画像の実領域を検査し、既存の髪・裾領域に顔・胴体・脚・翼の重なりはない。領域内に実際の毛先・裾があるため、座標変更は不要。[sway-pixel-proof/metrics.json](sway-pixel-proof/metrics.json)は最終画像4枚で新たに測定した各34位相の結果で、領域外と境界の画素変化は0、OFF時は同密度の元画像と完全一致、領域内に動きがあり、毎フレームの割り当て・readback・pixel writeは0。旧証拠を新画像のPASSとして利用していない。

## テストと保全

基準mainの回帰テスト337/337 PASS。候補の既存回帰337件と追加の画像・証拠検査はPASS（最終件数・CIはPRおよび最終レポート参照）。既存のvalidator、既知failure一覧、回帰基準は変更していない。

歴史的な固定プレビュー2件は、旧commitのmanifestを現在のmanifestと比較していた。その1ファイルだけを正確な旧Gitソースのfixtureへ切り替え、過去の固定ハッシュとの一致検査を保持した。他の全ソース・JS解析・エディタ検査は保持し、新候補の素材・ハッシュ・アンカー・実測証拠は別テストで固定している。

長時間のChromium計測1回でBGMの負のvolume例外を観測した。main画像の同手順では再現しなかったが、実際のmainと候補の同一`audio.js`を分離実行し、RAF時刻がfade開始`performance.now()`より1ms古い条件で両方とも同一行・同一値の例外を再現した。該当処理は一切変更していない。これを全ゲームの音声PASSやiPhone実機PASSとは扱わない。

## 固定プレビューとiPhone確認

`build-clean-preview.py`は既存の固定プレビュービルダーから派生したリュミエール専用検証資料である。commitの全スクリプト・CSSを埋め込み、全画像参照をその正確なcommitへ固定する。Productionのページやロード処理は変更しない。既存G3と公開Stage APIだけでシオンを確認位置へ動かし、下端の小さな方向ボタンを表示する。位置調整エディタや診断パネルは表示しない。

iPhone Safari実機はPENDING。正面・背面・左右それぞれ10.4秒以上、揺れON/OFF、方向切り替え、身体比率・足元、顔・翼・脚の固定、毛先・裾の自然さ、通常のタップ移動とドラッグ、星門庭園の前景、タブ復帰・reload、縦画面を確認する。自動テストとChromiumの結果は実機PASSの代用にしない。Device Registry Guardはこの正確なruntimeの人間のPASS記録までブロックされる。

## 再現

画像調整はPillow12.3.0、numpy、scipyによる開発用処理で、ゲームやCI依存関係へ追加していない。

```sh
python3 docs/lumiere-sprite-replacement-20261010/register-images.py
python3 docs/lumiere-sprite-replacement-20261010/measure-final-landmarks.py
node scripts/validate.mjs
node scripts/validate-background-assets.mjs
node scripts/validate-audio.mjs
node scripts/test-regression-baseline.mjs
node --test tests/lumiere-sway.test.cjs
node scripts/check-lumiere-sway-pixels.cjs /tmp/lumiere-final-sway-proof
```

画像再現には指定4commit、解剖学的測定には基準mainのGitオブジェクトが必要。ソフトウェア画素検査には開発環境の`@napi-rs/canvas`を利用する。
