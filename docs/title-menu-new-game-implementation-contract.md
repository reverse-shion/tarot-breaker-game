# Title Menu / New Game — Implementation Contract v0.1

Status: 設計候補・独立レビュー待ち。runtime変更／保存初期化／Lock変更は未実施。
Baseline main: `e99a25279728467ea209829a1d7ed2fd05ebb5bc`
Branch: `feature/title-menu-contract`
Risk: 今回の文書のみはLOW。後続のUI・New Game実装はHIGH。

## 1. 目的と承認境界

保存状態に合わせてタイトルの操作を整理し、既存の背景・ロゴ・星と金色の雰囲気に合うメニューを設計する。

今回確定するのはレビュー可能な設計候補である。「最初から」を既存の通常開始へ単に付け替えない。保存を実際に置換するNew Gameは、従来の通常開始のProgress非reset方針と異なる。Regression Lock Aに対する限定例外、対象保存、破壊的操作の境界を明示して製品承認を得るまでは実装しない。本書のPROPOSEDは承認済みの仕様変更ではない。

## 2. FACT / UNKNOWN / PROPOSED

FACT（現行コード照合）:
- `game.js` の`begin()`はready/runningを確認し、通常root開始ではstartを無効化→Journey reset→既存の`alenon.html?from=title&build=6bc2a38e`へ遷移する。audioDebug/orbOutputの既存付加条件がある。ここでProgress resetは行わない。
- `public-continue-title.js`はfrom/dev経路では動作しない。Continueクリックではdurable保存を再読込し、重複起動を抑える。通常startとContinueに別々のclick listenerがあるため、確認キャンセル後に既存`begin()`へ流れる実装は不適切。
- Public receiver対応はAlenon intro/pad_returnのみ。validなLanding/Garden保存は「準備中」であり、形式非対応や破損とは別の状態。
- `progress.js` の`resetGame(actionToken)`はINITIAL全体をpersistし、同一instance・同一tokenを一度の操作として扱う。INITIALはAlenon intro、completedEvents空、companion not_joined。
- persist失敗時は旧durable bytesが維持されるが、当該instanceにはvolatile INITIALが残る。resetGameは失敗時もtokenを記録するため、同一instance/tokenの再呼出しだけでdurable再試行が成立するとはいえない。
- `map-journey.js`はsessionStorageの`tarot-breaker:map-journey-v1`とruntime mirrorを管理する。resetの保存失敗を内部で許容するため、呼出し成功だけでは保存完了を証明できない。
- `progress-resume.js`は`tarot-breaker:arrival-handoff-v1`を定義する。現在の通常開始にはhandoff削除処理がない。現行の公開タイトル開始がhandoffを利用する事実は確認できない。
- `.title-screen__load-note`はCSSで非表示。保存理由の表示にはこれを使わず、専用の可視領域が必要。

UNKNOWN（実装前の限定監査が必要）:
- localStorageのdurable ProgressとsessionStorageのJourney/handoffを、クラッシュや別タブ競合も含めて原子的に置換する保証は現行APIにない。
- 通常New Gameの対象handoff backend/keyの所有権と、確実な失敗検出・再読込復旧の最小方式。
- sessionStorage getter/read/remove/write拒否、Quota、BFCache、遷移中断の各時点で、以下のcommit境界と安全な復旧が成立するか。

PROPOSED: 以下の表示・確認・置換境界を採用候補とする。不明点を都合のよい成功条件に読み替えない。

## 3. WORKING / LOCKED / 対象外

今回WORKING: この文書のみ。コード・保存・既存Lock・Device PASS記録は変更しない。

承認後の最小runtime候補: Titleメニュー・CSS・保存状態別表示・確認dialog・New Game専用controller・必要なJourney/handoff cleanup adapter・tests・契約追記。候補ファイルは`index.html`、Title用CSS、`public-continue-title.js`または専用Title module、`game.js`の通常root開始接続部、新規controller。`progress.js`等のcore変更が必要なら別途理由と差分をレビューする。

LOCKED: 既存背景／ロゴ素材、Continue validator/resolver/receiver、Alenon strict readiness/spawn、Audio gesture/native再生、ready/preload、Garden from/dev導線、story・collision・movement・PAD帰還checkpoint保存・Landing/Garden未対応状態・既存Device記録。

対象外: save slot、移行、保存修復、全マップPublic対応、通常PAD保存追加、素材作り直し、loading全面改修、Audio/Story再設計、settings/editor削除。

## 4. 状態別Title仕様候補

| durable読込結果 | 表示・操作 |
|---|---|
| none（読込成功し値がnull） | `TOUCH TO START`のみ。既存通常開始・Journey reset／Progress非resetを維持。保存状態用Continue／New Gameは出さない |
| valid・対応Alenon | 主操作「続きから」、副操作「最初から」。補足「最後に保存された地点から再開します」。旧通常startを同時に第三の開始操作として残さない |
| valid・未対応map | 主操作Continueを無効化。「この保存地点の再開は準備中です」。New Gameは確認付き候補。近隣mapへfallbackしない |
| invalid | 「保存データを確認できません」＋読込再試行。rawを保持。noneや新規開始に自動変換しない |
| unsupported-format/version | 「この保存形式には対応していません」＋再試行。map準備中とは区別。rawを保持 |
| unavailable | 「保存データを読み込めません」＋再試行。保存の有無を推測しない。読込不可のまま置換／開始しない |

invalid／形式非対応の保存にNew Gameによる明示的置換を提供するかは、破壊的復旧の追加承認事項。採用する場合も「既存データを置き換える」確認、raw再読込、変更検出、以下のcommit境界を必須とする。読めないデータを失敗扱いで黙って上書きしない。

判定はread-only。表示時、操作時、確認確定時、pageshow/storage再表示時に再検証する。途中で別状態へ変化した場合は確認を無効化し、更新した状態を提示する。volatileをdurable保存として表示しない。

## 5. デザイン・操作仕様候補

- 既存背景とロゴの位置関係を基本維持。ロゴを隠すパネルや大きな不透明カードは追加しない。
- game.cssのTitle関連の複数overrideとlogoの!importantを含めcascadeを先に監査する。Title専用selectorへ限定し、全buttonへのglobal styleやロゴ素材／scaleの一律変更は行わない。responsive mockupを実装前の見た目確認に用いてよい。
- 主操作は金色文字・紺色半透明面・細い金色border。副操作は控えめな文字／borderで優先順位を示す。星の小さな飾りと淡いglowを使い、点滅や派手な動きは加えない。
- ボタンは操作面の高さ44 CSS px以上。指操作の間隔を取り、説明は折返し可。disabledの理由は色だけに依存せず文字でも伝える。
- 390×844、狭幅320 CSS px、iPad縦横、iPhone横向きでロゴ・説明・操作を重ねず、safe-areaを確保する。小高さではmenu領域の配置調整やscrollを許し、操作を画面外へ固定しない。
- keyboard focus、明瞭なfocus ring、accessible name、状態読み上げ、disabled属性を使用。reduced-motionでは装飾の動きを止める。
- 確認dialogは「現在の保存を置き換えて、最初から始めます。よろしいですか？」を候補とし、取消と「保存を置き換えて始める」を区別。初期focusは取消、安全にfocusを戻す。背景の開始操作へeventが漏れないこと。

## 6. New Game操作・commit境界候補

1. 操作時に読み直し、現在のraw保存と検証結果を確認用snapshotに保持する。初期化をまだ行わない。
2. 確認dialogを表示する。取消／Escape／背面復帰はProgress・Journey・handoffへのwrite/removeゼロ。ContinueもTitle起動段階のwrite/removeゼロを維持。
3. 明示確定時に再読込し、snapshotとの変更を検出する。違えば停止し再確認。読込不可なら停止。
4. 対象Journey/handoffを読込・prepareできないならdurable reset前にfail closed。設定・editor等の無関係キーは対象に含めない。prepareに破壊的cleanupやダミーwriteを混ぜない。後続writeの成功は事前readで保証されない。
5. 一つの明示確定操作につき一つのopaque actionTokenと一つのProgress instanceを生成する。二重click、touch/click重複、重複listenerは同じ操作として抑止し、同じtokenを使う。
6. `resetGame(actionToken)`の`persisted === true`はdurable setItem成功を意味し、この時点を不可逆な保存置換のcommit境界とする。persisted falseなら停止し、volatile INITIALで開始せずJourney/handoffを変更しない。自操作のwrite失敗によって旧durable bytesを上書きしないが、別タブによる変更まで旧保存保持と保証しない。
7. commit後にdurableを再読込し、INITIAL一致を確認する。再読込不能／不一致なら状態未確認としてnavigationもcleanupも停止する。一致確認できた場合のみ対象Journey mirrorと対象handoffをclear/resetし、readbackで整合性を確認する。必要なruntime Journey mirrorも一致させる。`localStorage.clear()`／`sessionStorage.clear()`は禁止。
8. 全ての必要状態が整合してから、既存Alenon通常開始routeへ接続する。音声・gesture・preload条件と既存query保持を検証する。Titleの別listenerが未確認のreset／navigationを二重実行してはならない。

失敗の意味を区別する:
- **commit前**: navigationもcleanupもしない。自操作は旧durable bytesを上書きせず、確認／再試行へ戻す。persist失敗済みinstance/tokenを再呼出しするとvolatileを返し得るため、単純再呼出しによる再試行は禁止。再試行は再検証・再確認した別の明示操作として設計し、古い操作を破棄する。
- **commit直後のdurable再読込不能／不一致**: writeは成功済みだが現在状態は未確認。「保存の書込みは完了しましたが、現在の状態を確認できません」と伝える。旧保存保持やINITIAL確定とは表示しない。navigation、cleanup、旧raw rollback、reset再実行は行わない。不一致が競合保存なら、その保存と対応mirrorを更新・消去しない。再読込による状態確認と競合時の復旧判断を先に行う。
- **commit後のJourney/handoff失敗**: 保存はすでにINITIALへ置換済み。旧保存保持とは表示しない。navigationせず「新しい保存は作成されましたが、開始準備に失敗しました」と伝え、同じcommit済みINITIALを前提に対象cleanupだけを再試行する候補。無条件にresetを繰り返さない。
- **commit後のnavigation失敗**: INITIALを維持し、既存保存が残っていると誤説明しない。状態整合を再確認した上で起動再試行する。旧rawを無条件に戻して別タブ更新を上書きしない。
- **書込直後のクラッシュ／別タブ競合**: 複数store間の原子性は保証しない。上記境界を満たす最小復旧方式が実証できるまでは実装を止める。journal／新規handoff protocol等が必要なら、scope拡張として別レビューし、仕様へ黙って追加しない。

## 7. Regression Lockの限定例外レビュー

Lock Aの明文はTOUCH TO START、通常Title開始、Alenon正式遷移、Prologue開始条件、Audio unlock導線を保護する。Journey reset／Progress非resetは現行コードと既存契約で確認した挙動であり、Lock Aが文字通りProgress方針を定義しているとは扱わない。

保存あり状態の旧start置換はLock AのTitle操作に対する限定例外として独立レビュー・製品承認する。「確認済みNew GameだけProgressをINITIALに置換する」変更は、現行Progress policyからの明示的scope拡張として併せて承認する。

none時の通常start、取消時の非破壊、Continueのread-only、Garden/devの既存startは例外の対象外。旧テストを削除せず、none時の旧契約と保存あり時の新しい明示契約を別々に保護する。製品承認前にLock文書を変更しない。

## 8. Acceptance / tests / Device Gate

自動検証:
- 全読込状態の実DOM表示・主副操作・visible理由。unknown/unavailableをnoneにしない。
- 確認取消、二重click、event漏れ、raw変更／削除／形式変更、revalidation、storage/pageshow/BFCacheとloader-disabled startの保持。
- Continue write/removeゼロ、取消write/removeゼロ、New Game対象キーだけ変更。unrelated raw bytes完全一致。
- actionToken重複、reset persist失敗とvolatile、Journey/handoff失敗、cleanup retry、navigation失敗、各時点のcrash/reload想定をfault injectionで検証。
- NONE通常開始、通常Alenon／PAD帰還、AudioとOrb既存契約、Public restoreと未対応map、dev zero-Production-writeを維持。
- targeted＋main比較full regression＋Validate/Event Safety/lineage/registry guard＋diff-check。新規失敗・不明な境界が残ればSTOP。

HIGH runtime Device Gate（exact SHA・人間PASS必須）:
- iPhone/iPadの縦横・狭幅・safe-area・focus・文字折返し・44px操作面。
- none通常開始／保存ありContinue／New Game取消と確定、確認表示中の戻る・連打。
- actual durable replacement→fresh Alenon prologue→completion→reload、旧イベント非混入。
- 音声gesture/native再生、ロード待ち、BFCache後の操作復帰、失敗と再試行。
- Garden from/devを含む対象通常往復。既存PASSを転記しない。

今回文書のみのDevice GateはNOT APPLICABLE。後続実装のCI PASSはDevice PASSではない。

## 9. 未決定事項と実行順

製品承認が必要:
1. 保存ありタイトルで旧通常startをContinue／確認付きNew Gameへ置換する限定Lock A例外。
2. invalid／形式非対応のraw保存にも確認付き置換を提供するか。
3. commit後失敗では新しいINITIALを保持する境界と復旧案を採用するか。

技術監査が必要: store所有権、session failure検出、gesture維持、クラッシュ／別タブ競合での最小復旧。未実証のatomic保証を宣言しない。

順序: 本書の独立レビュー → 上記製品承認・限定runtime scope確定 → feasibility/preflight登録監査 → 専用branchで実装 → 独立diff／error-pathレビュー → CI／対象実機確認 → 別Draft PR → 全Gate後の別merge判断。

この設計文書の公開・mergeは、runtime実装や破壊的置換・後続runtime PRのmergeを承認するものではない。
