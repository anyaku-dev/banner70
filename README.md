# BANNER 70 — 販売サイト

株式会社ANYAKU「BANNER 70」の販売サイトです。GitHub の `main` への反映後、Vercel から `https://banner70.an-yaku.com/` で公開されます。
LP本体は HTML / CSS / JavaScript の静的サイトです。決済後のFigmaデータの自動送付には Vercel Functions（`api/`）を使用します（詳しくは「8. 決済後の自動納品」を参照してください）。

## 1. サイトを開く

- `index.html` がトップページ、`thanks.html` が購入完了ページです。
- 公開先は Vercel です。GitHub の `main` へプッシュすると自動デプロイされます（フレームワークの設定は「Other」、ビルドコマンドは不要です）。
- LPだけを確認する場合は、ローカルのWebサーバーで `index.html` を開いてください。HTMLを直接ダブルクリックした場合、ブラウザによって動画等の挙動が異なる場合があります。

## 2. 購入ボタンと価格

購入ボタンは `js/config.js` に設定した Stripe の本番決済リンクに接続しています。

決済リンクを変更するときは、`js/config.js` の `checkoutUrl` を新しい Stripe の決済用リンク（Payment Link）のURLに差し替えてください。現在の設定は次のとおりです。

```js
window.BANNER70_CONFIG = {
  checkoutUrl: 'https://buy.stripe.com/eVqcN619v2OQeTleUX2sM00',
  contactUrl: 'https://anyaku.co.jp/contact/'
};
```

`checkoutUrl` が空欄の場合は公式お問い合わせへ、`https://` から始まるURLが入力されている場合は決済ページへ遷移します。リンク設定に合わせて購入ボタンの文言も切り替わります。

発売記念特別価格は49,900円（税込）、適用期間は2026年11月20日〜12月31日です。キャンペーン終了後の販売予定価格は99,800円（税込）です。期間終了時には、Stripe の決済リンクとサイトの価格表示を同時に更新してください。

## 3. 収録素材

| フォルダ | 内容 |
| --- | --- |
| `assets/banner-template/` | 透かし入り公開見本 `banner-template_sample_1.jpg` ～ `banner-template_sample_70.jpg`（70枚、各512×512px） |
| `assets/image-pattern/` | `1A.jpg` / `1B.jpg` ～ `3A.jpg` / `3B.jpg`（比較用6枚、各512×512px） |
| `assets/movie/` | `movie.mp4`（1920×1080、H.264 / AAC、**約42秒**） |
| `assets/logo/` | `logo.png`（ユーザー提供のオリジナルロゴ） |
| `assets/Figma-logo.svg.webp` | Figma案内欄に表示するロゴ |
| `assets/video-poster.jpg` | 動画から作成した表示前サムネイル |
| `assets/banner70-image.jpg` | OGP・SNS共有用の画像（1024×1024px、ユーザー提供） |
| `assets/favicon.svg` | ページアイコン |

動画はご提供いただいた約42秒のファイルを、カットせず収録しています。

## 4. サイトの機能

- PC・タブレット・スマートフォン対応
- 商品一覧：全70種類、用途別フィルター、追加表示、拡大ダイアログ
- 拡大表示：左右ボタン・左右矢印キー、Escキーで閉じる
- Before / After：3組、スライダー操作で比較（キーボード操作可）
- 編集動画：画面に入るとミュートで自動再生し、終了後はループ再生。標準コントロールで一時停止・シークができ、音声切り替えボタンも利用可能
- FAQの開閉
- モバイルナビゲーション
- 目次へのスクロールリンク／ページ上部へ戻るボタン
- 基本SEOメタ情報、OGP画像、ファビコン
- LP本体は外部CDNやライブラリへの依存なし
- 決済後の自動納品：Figmaデータ（.fig）のダウンロード案内メールを自動送信（`api/`）

## 5. コピーや価格を変更する

- 見出し・説明・税込49,900円・FAQは `index.html` で編集できます。
- 配色・フォントサイズ・余白などは `css/style.css` で編集できます。
- バナーの並び・用途別フィルター設定は `js/script.js` の `categories` で変更できます。
- 表示する画像ファイルは `assets/` 配下に格納しています。ファイル名を変更する場合はHTML/JSの参照先も変更してください。

## 6. 公開後の確認事項

- [ ] 本番モードの決済リンク・価格ID・Webhook署名シークレットが同じStripeアカウントのものであることを確認する
- [ ] 本番の購入完了 → Resendからのメール受信 → Blobの `.fig` ダウンロードまで確認する（テストカードはサンドボックスでのみ使用）
- [ ] Vercel の `FIGMA_FILE_PATHNAME` が Private Blob 内の `BANNER 70.fig` と一致することを確認する
- [ ] **70種類の画像内の写真、ロゴ、人物、フォント、AI生成素材**を確認し、テンプレート販売・再配布が許可されることを確認する
- [ ] キャンペーン終了時に予定価格99,800円（税込）へ切り替え、価格に関するLP・特商法・Stripeの表示を揃える
- [ ] スマホ・PCで画像70枚、動画、購入・利用規約・返品・特商法のリンクを確認する

## 7. デザイン上の補足

実画像70枚の容量を維持しつつ、スクロール位置に応じて画像を読み込むよう最適化しています（lazy loading）。
画像は512pxのため、大きなデバイスでの拡大表示では元画像の解像度が上限です。
画面演出は `prefers-reduced-motion` に対応しています。

### 出現アニメーション

- `<head>` 内の小さなスクリプトが `html.has-motion` を付与した場合のみアニメーションが有効になります。視差効果を減らす設定（reduced motion）の環境や、`js/script.js` が読み込めなかった場合は、アニメーションなしで全コンテンツを表示します。
- スクロールで表示する要素には `reveal` クラスを付けます。同時に画面に入った要素は、順番に少しずつ時間をずらして表示されます。見出しは1行ずつ表示し、`reveal-children` を付けた要素は子要素を順番に表示し、`reveal-stack` は画像を重ねて配置したビジュアル用です。
- ファーストビュー（ヒーロー）：見出し・テキストを順に表示し、画像タイルの読み込み後に、タイルが波のように順番に表示されます。スクロールとマウスの動きに合わせて、画像がわずかに動きます。
- 収録数（70）と価格（49,900円）は、表示時に数値がカウントアップします。Before / Afterのスライダーは、表示時に一度だけ左右に動いて、操作できることを示します。
- 動きの速さや種類は `css/style.css` 末尾の `MOTION` セクションで調整できます。

## 8. 決済後の自動納品（Stripe → メール → ダウンロード）

### 仕組み

1. 購入者が Stripe の決済用リンク（Managed Payments を有効にしたもの）で支払います。
2. 支払いが完了すると、Stripe から `/api/stripe-webhook` に通知が届きます。本当に Stripe からの通知かを署名で確認したうえで、購入記録を保存し、購入者のメールアドレス宛てにダウンロード案内を送ります。同じ通知が複数回届いても、メールは1通だけ送ります。
3. 購入者は、メール内のリンク（`/api/download?token=...`）を開き、「ダウンロードする」ボタンを押します。押すたびに回数をチェックし、数分だけ有効な URL から .fig ファイルをダウンロードさせます。
   - リンクを開いただけでは回数を消費しません。メールソフトのリンク自動チェックで回数が減るのを防ぐためです。
4. 全額返金されると（`charge.refunded`）、そのリンクは使えなくなります。

| 設定 | 初期値 | 環境変数 |
| --- | --- | --- |
| リンクの有効期限 | 30日 | `DOWNLOAD_LINK_TTL_DAYS` |
| ダウンロード可能回数 | 5回 | `DOWNLOAD_MAX_COUNT` |

| ファイル | 役割 |
| --- | --- |
| `api/stripe-webhook.js` | Stripe からの通知を受け取る |
| `api/download.js` | ダウンロードページとダウンロード処理 |
| `api/_delivery.js` | 納品処理の本体（通知の処理・回数と期限のチェック） |
| `api/_store.js` | 購入記録の保存（Upstash Redis） |
| `api/_mailer.js` | 案内メールの文面と送信（Resend） |
| `api/_services.js` | 環境変数から各サービスを準備する |
| `thanks.html` | 決済完了後に表示するページ |
| `scripts/upload-figma-file.mjs` | .fig ファイルを Vercel Blob にアップロードする |

### 再設定・移行時の手順

1. **Vercel**：このフォルダを Vercel にデプロイします。プロジェクトの Storage から次の2つを追加します。対応する環境変数は自動で設定されます。
   - **Blob**（アクセスは Private）→ `BLOB_READ_WRITE_TOKEN`
   - **Upstash Redis**（Marketplace から追加）→ `KV_REST_API_URL` / `KV_REST_API_TOKEN`
2. **.fig ファイルのアップロード**：Private Blob に `BANNER 70.fig` を保存します。再アップロードする場合は `npm install` のあと、Vercel の `BLOB_READ_WRITE_TOKEN` を使って次を実行します。
   ```sh
   BLOB_READ_WRITE_TOKEN=... npm run upload-figma -- './BANNER 70.fig'
   ```
3. **Resend**：認証済みの `an-yaku.com` ドメインから `BANNER 70 <no-reply@an-yaku.com>` で送ります。API キーと `MAIL_FROM` を Vercel に設定します。
4. **Stripe**：
   - 商品「BANNER 70」を作成します（¥49,900・一回払い・**税込（inclusive）**、デジタル商品の税コードを設定）。
   - 決済用リンクを作成し、「Managed Payments を有効にする」にチェックを入れます。決済リンクの「支払い後」→「確認ページ」で、自分のサイトへリダイレクトする設定を選び、移動先を `https://banner70.an-yaku.com/thanks.html` に設定します。`/thanks/` が既に設定されている場合も、同じページへ転送されます。
   - Webhook のエンドポイントは `https://banner70.an-yaku.com/api/stripe-webhook` です。受け取るイベントは `checkout.session.completed`、`checkout.session.async_payment_succeeded`、`charge.refunded` の3つです。
5. **環境変数**：`.env.example` を参考に、Vercel の Environment Variables に `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_ID`、`SITE_URL`、`RESEND_API_KEY`、`MAIL_FROM` などを設定し、再デプロイします。
6. **テスト**：サンドボックスではテストカード、本番では0円注文用の限定クーポンなどを使って、Webhookの成功（200）、メール受信、ダウンロードを確認します。本番リンクでテストカードは使えません。
7. **購入リンク**：`js/config.js` の `checkoutUrl` は本番用のリンクを設定済みです。Stripe 側でリンクを作り直した場合だけ差し替えます。

### 運用メモ

- **API キーや Webhook シークレットはファイルに書かず**、Vercel の環境変数にだけ設定してください（`.env*` は `.gitignore` / `.vercelignore` で除外しています）。
- メールが届かないという問い合わせがあった場合は、Stripe ダッシュボードで該当イベントを「再送」すると、メールが未送信の場合のみ送信されます。
- Managed Payments でも、決済完了の通知に購入者のメールアドレス（`customer_details.email`）が含まれることを、最初のテスト決済で確認してください。含まれない場合は、通知が失敗（500）として Stripe に記録されます。
- テスト：`npm test`（Stripe・メール・保存先・Blob を仮のものに置き換えた自動テスト）。`UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` を設定すると、Redis との連携テストも実行されます。

**お問い合わせ**： https://anyaku.co.jp/contact/

© 2026 ANYAKU Co., Ltd.
