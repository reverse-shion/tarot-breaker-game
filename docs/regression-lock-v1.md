# TAROT BREAKER
## Regression Lock v1.0

### Existing Stable Behavior Protection Contract

対象リポジトリ：

`reverse-shion/tarot-breaker-game`

基準ブランチ：

`main`

基準HEAD：

`ec4ea501a1a572310f76d04204e0ee4f5a24518b`

---

# 0. PURPOSE

この文書の目的は、

**一度正常動作を確認した既存機能を、今後の新規開発によって再び壊さないこと**

です。

TAROT BREAKERでは今後、

- Progress
- Save / Continue
- 新マップ
- 新イベント
- 新キャラクター
- 新演出
- 新サウンド
- UI
- ストーリー進行

などを追加していきます。

その際、新機能の実装によって過去に修正済みの機能が壊れる「Regression / 回帰不具合」を防止するため、現在正常動作が確認されている機能を **REGRESSION LOCK** として固定します。

---

# 1. ABSOLUTE RULE

今後すべてのPR・Phase・修正作業は、**Regression Lock対象を壊してはいけません。**

今回の作業Scopeに含まれていないRegression Lock対象について、

- 整理のため
- 共通化のため
- ついでに改善
- リファクタリング
- コードをきれいにするため

などの理由で変更してはいけません。

変更が必要になった場合は、実装を継続せず **STOP** して理由を報告してください。

---

# 2. SOURCE OF TRUTH

現在のRegression Lock基準：

`main`

HEAD：

`ec4ea501a1a572310f76d04204e0ee4f5a24518b`

今後mainが更新された場合、Regression Lockを通過したmainのみを新しい基準とします。

古いcommitや過去の会話を、現在の実装として扱わないでください。

---

# 3. LOCK A — TITLE → ALENON ENTRY

通常公開導線：

`Title`
↓
`TOUCH TO START`
↓
`Alenon`

を維持してください。

保護対象：

- TOUCH TO START
- 通常タイトル開始
- Alenonへの正式遷移
- Prologue開始条件
- Audio unlock導線

タイトル開始処理を変更する場合、Alenon Audio初期化への影響を必ず確認してください。

---

# 4. LOCK B — ALENON WIND AMBIENCE

使用音源：

`assets/audio/ambience/alenon-wind-ambience.ogg`

現在実機PASS済み。

維持条件：

- 通常Title開始からAlenonへ入る
- 必要なタイミングで風環境音が再生される
- iPhone Safariで再生可能
- Prologue演出に合わせた停止・復帰が可能
- PAD Return後に復帰する

PR #26で確認済みのnative playback経路を、理由なくWeb Audio-only方式へ戻してはいけません。

---

# 5. LOCK C — ALENON ORB AUDIO

使用音源：

`assets/audio/ambience/alenon-orb-resonance.mp3`

現在実機PASS済み。

維持条件：

- Orb広間内で聞こえる
- Orb広間外では聞こえない
- Windより前に出すぎない
- PAD Return後も正常復帰
- iPhone Safariで再生可能

重要：

Orb Audio proximityと、Orb Interaction proximityは別システムです。

混同してはいけません。

---

# 6. LOCK D — ALENON PROLOGUE AUDIO SEQUENCE

現在PASSしている演出：

Wind ambience
↓
Orb anomaly
↓
Wind fade / stop
↓
Wind gust
↓
Orb restoration
↓
Wind ambience restoration

を維持してください。

以下を勝手に変更しないでください。

- 再生順序
- 停止条件
- 復帰条件
- 音源
- Audio element
- gesture unlock
- Orbとの関係

Progress実装によって、このAudio sequenceを壊してはいけません。

---

# 7. LOCK E — ORB INTERACTION RE-ARM

PR #25で実機PASS済み。

Interaction Contract：

### Spawn inside Orb area

154px未満なら：

`armed = false`

### Waiting

その場で何秒待っても、Orb promptは開かない。

### Exit

Orb中心から154px以上離れる：

`armed = true`

### Re-entry

Orb中心118px以内へ戻る：

Orb interactionが正常発火する。

---

# 8. LOCK F — NO TIME-BASED ORB RE-ARM

Orbの再武装は、時間経過では発生させないでください。

禁止：

- `setTimeout`
- wait N seconds
- elapsed time

だけでOrbをarmedに戻す処理。

再武装の唯一の条件は、**プレイヤーが実際にOrb外へ出たこと**です。

---

# 9. LOCK G — ALENON PAD RETURN

Landing
↓
Alenon

へ戻る際、以下を維持してください。

- PADに乗った状態で帰還
- 正常なLanding animation
- 正常なdismount
- PAD即再乗車を防ぐlockout
- Alenon Wind復帰
- Orb Audio復帰
- Orb Interaction誤発火なし

---

# 10. LOCK H — MAP ROUNDTRIP

現在存在する正式マップ間移動：

Alenon
↔
PAD Landing
↔
Star Gate Garden

について、既存routeを壊さないでください。

変更Scope外で、

- URL
- query parameter
- spawn
- return route
- route reason
- destination

を変更しないでください。

---

# 11. LOCK I — EVENT DUPLICATION

一度完了した同一イベントが、マップ往復によって無条件に再発火しない現在仕様を維持してください。

特に：

- Alenon event
- Landing event
- Garden event

の再発火条件を、Progress実装時に勝手に変更しないでください。

---

# 12. LOCK J — COMPANION STATE

しおぽんについて、現在成立している：

- Gardenでの同行
- Landingでの待機
- マップ移動時の配置
- Shionとの重なり防止
- Lumiereイベント時の位置関係

をScope外で変更しないでください。

将来Progress Coreへ統合する場合も、現在の見た目上の挙動を基準としてください。

---

# 13. LOCK K — COLLISION / NAVIGATION

今回のProgress・Save系開発では、既存collisionおよびnavigationを変更しないでください。

保護対象：

- collision JSON
- Tap-to-Move
- floating joystick
- movement speed
- walkable areas
- obstacle areas
- map transition trigger area

Save処理を入れるために、collisionを変更してはいけません。

---

# 14. LOCK L — DIALOGUE / STORY CONTENT

Progress・Save実装では、既存の：

- セリフ
- イベント内容
- キャラクター演技
- camera movement
- wait timing
- story sequence

を変更しないでください。

「保存しやすくするため」に、ストーリー内容を変更することは禁止です。

---

# 15. REGRESSION TEST POLICY

今後のPRでは、変更後だけをテストしてはいけません。

必ず：

`current main`
vs
`candidate branch`

を比較してください。

新しいfailureが増えた場合：

**STOP**

してください。

既存failureを、今回の変更によるfailureとして扱わないでください。

逆に、既存failureだからという理由で、新しいfailureを見逃してはいけません。

---

# 16. AUTOMATED REGRESSION CHECK

可能な限り毎PRで最低限：

- JavaScript syntax
- Trigger tests
- map-roundtrip tests
- Alenon audio tests
- navigation tests
- dialogue/event tests
- Progress tests
- `git diff --check`
- full available test suite

を実行してください。

---

# 17. DEVICE SMOKE TEST

すべての小規模PRで、毎回ゲーム全体をフルプレイする必要はありません。

ただし重要Phaseの統合後には、以下を短時間で確認します。

## Core Smoke Route

Title
↓
TOUCH TO START
↓
Alenon
↓
Wind確認
↓
Orb確認
↓
PADへ移動
↓
Landing
↓
必要に応じてGarden
↓
AlenonへReturn

目的：

序盤の基幹導線が壊れていないか確認すること。

---

# 18. DEVICE TESTを要求する条件

実機確認を要求するのは、以下のような変更があった場合に限定してください。

- Audio
- browser gesture
- map transition
- spawn
- camera
- touch input
- visual layout
- persistence / reload
- iOS特有挙動

コード変更のたびに、全ゲームの実機確認を要求しないでください。

---

# 19. SAVE / PROGRESS DEVELOPMENT RULE

Phase 2A以降、ProgressやSaveを実装する場合：

**Progress Systemは既存Gameplayを支配しないこと。**

Progress Systemの責任は：

- 保存
- 復元
- event completion記録
- checkpoint記録
- companion state記録

です。

Audio、Collision、Movement、Dialogueそのものの内部仕様を、Progress都合で書き換えてはいけません。

---

# 20. ATOMIC INTEGRATION

一度に全マップをSave対応しないでください。

基本順：

### Phase A
Alenon

### Phase B
Landing

### Phase C
Star Gate Garden

### Phase D
Companion / Cross-map state

各Phaseごとに：

実装
↓
自動テスト
↓
diff review
↓
必要な実機確認
↓
merge

を完了してから次へ進みます。

---

# 21. MAIN PROTECTION RULE

mainは「開発途中の実験場所」として使用しないでください。

原則：

main
↓
feature / fix branch
↓
test
↓
device validation if required
↓
PR
↓
merge

としてください。

---

# 22. NO UNRELATED REFACTOR

今後特に禁止：

- 巨大ファイルだから分割
- 名前が気になるのでrename
- 古いコードに見えるので削除
- 一般的な設計へ変更
- AIがより良い方式だと判断したため変更

今回の目的に直接必要でないrefactorは禁止です。

必要なら別Phaseとして提案してください。

---

# 23. CI RED BASELINE

現在GitHub Actionsには、

`assets/maps/star-country-world-islands.webp`

に関する既知のvalidation failureがあります。

これは新規PRのfailure判定を難しくするため、将来的に別作業として正常化することを推奨します。

ただし、Progress Phaseと同時に修正してはいけません。

CI baseline cleanupは独立作業としてください。

---

# 24. STOP CONDITIONS

以下の場合は必ずSTOP：

### STOP A
Regression Lock対象ファイルを変更する必要が出た。

### STOP B
current main比で新規test failureが出た。

### STOP C
Audio behaviorが変化した。

### STOP D
Trigger behaviorが変化した。

### STOP E
Map route / spawn behaviorが変化した。

### STOP F
保存処理が既存イベント進行と競合した。

### STOP G
原因不明のiPhone Safari差異が発生した。

STOP後、別の修正へ勝手に進まないでください。

---

# 25. PR FINAL REPORT REQUIREMENT

今後すべての重要PRで、最終報告に以下を含めてください。

## REGRESSION LOCK RESULT

### Baseline
main HEAD

### Candidate
branch HEAD

### Scope
今回変更したもの

### Locked Systems Touched
YES / NO

### New Test Failures
YES / NO

### Existing Failures
既存baselineとの差異

### Audio Regression
PASS / NOT APPLICABLE / STOP

### Trigger Regression
PASS / NOT APPLICABLE / STOP

### Route Regression
PASS / NOT APPLICABLE / STOP

### Device Validation
必要な場合のみ結果

### Final
`REGRESSION LOCK PASS`

または該当STOP。

---

# 26. CURRENT BASELINE STATUS

基準：

`ec4ea501a1a572310f76d04204e0ee4f5a24518b`

現在確認済み：

### PR #26 Audio Recovery
PASS

### Wind Ambience
PASS

### Orb Audio
PASS

### Prologue Audio Sequence
PASS

### PAD Return Audio
PASS

### PR #25 Orb Trigger Re-arm
PASS

### Initial Orb Auto-trigger Prevention
PASS

### Exit → Re-arm → Re-entry
PASS

---

# 27. FINAL PRINCIPLE

TAROT BREAKERの今後の開発では、

**新しいものを作ることと、今あるものを壊さないことを、同じ重要度で扱う。**

一度PASSした仕様は、次の開発者・AI・Phaseにとって「変更可能な参考実装」ではなく、**明示的に変更指示されるまで維持すべき契約**として扱ってください。
