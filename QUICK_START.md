# 🚀 クイックスタートガイド - Cloudflare Workers デプロイ

## 手順1: Cloudflare ログイン

```bash
cd /workspaces/curation-ai/workers
wrangler login
```
ブラウザでCloudflareアカウントにログインしてください。

## 手順2: KV Namespace 作成

```bash
# 本番用
wrangler kv:namespace create "CURATION_DB"

# プレビュー用
wrangler kv:namespace create "CURATION_DB" --preview
```

**重要**: 出力されたIDをコピーして、以下のコマンドで `wrangler.toml` を更新してください：

例：出力が以下の場合
```
{ binding = "CURATION_DB", id = "abc123..." }
{ binding = "CURATION_DB", preview_id = "def456..." }
```

以下のコマンドで更新：
```bash
# 本番ID設定（abc123...を実際のIDに置換）
sed -i 's/your-kv-namespace-id/abc123.../g' wrangler.toml

# プレビューID設定（def456...を実際のIDに置換）  
sed -i 's/your-preview-kv-namespace-id/def456.../g' wrangler.toml
```

## 手順3: 環境変数設定

```bash
# Gemini API キー
wrangler secret put GEMINI_API_KEY
# 入力: AIzaSyAOFXswyRObspZIF0iUJtM-SJp65KS37GM

# メールアドレス
wrangler secret put EMAIL_USER
# 入力: kakusato8@gmail.com

# メールパスワード
wrangler secret put EMAIL_PASSWORD  
# 入力: horuhis8horuhis8

# JWT シークレット（強力なランダム文字列）
wrangler secret put JWT_SECRET
# 入力: curation-ai-super-secret-jwt-key-2024-make-it-very-long-and-random-string
```

## 手順4: デプロイ実行

```bash
# デプロイ
npm run deploy

# または
wrangler deploy
```

## 手順5: フロントエンド設定

デプロイ完了後、Workers のURLが表示されます（例：`https://curation-ai-workers.your-subdomain.workers.dev`）

そのURLを使って以下を実行：

```bash
# Workers用環境変数ファイル作成
echo "VITE_API_BASE_URL=https://your-actual-workers-url.workers.dev/api" > frontend/.env.local

# フロントエンド起動
npm run start:frontend
```

## 手順6: 動作確認

1. ブラウザで http://localhost:5173 にアクセス
2. ユーザー登録（メールアドレス入力）
3. 設定追加
4. 即時配信テスト

## トラブルシューティング

### KV Namespace エラー
```bash
# 現在の設定確認
cat wrangler.toml | grep -A 3 "kv_namespaces"

# Namespace一覧確認
wrangler kv:namespace list
```

### 環境変数確認
```bash
# 設定済みシークレット確認
wrangler secret list
```

### デプロイログ確認
```bash
# リアルタイムログ
wrangler tail

# または特定の関数ログ
wrangler tail --format=pretty
```

## 成功時の出力例

デプロイ成功時：
```
✨ Successfully deployed to Cloudflare Workers!
🌍 https://curation-ai-workers.your-subdomain.workers.dev
```

このURLをフロントエンドの環境変数に設定してください。

---

### 質問・問題が発生した場合

実行中にエラーが出た場合は、エラーメッセージをお教えください。すぐに解決します！