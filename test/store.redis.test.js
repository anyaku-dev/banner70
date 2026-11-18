// Integration test for the Upstash Redis store. Skipped unless a Redis REST endpoint is configured, e.g.
// UPSTASH_REDIS_REST_URL=http://localhost:8079 UPSTASH_REDIS_REST_TOKEN=... npm test
// (a local endpoint can be started with Redis + hiett/serverless-redis-http).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Redis } from '@upstash/redis';
import { createRedisStore } from '../api/_store.js';

const configured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

test('redis store creates purchases atomically and tracks downloads, emails, locks and revocation', { skip: !configured && 'UPSTASH_REDIS_REST_URL is not set' }, async () => {
  const redis = Redis.fromEnv();
  const store = createRedisStore(redis);
  const suffix = Date.now().toString(36);
  const sessionId = `cs_test_${suffix}`;
  const token = `tok_${suffix}_${'x'.repeat(32)}`;
  const purchase = { sessionId, email: 'buyer@example.com', token, paymentIntentId: `pi_${suffix}`, createdAt: 1_700_000_000_000, expiresAt: 1_702_592_000_000, maxDownloads: 5 };

  const first = await store.ensurePurchase(purchase);
  assert.equal(first.created, true);
  assert.deepEqual(first.purchase, { ...purchase, downloads: 0, revoked: false, emailedAt: null });

  const second = await store.ensurePurchase({ ...purchase, token: `other_${suffix}_${'y'.repeat(32)}` });
  assert.equal(second.created, false);
  assert.equal(second.purchase.token, token);

  assert.equal(await store.findSessionIdByToken(token), sessionId);
  assert.equal(await store.findSessionIdByToken(`other_${suffix}_${'y'.repeat(32)}`), null);
  assert.equal(await store.findSessionIdByPaymentIntent(`pi_${suffix}`), sessionId);

  assert.equal(await store.incrementDownloads(sessionId), 1);
  assert.equal(await store.incrementDownloads(sessionId), 2);

  assert.equal(await store.acquireMailLock(sessionId), true);
  assert.equal(await store.acquireMailLock(sessionId), false);
  await store.releaseMailLock(sessionId);
  assert.equal(await store.acquireMailLock(sessionId), true);

  await store.markEmailed(sessionId, 1_700_000_100_000);
  await store.revoke(sessionId);
  const stored = await store.getPurchase(sessionId);
  assert.equal(stored.downloads, 2);
  assert.equal(stored.emailedAt, 1_700_000_100_000);
  assert.equal(stored.revoked, true);

  const noPayment = await store.ensurePurchase({ ...purchase, sessionId: `${sessionId}_nopi`, token: `nopi_${suffix}_${'z'.repeat(32)}`, paymentIntentId: null });
  assert.equal(noPayment.created, true);
  assert.equal(noPayment.purchase.paymentIntentId, null);

  assert.equal(await store.getPurchase('cs_missing'), null);
});
