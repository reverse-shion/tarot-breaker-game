# TAROT BREAKER — Phase 2A-5 保存・復帰・タイトル接続仕様書 v1.0

作成日：2026-10-01（日本時間）
対象：`reverse-shion/tarot-breaker-game`
監査基準main：`f1688abc89f82ef159c7de88e21fbfb821fd4aeb`
状態：設計仕様。実装・実機検証・公開は未実施。タイトルUIは提案であり未承認。
目的：記録済みのProgress v1から、安全な地点・イベント履歴・しおぽんの状態を復元し、「つづきから」を成立させる。

## 1. 結論と作業順序

2A-4a〜4dのPRが統合済みであることと、全マップで永続保存から再開できることは同義ではない。現在はProgressへの記録と、旧sessionStorageを使う実行処理が併存している。

Phase 2A-5を次の単位に分ける。本書の小区分は今回の実装順序の提案であり、過去に完了したPhaseを示さない。

| 区分 | 成果物 | 有効化範囲 |
|---|---|---|
| 2A-5a | 復帰コンテキスト、状態復元、到着保存の共通契約とテスト | 通常公開導線へは未接続 |
| 2A-5b | 3マップの復帰処理。マップごとにレビュー・検証 | 隔離した検証導線のみ |
| 2A-5c | タイトルのNew Game／Continue接続 | UI承認後。公開導線の切替は未実施 |
| 2A-6 | 全経路・中断・リロード検証と統合公開 | 必須Gate通過後のみ |
| 2A-7 | 不要になった旧進行コードの整理 | 統合公開と同等動作確認後のみ |

先にボタンだけを追加しない。保存地点を実際の安全な復帰処理へ結びつけてからタイトルを接続する。

## 2. 確認済みの事実と証拠の限界

| 監査結果 | 現在の証拠 | 対応 |
|---|---|---|
| 保存基盤・旧データ分離のテスト26件PASS | 現main取得の`progress-core`／`progress-legacy-guard`テストを実行 | 基盤を維持し、ページ接続の検証を追加 |
| アレノンの通常復帰は`alenon/intro`かつプロローグ完了に限定 | `alenon.html`の`progressResume`判定 | `pad_return`と未完了introの復帰を明確にする |
| Landing→Alenon帰還で到着をProgressへ記録する呼出しがない | アレノン帰還分岐と遷移処理 | 実際の着地・降車完了後に記録 |
| 庭園の会話履歴は旧Journeyから読む | `dialogue.js`の`savedStory`初期化 | Continue時に有効なv1から復元 |
| Landingのしおぽんは旧Journeyのmodeと座標から読む | `star-country-landing.html`の`savedCompanion`初期化 | 意味状態から安全な位置を再構築 |
| タイトルは旧Journeyのみresetする | `game.js`の`begin()` | New GameとContinueを明確に分ける |
| Landing到着保存はcollision読込より前 | Landing初期化→`boot()`の順序 | 安全な到着完了へ保存境界を移す |
| Garden到着保存はscene-ready確認なしで実行する | `garden-progress-observer.js` | scene準備と入力解放前の境界へ移す |
| PR #33説明のLanding完了事実復元は後に意図的に撤回された | `5775e7aa`で追加、`46bf8048`でfresh-start regressionを理由に撤回。現在はコメントだけが残る | 通常ロードへの一律復元を再導入しない。明示的Continueに限定して設計 |

この監査はコード・限定テストによるもの。iPhone／iPadで安全なspawn、音の出力、画面、操作を確認した証拠ではない。26件PASSは全体CI PASSを意味しない。

## 3. 変更範囲と保護対象

WORKING：Progressの読込・復元、復帰入口の解決、到着記録、同行意味状態、別途承認されたタイトル選択UI。

LOCKED：セリフ、物語順序、演技、待ち時間、星門演出、幻視イベント、カメラ演出、画像・音源・音量、collision JSON、移動速度、Tap-to-Move、joystick、Orbの118px／154px再武装契約、通常PADの飛行・着地・降車演出。

通常のマップ移動は既存演出を維持する。Continueは新たな復帰入口として、地上の安定状態から開始する。飛行中・会話途中・星門演出途中を復元しない。タイトル開始の意味変更は2A-5cに限り、具体的UI承認後に行う。

## 4. 保存状態の権限

1. 有効なProgress v1だけをContinueの履歴・保存地点・同行意味状態の根拠にする。
2. 旧JourneyやURLから、v1の完了イベント・checkpointを作らない。
3. 通常移動、Continue、New Game、開発用入口を別のコンテキストとして扱う。
4. Continueで復元する際は、旧Journeyとの競合を放置しない。互換処理が必要なら、その復帰コンテキスト内だけでv1を元に必要な旧フィールドを再構築する。旧値をv1へ逆流させない。
5. v1にない完了を旧値から残すORマージは禁止。明示的Continueではv1の完了／未完了と一致させる。通常プレイ全体へ一律に適用して既存Triggerを変更しない。
6. 設定・editorの保存領域を変更／削除しない。旧Journey自体の全面廃止は2A-7へ延期する。
7. `load()`がinvalid／unsupported／unavailableの場合は自動resetしない。読込不能を「保存なし」と同一視して上書きしない。

## 5. 復帰コンテキストと入口解決

復帰コンテキストはmapId、spawnId、入口種別、検証済みイベント履歴、companion意味状態を含むページ内の読取専用データとする。保存schema v1に一時情報を追加しない。

| 入力状態 | 動作 | 永続保存 |
|---|---|---|
| 明示的Continue＋valid v1 | checkpointへ復帰 | 読込だけで書換えない |
| 明示的New Game | 新規actionTokenで初期状態を作りintroへ | 成功時のみ新規記録 |
| 有効な通常移動Handoff | 既存移動演出で到着し、安全な境界で保存 | 到着完了時 |
| v1なし＋通常公開入口 | タイトルでNew Gameを選べる | ページを開くだけでは作らない |
| corrupt／future v1 | Continue無効、保存内容を保持しタイトルで案内 | 自動上書きしない |
| storage読込不能 | 復帰不可を案内し、明示的な一時プレイを選べる | 既存データを消さない |
| 引数だけの別マップ直アクセス | v1 checkpointへのContinue選択またはタイトル | URLで履歴を進めない |
| editor／dev入口 | 既存検証導線を使う | production v1へ書き込まない |

`?from=`は通常移動の表示上のヒントに留める。新しい進行経路では、検証済みHandoffなしに履歴や到着を確定しない。旧導線は隔離実装の間は変更せず、新経路を一部だけ公開しない。

Handoffはsession内で一度だけ利用する遷移データとする。許可されたedge・source・destination・spawn・前提イベントを照合する。単なるURLパラメータはHandoffの証拠にならない。

受領後、到着保存前にHandoffの唯一の証拠を削除しない。pending→claimed→committedの段階を持たせ、claimed中のreloadでも同じ試行を検証できるようにする。到着保存失敗時は最後の確定checkpointを保持する。重複実行は同じ結果への無害な再試行とし、イベントや同行変更を重複発火させない。実際のclaim方式と寿命・二重タブの扱いは2A-5aのAPI設計・テストで確定する。

## 6. マップ別の復帰仕様

| checkpoint | 復帰状態 | イベント | しおぽん |
|---|---|---|---|
| `alenon/intro` |既存introの安全な地上位置 | 未完了ならプロローグを先頭から。完了なら再生しない | `not_joined`なら不在。`waiting_at_landing`ならLanding待機の意味状態を保持 |
| `alenon/pad_return` | 既存降車後の安全な地上位置 | プロローグ完了が必須。帰還演出は再生しない | Landing待機の意味状態を保持 |
| `star_country_landing/pad_ground` | PAD付近の安全な降車後位置 | 悪魔イベントは完了済みなら抑止、未完了なら既存Triggerで開始 | not_joined／joined／waitingをv1に従って再構築 |
| `star_country_landing/garden_entrance` | 既存庭園帰還の安全な地上位置 | 必須履歴を検証し、完了イベントは抑止 | joinedならシオンから離した既存候補位置。waitingならPAD付近の待機位置 |
| `star_gate_garden/south_gate` | 既存south_gateの安全な地上位置 | しおぽん・リュミエール完了を個別に復元。未完了は既存順序で発火 | 加入前なら既存初期配置。加入後なら既存同行配置 |

全行は既存`validateRecord()`の有効性判定を前提とする。schema上不正な履歴や同行組合せを推測で修復しない。

spawnIdは意味IDであり座標保存ではない。collisionと必要なlayoutの読込後、既存の安全位置解決を利用する。任意の近隣点へ移してイベントを飛ばさない。候補を解決できなければ入力を解放せず、回復可能な読込エラーとタイトルへの導線を示す。

Continueのspawnは自動再移動・即PAD乗車・Orb誤発火を起こさない。必要な一時re-arm／lockoutは既存契約に従う。通常移動時のカメラや演出は維持する。

## 7. 初期化の順序

1. Progressを読み、入口種別・schema・履歴・checkpointを検証。
2. 対象sceneを決定。タイトルと庭園が同じ`index.html`である点を明示的に解決。
3. 必要なassets、layout、collisionを読む。
4. 安全なspawn候補を解決。
5. v1の完了履歴とcompanion意味状態を、最初のTrigger評価より前に復元。
6. player・companionを配置し、既存入力ロック・再武装条件を設定。
7. sceneが表示可能で、安定した到着状態になったことを確認。
8. 通常移動だけ到着記録をcommitし、結果を判定。
9. 準備完了を通知し、入力を解放。

Continueは手順8で新しい到着記録を作らない。保存を読むだけで既存checkpointを動かさない。履歴復元より先にTriggerを実行しない。

## 8. 到着の保存境界

| 通常移動 | 保存する地点 | commitしてよい境界 |
|---|---|---|
| Alenon→Landing | Landing/pad_ground | collision準備・着地・降車・位置解決が完了 |
| Landing→Garden | Garden/south_gate | scene準備・安全位置・履歴・同行配置が完了 |
| Garden→Landing | Landing/garden_entrance | collision準備・位置解決・同行配置が完了 |
| Landing→Alenon | Alenon/pad_return | collision準備・着地・降車・位置解決が完了 |

保存境界は時間経過だけで決めない。通常演出の所要時間・音・セリフを変えない。保存前に移動先読込へ失敗したら、移動元の確定checkpointを維持する。

イベント完了は既存の最終セリフ／最終動作終了境界で保存する。イベント開始や途中タップで完了にしない。

## 9. 保存失敗と再試行

`try/catch`だけでは不十分。Progressが例外を投げず`persisted:false`を返す場合も処理する。

- `persisted:true`だけを永続保存成功と扱う。
- 失敗時は古いdurable bytesと最後の確定checkpointを保持し、明示的な一時状態でそのプレイを続ける。
- 「保存できませんでした。次回は最後に保存できた地点から再開します」等の控えめな表示を用意する。成功表示を出さない。
- 完了イベントや到着の重複APIがvolatile状態でno-opになる場合を考慮する。再試行は有効な一時記録全体を検証し、1回のatomic writeとして永続化する経路を設計する。
- 書込再試行のために`resetGame()`を呼ばない。schema検証・前提イベント・同行不変条件を迂回しない。
- ページをまたぐ一時状態の扱いを2A-5aで明文化する。引き継げない場合にURLから進行を捏造しない。
- 中断後のContinueはdurable checkpointから開始する。会話途中・飛行途中を保存しない。

## 10. タイトルUI案（2A-5cで別途承認）

この節はレビュー用の具体案であり、現時点の承認済みUIではない。

| 保存状態 | 表示・操作案 |
|---|---|
| valid v1 | 「つづきから」を主操作、「はじめから」を副操作 |
| 保存なし | 「はじめから」 |
| invalid／unsupported | Continue無効。短い案内と「はじめから」 |
| unavailable | 保存機能の状態を案内し「保存せずに開始」を選択可能 |

既存のTOUCH TO STARTは選択画面へ進む入口として残す案とする。タップだけで旧Journeyやv1をresetしない。valid saveがある場合の「はじめから」は上書き確認後、actionTokenを1回生成する。二重タップ・同一操作再入で複数resetしない。

New Gameの永続書込が失敗した場合は既存保存を消さず、無言で新ゲームへ遷移しない。一時プレイに進む場合は状態を明示する。設定・editor dataは保持する。

Continue操作と音のgesture unlockを同じ操作導線に接続する。iOSでページ遷移後の再生が保証されると仮定しない。復帰先でも既存のgesture-local retryを維持し、実機で音を確認する。

## 11. 自動検証

最低限、以下を実際のページ接続またはその実行関数で検証する。文字列一致テストだけを復帰動作の証拠にしない。

| ケース | 期待結果 |
|---|---|
| 5種類のcheckpoint | 正しいscene・spawn意味ID、入力解放順序 |
| 完了／未完了イベント | 完了は再生せず、未完了は既存順序で実行 |
| v1と旧Journeyが競合 | 明示的Continueではv1が勝ち、v1を書換えない |
| v1なし＋旧Journey完了 | Continue不可。旧値を新保存へ移さない |
| 3種類のcompanion | 表示・同行・待機と履歴が一致 |
| 通常移動の到着前 | 保存地点は移動元のまま |
| 到着完了・重複callback | 正しいcheckpointへ1回commit、副作用重複なし |
| assets／collision失敗 | 移動先を保存せず、回復導線を表示 |
| Handoff claim中のreload | 試行を検証して回復。履歴捏造なし |
| 改変URL／無効Handoff | 必須イベントやマップを飛ばせない |
| corrupt／future save | bytes保持、Continue無効、boot継続可能 |
| storage read／write／quota失敗 | 既存保存保持、一時状態と保存成功を区別 |
| 失敗→書込回復 | 一時記録全体を安全に再保存可能 |
| New Game二重入力 | 1操作1reset、設定・editorは保持 |
| プロローグ／庭園会話／PAD飛行／星門演出中断 | 最後の安全地点から復帰、部分状態を保存しない |
| editor／dev | production保存を更新しない |

既存Progress、Trigger、Alenon Audio、map-roundtrip、Dialogue、同行、verified gameplay contractの対象テストと、利用可能な全体CIを実行。最新mainとの差を比較し、新規failureを既存failureへ紛れ込ませない。

## 12. 実機Gateとレビュー

実装リスクはHIGH。監査の26件PASSや過去PRの記載を現在candidateのDevice PASSへ転用しない。

必要な確認：iPhone Safari／iPad Safariで、5種類の復帰地点、しおぽん加入前・同行・待機、完了イベント抑止、未完了イベント順序、Orb外へ出て再進入、風／Orb音復帰、通常PAD往復、タイトルからの両開始操作、代表的な中断・reload。

Device Gateには正確なcandidate SHA、機種／browser、確認経路、明示的な人間のPASSを記録する。現在のDevice Registryには今回の候補に使える記録がない。CI PASSと実機PASSは別条件。

実装時は`AGENTS.md`と適用される役割契約を再読込し、独立した差分レビューを行う。docs-onlyの本書作成ではゲーム実装・Device PASS追記・main統合は行わない。

## 13. 実装候補ファイルと制限

| ファイル群 | 変更理由 |
|---|---|
| 小さなentry／resume／handoffモジュール（名称は実装時確定） | 入口種別・状態復元・到着試行の責任を分離 |
| `progress.js` | 必要な場合のみ、volatileの安全な再保存API。既存schemaは維持 |
| `alenon.html` | intro／pad_return復帰と帰還到着のcommit |
| `star-country-landing.html` | 履歴・同行復元と到着commit境界 |
| `dialogue.js`／`story-event-guard.js` | 最初のTrigger前の復帰状態適用。セリフ・演技・Trigger座標は変更しない |
| `garden-progress-observer.js`／`game.js`／`index.html` | 庭園ready境界、タイトルと庭園の入口解決、承認後のUI接続 |
| `tests/`と必要な仕様・検証記録 | 実行動作・不変条件・Device evidence |

巨大ファイルの全面分割、命名整理、音響共通化、collision修正、幻視演出の調整、旧Journeyの全面削除は行わない。詳細な変更予定箇所と公開Gateは各PR開始前に確定する。

## 14. 停止条件・完了条件

停止条件：既存確認済み挙動の回帰、新規test failure、復帰のためにLOCKED演出変更が必要、履歴とcheckpointの矛盾、v1への旧値自動移行、scene準備前の保存、音／Trigger／同行の原因不明な実機差異。

問題の回避として保存データやテストを緩めない。PR #33説明と現mainの差は、`5775e7aa848f8722fb71743cb8ec4f29784878f2`で追加したロード時の復元を、`46bf80483a7f9d4cf463a92426a523357f5d5299`で意図的に撤回したもの。撤回commitには「Revert Landing restore bridge after fresh-start regression」と記載され、v1の完了を旧Journeyへ書く7行が除去されている。この証拠は撤回の事実を示すもので、当時の実機症状全体を今回再現した証拠ではない。一律ロード復元の再導入は禁止し、明示的Continueの入口だけで再設計する。

2A-5完了条件：5種類の復帰入口・4種類の通常到着保存・イベント履歴・同行状態が一致し、タイトル両操作が承認済み仕様どおり動作。対象テスト・独立レビュー・CI・必要なcandidate実機GateがPASS。全体公開の切替は2A-6の検証と同時に行う。

本書作成によって実装や公開が完了したとは扱わない。次の実装着手単位は2A-5aとする。

## 15. 参照した現行資料

- `AGENTS.md`
- `docs/regression-lock-v1.md`
- `docs/architecture/progress-route-save-contract.md`（旧設計のFACTは当時の基準。現在コードと区別）
- `docs/change-risk-device-gate-v1.md`
- `docs/DEVICE_VERIFICATION_REGISTRY.md`
- `docs/AI_CHANGE_SAFETY.md`
- 現mainのAlenon／Landing／Garden／Title／Progress／旧Journeyの実装

実装開始時は最新mainを再取得し、本監査基準からの差を確認する。本書のv1.0を新しいコードへ無検証で適用しない。
