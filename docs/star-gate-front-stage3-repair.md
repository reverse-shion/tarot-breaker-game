# 星門前半回帰修復＋Stage 3接続候補（2026-10-05）

## 判定

前半修復は実装・自動検証済み。Stage 3後半はBを保全。アルカナ詳細カットは素材BLOCKERのため未実装。全体を完成・Device PASSとは扱わない。main merge／通常公開接続なし。

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

## アルカナの正式照合・未実装

A/Bでpose01〜04素材は同一、赤黒カードを描き込み済み。pose03カード約71×91pxは手の遮蔽があり、詳細表示まで拡大すると粗い。独立dark_aura_01(515×773、hash3c594fb808a716e2e8af7b13be205aefcbe5f1cde79dc10a8fae5bb99c1f78ae)のカード領域約x150–355/y240–475には紫の発光帯が図柄自体を横切る。切り抜きだけでは「漏出前」の鮮明な詳細カットを作れない。dark_aura_02も適合しない。

唯一残る素材BLOCKER: 赤い結晶・金枠/装飾・赤黒い地を忠実に持つ、手・人物・紫オーラ/発光帯のない変化済みカード単独画像。縦画面でカード幅180CSSpx程度を鮮明に読める解像度（高DPRを考慮）と透明余白/カード角の登録が必要。通常カードへの単純色フィルターや人物AI再生成で代替しない。素材適合後、0.8〜1.2秒の詳細カット→認識の間→D02→漏出へ接続し、全終了経路で詳細レイヤーを解除する。この接続は今回は未実装で、D02以前の異常可読性改善をPASSとはしない。

通常参考素材はassets/tarot/backs/tarot-card-back.webp、1024×1536、SHA256 cf814dcf307897bf32b20c8d58d861cb81a2f06fd976f73c35bcbc3e1349f6c4。今回メッセージには実際の通常画像添付がなく、ユーザー添付と同一とは断定していない。

§101の通常カードと赤黒入りR0/R1ポーズ03の衝突は、ユーザーが「R0と同じ赤黒いカードへ戻す（§101の通常表示という記載を訂正）」と明示回答したため解消。R1は既存03を維持し、旧レポートのembedded normal card誤記を訂正。記憶欠落/原因/CANONを追加せず、§78台詞は変更なし。

## 検証

- 最新main:326/326 PASS。
- 最終候補:352/352 PASS（前半4追加、早いRAF1追加）。既存期待値の弱体化/skip/削除なし。
- preflight・構文・diffチェックPASS。独立Architect/Reviewer確認済み。Device/merge GateはPASSを付けない。
- Chromium151/DPR1: A/B/candidateの縦横比較。候補の空実被覆と内光登録がAに一致し、通常庭園のdevフラグなし登録は標準空/幅190のまま。
- 修復後の統合通し: 接近→調べる→正常共鳴→逆流→Stage1/2→Stage3→R1→P0復帰、completed/restored true、pageErrors/audioFailures/storageWrites 0。後半固定/足元/レイヤーは既存runnerの実DOM検査を通過。
- 選択異常系: 離れるで未開始、keyboardで146→177へ移動して操作返却を確認。距離再武装/再接近は既存TarotStageの合法経路moveで確認し、開始→cancel→P0復帰→所有ロック解除→keyboard移動→メモリ内消費、保存書込0。直線移動/タップだけで退出半径へ達する試行はタイムアウトし、保護対象のcollision/navigationは変更していない。実機で退出経路のtouch確認が必要。
- 通常Title→Alenon正式導線をブラウザ確認。保存/Continueは全既存自動回帰で保全。Aおよび通常Titleの可変main画像は環境のTLS制約を避け、同一最新main資源をローカルHTTPで配信する試験transportを使用した。ソース書換えはなし。
- 物理iPhone D1〜D36 UNPERFORMED。空被覆/光配置/選択touch/離れる移動/共鳴逆流/カード所有権/白後赤黒カード/固定/白黒無音/回転背景化復帰/保存ゼロを確認。カード詳細素材GateはBLOCKED。Large雷誤読と未来廃墟下端境界はBから継承した未合格の視覚課題で、今回変更していない。

候補の公開SHA・Draft PR・到達結果は最終報告で固定する。main merge／Production公開は行わない。
