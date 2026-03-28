# 昔の人 - 古文解析アプリ

古文をカメラ撮影やテキスト入力から解析するPWA（Progressive Web App）です。

## 機能

- 📷 カメラ撮影によるOCR読み取り
- ⌨️ テキスト入力による解析
- 📚 解析履歴の保存・閲覧
- 📖 単語帳機能（単語の保存・検索・削除）
- 📱 PWA対応（オフライン動作、ホーム画面追加可能）

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env.local`ファイルを作成し、Anthropic APIキーを設定してください：

```bash
ANTHROPIC_API_KEY=your_api_key_here
```

APIキーは [Anthropic Console](https://console.anthropic.com/) で取得できます。

### 2.1 公式単語帳「英検２級レベル」の投入（任意）

1. Supabase **Authentication** で公式用のダミーユーザーを1件作成し、**User UID** を控える。
2. `.env.local` に次を追加する（Service Role はブラウザに公開しないこと）。
   - `OFFICIAL_WORDBOOK_OWNER_ID` … 上記 UID
   - `SUPABASE_SERVICE_ROLE_KEY` … Supabase ダッシュボードの Service Role
3. リポジトリに `data/seed/eiken-grade2-level.json` が無い場合、手元の**自分が権利を持つ**番号付き英単語リスト（PDF または .txt）から生成する。

```bash
npm run parse:eiken -- "/絶対パス/語彙リスト.pdf"
```

4. Supabase に公式単語帳を流し込む（冪等。既に語が入っていればスキップ）。以前「ターゲット1400」で入れた行は、シード実行時にタイトルが「英検２級レベル」へ更新される。

```bash
set -a && source .env.local && set +a && npm run seed:official
```

### 3. アイコンの生成（オプション）

PWAアイコンを生成するには、`sharp`パッケージをインストールしてスクリプトを実行：

```bash
npm install sharp --save-dev
node scripts/generate-icons.js
```

これにより、`public/icon-192x192.png`と`public/icon-512x512.png`が生成されます。

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

## PWAとしてインストール

### iPhone/iPad

1. Safariでアプリを開く
2. 共有ボタン（□↑）をタップ
3. 「ホーム画面に追加」を選択
4. アプリがフルスクリーンモードで起動します

### Android

1. Chromeでアプリを開く
2. メニューから「アプリをインストール」を選択
3. ホーム画面にアイコンが追加されます

## 技術スタック

- **フレームワーク**: Next.js 16
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **データベース**: Dexie.js (IndexedDB)
- **OCR**: Google Cloud Vision API
- **AI解析**: Anthropic Claude API
- **PWA**: Service Worker + Web App Manifest

## ライセンス

MIT
