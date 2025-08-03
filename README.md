# 個人情報配信BEアプリ (Personal Information Delivery Backend)

このプロジェクトは、Gemini APIを利用してユーザーが設定した情報カテゴリに基づき、定期的にメールで情報を配信するNestJSバックエンドアプリケーションです。

## 技術スタック

- **言語**: TypeScript
- **フレームワーク**: NestJS
- **データベース**: Firebase Firestore
- **認証**: Firebase Authentication
- **API**: Google Gemini API
- **メール送信**: Nodemailer (Gmail SMTP)
- **スケジューラー**: NestJS Schedule

## 主要機能

### 1. ユーザー管理
- Firebase Authenticationによるユーザー登録・認証
- プロフィール管理

### 2. 情報設定機能
- 情報カテゴリの設定（漫画、アニメ、ライブ情報など）
- 配信頻度設定（毎日/毎週/毎月）
- 即時配信機能

### 3. 情報収集・配信
- Gemini APIによる情報収集
- パーソナライズされたメール配信
- 配信ログ記録

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.example`を参考に`.env`ファイルを作成し、以下の値を設定してください：

```bash
# Firebase Configuration
FIREBASE_PROJECT_ID=your-firebase-project-id

# Gemini API Configuration
GEMINI_API_KEY=your-gemini-api-key

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password

# Port Configuration (optional)
PORT=3000
```

### 3. Firebase設定

1. Firebase Consoleでプロジェクトを作成
2. Firestoreデータベースを有効化
3. Firebase Authenticationを有効化
4. サービスアカウントキーをダウンロードし、`GOOGLE_APPLICATION_CREDENTIALS`環境変数で指定するか、デフォルトの認証を使用

### 4. Gmail設定

Gmail SMTPを使用する場合：
1. Googleアカウントの2段階認証を有効化
2. アプリパスワードを生成
3. `EMAIL_PASSWORD`にアプリパスワードを設定

### 5. フロントエンド設定

`frontend/.env.example`を参考に`frontend/.env`ファイルを作成し、Firebase設定を行ってください：

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=your-app-id

# Backend API URL
VITE_API_BASE_URL=http://localhost:3000
```

## 実行

### バックエンドの実行

**開発環境:**
```bash
npm run start:dev
```

**本番環境:**
```bash
npm run build
npm run start:prod
```

### フロントエンドの実行

**開発環境（開発サーバー起動）:**
```bash
npm run start:frontend
```

ブラウザで http://localhost:5173 にアクセスしてください。

**本番環境（ビルド）:**
```bash
npm run build:frontend
```

### 同時実行

バックエンドとフロントエンドを同時に起動する場合：

**ターミナル1（バックエンド）:**
```bash
npm run start:dev
```

**ターミナル2（フロントエンド）:**
```bash
npm run start:frontend
```

## APIエンドポイント

### 認証関連
- `POST /auth/register` - ユーザー登録
- `POST /auth/login` - ユーザーログイン
- `POST /auth/logout` - ユーザーログアウト

### 設定関連
- `GET /settings` - ユーザーの設定一覧取得
- `POST /settings` - 新しい設定追加
- `PUT /settings/:id` - 設定更新
- `DELETE /settings/:id` - 設定削除

### 配信関連
- `POST /delivery/instant/:settingId` - 特定設定の即時配信
- `POST /delivery/instant/all` - 全設定の即時配信
- `GET /delivery/logs` - 配信ログ取得

## データベース構造

### users コレクション
```typescript
{
  uid: string,
  email: string,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### user_settings コレクション
```typescript
{
  userId: string,
  settings: [
    {
      id: string,
      categoryName: string,
      geminiQuery: string,
      frequency: 'daily' | 'weekly' | 'monthly',
      weeklyDay?: number,
      monthlyDay?: number
    }
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### delivery_logs コレクション
```typescript
{
  userId: string,
  settingId?: string,
  deliveryType: 'scheduled' | 'instant',
  status: 'success' | 'failed',
  errorMessage?: string,
  deliveredAt: Timestamp,
  contentSummary?: string
}
```

## 自動配信

毎日午前5時に自動実行され、以下の条件でメール配信を行います：
- `daily`: 毎日配信
- `weekly`: 指定した曜日に配信
- `monthly`: 指定した日付に配信

## 開発

### ビルド

```bash
npm run build
```

### テスト

```bash
npm run test
npm run test:e2e
```

### リント

```bash
npm run lint
```

### フォーマット

```bash
npm run format
```

## デプロイ方法

### 🔥 Firebase デプロイ（有料）

#### 全体デプロイ
```bash
npm run deploy
```

#### 個別デプロイ
```bash
# フロントエンドのみ
npm run deploy:hosting

# バックエンド（Functions）のみ  
npm run deploy:functions
```

詳細手順: `DEPLOY.md` を参照

### ⚡ Cloudflare Workers デプロイ（無料）**【推奨】**

#### 開発環境
```bash
npm run dev:workers
```

#### 本番デプロイ
```bash
npm run deploy:workers
```

詳細手順: `workers/DEPLOY_WORKERS.md` を参照

### デプロイ後のURL

#### Firebase 版
- **フロントエンド**: `https://your-project-id.web.app`
- **API**: `https://asia-northeast1-your-project-id.cloudfunctions.net/api`

#### Cloudflare Workers 版（推奨）
- **フロントエンド**: Firebase Hosting または Vercel
- **API**: `https://curation-ai-workers.your-subdomain.workers.dev/api`

### 自動スケジュール配信
毎日午前5時（JST）に自動配信が実行されます：
- **Firebase**: Cloud Functions スケジュール
- **Cloudflare**: Cron Triggers

## ライセンス

MIT License