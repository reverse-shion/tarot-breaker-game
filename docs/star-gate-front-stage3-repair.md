# 星門前半回帰修復＋Stage 3接続候補（2026-10-05）

## 判定

前半修復とBのStage 3後半を保全し、PR #114追加指示の変化済みカード詳細カットと吸収背景面の左右矩形縁修正を実装。素材BLOCKERは解消。物理iPhoneでの修正効果はUNPERFORMED、廃墟画像の既存下端境界は残件。main merge／通常公開接続なし。

## 比較基準・原因

- A: 5d696165914e585c617d9dbb406c50145d724b28
- B: 794fee3551f4382af7c1349c1986124c35d5d9e8
- 最新main: 5c33fb8ccf9a46321c1dc1c94ba1dfac125900f3
- A/B共通祖先: 09aa8a6950c00e71204e03a6d03c580c225b54ee

Aは星門調整系列、BはmainのContinue/Title更新を含む別系列。両端の実ファイル比較と共通祖先以後の履歴を分けて確認し、BをAの単純な後続とは扱わなかった。Bを基準に限定追加し、Aへreset／巨大ファイル置換はしていない。

Bのbootstrapは通常空のまま前半を実行し、拡張空用CSSだけ残っていた。実ブラウザの上パン中、通常画像上端が縦177.903px／横172.375pxへ下がり、その上を覆えていなかった。Aと候補は縦−154.361px／横−326.021pxで覆う。A/B/candidateの390×844と844×390で初期・panシーケンス・正常共鳴・異常逆流を比較。内光はscene-preview41-fix.jsとsingle-map-occlusion.jsの両方で230.86→190になり、正常共鳴/異常逆流のz3も欠落。選択ランタイム不在を直接devボタンで代替していた。

Aの可変main画像参照は現在mainの実体へ解決し、候補のローカル資源に固定。拡張空は自然1003×1568、SHA256 6733b97eff20ff3595e5b0cb1aabb8d8bbe4b09fa2ba1d5f0002ef5ff3e851e1。表示登録1448×1600/top−514は自然寸法と別。A承認当時の可変URL実体を復元したとまでは断定できない。現在実際にAが参照するmain資源の比較を行った。10素材の寸法/bytes/hashはstar-gate-front-stage3-evidence/asset-registration.jsonに記録。

## WORKING / LOCKED・変更

WORKING: dev=star-gate-full前半の空・内光・正常共鳴／異常逆流レイヤー・接近選択・接続・実画像被覆検証。
LOCKED: 最新mainの保存/Continue/通常導線、Alenon音、collision、通常庭園背景/内光、B後半の台詞/時間/固定/Handoff/吸収/白黒復帰/キャンセル。

- stage3-dev-bootstrap.js: devのみ拡張空へ登録、A相当gate+72 fixture(810,177)、右上直接起動除去、元の接近選択モジュールを読み込む。
- star-gate-interaction.js/css: Aの選択UI/半径46、退出96の距離再武装。開始直前にprompt所有ロックを同期解除してからP0取得。離れる場合は未開始。終了/中断はメモリ内消費し、保存へ書かない。別のStage3直起動ルートは追加していない。
- scene-preview41-fix.js / single-map-occlusion.js: devのみX684.57/Y−136.06455078/W230.86/H346.06455078へ一組で復旧。通常幅190維持。
- star-gate-anomaly.css: 前半celestial/dark z3をdev限定復旧。
- star-gate-anomaly.js: 拡張空の既存10秒期限内preloadと実DOM decode、既存座標判定に実画像外接矩形を追加。背景/Actor/カメラは別処理。後半・カード順序は変更なし。
- dev-checkpoints.js: 接近選択、spawn、requiredRuntimeを実接続へ合わせた。

ブラウザ検証でB由来イベント音量補間の負値エラーも発見。原因追加commit d4f5abc5f7fdec2f90a53a185d1b8cc8520c0d20。開始より早いキュー済RAF時刻で進捗が負になる。audio.jsのイベント専用補間1行で[0,1]へ制限した。補間時間/係数/ユーザー設定/通常音を変えず、再現テストは修正前にnative volume例外、修正後PASS。前半比較evidenceの候補縦エラーはこの修復前の証拠として残す。最終通しはエラーなし。

## 前回のアルカナ照合（追加添付前の履歴）

A/Bでpose01〜04素材は同一、赤黒カードを描き込み済み。pose03カード約71×91pxは手の遮蔽があり、詳細表示まで拡大すると粗い。独立dark_aura_01(515×773、hash3c594fb808a716e2e8af7b13be205aefcbe5f1cde79dc10a8fae5bb99c1f78ae)のカード領域約x150–355/y240–475には紫の発光帯が図柄自体を横切る。切り抜きだけでは「漏出前」の鮮明な詳細カットを作れない。dark_aura_02も適合しない。

唯一残る素材BLOCKER: 赤い結晶・金枠/装飾・赤黒い地を忠実に持つ、手・人物・紫オーラ/発光帯のない変化済みカード単独画像。縦画面でカード幅180CSSpx程度を鮮明に読める解像度（高DPRを考慮）と透明余白/カード角の登録が必要。通常カードへの単純色フィルターや人物AI再生成で代替しない。素材適合後、0.8〜1.2秒の詳細カット→認識の間→D02→漏出へ接続し、全終了経路で詳細レイヤーを解除する。この接続は今回は未実装で、D02以前の異常可読性改善をPASSとはしない。

通常参考素材はassets/tarot/backs/tarot-card-back.webp、1024×1536、SHA256 cf814dcf307897bf32b20c8d58d861cb81a2f06fd976f73c35bcbc3e1349f6c4。今回メッセージには実際の通常画像添付がなく、ユーザー添付と同一とは断定していない。

§101の通常カードと赤黒入りR0/R1ポーズ03の衝突は、ユーザーが「R0と同じ赤黒いカードへ戻す（§101の通常表示という記載を訂正）」と明示回答したため解消。R1は既存03を維持し、旧レポートのembedded normal card誤記を訂正。記憶欠落/原因/CANONを追加せず、§78台詞は変更なし。

## 前回の検証（c6964bbe基準）

- 最新main:326/326 PASS。
- 最終候補:352/352 PASS（前半4追加、早いRAF1追加）。既存期待値の弱体化/skip/削除なし。
- preflight・構文・diffチェックPASS。独立Architect/Reviewer確認済み。Device/merge GateはPASSを付けない。
- Chromium151/DPR1: A/B/candidateの縦横比較。候補の空実被覆と内光登録がAに一致し、通常庭園のdevフラグなし登録は標準空/幅190のまま。
- 修復後の統合通し: 接近→調べる→正常共鳴→逆流→Stage1/2→Stage3→R1→P0復帰、completed/restored true、pageErrors/audioFailures/storageWrites 0。後半固定/足元/レイヤーは既存runnerの実DOM検査を通過。
- 選択異常系: 離れるで未開始、keyboardで146→177へ移動して操作返却を確認。距離再武装/再接近は既存TarotStageの合法経路moveで確認し、開始→cancel→P0復帰→所有ロック解除→keyboard移動→メモリ内消費、保存書込0。直線移動/タップだけで退出半径へ達する試行はタイムアウトし、保護対象のcollision/navigationは変更していない。実機で退出経路のtouch確認が必要。
- 通常Title→Alenon正式導線をブラウザ確認。保存/Continueは全既存自動回帰で保全。Aおよび通常Titleの可変main画像は環境のTLS制約を避け、同一最新main資源をローカルHTTPで配信する試験transportを使用した。ソース書換えはなし。
- 物理iPhone D1〜D36 UNPERFORMED。空被覆/光配置/選択touch/離れる移動/共鳴逆流/カード所有権/白後赤黒カード/固定/白黒無音/回転背景化復帰/保存ゼロを確認。カード詳細素材GateはBLOCKED。Large雷誤読と未来廃墟下端境界はBから継承した未合格の視覚課題で、今回変更していない。

候補の公開SHA・Draft PR・到達結果は最終報告で固定する。main merge／Production公開は行わない。


## PR #114追加修正 — カード詳細／White Out左右縁

作業基準c6964bbe50b3926059b36fb91f4ae2681de6bf72がローカル／リモート対象ブランチとPR #114のHEADに一致することを確認。最新mainは5c33fb8ccf9a46321c1dc1c94ba1dfac125900f3。後続修正なし。reset／全体置換なし。

WORKING: 指定カードの外側透過、詳細カット、白転前の背景Canvas矩形境界と関連検証。LOCKED: A前半の空/pan/接近選択/光/共鳴/逆流、Stage1/2、Bの後半台詞・固定・Handoff・音・R1/P0・キャンセル、通常Title/Save/Continue/Progress。HIGH risk、Architect→実装→独立Reviewerを実施。Device/merge Gateは未通過。

### 指定素材と実接続

原本: `assets/events/star-gate/future-fixation/card/arcana-transformed-source.jpeg`。
ゲーム用: `assets/events/star-gate/future-fixation/card/arcana-transformed-detail.png`。

添付実ファイルは1-写真1.jpg（ユーザー指定IMG_7334.jpegの表示画像）。原本は添付とバイト一致、JPEG853×1280。画像編集ツール出力は細部を変更したため不採用。ユーザー明示許可のPython外周マスク処理でRGB全画素を保存し、外側だけアルファ0、内部の穴をすべて保持。カード範囲x48–804/y26–1246、角丸・金枠・白い剣/装飾を保持。画像全体の縦横比/寸法/色は変更なし。RGBA目安4,367,360bytes。原本/PNGハッシュとアルファ検証は[card-registration.json](star-gate-card-white-evidence/card-registration.json)。暗色/灰色背景の確認画像も同ディレクトリ。

`star-gate-anomaly.js`のASSETS.cardDetailを既存10秒preload/decodeへ登録。実関数showArcanaDetailをpose03安定→R0取得の直後に挿入。1000ms詳細→既存720ms認識Hold→§78 D02→既存260ms→暗い漏出→強制挙上/Handoffを維持。詳細はbody独立の編集レイヤーで、Actor・足位置・身長・ワールド内カード所有権を変更しない。人物全体再生成、正常→異常変形、発光/SE/台詞追加なし。try/finallyと共通releaseで全終了経路から除去。白後は既存赤黒カード入りR0 pose03へ戻る。

### 矩形縁の原因と修正

診断で渦のみ／亀裂全体を隠しても左右の矩形が残り、吸収Canvasを隠すと消えた。390×844で旧面がscale.90によりx11.78–362.78/y3.84–763.44へ縮まり、外周が画面内へ入り、背景面filter/opacityと下地の色差が露出していた。素材外周の最大alphaはSmall0/Medium2/Large9/Vortex4で、今回の大きな左右矩形とは別。素材を推測で加工していない。

game.jsのdev専用prepareBackgroundに縮小の逆変換から算出する描画余裕を追加。left=min(0,−anchorX/9)、right=max(W,W+(W−anchorX)/9)を整数丸め＋1px余裕で登録、Y同様。描画面のoffsetと内部の逆translationが相殺し、初期廃墟画像のワールド登録/倍率を維持。transformOriginは面内のanchor−offset。最終scale.90でも面外周はviewport外に残る。表示倍率1→.90、opacity1→.12、saturation/contrast、音・白黒の時間/順序は変更なし。背景のみ処理、追加Actor/マスク/新規レイヤーなし、既存#080A12下地を維持。画像の登録・足位置を合わせるためのActor移動なし。復帰／中断で面を除去。

修正後の実Canvas外接矩形は縦x−1.72–391.58/y−1.40–845.50。白レイヤーは従来からbody直下fixed全画面・z2500で、opaque #fff、filter/shadow/maskなし。Chromiumのピークは縦横とも全RGB255。横は自然タイムライン撮影、縦は実opacity1到達後に診断用RAFを一時停止して撮影（opacityの強制変更なし）。縦の初回白ピーク撮影は遅延により解除途中となり、white-release-sampledとして区別。iPhoneの白ピーク症状全体と同じ原因であるとの断定はしない。

残件: 廃墟画像自体の既存下端水平境界は背景面の左右外周とは別で、吸収直後の暗い場面に残る。§102/Device D34の全境界解消は未合格。「途中のすべての境界を解消」とは扱わない。初期Stage2/Bの背景登録を変更せず解消するには、元背景の有限描画範囲を保全しながら吸収専用描画の下端処理を別途調整する必要がある。素材追加・登録の無断変更で補わない。

### 追加検証と証拠

- 最新main326/326、候補356/356自動テストPASS。追加4件は実詳細関数の1000ms/中断/未decode拒否と実描画余裕関数の縦横/全吸収scale/画面外anchor。既存テスト弱体化/skip/削除なし。syntax/diff/preflight PASS。
- Chromium151/DPR1、390×844／844×390通し: 接近→調べる→前半→Stage1/2→詳細→D02→Handoff→後半→赤黒R1→P0。completed/restored true、console例外/audioFailures/storageWrites 0。詳細実測1024.3ms／1009.1ms（時計の初期値1000ms）。描画待ちのHold延長は実測JSONを保存し、目標値を書き換えない。
- 離れる→イベント未開始／距離再武装→調べる→cancel→P0検証→所有ロック解除→移動→再発火抑止。保存書込0。退出は既存TarotStage合法移動APIを利用し、物理touch退出のPASSを推定しない。
- [縦カード](star-gate-card-white-evidence/full-portrait-card-detail.png)、[横カード](star-gate-card-white-evidence/full-landscape-card-detail.png)、[白転途中](star-gate-card-white-evidence/full-portrait-FUTURE_WHITEOUT.png)、[縦白ピーク・RAF診断停止](star-gate-card-white-evidence/portrait-white-peak-raf-paused.png)、[横白ピーク・自然再生](star-gate-card-white-evidence/full-landscape-white-peak.png)。before/afterレイヤー診断・実測JSON・回帰TAPは同ディレクトリ。
- 物理iPhone D1〜D36 UNPERFORMED。今回ユーザー報告の白転左右縁は修正前の実機FAIL症状として扱い、修正後PASSへ更新しない。詳細可読性/角切れ、白転の左右・下端・均一ピーク、白後赤黒R0、無音/音復帰、縦横回転・背景化・中断・操作返却、保存ゼロを実機確認する。

通常Title→Alenonも追加ブラウザ確認: dev=false、接近選択ランタイムなし、標準空/内光幅190、pageErrors0。可変main画像は同一ローカル資源配信の試験transportを使用し、通常コードは変更していない。

詳細カット表示中のviewport390×844→844×390変更、およびdocument.hidden/visibilitychangeによる合成背景化→再表示も追加確認: 演出中断→P0復帰、owned lockなし、詳細/白/黒残留0、音失敗/console例外/保存書込0。物理端末の回転・OS背景化ではなくChromiumのviewport変更／visibilityイベント試験として区別する。初回試験は1000ms表示中にスクリーンショットを取得したため、その後のDOM計測でレイヤーが消えた試験ハーネスエラー。演出不具合とは混同せず、計測を先に行う修正版で再試験し正常復帰を確認した。

## Aftermath v1.3 continuation

The continuation starts at8461475634e9d53bf6dd14ad82b6f5f3127ce1a3 without changing the repaired front, card assets or Stage3 cinematic. See [Aftermath implementation and verification record](future-vision-aftermath-v1.3.md). The same Draft PR and `dev=star-gate-full` entry now continue through author-approved11Box, explicit gate reinspection, Lumiere departure and Shion/Shiopon free movement. Physical iPhone evidence is still pending; the inherited ruins lower boundary remains unresolved. New browser observations of an inherited ordinary-audio fade exception are recorded separately from the previous baseline report.

## Aftermath v1.5 revision

The same PR now uses continuous14Box Aftermath with no intermediate gate inspection or normal status panels. See [current implementation and verification record](future-vision-aftermath-v1.5.md). The repaired gate front/Stage3/assets remain preserved; this revision ends with Lumiere departed and player-controlled Shion plus existing Shiopon Follow. Device evidence is still pending.

## Author v1.6 integration

Normal01–03 from97bfdb7 are preserved; the author now explicitly approves one large-cut normal→Re change and separate exact-old red03 for post-change/R0. This supersedes the previously halted reference conflict and old “already altered at initial03” contract. Continuous Aftermath ownership/return remains v1.5, dialogue table is v1.6. Fresh evidence and scope: [integration v1.6](future-vision-integration-v1.6.md). No main merge or ordinary-route publish.
