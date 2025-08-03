# Firebase デプロイ手順書

## 事前準備

### 1. Firebase プロジェクトの設定
1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Authentication を有効化（メール/パスワード）
3. Firestore Database を作成
4. ウェブアプリを追加して設定値を取得

### 2. Firebase CLI のインストール・設定
```bash
npm install -g firebase-tools
firebase login
firebase init
```

### 3. プロジェクトの選択
```bash
firebase use your-project-id
```

## 環境変数の設定

### 1. Firebase Functions の環境変数設定
```bash
# Gemini API キー
firebase functions:config:set gemini.api_key="your-gemini-api-key"

# メール設定
firebase functions:config:set email.user="your-email@gmail.com"
firebase functions:config:set email.password="your-app-specific-password"

# Firebase プロジェクト ID
firebase functions:config:set firebase.project_id="your-project-id"
```

### 2. フロントエンド環境変数の設定
`frontend/.env.production` ファイルを編集：
```bash
VITE_FIREBASE_API_KEY=your-production-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
VITE_API_BASE_URL=/api
```

## デプロイ手順

### 1. 依存関係のインストール
```bash
# ルートディレクトリで
npm install

# Functions ディレクトリで
cd functions
npm install
cd ..
```

### 2. 全体デプロイ（推奨）
```bash
npm run deploy
```

### 3. 個別デプロイ

#### フロントエンドのみ
```bash
npm run deploy:hosting
```

#### バックエンド（Functions）のみ
```bash
npm run deploy:functions
```

## デプロイ後の確認

### 1. Hosting URL の確認
デプロイ完了後に表示される URL でフロントエンドにアクセス：
```
https://your-project-id.web.app
```

### 2. Functions URL の確認
Firebase Console で Functions の URL を確認：
```
https://asia-northeast1-your-project-id.cloudfunctions.net/api
```

### 3. 動作確認
1. フロントエンドでユーザー登録・ログイン
2. 設定追加・編集
3. 即時配信テスト
4. 配信ログ確認

## スケジュール配信の確認

### 1. Firebase Console での確認
1. Functions → Logs でスケジュール実行を確認
2. Firestore → delivery_logs コレクションで配信ログを確認

### 2. 手動実行（テスト用）
```bash
# ローカルで関数をテスト
firebase functions:shell

# 関数を手動実行
scheduledDelivery()
```

## トラブルシューティング

### 1. Functions デプロイエラー
```bash
# ログ確認
firebase functions:log

# Functions の詳細ログ
firebase functions:log --only=functions
```

### 2. 環境変数確認
```bash
# 設定済みの環境変数を確認
firebase functions:config:get
```

### 3. ローカルエミュレーター実行
```bash
# エミュレーター起動
firebase emulators:start

# または
npm run serve
```

## セキュリティ設定

### 1. Firestore セキュリティルール
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /user_settings/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /delivery_logs/{document} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
      allow write: if false; // Only server can write logs
    }
  }
}
```

### 2. Functions CORS 設定
既に実装済み（フロントエンドのドメインからのアクセスを許可）

## コスト最適化

### 1. Functions の設定
- メモリ: 1GB（必要に応じて調整）
- タイムアウト: 540秒
- 最大インスタンス数: 10

### 2. スケジュール関数の最適化
- 実行頻度: 毎日 5:00 AM JST
- 必要に応じて頻度を調整

## 監視・ログ

### 1. Firebase Console でのモニタリング
1. Functions → ダッシュボード
2. Hosting → 使用状況
3. Authentication → ユーザー

### 2. カスタムログの確認
```bash
firebase functions:log --only=api
firebase functions:log --only=scheduledDelivery
```