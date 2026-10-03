# Phase 2A-6 — Public Continue Implementation Contract v1.0

Status: ALENON IMPLEMENTATION + INDEPENDENT LOCAL REVIEW PASS / runtime publication, remote CI and Device Gates pending

Independent content review: `ae0c1cf30f1b72e4d6d1655feff4e77dcc69fc6c` PASS。関連5ファイル77/77、full regression276/276 PASS、fail/skip 0。契約本文のみのレビュー結果であり、Public runtime・remote CI・integrationの合格を意味しない。

Baseline main: `b24e2f46568410c5e1688ca156458e4d49f2ee52`

Goal: タイトルから、既存の保存済みProgressを検証し、安全に保存checkpointへ再開できる入口を追加する。

## 1. Evidence and limits

FACT: 上記mainをfetchし、通常タイトル開始、Progress Core、resolver、route registry、既存receiver、関連テストとRepository Working Rulesを照合した。

FACT: 通常開始はJourneyをresetするが、保存済みProgressを毎回resetしない。Alenonの初期化はdurable authorityが存在しない場合のみresetGameを使用する。

FACT: 通常PAD帰還のProduction経路はAlenon `pad_return` checkpointを保存していない。isolated Continue経路の保存処理をProduction保存の証拠として扱わない。

FACT: `tests/progress-resume.test.cjs` はresume importをisolated receiverに限定しており、Public入口を追加する場合は専用の許可条件と負の検証が必要。

FACT: Public Continue用preflight targetは未登録。

USER-REPORTED EVIDENCE: Pre-Implementation Auditの関連テスト178/178 PASS、およびexact mainのValidate・Event Safety・deployment成功。契約作成時の再実行結果とは区別する。

UNKNOWN: 提示された `/workspace/phase-2a-6-pre-implementation-audit.md` の全文はこの環境およびmainのroot/docsに存在しない。全文照合済みとは記録しない。ここではユーザーが提示した監査要約と現行コードを根拠にする。

PROPOSED: 以下をPublic Continue専用の実装契約として採用する。独立レビュー完了までruntime実装を開始しない。

## 2. WORKING / LOCKED scope

WORKING:
- TitleにContinue操作と保存状態の表示を追加する。
- Production専用controllerを追加する。
- Alenon / Landing / Gardenに明示的なPublic Continue入口を追加する。
- validator / resolver / 検証済みspawn・readiness・projection処理を再利用する。
- Public専用preflight target、tests、契約・検証文書を追加する。

LOCKED:
- 通常のTOUCH TO START → Alenon導線と既存Journey reset。
- 通常開始時のProgress取扱いと既存Production保存経路。
- Progress v1 schema、route/event/companion authority。
- 既存isolated dev receiverとProduction保存の分離。
- story、dialogue、audio、collision、movement、camera、PAD演出、Star Gate STAGE 1–3。
- 既存Device PASS記録。Public入口への流用は禁止。

対象外: New Gameとしての保存消去、save slot、migration、PAD帰還の新規checkpoint保存、保存頻度変更、loading全面改修、未実装イベント。

## 3. 監査の4点に対する確定方針

| 論点 | 本Phaseの方針 |
|---|---|
| 通常開始はProgressを毎回resetしない | 現行維持。通常開始を「保存を消して最初から」に改名しない。resetGameを追加しない |
| PAD帰還ではProduction pad_returnを保存しない | 現行維持。Continueは最終durable checkpointを使用。最後にいた場所へ戻れるとは表示しない |
| isolated専用import制約との衝突 | 純粋module importの副作用ゼロを維持し、Public controllerと専用receiver入口のみを許可。任意Production pageの自動復元は引き続き禁止 |
| Public preflight未登録 | 新規target `public-continue` と入口segmentを登録してからruntime作業を開始。既存locked targetを再利用・解除しない |

## 4. Title contract

Continueの表示文言は「つづきから」、補足は「最後に保存された地点から再開します」。通常開始のTOUCH TO STARTを維持する。

Titleでの保存判定はread-only。保存なし、invalid、unsupported、storage unavailableはContinueを無効化し、理由を短く表示する。壊れた保存を消去・修復・初期化しない。通常開始の可否をContinue判定の失敗で変更しない。

valid durable recordに対してのみContinueを有効化する。volatile progressは再開可能な保存とみなさない。クリック時に再読込・再検証し、表示時から変化した場合は新しい検証結果に従う。

Continueの連打・二重イベントは一回の起動として扱う。失敗時はTitleに留まり、再試行できる。Continue操作から通常開始へ自動fallbackしない。

## 5. Production controller and receiver contract

順序: 明示操作 → durable load → validateRecord → resolveContinue → 登録済みmap/spawnへの遷移 → receiverで再検証 → readiness → input unlock。

- 入口識別は専用の明示markerを使用する。候補は `entry=continue`。実装レビューで具体形式を固定し、`from=title`・`from=landing`・既存dev queryをContinue判定に流用しない。
- markerは起動方法の識別にのみ用いる。URL由来のmap、spawn、event完了、companion値をauthorityにしない。
- 遷移先はresolverが返すregistryのentryFileからのみ選択する。外部URLや任意pathは受け付けない。
- devとの併記、重複marker、矛盾するnormal-route markerは起動を拒否する。devからProductionへfallbackしない。
- Public controllerはProduction Progressを読む。isolated dev storageをProductionへコピーしない。
- 受信側はdurable recordを再検証し、要求先mapと一致することを確認する。不一致ならlocked errorとTitleへの手動復帰を提供する。
- Continue入場自体ではcheckpoint更新、event完了追加、companion遷移、Journey resetを実行しない。
- 復元後は既存Productionのイベント完了・保存経路へ接続する。isolated receiverのzero-write adapterをPublicの進行保存へ流用しない。
- Journey mirrorへの必要なprojectionは検証済みProgressに従う。逆方向に履歴を推測・修復しない。無関係なJourney/settings/editor状態を変更しない。

## 6. Supported destinations

registryのcheckpointを候補とし、各専用receiverの安全な復元が証明された組合せのみPublic対応とする。

| Map | Spawn IDs | 復元条件 |
|---|---|---|
| alenon | intro, pad_return | 検証済みAlenonのspawn/readiness契約を維持。待機中のしおぽんをAlenonへ出現させない |
| star_country_landing | pad_ground, garden_entrance | Landingの検証済み配置とイベント・同行状態を復元。dev往復markerを要求しない専用入口を作る |
| star_gate_garden | south_gate | Gardenの検証済み配置と履歴を復元。Publicでは通常Production往復経路に戻れることを検証する |

validatorが通ることとreceiverが対応していることは別々に検証する。対応しない組合せはfail closed。未対応を近隣spawnや別mapで代替しない。

現行Landing `receive()` は `pad_ground` に限定される。`garden_entrance` はdevの `from=garden` sessionによる分岐であり、そのままPublic対応の証拠にしない。専用Public adapterの復元・readiness・往復を個別に証明する。

## 7. Readiness and failure

input / movement / PAD / gate / event observationは、assetsReady、collisionReady、spawnResolved、historyRestored、companionPlaced、arrivalSettledの全成立までlocked。

使用するspawnは既存receiverの検証済みauthored point。座標再設計、collision変更、nearest-walkable探索による補正は禁止。

decode/fetch/collision/unsafe spawn/history mismatch/companion mismatch/storage read failureはlocked error。元のdurable bytesを保持し、controlled retryとTitle復帰を用意する。retryはeventを完了扱いにしない。

## 8. Expected implementation files

候補: `index.html`, `game.js` のTitle/entry分岐, 必要最小限のTitle CSS, 新規Production controller, `alenon.html`, `star-country-landing.html`, Garden bootstrap, 各resume moduleの専用Public adapter。

契約・検証: `event-contracts.json`, `docs/EVENT_CONTRACTS.md`, 必要なdev checkpoint登録, 専用tests, 本契約, Device Registryへの新規証拠追記。

`progress.js` / `route-registry.js` のauthority・schema変更、通常PAD帰還へのcommitArrival追加、通常開始へのresetGame追加はscope expansion。実装を止め、理由と差分を別途レビューする。

## 9. Preflight setup

runtime変更前に文書・registryのみの準備差分で、target `public-continue` をNOT TESTEDとして登録する。segments: `public-continue-title`, `public-continue-alenon`, `public-continue-landing`, `public-continue-garden`, `public-continue-integration`。

登録後に `node scripts/event-preflight.cjs --target public-continue` を実行し、baseline・branch・WORKING/LOCKED scopeを記録する。未知target拒否や既存LOCKED targetの保護を緩めない。

Public確認用dev fixtureが必要なら既存registryで隔離したテストstorageを注入し、Production writesゼロを検証する。実際のProduction persistence確認は、明示的に用意したテスト保存で別に行う。

## 10. Automated acceptance criteria

- valid / none / invalid / unsupported / unavailableとvolatileを区別し、Title判定でdurable writesゼロ。
- Continueクリックの再検証、連打抑止、wrong-map拒否、query矛盾拒否。
- 各対応map/spawnでexact spawn、event completion、companion authorityを復元。
- completed event再演ゼロ。incomplete eventのeligibilityと既存順序を維持。
- readiness前のinput・trigger発火ゼロ。asset/decode/collision/spawn失敗、retryを検証。
- 通常開始のJourney resetとProgress非resetを保存bytesで比較する。
- 通常PAD帰還に新たなProduction pad_return保存が追加されていないことを検証する。
- module importだけではstorage/clock/token/navigationにアクセスしない。
- isolated dev入口のProduction writesゼロを維持し、Public許可module以外の起動・importを拒否する。
- Public復元後の既存イベント保存と通常往復が機能し、dev markerが残らない。
- 関連targeted tests、full regression、Validate、Event Safety、lineage、registry guard、diff --checkが成功。

既存isolated import assertionは新しい明示allowlistと否定テストへ置き換える。テスト削除・無条件許可・skipで通さない。

## 11. Risk and Device Gate

この契約のみの変更: LOW / Device Gate NOT APPLICABLE。

後続runtime変更: HIGH。Title UI、gesture、保存読込、map/spawn、event/companion復元を横断するため。

exact candidate SHAでiPhone/iPadの対象viewportと実機確認を行う:
- 保存なしTitle、既存通常開始、音声unlock。
- 各mapへのPublic Continue、移動・カメラ・音声・しおぽん配置。
- 完了イベント非再演、未完了イベントの既存発火。
- Landing ↔ Garden、PAD → Alenon → Landingの対象往復。
- reloadで最終durable checkpointへ戻ること。PAD帰還地点の新規保存を期待しない。
- invalid/unavailable/途中失敗からの安全なTitle復帰。

既存Phase 2A-5c Device PASSはPublic入口のPASSに転記しない。CIと人間の実機PASSを区別して記録する。

## 12. Handoff and completion

次: この契約の独立レビュー → preflight登録 → 別runtime branch。Regression Lock §20に従い、Alenon → Landing → Gardenの順でmapごとに実装/自動テスト → 独立diff・error-pathレビュー → 対象exact-build Device Gate → CI/Merge Gate → 許可されたmain統合 → exact post-merge CIを完了する。

全mapを一括実装・一括合格扱いにしない。各段階で証明済みのmap/spawnだけをPublic許可対象にし、未対応の保存ではContinueを無効化して「この保存地点の再開は準備中です」と表示する。保存bytesは保持する。最後に全対応mapを横断するPublic integrationを検証してPhase完了とする。

契約作成後、候補 `afba0a1686c73897d61d8cdad4de8ace018a9112` でPublic preflight targetと5 segmentを登録した。登録状態はすべてNOT TESTED、productionEnabledはfalse。既存registry entryは変更していない。実際のPublic emitter/receiver・起動URLはまだ存在しない。

Local preflight PASS、独立local/content review PASS、full regression279/279 PASS（fail/skip 0）、assets/background/audio validationとdiff --check PASS。登録の検証はPublic runtime・Device PASSを意味しない。

GitHub pushは自動承認レビューにより拒否された。ユーザーの「次の段階に進んで」だけでは、当該リポジトリへの契約公開を明示的に許可したと認められないという判定。PR・remote CI・main統合は未実施。監査全文との照合も未完了。

登録段階の次の技術段階だったAlenon専用runtime branch作成と入口実装は、以下§13–14の候補で完了した。登録時点のpush拒否は、その後のユーザーの明示承認により解決し、契約・登録変更はDraft PR #87へ公開済み。PR #87のexact HEAD `f74c3796f3819f9601fafae8e5f323fca19667e7` でValidateとEvent Safetyはsuccess。main未統合。runtime候補の公開・CI・実機確認は別の後続段階。

再開文:

> Phase 2A-6 Alenon Public Continueの独立レビュー済み候補から再開して。§14のruntime SHAと公開状況を確認し、専用ブランチ公開・remote CI・exact-build実機確認へ進んで。通常開始のProgress resetとPAD帰還checkpoint保存は変更しない。mainへは必要なテストと実機確認が完了し、マージ承認を得てから統合する。

## 13. Alenon candidate segment (Phase 2A-6A)

WORKING: Title UI + pure `public-continue.js` controller, `alenon-public-continue.js` explicit adapter, reuse of the authored Alenon strict readiness boot, tests and four session-only real-runtime fixtures. HIGH risk; human Device Gate pending. Only Alenon `intro` and `pad_return` are supported; Landing/Garden saves display 準備中 and retain their exact bytes.

The marker is fixed as `entry=continue`. Duplicate/unknown entry values and dev/from/landingDev/skipPrologue/edit/objects/collision/legacyCollision/map/spawn/resume conflicts are refused before gameplay. The initial editor redirect also excludes explicit entry requests, so a contradictory collision query cannot escape refusal into a tool.

Title loads and validates durable Progress read-only, independently of Garden assets. Click re-reads the save and suppresses duplicate launches. Navigation failure allows retry; storage/pageshow refreshes status. A normal-start click disables Continue for that departure; a successful Continue disables normal start for that departure. The normal Journey reset and Progress non-reset behavior are unchanged.

Public Alenon uses the existing receiver's validated projection, authored intro/PAD ground point, image decode, strict collision and no-event-before-readiness behavior. A second durable read after assets settle must still match the entry context. Only then are the three Journey mirrors (landingMemoryDone/gardenStory/companion) projected; unrelated Journey keys are retained, and readback must confirm restored mirrors before controls unlock. Waiting companion projection has no stale x/y and therefore uses Landing's existing deterministic fallback placement. No checkpoint/event/companion transition is written merely by entry. The authored prologue completion uses the existing Production Progress path. PAD departure uses the existing Production route. Production PAD-return checkpoint saving is unchanged.

On successful Production Continue readiness, hide the entire loading/status panel including its Title link. Loading and failures retain status; isolated dev fixtures retain diagnostics. No timer is involved.

On Public errors, the player sees Japanese explanations with retry and Title return. Raw diagnostic codes remain in console or isolated development status. Public retry reloads the receiver so stale-during-readiness state is independently revalidated. No automatic ordinary-start fallback occurs.

Fixtures: `?dev=public-continue-alenon-intro-incomplete`, `intro-complete`, `pad-return`, and `pad-return-waiting` (each suffix appended to `public-continue-alenon-`). They run the same Public adapter with an injected session-only Progress backend, keep Journey detached, and contain PAD departure. They do not copy to or read Production Progress and cannot establish Production persistence/roundtrip Device PASS. `dev` plus `entry=continue` remains rejected.

Device checks needed on exact reviewed/published candidate: normal Title/start/audio; Title no-save/reasons/layout; each isolated Alenon fixture; a real Public `entry=continue` from a test save on the same origin; actual prologue completion persistence/reload; Production PAD → Landing → Alenon roundtrip and waiting companion behavior. Test saves must be prepared explicitly on the test origin without replacing a player's existing production save. No human PASS or release eligibility is inferred from automation. Main merge remains blocked until required human and CI gates pass.

Local Alenon candidate evidence: 12/12 new Public tests PASS, full regression 291/291 PASS (fail/skip 0), Public Alenon preflight PASS, new/inline JavaScript syntax PASS, asset/background/audio validation PASS and diff --check PASS. Tests execute the real Alenon inline runtime with controlled DOM/media/storage rather than a parallel UI simulation. They cover readiness/failure/retry, stale save detection, Production authored completion, zero entry Progress writes, Journey mirror restoration, Production PAD departure versus fixture containment, actual Title event wiring/BFCache recovery, and unchanged normal Title/PAD-return bootstrap. Automation does not establish real media/touch/viewport behavior or human Device PASS.

## 14. Independent Alenon implementation review / next gate

Branch: `feature/phase-2a-6-public-continue-alenon`
Exact reviewed runtime candidate: `db670a271c675d258e9c6e3ab604eef44a036aff`
Parent contract/preflight: `f74c3796f3819f9601fafae8e5f323fca19667e7`
Freshly verified main: `b24e2f46568410c5e1688ca156458e4d49f2ee52`

Independent local/content review: PASS。main276/276、candidate291/291、targeted41/41 PASS。fail/skip/known/new failureは0。追加の保存削除・破損・非対応version・矛盾companion・map変更・unsafe spawn・degenerate collision matrixもPASS。

レビューでは、通常PAD出発がdev markerなしの `./star-country-landing.html?from=alenon` に到達すること、Public prologue保存後の再読込で再演しないこと、4 fixtureでProduction accessゼロと専用session保存を確認した。Landing/Garden Public receiverは未実装。通常開始のProgress policyとProduction PAD帰還の保存経路は維持。

Remote runtime CI: PENDING。Human isolated Device Gate: PENDING。Human Production integration Device Gate: PENDING。main merge: NOT AUTHORIZED / NOT PERFORMED。

次は実装候補を専用ブランチへ公開し、Draft PRのCIを確認する段階。前回の明示的な公開承認は契約・登録変更を対象としており、このruntime候補の公開承認とは区別する。公開前にはローカルfixtureをユーザーが開けるexact-build URLとして提示しない。公開後も自動合格を実機PASSとして扱わない。
