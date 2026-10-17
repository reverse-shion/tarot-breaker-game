# TAROT BREAKER — iPhone独立QA入口（GitHub Codespaces版）

**状態：準備中 / 保存テスト無効 / HOST未確認 / DEVICE未確認 / mainマージ禁止。**

## なぜCodespacesか

現行 `reverse-shion.github.io` のプロジェクトPagesは別リポジトリにしても同じオリジンを共有し、セーブの分離にはならない。
Codespacesの転送ポートは、通常ゲームと別の `https://<codespacename>-8765.app.github.dev` のようなHTTPSホストになる。
異なるポート番号のホストは異なるオリジンなので、**QA-A**と**QA-B**の保存領域を分離できる。
Codespacesは一定期間の非アクティブ状態で停止するため、一時的な実機受入専用とする。

ゲーム本体の凍結基準はPR #165、SHA `671b4282aea2d3e9cb21a873e99c7b2221fe27e5`。
この作業はPR #166（QA専用ブランチ）。PR #165・main・通常ゲームサイトは一切書き換えない。

## 準備（スマホでも可能、GitHub以外のサービス登録は不要）

1. GitHubで `reverse-shion/tarot-breaker-game` を開き、ブランチを `qa/east-passage-device-host-v1` に変更する。
2. `Code` → `Codespaces` → `Create codespace`。構成を選べる画面では `.devcontainer/qa-device/devcontainer.json`（**isolated iPhone QA**）を選ぶ。2コアの最小構成で十分。
3. 作成したCodespaceに設定された `postStartCommand` が、QA-A:8765とQA-B:8766の2つの静的配信サーバーを起動する。Devcontainerのポート属性には対応していない `visibility` 項目を使わず、GitHubのデフォルトPrivate設定を保護する。Terminalの設定や個別のデプロイサービスは不要な想定。ただし**実際の稼働とURLは未検証**。
4. `PORTS`で8765と8766が **Private（GitHubの標準設定）** であることを確認し、各URLをiPhone Safariで開く（GitHubログインが必要な場合あり）。GitHubの「接続用HTTPS URL」であり、サーバー自体はHTTPのままにする。**プライベート設定を勝手にパブリックへ変更しない**。
5. それぞれ `/qa/east-passage/index.html` を開く。画面に `安全ロック` が出ること、ボタンを押せないこと、正規ゲームタイトル画面と画像/音声が開くことを確認。URLが既存サイトとは別の `app.github.dev` のままか必ず確認。
6. 実URL・2つのポート・GitHub上のCodespace ID・`git rev-parse HEAD`を記録。動作が不明なら**HOST PENDING**とし、保存は絶対に作らない。

CodespacesのURLを取得したら、必ず配信バイト検査を実施する（最初は`approved-origin.js`空欄と一致する）。
```bash
node --test qa/east-passage/hosting/*.test.mjs
node qa/east-passage/hosting/verify-host.mjs https://実際のQA-Aのホスト --codespaces-private
node qa/east-passage/hosting/verify-host.mjs https://実際のQA-Bのホスト --codespaces-private
```
この検証はCodespaces内のターミナルから実行する。認証にはCodespaces内の `GITHUB_TOKEN` をリクエストヘッダーに使うが、絶対に画面共有・コピー・ログへトークン値を出さない。HTTP 302/401などの失敗が出たらHOST STOPにする。

ChromeやLinux WebKit上のPASSでは、実機SafariのPASSにはならない。

## 保護ルール

- デフォルトは保存用QA承認オリジンが空。ゲーム本体・本番セーブにはアクセスできず、QAランチャーも保存できない。
- `codespaces-host.mjs` はHTTPリクエストの書込みを拒否し、隠しファイル、.git、CI、スクリプト、テスト、文書などを配信しない。既存ゲームのHTML・素材・JSと4つのQAランチャーファイルだけを配信する。
- 保存テストを有効にするときは、実際に発行された各URL・配備SHA・内容一致を独立確認した上で、**別途承認された手順**でそれぞれのサーバーへ `TAROT_QA_APPROVED_ORIGIN` を設定し再起動する。コミットされた `approved-origin.js` は空欄のまま保持し、QAホストが読み出すときだけ一致した承認値を渡す。
- **今の段階では上記の有効化をしない。** コードとQA証拠を独立レビューした後に進める。
- 1つのポートに2つの検証データを入れない。ポート8765と8766でそれぞれ一回だけの合成セーブを作る。失敗したら勝手にSafariのサイトデータを消さずSTOP。
- Codespacesの無料枠を使い切ると課金対象・停止となる場合がある。時間をかけて常時稼働させない。
- Codespaces停止・プライベートポート認証・Safariキャッシュ・一時的な中断は別途観測する。未観測のBFCache／Home復帰をPASSと書かない。
- **mainへのマージ・本番公開はSTOPを維持**。QA Host PASSとiPhone Device PASSの判定は分離。

## 既存のCloudflare Pages案

Cloudflare Pagesの独立プロジェクト案も代替手段として残すが、当面は使わない。
現在のGitHubアカウント／Codespacesだけで完結できるかを最優先で確認する。

## 2026-10-17 自動監査補強（QA-only）

- ブラウザ音声用に `Range: bytes=...` の単一バイト範囲を返し、`206 Partial Content` と `Content-Range` を設定。解決不能な範囲は `416` で停止。HEAD、先頭範囲、末尾範囲、開放範囲、範囲外を自動検証。iPhone Safari実機での音質・再開は依然未確認。
- `verify-host.mjs` の `--enabled` は、**GitHubにコミットされた `approved-origin.js` を書き換えず**、CodespacesのHTTPサーバーが返す一時的な承認値と実オリジンの一致を検証する。ローカルHTTPサーバーで15ファイルの実データ比較をロック状態・一時承認状態の双方で検証する。実Codespaceホスト上の証拠ではない。
- `portsAttributes.visibility` はDevcontainer仕様にないため使わない。GitHub側の標準Privateポートを維持し、Port Visibilityを実画面で確認する。
- Codespaceの作成画面への公式形式の入口：[QA専用ブランチからCodespaceを作成](https://codespaces.new/reverse-shion/tarot-breaker-game/tree/qa/east-passage-device-host-v1) 。使用量と費用をGitHub上で確認し、対応する `.devcontainer/qa-device/devcontainer.json` を選ぶ。
- **Codespaceの作成を自動で行ったとは報告しない。** 既存アカウントの本人による作成が必要。HOST/DEVICEの判定は外部実体の確認後に更新。
