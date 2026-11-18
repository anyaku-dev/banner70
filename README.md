# BANNER 70 — LP 納品ファイル

株式会社ANYAKU「BANNER 70」販売用ランディングページの一式です。
LP本体は HTML / CSS / JavaScript のみの静的サイトです。決済後にFigmaデータを自動で届けるため、Vercel Functions（`api/`）を追加しています（詳しくは「8. 決済後の自動納品」を参照してください）。

## 1. サイトを開く

- `index.html` がトップページ、`thanks.html` が購入完了ページです。
- 公開先は Vercel を想定しています。このフォルダを Vercel のプロジェクトとしてデプロイしてください（フレームワークの設定は「Other」、ビルドコマンドは不要です）。
- LPだけを確認する場合は、ローカルのWebサーバーで `index.html` を開いてください。HTMLを直接ダブルクリックした場合、ブラウザによって動画等の挙動が異なる場合があります。

## 2. 最重要：購入ボタンのリンク先を設定する

現在は決済ページのURLが未提供のため、**すべての購入ボタンは株式会社ANYAKUの公式お問い合わせページ**に接続しています。
未設定の状態で、「決済できる」と誤認させないようボタンの文字も「購入について問い合わせる」にしています。

`js/config.js` を開き、次の `checkoutUrl` に、Stripe の決済用リンク（Payment Link）のURLを入力してください。

```js
window.BANNER70_CONFIG = {
  checkoutUrl: 'https://buy.stripe.com/...',
  contactUrl: 'https://anyaku.co.jp/contact/'
};
```

`checkoutUrl` が空欄の場合は公式お問い合わせへ、`https://` から始まるURLが入力されている場合はその購入ページへ遷移します。
リンク設定と同時に購入ボタンの文言も切り替わります。

## 3. 収録素材

| フォルダ | 内容 |
| --- | --- |
| `assets/banner-template/` | `banner-template_1.jpg` ～ `banner-template_70.jpg`（70枚、各512×512px） |
| `assets/image-pattern/` | `1A.jpg` / `1B.jpg` ～ `3A.jpg` / `3B.jpg`（比較用6枚、各512×512px） |
| `assets/movie/` | `movie.mp4`（1920×1080、H.264 / AAC、**約42秒**） |
| `assets/logo/` | `logo.png`（ユーザー提供のオリジナルロゴ） |
| `assets/video-poster.jpg` | 動画から作成した表示前サムネイル |
| `assets/ogp-banner70.jpg` | OGP・SNS共有用の画像 |
| `assets/favicon.svg` | ページアイコン |

動画はご提供いただいた約42秒のファイルを、カットせず収録しています。

## 4. サイトの機能

- PC・タブレット・スマートフォン対応
- 商品一覧：全70種類、用途別フィルター、追加表示、拡大ダイアログ
- 拡大表示：左右ボタン・左右矢印キー、Escキーで閉じる
- Before / After：3組、スライダー操作で比較（キーボード操作可）
- 編集動画：ブラウザ標準の動画コントロールを使用
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

## 6. 公開前チェックリスト（重要）

- [ ] 「8. 決済後の自動納品」の設定を行い、サンドボックス（テスト環境）で、支払い → メール受信 → ダウンロードまでを通しでテストする
- [ ] 購入者に提供する**編集可能なFigmaデータ（.fig）**を用意し、Vercel Blob にアップロードする
- [ ] 商品ライセンス・利用規約を確定する（商用利用・受託案件・複製・第三者との共有・禁止事項）
- [ ] **70種類の画像内の写真、ロゴ、人物、フォント、AI生成素材**を確認し、テンプレート販売・再配布が許可されることを確認する
- [ ] バナー内の架空／実在の社名・商品名・受賞・数値・日付等が購入後にそのまま使われないよう購入者へ案内する
- [ ] 「特定商取引法に基づく表記」および返品／返金条件、提供方法等を適切に提示する
- [ ] 49,900円を「発売記念価格」と表記する場合の価格表示・キャンペーン条件を確認する（本LPは未実績の通常価格との二重価格表示をしていません）
- [ ] 実際の公開ドメインが決まったら `index.html` の `og:image` を絶対URLに変更し、必要なら `canonical` を追加する
- [ ] 公開するサーバー上で、スマホ・PCの表示、画像70枚、動画、リンク先を最終確認する

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

### 設定手順（最初はサンドボックス／テスト環境で）

1. **Vercel**：このフォルダを Vercel にデプロイします。プロジェクトの Storage から次の2つを追加します。対応する環境変数は自動で設定されます。
   - **Blob**（アクセスは Private）→ `BLOB_READ_WRITE_TOKEN`
   - **Upstash Redis**（Marketplace から追加）→ `KV_REST_API_URL` / `KV_REST_API_TOKEN`
2. **.fig ファイルのアップロード**：`npm install` のあと、`vercel env pull .env.local` で取得した `BLOB_READ_WRITE_TOKEN` を使って、次を実行します。
   ```sh
   BLOB_READ_WRITE_TOKEN=... npm run upload-figma -- ./BANNER70.fig
   ```
3. **Resend**：送信元ドメイン（例：anyaku.co.jp）を Resend に登録し、表示される DNS レコードを追加して認証します。API キーを発行します。
4. **Stripe**：
   - 商品「BANNER 70」を作成します（¥49,900・一回払い・**税込（inclusive）**、デジタル商品の税コードを設定）。
   - 決済用リンクを作成し、「Managed Payments を有効にする」にチェックを入れます。支払い後の移動先を `https://（公開ドメイン）/thanks.html` に設定します。
   - Webhook のエンドポイントを `https://（公開ドメイン）/api/stripe-webhook` で追加します。受け取るイベントは `checkout.session.completed`、`checkout.session.async_payment_succeeded`、`charge.refunded` の3つです。
5. **環境変数**：`.env.example` を参考に、Vercel の Environment Variables に `STRIPE_SECRET_KEY`、`STRIPE_WEBHOOK_SECRET`、`STRIPE_PRICE_ID`、`SITE_URL`、`RESEND_API_KEY`、`MAIL_FROM` などを設定し、再デプロイします。
6. **テスト**：テストカードで購入し、メールが届くこと、ダウンロードできること、Stripe ダッシュボードの Webhook 画面で通知が成功（200）になっていることを確認します。
7. **`js/config.js` の `checkoutUrl`** に決済用リンクの URL を設定します（本番では本番用のリンク）。

### 運用メモ

- **API キーや Webhook シークレットはファイルに書かず**、Vercel の環境変数にだけ設定してください（`.env*` は `.gitignore` / `.vercelignore` で除外しています）。
- メールが届かないという問い合わせがあった場合は、Stripe ダッシュボードで該当イベントを「再送」すると、メールが未送信の場合のみ送信されます。
- Managed Payments でも、決済完了の通知に購入者のメールアドレス（`customer_details.email`）が含まれることを、最初のテスト決済で確認してください。含まれない場合は、通知が失敗（500）として Stripe に記録されます。
- テスト：`npm test`（Stripe・メール・保存先・Blob を仮のものに置き換えた自動テスト）。`UPSTASH_REDIS_REST_URL` と `UPSTASH_REDIS_REST_TOKEN` を設定すると、Redis との連携テストも実行されます。

**お問い合わせ**： https://anyaku.co.jp/contact/

© 2026 ANYAKU Co., Ltd.
