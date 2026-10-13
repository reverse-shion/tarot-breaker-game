# TAROT BREAKER Stage 3 透過素材セット v1

v1.9.2の素材Gate不一致を解消するため、ユーザー添付4画像をBuilt-in ImageGenで編集した差し替え候補。

## 内容

|役割|差し替え先WebP|元の参照画像|
|---|---|---|
|小亀裂|assets/events/gate-vision/future-fixation-rift-01-small.webp|image-gen-1.png|
|中亀裂|assets/events/gate-vision/future-fixation-rift-02-medium.webp|image-gen-3.png|
|大亀裂|assets/events/gate-vision/future-fixation-rift-03-large.webp|image-gen-2.png|
|渦|assets/events/gate-vision/future-fixation-rift-04-vortex.webp|image-gen-4.png|

source-png/に編集後PNGを同梱。元の添付画像を上書きしていない。WebPはPNGと同じRGBA画素を保つlossless変換。manifest.jsonに寸法・alpha統計・SHA-256・エンコード前後の画素一致確認を収録。

## 確認済み

- 4枚とも1024×1536、RGBA、完全透明画素と中間alphaが存在。
- 宇宙の風景・星・銀河・円形記号・ルーンを除去した独立した効果。
- 小→中→大は縦の主亀裂と左上→右下の枝を基本に拡大。渦は大亀裂を参照して編集。
- WebP再decodeのRGBA画素は同梱PNGと完全一致。

## 未確定・実装時に確認

- 同じキャンバス寸法は同じ傷アンカーを保証しない。生成時は(512,768)を共通起点に指示したが、形状の起点と渦中心は実物に基づいて登録すること。
- manifestのcanvas_centerは初期参照値であり、完成したSource Space Anchorではない。傷の交点/渦の奥を選び、共通の画面アンカーに合わせる。
- 全画像を画面サイズいっぱいに貼らない。透明余白を考慮し、v1.9.2の小・中・大の表示寸法と倍率を素材登録表で設定する。
- 大亀裂は細い枝の発光が強く、実表示サイズでは雷に寄って見える可能性が残る。D4を検証し、必要なら素材を再修正する。円形記号の除去と、雷誤読の防止は別の判定。
- alpha非ゼロ領域には微弱な縁の画素も含まれる。大亀裂のキャンバス端には最大alpha 9/255、渦では4/255の微弱画素が残る。廃墟へ重ねて矩形端が視認されないことを確認する。
- 小→中→大のCrossfade連続性、Large→Vortexの中心接続、廃墟/人物/UIへの重ね合わせ、iPhone性能は未検証。
- 4枚のRGBA単純展開目安合計は24MiB。ブラウザの総メモリ使用量ではない。WebP圧縮容量と混同しない。

## Codex再開指示

1. 元の4素材を維持した上で、専用作業ブランチに本セットの正式4パスを配置する。mainへ直接反映しない。
2. §104の素材Gateを再実施し、RGBA alpha・円形記号除去・矩形背景除去を確認する。透明化だけで全項目PASSにしない。
3. 各画像の傷起点/渦中心/最終表示寸法を登録して、小→中→大→渦の重ね合わせを廃墟上で確認する。起点補正は素材側で行い、Actor/Arcanaを移動しない。
4. 素材契約とコード照合が成立すれば、v1.9.2のdev=star-gate-full実装・テストへ進む。台詞・CANON・通常公開経路・Production進行/保存を変更しない。
5. 素材の形状または連続性が契約を満たさない場合は、どの画面で何が見えるかを示して最小の素材修正を報告する。新しい設定や別の台詞で補完しない。
6. 実装後の検証リンクと、未実施のiPhone Gateを提示する。

本セットは素材差し替え候補。ゲーム内・iPhoneのDevice PASSを主張しない。

