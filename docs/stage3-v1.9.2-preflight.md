# Stage 3 v1.9.2 実装前照合 — 2026-10-05

判定: **C7 不成立 / IMPLEMENTATION BLOCKED**。ユーザー仕様§104・依頼6に従う。実装済み、CI PASS、Device PASSを意味しない。独立Architectも同じ素材不一致を確認した。

## 作業基準と保護範囲

- 最新取得main / 素材参照: `5c33fb8ccf9a46321c1dc1c94ba1dfac125900f3`
- PR #105 (open / Draft), branch `feature/future-shion-arcana-anomaly-stage3`: `177b3f5ab3cc512e2365b5ba403d24585657f949`
- PR base `fix/future-shion-scale-stage3`: `0f0ac83ea56cfb1d3db0d1ba5047cdbd2559230b`
- main/PR共通祖先: `09aa8a6950c00e71204e03a6d03c580c225b54ee`
- ローカル照合ブランチ: `audit/stage3-v1.9.2-preflight` (mainから作成)
- WORKING: dev=star-gate-full のStage 3後半と、必要なP0取得・資源準備・復元接続。
- LOCKED: Stage 1/2、Stage 3前半の演出、通常経路、Production保存/進行、既存Device Verified契約。
- HIGH: 音、入力、描画、カメラ、復帰に影響するため。

AGENTS.md、regression-lock-v1、delegated-development-v1、change-risk-device-gate-v1、EVENT_DEVELOPMENT_SYSTEM、VERIFIED_GAMEPLAY_CONTRACTS、EVENT_CONTRACTS、DEVICE_VERIFICATION_REGISTRY、AI_CHANGE_SAFETY、EVENT_DEVELOPMENT_CONTRACT、3つのrole contractを確認した。下位AGENTS.mdはない。

mainとPRは分岐している。mainにはその後のTitle/Continue/Progress/route修正があり、PRのイベントruntime・描画API・dev登録はmainには存在しない。古いPRのgame.js/index.htmlを丸ごと戻す方法は禁止。再開時には現行main修正を保持した専用ブランチへイベント専用差分を統合して再照合する必要がある。mainへの変更・merge・Production操作は行っていない。

## §104 C1–C6 のコード接続

以下のコード行は、断りがない限りPR105の完全SHAに固定した参照。接続変更の候補であり、実装・復元成功の証拠ではない。

|項目|照合結果 / 必要な最小接続|
|---|---|
|C1|上記完全SHAはgitとGitHub PR metadataで一致。4素材は現行mainにあり、PRにはない。|
|C2|star-gate-anomaly.js のrun():674付近でdev判定→resonance→Stage1→Stage2→Stage3。通常vision/aftermath/completeは別分岐。P0はStage1呼出し前、最初の未来表示・カメラ・音・Actor変更より前に一度取得する。Stage3のbeforeは既に未来状態でありP0ではない。|
|C3|R0はpose03 assets/sprites/shion/shion_card_03_check.webp (512×512)、カードを持つ確認姿勢を実物で確認。setShion(3)→560ms→720ms→D02→260ms→異常、約533–550行。安定後/異常前に取得可能。alignFutureShionElement():53付近は人物倍率.86、offsetX=-1.15、offsetY=.30。描かれた足元のSource Space登録は未実装。R1は03固有の足元と白前05足元を登録し、画像箱を引き伸ばさず同じ身体倍率にする必要がある。|
|C4|PR game.js drawVisionWorld():283–299が背景のみの境界。登録倍率1.10、offset(-72,-330)。draw():1731–1751は背景→Actorを同Canvasに描く。通常風景は別DOM #map。吸収面だけを変形し、元廃墟と通常風景を同時抑止、現在シオンは独立描画、#080A12を固定下地にする追加接続が必要。Canvas全体変形は不可。既存Stage2合成下地色/viewport面登録は素材適合後の照合事項として残る。|
|C5|PR audio.js:118–137のcinematic音量APIはpauseせず、再生位置/状態snapshotもない。既定OFFのイベント専用係数・snapshot・pause/resume APIが必要。音源は同ファイルBGM、star-gate-anomaly.js新規SEなし。白/黒の無音保証には他の再生元/操作音の全列挙も必要で、今回は未完了。say():38–45はhide後100ms待つ。共有挙動を変えずdev側に閉鎖時刻を記録し、規定Holdから経過分を引く必要がある。|
|C6|restorePresentAfterFutureFixation():460–505とfinally:689は全Actor reset、camera release、音復帰、操作解除を無条件に行う。P0/NPC/ロック所有権の復元検証にはならない。devのみsnapshot復元→論理NPC判定→描画確認→所有ロック返却へ変更が必要。PR game.js:2147付近のinteractionLockedは単一booleanで所有権APIがない。既存安全Title入口は./index.html。VisionWorld.end():2047付近は画像を破棄するため資源保持も必要。|

## C7 — 実装を阻む素材不一致

4画像は全て1024×1536、alpha最小/最大255/255、透過画素0、全面不透明。各RGBA展開目安6,291,456 bytes (6 MiB)、4枚合計24 MiB。圧縮容量とは別で、ブラウザ内部コピー/GPU/他画像/一時面は含まない。同時表示はcrossfade2枚を想定するが、decode済み4枚を保持する場合の展開総量は24 MiB。実機メモリ計測ではない。

|正式Path (assets/events/gate-vision/以下)|圧縮bytes|SHA-256|
|---|---:|---|
|future-fixation-rift-01-small.webp|2928175|78bdde5c0b0da8e0732eca024e3bfe895e16d47889a83859f8111b1c99829095|
|future-fixation-rift-02-medium.webp|3094009|7caef8c6df6debfe24c4604a06f20d943cc9bf9ddfb67e522e1e67664260d2ac|
|future-fixation-rift-03-large.webp|3344566|14bddfd4511570270d1deabfd58b3347a5d17ee70f858145548c0eaba10a794a|
|future-fixation-rift-04-vortex.webp|3300075|561dce635a052eb4cbcaa64b57a8c8059226bff8b4390b78eb586594296546f0|

実物にはSmallから宇宙背景、多数の破片、閉じた同心円の目盛り・記号がある。通常の画像合成では、§82のActorより上にあるRift層が廃墟と人物を不透明な画像矩形で覆う。低opacityでも宇宙背景と円形記号は残る。screen等のblendは黒を弱めてもこの描画内容を消せない。

該当契約: §5–6の一つの傷の登録、§23のSmallでの世界暗転等禁止、§26/102の吸収開始まで未加工の同じ廃墟、§36/96の魔法陣化禁止、§41/82の背景とActor分離。傷起点/主線/最終表示寸法は適合素材なしでは確定できないため未登録。crossfadeで隠してPASSにはしていない。

**最小修正案**: 正式4パスに、宇宙背景と円形記号を含まない透明な亀裂/渦だけの承認素材を用意する。同じ傷の起点と主線を保持してから寸法・足元・表示倍率を登録する。新規台詞・設定・人物移動は不要。任意切抜き/マスク/生成による推測補完は行っていない。ユーザー指定素材をAI判断で加工してこの問題を隠さない。

## 検証区分

- 実施済み: 読み取り専用git/PR照合、Pillowによる4素材全画素alpha・寸法・hash計測、4素材/pose03の視認、独立Architect照合。
- event-preflight --target star-gate-anomaly: target登録/非LOCKED判定PASS。ただし既定sandboxのchild-process制約により出力branch/headがunknown。gitで別途完全SHA/ブランチを確認。これをruntime接続PASSとは扱わない。
- 現行mainの回帰suite: 326/326 PASS、failure 0、new 0。最初の実行はspawnSync EPERMでテスト開始失敗。権限付き再実行で上記結果を取得。
- ブラウザ素材検証の結果は別添evidence JSON。ゲーム演出のブラウザPASSではない。初回Chromium起動はsandbox socket権限で失敗し、次のfile URLはERR_BLOCKED_BY_ADMINISTRATOR。バイト一致のdata URLで素材decode/alpha検証へ切替。
- §90 T1–T35: **全て未実施**。v1.9.2 runtimeを実装していないため、素材照合/現行main suiteを新実装のT1/T27 PASSへ読み替えない。
- iPhone D1–D36: **全て未実施 / Device PENDING**。
- runtime変更なし。新仕様の正常復帰/異常復帰/音/操作返却のPASS主張なし。

## 検証リンクと再開条件

v1.9.2をiPhoneで開く検証リンクは作成していない。素材Gateが不成立でruntime未実装、作業ブランチもローカル照合記録のみ。PR105の旧v1.8リンクを今回の検証リンクとして提示しない。通常公開/Production/mergeは行わない。

素材が適合したら、最新main/PR再取得→C1–C7再照合→専用dev実装→制御時計T1–T35→ブラウザ→未公開候補のSHA固定リンク、の順で再開可能。iPhoneではD1–D36を確認し、特に同じ傷の成長、矩形/庭園露出なし、不動と白後の身体倍率、白黒無音と再開位置、回転/背景移行復帰、NPC存在/不在、連打持越し、復元失敗の操作可能な回復UIを確認する。機種/iOS/Safari/起動形態/方向/SHA/音設定/冷起動・再実行を記録する。
