# Cloudflare Workers デプロイ手順書

## 事前準備

### 1. Cloudflare アカウント作成
1. [Cloudflare](https://www.cloudflare.com/) でアカウント作成
2. ダッシュボードにアクセス

### 2. Wrangler CLI のインストール
```bash
npm install -g wrangler
```

### 3. Cloudflare にログイン
```bash
wrangler login
```

## KV Namespace の作成

### 1. KV Namespace を作成
```bash
cd workers
wrangler kv:namespace create "CURATION_DB"
wrangler kv:namespace create "CURATION_DB" --preview
```

### 2. wrangler.toml を更新
出力された ID を `wrangler.toml` に設定：
```toml
[[kv_namespaces]]
binding = "CURATION_DB"
id = "your-production-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"
```

## 環境変数（Secrets）の設定

### 1. 必要なシークレットを設定
```bash
cd workers

# Gemini API キー
wrangler secret put GEMINI_API_KEY
# 入力: AIzaSyAOFXswyRObspZIF0iUJtM-SJp65KS37GM

# メール設定
wrangler secret put EMAIL_USER
# 入力: kakusato8@gmail.com

wrangler secret put EMAIL_PASSWORD
# 入力: horuhis8horuhis8

# JWT シークレット（ランダムな文字列）
wrangler secret put JWT_SECRET
# 入力: your-super-secret-jwt-key-make-it-long-and-random
```

### 2. シークレット確認
```bash
wrangler secret list
```

## デプロイ

### 1. 依存関係のインストール
```bash
cd workers
npm install
```

### 2. 開発環境でテスト
```bash
npm run dev
```

### 3. 本番デプロイ
```bash
npm run deploy
```

## デプロイ後の確認

### 1. Workers URL の確認
デプロイ完了後に表示される URL:
```
https://curation-ai-workers.your-subdomain.workers.dev
```

### 2. API エンドポイントテスト
```bash
# ヘルスチェック
curl https://curation-ai-workers.your-subdomain.workers.dev/api/health

# ユーザー登録テスト
curl -X POST https://curation-ai-workers.your-subdomain.workers.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"uid":"test123","email":"test@example.com"}'
```

## スケジュール確認

### 1. Cloudflare Dashboard でCron確認
1. Workers & Pages → あなたのWorker
2. Triggers タブ
3. Cron Triggers で「0 5 * * *」が設定されていることを確認

### 2. 手動でCronトリガーをテスト
```bash
# Cron トリガーを手動実行
wrangler dev --test-scheduled
```

## フロントエンドの更新

### 1. API URL の更新
`frontend/.env.production` を更新：
```bash
VITE_API_BASE_URL=https://curation-ai-workers.your-subdomain.workers.dev/api
```

### 2.認証システムの更新
Firebase Auth の代わりに Workers の JWT を使用するよう、フロントエンドを更新する必要があります。

## 監視・デバッグ

### 1. ログの確認
```bash
wrangler tail
```

### 2. KV データの確認
```bash
# 全ユーザー一覧
wrangler kv:key list --binding=CURATION_DB --prefix="user:"

# 特定ユーザーの設定確認
wrangler kv:key get "settings:user123" --binding=CURATION_DB
```

### 3. パフォーマンス確認
Cloudflare Dashboard → Analytics でリクエスト数、レスポンス時間等を確認

## コスト確認

### 無料枠
- **リクエスト**: 100,000リクエスト/日
- **CPU時間**: 10ms/リクエスト
- **KVストレージ**: 1GB
- **KV読み取り**: 100,000回/日
- **KV書き込み**: 1,000回/日

### 予想コスト（月間）
- 軽い利用（1日100リクエスト）: **完全無料**
- 中程度利用（1日1,000リクエスト）: **$1-3程度**

## トラブルシューティング

### 1. デプロイエラー
```bash
# 詳細ログでデプロイ
wrangler deploy --verbose
```

### 2. KV アクセスエラー
- KV Namespace IDが正しく設定されているか確認
- wrangler.toml の binding 名が正しいか確認

### 3. 認証エラー
- JWT_SECRET が設定されているか確認
- フロントエンドのトークン送信が正しいか確認

### 4. Cron が動かない
- wrangler.toml の crons 設定を確認
- Cloudflare Dashboard でトリガーが有効になっているか確認

## セキュリティ

### 1. CORS設定
現在は全オリジンを許可（`*`）。本番では特定ドメインに制限推奨。

### 2. レート制限
必要に応じて追加実装を検討。

### 3. JWT トークン有効期限
現在は7日間。要件に応じて調整。

これで Cloudflare Workers への完全移行が完了します！