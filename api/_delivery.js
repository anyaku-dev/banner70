// Core delivery logic for BANNER 70: fulfils paid Checkout Sessions by emailing a personal
// download link, revokes links on full refunds, and resolves download tokens to short-lived
// signed Blob URLs. All external services are injected so the logic can be tested in isolation.
import { randomBytes } from 'node:crypto';

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,64}$/;
const SIGNED_URL_TTL_MS = 5 * 60 * 1000;

export const createDownloadToken = () => randomBytes(32).toString('base64url');

export const createDeliveryService = ({ stripe, store, mailer, files, config, now = () => Date.now(), createToken = createDownloadToken }) => {
  const isBanner70Purchase = async session => {
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    return lineItems.data.some(item => item.price?.id === config.priceId);
  };

  const fulfillCheckoutSession = async session => {
    if (session.mode !== 'payment') return { status: 'ignored', reason: 'not-a-payment' };
    if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') {
      return { status: 'ignored', reason: 'payment-pending' };
    }
    if (!(await isBanner70Purchase(session))) return { status: 'ignored', reason: 'other-product' };

    const email = session.customer_details?.email || session.customer_email;
    if (!email) throw new Error(`Checkout Session ${session.id} has no customer email`);

    const createdAt = now();
    const { purchase } = await store.ensurePurchase({
      sessionId: session.id,
      email,
      token: createToken(),
      paymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id ?? null,
      createdAt,
      expiresAt: createdAt + config.linkTtlDays * 24 * 60 * 60 * 1000,
      maxDownloads: config.maxDownloads
    });
    if (purchase.emailedAt) return { status: 'already-sent' };
    if (!(await store.acquireMailLock(session.id))) return { status: 'in-progress' };

    try {
      await mailer.sendDownloadEmail({
        to: purchase.email,
        customerName: session.customer_details?.name || null,
        downloadUrl: `${config.siteUrl}/api/download?token=${purchase.token}`,
        expiresAt: purchase.expiresAt,
        maxDownloads: purchase.maxDownloads,
        idempotencyKey: `banner70-delivery/${session.id}`
      });
    } catch (error) {
      await store.releaseMailLock(session.id);
      throw error;
    }
    await store.markEmailed(session.id, now());
    return { status: 'sent' };
  };

  const revokeRefundedCharge = async charge => {
    if (!charge.refunded) return { status: 'ignored', reason: 'partial-refund' };
    const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : charge.payment_intent?.id;
    const sessionId = paymentIntentId ? await store.findSessionIdByPaymentIntent(paymentIntentId) : null;
    if (!sessionId) return { status: 'ignored', reason: 'unknown-payment' };
    await store.revoke(sessionId);
    return { status: 'revoked' };
  };

  const inspectToken = async token => {
    if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) return { ok: false, reason: 'invalid' };
    const sessionId = await store.findSessionIdByToken(token);
    const purchase = sessionId ? await store.getPurchase(sessionId) : null;
    if (!purchase) return { ok: false, reason: 'invalid' };
    if (purchase.revoked) return { ok: false, reason: 'revoked' };
    if (now() > purchase.expiresAt) return { ok: false, reason: 'expired' };
    if (purchase.downloads >= purchase.maxDownloads) return { ok: false, reason: 'limit' };
    return { ok: true, purchase, remaining: purchase.maxDownloads - purchase.downloads };
  };

  return {
    async handleEvent(event) {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          return fulfillCheckoutSession(event.data.object);
        case 'charge.refunded':
          return revokeRefundedCharge(event.data.object);
        default:
          return { status: 'ignored', reason: 'unhandled-event' };
      }
    },

    // Read-only check used to render the download page (does not consume a download).
    inspectToken,

    // Consumes one download and returns a short-lived signed URL for the .fig file.
    async redeemToken(token) {
      const check = await inspectToken(token);
      if (!check.ok) return check;
      // Create the URL before counting, so a storage error does not use up a download.
      const url = await files.createDownloadUrl({ validUntil: now() + SIGNED_URL_TTL_MS });
      const count = await store.incrementDownloads(check.purchase.sessionId);
      if (count > check.purchase.maxDownloads) return { ok: false, reason: 'limit' };
      return { ok: true, url, remaining: check.purchase.maxDownloads - count };
    }
  };
};

export const handleWebhookRequest = async (request, { stripe, webhookSecret, service, logger = console }) => {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return new Response('Missing Stripe-Signature header', { status: 400 });
  const payload = await request.text();
  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (error) {
    logger.warn('[banner70] webhook signature verification failed', error.message);
    return new Response('Invalid signature', { status: 400 });
  }
  try {
    const result = await service.handleEvent(event);
    logger.info('[banner70] webhook handled', event.type, event.id, result);
    return Response.json({ received: true, ...result });
  } catch (error) {
    // A non-2xx response makes Stripe retry the event later.
    logger.error('[banner70] webhook handling failed', event.type, event.id, error);
    return new Response('Delivery failed', { status: 500 });
  }
};

const PAGE_MESSAGES = {
  ready: { title: 'ダウンロードの準備ができました', body: '下のボタンを押すと、BANNER 70 のFigmaデータ（.figファイル）のダウンロードが始まります。' },
  invalid: { title: 'リンクが無効です', body: 'ダウンロードリンクが正しくありません。メールに記載されたリンクをもう一度お試しください。' },
  revoked: { title: 'このリンクは無効になっています', body: 'ご購入が返金済みのため、ダウンロードできません。' },
  expired: { title: 'ダウンロードの有効期限が切れています', body: '有効期限を過ぎたため、このリンクではダウンロードできません。再発行をご希望の場合はお問い合わせください。' },
  limit: { title: 'ダウンロード回数の上限に達しました', body: 'このリンクで利用できるダウンロード回数を超えました。再発行をご希望の場合はお問い合わせください。' },
  error: { title: 'ただいまダウンロードできません', body: '一時的なエラーが発生しました。しばらく時間をおいて、もう一度お試しください。' }
};

const renderDownloadPage = ({ state, token, remaining, contactUrl }) => {
  const message = PAGE_MESSAGES[state];
  const action = state === 'ready'
    ? `<form method="post" action="/api/download"><input type="hidden" name="token" value="${token}"><button type="submit">ダウンロードする</button></form><p class="note">残りダウンロード回数：${remaining}回</p>`
    : `<p><a class="link" href="${contactUrl}">お問い合わせはこちら</a></p>`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${message.title} | BANNER 70</title>
<style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#faf9f7;color:#17151e;font-family:-apple-system,BlinkMacSystemFont,"Hiragino Kaku Gothic ProN","Hiragino Sans",Meiryo,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:520px;width:100%;background:#fff;border:1px solid #e9e6e9;border-radius:18px;padding:36px 30px;text-align:center}
.label{font-size:11px;font-weight:800;letter-spacing:.16em;color:#5a2aff;margin:0 0 10px}
h1{font-size:22px;line-height:1.5;margin:0 0 14px}
p{font-size:14px;line-height:1.9;color:#5f5a63;margin:0 0 18px}
button{border:0;border-radius:12px;background:#5a2aff;color:#fff;font:inherit;font-weight:800;font-size:15px;padding:17px 34px;cursor:pointer}
button:hover{background:#4617eb}
.note{font-size:12px;color:#8f8995;margin:14px 0 0}
.link{color:#5a2aff;font-weight:700}
</style>
</head>
<body><main><p class="label">BANNER 70</p><h1>${message.title}</h1><p>${message.body}</p>${action}</main></body>
</html>`;
};

const htmlResponse = (html, status) => new Response(html, {
  status,
  headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex, nofollow', 'referrer-policy': 'no-referrer' }
});

// GET: show a confirmation page without consuming a download, so that email link scanners
// that prefetch URLs do not use up the buyer's download count.
export const handleDownloadPageRequest = async (request, { service, contactUrl, logger = console }) => {
  const token = new URL(request.url).searchParams.get('token');
  try {
    const check = await service.inspectToken(token);
    if (!check.ok) return htmlResponse(renderDownloadPage({ state: check.reason, contactUrl }), check.reason === 'invalid' ? 404 : 410);
    return htmlResponse(renderDownloadPage({ state: 'ready', token, remaining: check.remaining, contactUrl }), 200);
  } catch (error) {
    logger.error('[banner70] download page failed', error);
    return htmlResponse(renderDownloadPage({ state: 'error', contactUrl }), 500);
  }
};

// POST: consume one download and redirect to a short-lived signed URL.
export const handleDownloadRedeemRequest = async (request, { service, contactUrl, logger = console }) => {
  let token = null;
  try {
    token = (await request.formData()).get('token');
  } catch {
    token = null;
  }
  try {
    const result = await service.redeemToken(token);
    if (!result.ok) return htmlResponse(renderDownloadPage({ state: result.reason, contactUrl }), result.reason === 'invalid' ? 404 : 410);
    return new Response(null, { status: 303, headers: { location: result.url, 'cache-control': 'no-store', 'referrer-policy': 'no-referrer' } });
  } catch (error) {
    logger.error('[banner70] download redeem failed', error);
    return htmlResponse(renderDownloadPage({ state: 'error', contactUrl }), 500);
  }
};
