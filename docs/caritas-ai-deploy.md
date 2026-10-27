# カリタスAI試作 — 無料枠デプロイ手順

対象ブランチ: `feature/caritas-ai-resonance-v1`。**mainへは未統合**。

## 必要なもの
- GitHubリポジトリをVercelにImport。Root Directoryはリポジトリ直下。
- Vercel Environment Variables: `GEMINI_API_KEY`（秘密）、`TAROBRE_ALLOWED_ORIGIN`（ゲームの正確なOrigin。例: `https://raw.githack.com`）。
- 必要に応じて `GEMINI_MODEL`。無料利用できるモデルか事前確認すること。
- Redisは不要。

## ゲーム側の接続
ゲームを配信するHTMLの実行時に、バトルスクリプト読み込み前に以下を設定する:
```html
<script>window.TAROBRE_CARITAS_API_URL = "https://YOUR-VERCEL-DOMAIN.vercel.app/api/caritas-interpret";</script>
```
URLはVercelで発行された実URLに置き換える。APIキーは絶対にHTMLやGitHubに書かない。

## 動作確認
1. Vercel側で `OPTIONS /api/caritas-interpret` にOriginヘッダーを付けて204とCORSヘッダーを確認。
2. `POST` に `{"reading":"月は不安、力は優しさ、星は希望を表すと思う"}` を送信し、`shion`・`caritas`・`previewOnly:true` を確認。
3. iPhone Safariで実際に入力→送信→返答を確認。
4. 8文字未満、通信失敗、連打、タイムアウト時も画面と既存バトルが壊れないことを確認。

## 注意
- 現行のAPIは**無状態の解釈プレビュー**。AI共鳴値を確定せず、必殺技や既存のバトル結果は変えない。
- 無料枠・モデルの利用条件は変更される。Vercel/Geminiの課金設定を確認し、予算上限と利用制限を設定する。無料枠の範囲内で必ず動く保証はない。
- 現行のメモリ内レート制限はサーバーレス環境全体の厳密な制限ではない。一般公開前に利用量を制御すること。
- Origin/CORS制限は認証ではない。公開APIの濫用防止には追加対策が必要。
- `raw.githack.com` はVercel APIをホストしないため、接続先の明示が必須。
