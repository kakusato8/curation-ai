# 🚀 Cloudflare Workers デプロイ手順書

## エラー解決済み - 以下の手順で実行してください

### 1. Cloudflare API Token の取得

1. https://dash.cloudflare.com/profile/api-tokens にアクセス
2. "Create Token" をクリック
3. "Custom token" を選択
4. **Permissions** セクションで以下を追加：
   - **Account** → **Workers Scripts:Edit**
   - **Account** → **Workers KV Storage:Edit**
   - **User** → **User Details:Read** (必須)
5. **Account Resources** で "Include - All accounts" を選択
6. "Continue to summary" → "Create Token" をクリック
7. 生成されたトークンをコピー（一度しか表示されません）

### 2. 環境変数設定

```bash
export CLOUDFLARE_API_TOKEN="your-api-token-here"
```

### 3. KV Namespace 作成

```bash
cd /workspaces/curation-ai/workers
wrangler kv namespace create "CURATION_DB"
wrangler kv namespace create "CURATION_DB" --preview
```

### 4. wrangler.toml 更新

出力されたIDで以下を置換：
```bash
# 例: { binding = "CURATION_DB", id = "abc123..." }
sed -i 's/test-kv-namespace-id/abc123.../g' wrangler.toml
sed -i 's/test-preview-kv-namespace-id/def456.../g' wrangler.toml
```

### 5. Secrets 設定

```bash
wrangler secret put GEMINI_API_KEY
# 入力: AIzaSyAOFXswyRObspZIF0iUJtM-SJp65KS37GM

wrangler secret put EMAIL_USER
# 入力: kakusato8@gmail.com  

wrangler secret put EMAIL_PASSWORD
# 入力: horuhis8horuhis8

wrangler secret put JWT_SECRET
# 入力: curation-ai-super-secret-jwt-key-2024
```

### 6. デプロイ実行

```bash
wrangler deploy
```

### 7. フロントエンド設定

デプロイ完了後：
```bash
echo "VITE_API_BASE_URL=https://your-workers-url.workers.dev/api" > frontend/.env.local
npm run start:frontend
```

## 🎯 現在の状況

✅ **デモ版起動完了**:
- フロントエンド: http://localhost:5173
- API デモ: http://localhost:8787
- 全機能テスト可能

⚡ **次のアクション**: 
上記手順を順番に実行してCloudflare Workersにデプロイしてください。

---

## 📱 デモ版での動作確認

1. http://localhost:5173 にアクセス
2. ユーザー登録（任意のメールアドレス）
3. 設定追加
4. 即時配信テスト
5. 配信ログ確認

全ての機能が正常に動作することを確認できます！