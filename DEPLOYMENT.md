# デプロイ手順書

## Vercel環境変数の設定

本番環境で正しく動作させるために、以下の環境変数をVercelで設定してください。

### 必須の環境変数

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Anthropic (Claude API)
ANTHROPIC_API_KEY=your_anthropic_api_key

# Stripe (本番環境)
STRIPE_SECRET_KEY=sk_live_your_production_secret_key
STRIPE_PRICE_ID=price_1SpP0LPHP72H6VKu0r4uDFk5
```

### 重要な注意事項

#### 1. Stripeの本番モード
- `STRIPE_SECRET_KEY` は必ず `sk_live_` で始まる本番用キーを使用してください
- テスト用キー（`sk_test_`）を使用すると、決済画面に「TEST」ラベルが表示されます

#### 2. Stripe価格ID
- `STRIPE_PRICE_ID` には、Stripeダッシュボードで作成した本番用の価格IDを設定してください
- 現在の本番用価格ID: `price_1SpP0LPHP72H6VKu0r4uDFk5`（月額500円）

#### 3. 環境変数の適用
- 環境変数を追加・変更した後は、必ずデプロイを実行してください
- キャッシュをクリアしてデプロイすることを推奨します

## Vercelでのキャッシュクリアデプロイ手順

環境変数を変更した場合、古いビルドキャッシュが残っていると正しく反映されないことがあります。
以下の手順でキャッシュをクリアしてデプロイしてください。

### 手順

1. Vercelダッシュボードにアクセス
2. プロジェクトを選択
3. **Deployments** タブを開く
4. 最新のデプロイメント（一番上）の右側にある **「...」（三点リーダー）** をクリック
5. **「Redeploy」** を選択
6. ポップアップが表示されたら、**「Use existing Build Cache」のチェックを外す**
   - または **「Clean Build (Do not use existing build cache)」** にチェックを入れる
7. **「Redeploy」** ボタンをクリック

### なぜキャッシュクリアが必要か

- 環境変数は**ビルド時**に読み込まれます
- キャッシュを使用すると、古いビルド結果が再利用され、新しい環境変数が反映されません
- キャッシュをクリアすることで、最新の環境変数を使用してアプリがビルドされます

## デプロイ後の確認

デプロイが完了したら、以下を確認してください。

### 1. 決済画面の確認
- 料金プランページ（`/pricing`）にアクセス
- 「今すぐ始める」ボタンをクリック
- Stripe決済画面に **「TEST」ラベルが表示されていないこと** を確認

### 2. 価格の確認
- 決済画面に「月額 ¥500」と表示されていることを確認

### 3. 決済テスト
- 本番環境では実際のカードで決済が行われます
- テストカード（`4242 4242 4242 4242`）は使用できません
- 実際の決済を行う前に、必ず少額でテストすることを推奨します

## トラブルシューティング

### 決済画面に「TEST」が表示される

**原因**: 環境変数が正しく設定されていない、またはキャッシュが残っている

**対処法**:
1. Vercelで `STRIPE_SECRET_KEY` が `sk_live_` で始まっているか確認
2. 上記の「キャッシュクリアデプロイ」を実行
3. デプロイ完了後、ブラウザのキャッシュもクリア（スーパーリロード: Cmd+Shift+R）

### 決済エラーが発生する

**原因**: Stripe価格IDが見つからない、または無効

**対処法**:
1. Stripeダッシュボードで価格IDを確認
2. Vercelで `STRIPE_PRICE_ID` が正しく設定されているか確認
3. 価格が「有効」（アーカイブされていない）状態か確認

### ログの確認方法

Vercelダッシュボード → プロジェクト → **Runtime Logs** で以下のエラーを確認:
- `STRIPE_SECRET_KEYが環境変数に設定されていません`
- `STRIPE_PRICE_IDが環境変数に設定されていません`

## コードの確認ポイント

このプロジェクトでは、すべてのStripe関連の設定を環境変数から読み込むように実装されています。

### 確認済み項目
- ✅ テスト用APIキー（`pk_test_`, `sk_test_`）のハードコードなし
- ✅ テスト用価格ID（`price_1Q...`）のハードコードなし
- ✅ すべてのStripe設定が環境変数から読み込まれる

### 主要ファイル
- `app/api/stripe/checkout/route.ts`: Stripe決済セッション作成
  - 12行目: `process.env.STRIPE_SECRET_KEY` から読み込み
  - 60行目: `process.env.STRIPE_PRICE_ID` から読み込み

## 本番環境への完全移行チェックリスト

- [ ] Vercelで `STRIPE_SECRET_KEY` を `sk_live_` で始まるキーに更新
- [ ] Vercelで `STRIPE_PRICE_ID` を `price_1SpP0LPHP72H6VKu0r4uDFk5` に設定
- [ ] Stripeダッシュボードで価格が「有効」になっていることを確認
- [ ] Vercelでキャッシュクリアデプロイを実行
- [ ] デプロイ完了後、決済画面から「TEST」ラベルが消えていることを確認
- [ ] 実際の決済フローをテスト（少額推奨）
- [ ] Webhook設定（サブスク更新時の処理が必要な場合）

---

**最終更新**: 2026年1月14日

