# PR #114 iPhone Safari起動失敗 — 調査・プレビュー準備結果

2026-10-12 UTC。**MAIN MERGE GATE: STOP / DEVICE: PENDING**。
HTTPSプレビューの発行は未完了。Vercelはユーザーが選択したが、接続状態は未接続。
main・本番・既存GitHub Pages・PR #114のHEADは変更していない。PR #114はDraft。

## 対象と根拠

- 最新main: `22c07ae94d7491c3818b57574da7ee3af12edfc4`。
- 監査/source HEAD: `b093e355f8ba409f8a87de0de5c828604d2bf905`。
- Runtime SHA: `b8cd71755f7eafabf7c23fc3c85c779f345ea948`。
- 監査HEADとruntime SHAの差分はdocsのみ。ゲーム実行ファイルは同一。
- 独立作業ブランチ: `fix/pr114-safari-preview`（監査HEADから派生）。

**確認できた原因機構は、画像の別オリジンへのリダイレクトによるCanvas汚染。**
未変更の実ゲームを2つのローカルoriginで比較し、Lumiere WebPの要求だけを
301で別originへ送ると、desktop WebKitで報告と同じ例外が発生した。

```text
SecurityError: The operation is insecure.
getImageData@[native code]
create@http://127.0.0.1:8766/lumiere-sway.js:77:43
@http://127.0.0.1:8766/game.js:2589:58
```

`game.js:377–380`の動的ImageローダーはcrossOriginを指定せずsrcを設定する。
`lumiere-sway.js:74–77`がその画像をCanvasへ描き、初回getImageDataで失敗する。
`game.js:2638–2643`が例外を捕捉し、画面にはmessageだけを残す。
そのためpageerrorが0でも起動は失敗する。Stage3 WAITING等は起動未完了の結果。

対照条件では同じJS／画像バイトを同一originで配信すると、両エンジンで起動成功。
scene-layoutのcrystal読み戻しは成功し、この再現での最初の失敗はLumiere。
HTMLのcrystal画像にはanonymous CORSが付いている。素材応答側に
Access-Control-Allow-Originがあっても、Image側がno-CORSでは読み戻せない。
scene-layout.js／scene-effects.js／lumiere-sway.jsは現在mainと同一であり、
mainの動的Imageローダーにも同じcrossOrigin未指定が存在する。

[RawGitHackの公開nginx設定](https://github.com/neoascetic/rawgithack/blob/30d6b829b667034240a7b700ab6cf4379c20805b/rawgithack.conf#L178)
ではwebp/pngの拡張子がContent-Type表に含まれず、未登録拡張子を301で
raw.githubusercontent.comへ送る。raw／rawcdn両ホストに適用される設定。
[Canvas/CORSの仕様説明](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/CORS_enabled_image)とも整合する。

**証拠の境界:** これは実際のゲームコードでの因果再現と公開配信設定の照合。
報告された物理iPhoneの元URL全文・Web Inspectorログ・実応答のリダイレクト連鎖は
未取得。このexecutorからRawGitHackへはCloudflareのHTTP403となり、実サイトの
301応答を直接観測できなかった。物理iPhoneの発生行を実測済みとは報告しない。
元URLの通信ログが異なる場合は結論を再照合する。

## 修正差分と保全

ゲーム本体の修正は0。追加は固定SHA exporterと本調査資料のみ。
`scripts/build-pr114-safari-preview.py`はgit archiveで対象commitを固定して
193個のゲームファイル（122,634,290 bytes）を配信フォルダへ書き出す。
全JS・CSS・画像・音源のバイトを保全。全データの元SHA-256と配信SHA-256を記録。

配信フォルダ内のindex.htmlだけ、data-shiopon-base設定を可変mainの外部URLから
同梱の`./assets/sprites/shiopon/`へ置換する。元indexのバイト一致を偽らず、
この1変換と変換前後のハッシュをmanifestへ記録する。リポジトリのindexは未変更。
Lumiere、Star Gate、Save/Continue、通常BGM／イベント音響、カメラ等のコードは
監査runtimeと同一。Device Registry／Guard／テスト／baselineも無変更。

追加の`__preview__/verify.html`はゲームとは別ページ。
`__preview__/manifest.json`の固定HEAD/runtimeを確認し、配信された193ファイルを
ブラウザのSHA-256で照合する。これは配信バイトの証明であり、Device PASSではない。
全静的export内のVercel設定はbuildなし。後述の小さなbootstrap設定はビルドで
この静的exportを生成する。既存本番プロジェクトへの接続・Git連携は行わない。

## 自動・ブラウザ検証

| 検証 | 結果と範囲 |
|---|---|
| 候補の全Node＋regression baseline | 446/446、fail/skip/cancelled 0、新規失敗0 |
| 最新mainの同検証 | 341/341、fail/skip/cancelled 0、新規失敗0 |
| assets／background／audio検証器 | すべてexit 0 |
| 既存root JS／scripts構文 | 57ファイルPASS |
| Lumiere画素検証器 | 4方向、34 phase、局所領域外／root／境界保全、frame readback/allocation 0 |
| 独立Gitバイト照合 | 193個、indexの指定設定以外は元commitと同一 |
| Chromium実ブラウザ | Stage3縦390×844／横844×390、通常Title、通常Garden G3の起動・全DOM画像・Canvas読み戻し成功 |
| desktop WebKit実ブラウザ | 同じ4条件で起動・全DOM画像・Canvas読み戻し成功 |
| 配信ファイルSHA | 両エンジンで全193個を実HTTP取得しmanifestと照合成功 |
| 起動のCORS／SecurityError | 同一originのパッケージでは0。再現条件では意図どおりSecurityError |
| 通常ルートのdev漏出 | 通常Title／G3でStage3フラグ・イベントruntime・選択UIなし |
| Device Registry Guard（PR条件） | exit 1、runtime SHAの人間確認記録なし。STOPを維持 |
| Main lineage guard（PR条件） | 独立ブランチ公開後PASS、最新mainは候補のancestor |
| MAIN MERGE GATE | STOP。HTTPS・人間実機・統合承認を満たしていない |

ブラウザ計測はLinux desktop Chromium／Playwright WebKit26.5。
後者は物理iPhone Safariではない。WebKit起動に必要なライブラリはworkspaceへ
展開した。システム／ゲーム依存は変更せず、host dependency validatorの手動回避を
使用したため、その実行条件も隠さない。

Chromiumのfavicon.icoだけ404（元ゲームにfaviconなし）。ゲーム資源は成功。
desktop WebKitのMP3 media応答はstatus0として観測される。音源バイトは全ファイル
SHA照合で一致するが、再生・聴感・iOS gesture／BFCacheは未確認。
条件付きイベント開始チェックは選択UIが出ず実行されなかった。
**このブラウザ検証はイベントの通し再生・音響PASSを含まない。**
前半の厳格なharnessはfavicon404／WebKit media status0を拾って停止した。
最終harnessはそれぞれを明示して起動・画像・Canvasの判定から分離した。
ゲームテストや検証器のassertionを変更していない。

## HTTPSプレビューとiPhone確認手順

**iPhone向けHTTPS URL: 未発行。** ローカルHTTP URLを実機URLとして渡さない。
Vercel接続後、新規のプレビュー専用プロジェクトを選び、固定exportを
Preview deploymentとして配信する。既存プロジェクト・Production・Pagesに
deployしない。新規projectのGit自動連携も不要。

[VercelのCLI上限](https://vercel.com/docs/limits#static-file-uploads)はHobbyで100MB、
Proで1GB。全素材122.6MBを削らず配信するため、
`scripts/build-pr114-vercel-bootstrap.py`が8,834 bytesのアップロード用パッケージを作る。
同梱exporterをSHA-256照合し、ビルド内で監査HEADとruntimeの2つのGit object ID
だけを取得して、上記と同一のpublicファイルを生成する。可変mainを取得しない。
ローカルのpublic出力は.vercelignoreで除外する。VercelビルドでのGitHubアクセス・
git／bash／python3の利用は、実ホストに接続した後の確認事項。

```sh
python scripts/build-pr114-vercel-bootstrap.py /absolute/new/pr114-build-upload
# 新規プレビュー専用Vercel projectだけにlinkした上で実行する。
vercel deploy /absolute/new/pr114-build-upload --target=preview
```

[Vercel CLI](https://vercel.com/docs/cli/deploy)のPreview targetを用いる。
配信後はdeployment固有HTTPS URLを記録し、manifest・全193ファイル・HTTPヘッダ・
redirectなしを再検証する。ローカルでのPASSをHTTPSに転記しない。

実際のdeployment originが確定したら以下を使用する（現在は手順、実URLではない）。

1. iPhone通常Safariで`/__preview__/verify.html`を開く。
   表示HEAD/runtimeが上記40桁と一致することを確認し、Wi-Fiで全ファイルを照合する。
2. 同ページの星門リンク（`/index.html?dev=star-gate-full&returnDebug=1`）を開く。
   読み込み失敗なし／ERROR noneを確認。WAITINGはイベント未開始時には正常。
3. 縦横でLumiere4方向・局所揺れ・浮遊、門のNormal／Corrupted・内光・闇上昇を確認。
4. 星門へ移動して「星門を調べる」から本来のイベントを開始し、3鼓動・Re侵食・
   未来シオン・現在帰還カメラ・Aftermath両会話順と操作復帰を確認。
5. BGM／音響の順序、白無音／黒完全無音／現在BGM復帰、背景化・復帰を確認。
6. 別途通常TitleからSave／Continueと通常Gardenのdev非漏出を確認。
7. 機種・iOS／Safari・deployment URL・SHA・確認項目・PASS/FAILを人間が記録する。
   未確認項目をPASSにしない。失敗時はSafari Web InspectorのConsole／Networkを採取。

## 残存リスク・再監査

HTTPSホスティング未接続、実配信未検証、物理Safari未確認。
RawGitHackの実際の元URL／通信ログも未取得。
Saveは別originのため本番の保存データを共有しない。通常導線の再確認が必要。
VercelのPreviewアクセス保護はiPhoneでも同じviewerで開けることを確認する。
必要な音響・イベント全編・BFCache確認は保留。これらはbyte一致だけでは証明できない。

独立Astraが実diff・export・取得ログ・テスト結果をread-onlyで再監査した。
exporter／bootstrap実装は受入可、統合はSTOP。詳細は`astra-review.md`。
2件の低リスク文書指摘を修正。実機と外部配信の確認までMAIN MERGE GATEはSTOP。

独立Draft [PR #148](https://github.com/reverse-shion/tarot-breaker-game/pull/148)は
PR #114のブランチをbaseとする。main向けではない。初回候補
`82de6f0c29b19387692e77574aad3db1a2f9bfb0`の
[Validate CI #1734](https://github.com/reverse-shion/tarot-breaker-game/actions/runs/38189797142)はSUCCESS。
Main lineage guardの初回FAILは未公開のremote refによるものだった。
独立ブランチ公開後に同じ検証器を再実行してPASSを確認した。

全静的配信パッケージ: `pr114-preview-b093e355.tar.gz`（196 files）。
SHA-256: `4d70e8eaf43a080763ec6ac683311c1bc1c5e71d4ceb49418321b8305bc93fee`。

REGRESSION LOCK: source runtime changes NO / new Node failures NO /
automated audio/trigger/route assertions PASS / physical device PENDING /
integration and release STOP。
