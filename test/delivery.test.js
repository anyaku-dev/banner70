import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { createDeliveryService, handleWebhookRequest, handleDownloadPageRequest, handleDownloadRedeemRequest } from '../api/_delivery.js';
import { createMemoryStore } from '../api/_store.js';
import { buildDownloadEmail } from '../api/_mailer.js';

const WEBHOOK_SECRET = 'whsec_test_banner70';
const PRICE_ID = 'price_banner70';
const SITE_URL = 'https://banner70.example';
const CONTACT_URL = 'https://anyaku.co.jp/contact/';
const DAY = 24 * 60 * 60 * 1000;
const realStripe = new Stripe('sk_test_dummy');
const silentLogger = { info() {}, warn() {}, error() {} };

const setup = ({ linePriceId = PRICE_ID, failMailTimes = 0 } = {}) => {
  let clock = Date.UTC(2026, 10, 18, 3, 0, 0);
  const sent = [];
  let failuresLeft = failMailTimes;
  const store = createMemoryStore();
  const service = createDeliveryService({
    stripe: { checkout: { sessions: { listLineItems: async () => ({ data: [{ price: { id: linePriceId } }] }) } } },
    store,
    mailer: {
      async sendDownloadEmail(message) {
        if (failuresLeft > 0) {
          failuresLeft -= 1;
          throw new Error('mail provider down');
        }
        sent.push(message);
      }
    },
    files: { createDownloadUrl: async ({ validUntil }) => `https://blob.example/banner70/BANNER70.fig?signed=1&until=${validUntil}` },
    config: { priceId: PRICE_ID, siteUrl: SITE_URL, linkTtlDays: 30, maxDownloads: 5 },
    now: () => clock
  });
  const deps = { stripe: realStripe, webhookSecret: WEBHOOK_SECRET, service, logger: silentLogger };
  const downloadDeps = { service, contactUrl: CONTACT_URL, logger: silentLogger };
  return {
    store,
    sent,
    service,
    advance: ms => { clock += ms; },
    async deliver(event, { secret = WEBHOOK_SECRET } = {}) {
      const payload = JSON.stringify(event);
      const signature = realStripe.webhooks.generateTestHeaderString({ payload, secret });
      const request = new Request(`${SITE_URL}/api/stripe-webhook`, { method: 'POST', headers: { 'stripe-signature': signature }, body: payload });
      return handleWebhookRequest(request, deps);
    },
    openPage: token => handleDownloadPageRequest(new Request(`${SITE_URL}/api/download?token=${encodeURIComponent(token)}`), downloadDeps),
    redeem: token => handleDownloadRedeemRequest(new Request(`${SITE_URL}/api/download`, { method: 'POST', body: new URLSearchParams({ token }) }), downloadDeps)
  };
};

const sessionEvent = (overrides = {}, type = 'checkout.session.completed') => ({
  id: `evt_${Math.random().toString(36).slice(2)}`,
  object: 'event',
  type,
  data: {
    object: {
      id: 'cs_test_banner70',
      object: 'checkout.session',
      mode: 'payment',
      payment_status: 'paid',
      payment_intent: 'pi_test_banner70',
      customer_details: { email: 'buyer@example.com', name: '山田 太郎' },
      ...overrides
    }
  }
});

const tokenFrom = message => new URL(message.downloadUrl).searchParams.get('token');

test('paid checkout sends exactly one download email, even when Stripe retries the event', async () => {
  const app = setup();
  const first = await app.deliver(sessionEvent());
  assert.equal(first.status, 200);
  assert.equal((await first.json()).status, 'sent');
  assert.equal(app.sent.length, 1);
  assert.equal(app.sent[0].to, 'buyer@example.com');
  assert.match(app.sent[0].downloadUrl, /^https:\/\/banner70\.example\/api\/download\?token=[A-Za-z0-9_-]{43}$/);
  assert.equal(app.sent[0].idempotencyKey, 'banner70-delivery/cs_test_banner70');

  const retry = await app.deliver(sessionEvent());
  assert.equal((await retry.json()).status, 'already-sent');
  assert.equal(app.sent.length, 1);
});

test('rejects requests with an invalid signature', async () => {
  const app = setup();
  const response = await app.deliver(sessionEvent(), { secret: 'whsec_wrong' });
  assert.equal(response.status, 400);
  assert.equal(app.sent.length, 0);
});

test('waits for delayed payment methods, then delivers on async_payment_succeeded', async () => {
  const app = setup();
  const pending = await app.deliver(sessionEvent({ payment_status: 'unpaid' }));
  assert.deepEqual(await pending.json(), { received: true, status: 'ignored', reason: 'payment-pending' });
  assert.equal(app.sent.length, 0);

  const succeeded = await app.deliver(sessionEvent({}, 'checkout.session.async_payment_succeeded'));
  assert.equal((await succeeded.json()).status, 'sent');
  assert.equal(app.sent.length, 1);
});

test('ignores purchases of other products on the same Stripe account', async () => {
  const app = setup({ linePriceId: 'price_something_else' });
  const response = await app.deliver(sessionEvent());
  assert.equal((await response.json()).reason, 'other-product');
  assert.equal(app.sent.length, 0);
});

test('returns 500 when the email fails so Stripe retries, and the retry delivers', async () => {
  const app = setup({ failMailTimes: 1 });
  const failed = await app.deliver(sessionEvent());
  assert.equal(failed.status, 500);
  assert.equal(app.sent.length, 0);

  const retried = await app.deliver(sessionEvent());
  assert.equal((await retried.json()).status, 'sent');
  assert.equal(app.sent.length, 1);
});

test('download page does not consume a download; each POST does, up to the limit', async () => {
  const app = setup();
  await app.deliver(sessionEvent());
  const token = tokenFrom(app.sent[0]);

  for (let i = 0; i < 3; i += 1) {
    const page = await app.openPage(token);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /残りダウンロード回数：5回/);
  }

  for (let i = 1; i <= 5; i += 1) {
    const response = await app.redeem(token);
    assert.equal(response.status, 303);
    assert.match(response.headers.get('location'), /^https:\/\/blob\.example\/banner70\/BANNER70\.fig\?signed=1/);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  }

  const overLimit = await app.redeem(token);
  assert.equal(overLimit.status, 410);
  assert.match(await overLimit.text(), /上限に達しました/);
  assert.equal((await app.openPage(token)).status, 410);
});

test('links expire after 30 days', async () => {
  const app = setup();
  await app.deliver(sessionEvent());
  const token = tokenFrom(app.sent[0]);
  app.advance(30 * DAY - 1000);
  assert.equal((await app.openPage(token)).status, 200);
  app.advance(2000);
  const expired = await app.redeem(token);
  assert.equal(expired.status, 410);
  assert.match(await expired.text(), /有効期限が切れています/);
});

test('a full refund revokes the link; a partial refund does not', async () => {
  const app = setup();
  await app.deliver(sessionEvent());
  const token = tokenFrom(app.sent[0]);
  const refundEvent = refunded => ({ id: 'evt_refund', object: 'event', type: 'charge.refunded', data: { object: { id: 'ch_1', object: 'charge', payment_intent: 'pi_test_banner70', refunded } } });

  assert.equal((await (await app.deliver(refundEvent(false))).json()).reason, 'partial-refund');
  assert.equal((await app.openPage(token)).status, 200);

  assert.equal((await (await app.deliver(refundEvent(true))).json()).status, 'revoked');
  const revoked = await app.redeem(token);
  assert.equal(revoked.status, 410);
  assert.match(await revoked.text(), /返金済み/);
});

test('unknown or malformed tokens get a 404 page', async () => {
  const app = setup();
  assert.equal((await app.openPage('nope')).status, 404);
  assert.equal((await app.openPage('A'.repeat(43))).status, 404);
  assert.equal((await app.redeem('<script>')).status, 404);
});

test('a session without an email fails loudly so it shows up in Stripe as a failed delivery', async () => {
  const app = setup();
  const response = await app.deliver(sessionEvent({ customer_details: { email: null } }));
  assert.equal(response.status, 500);
});

test('email contains the link, expiry in JST and download limit, and escapes the customer name', () => {
  const message = buildDownloadEmail({
    customerName: '<b>山田</b>',
    downloadUrl: 'https://banner70.example/api/download?token=abc',
    expiresAt: Date.UTC(2026, 11, 18, 3, 0, 0),
    maxDownloads: 5,
    contactUrl: CONTACT_URL
  });
  assert.match(message.subject, /BANNER 70/);
  assert.match(message.text, /https:\/\/banner70\.example\/api\/download\?token=abc/);
  assert.match(message.text, /2026年12月18日 12:00（日本時間）まで/);
  assert.match(message.text, /5回まで/);
  assert.match(message.html, /&lt;b&gt;山田&lt;\/b&gt; 様/);
  assert.doesNotMatch(message.html, /<b>山田<\/b>/);
});
