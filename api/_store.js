// Purchase records for BANNER 70 deliveries.
// A purchase is keyed by its Stripe Checkout Session ID and holds the random download token,
// expiry, download counter and revocation flag. Lookup keys map a token / PaymentIntent
// back to the session.

const PREFIX = 'banner70';
const keys = {
  purchase: sessionId => `${PREFIX}:purchase:${sessionId}`,
  token: token => `${PREFIX}:token:${token}`,
  payment: paymentIntentId => `${PREFIX}:payment:${paymentIntentId}`,
  mailLock: sessionId => `${PREFIX}:mail-lock:${sessionId}`
};
const MAIL_LOCK_SECONDS = 600;

const toPurchase = raw => {
  if (!raw || !raw.sessionId) return null;
  return {
    sessionId: String(raw.sessionId),
    email: String(raw.email),
    token: String(raw.token),
    paymentIntentId: raw.paymentIntentId ? String(raw.paymentIntentId) : null,
    createdAt: Number(raw.createdAt),
    expiresAt: Number(raw.expiresAt),
    maxDownloads: Number(raw.maxDownloads),
    downloads: Number(raw.downloads || 0),
    revoked: String(raw.revoked) === '1',
    emailedAt: raw.emailedAt ? Number(raw.emailedAt) : null
  };
};

const toHashFields = purchase => ({
  sessionId: purchase.sessionId,
  email: purchase.email,
  token: purchase.token,
  paymentIntentId: purchase.paymentIntentId || '',
  createdAt: String(purchase.createdAt),
  expiresAt: String(purchase.expiresAt),
  maxDownloads: String(purchase.maxDownloads),
  downloads: '0',
  revoked: '0'
});

// Creates the purchase and its lookup keys atomically, only if the purchase does not exist yet.
// KEYS: purchase hash, token key, payment key (same as purchase key when there is no PaymentIntent).
const CREATE_PURCHASE_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
redis.call('HSET', KEYS[1], unpack(ARGV, 2))
redis.call('SET', KEYS[2], ARGV[1])
if KEYS[3] ~= KEYS[1] then redis.call('SET', KEYS[3], ARGV[1]) end
return 1
`;

/** Store backed by Upstash Redis (`@upstash/redis` client). */
export const createRedisStore = redis => {
  const getPurchase = async sessionId => toPurchase(await redis.hgetall(keys.purchase(sessionId)));
  return {
    getPurchase,
    async ensurePurchase(purchase) {
      const purchaseKey = keys.purchase(purchase.sessionId);
      const paymentKey = purchase.paymentIntentId ? keys.payment(purchase.paymentIntentId) : purchaseKey;
      const fields = Object.entries(toHashFields(purchase)).flat();
      const created = await redis.eval(
        CREATE_PURCHASE_SCRIPT,
        [purchaseKey, keys.token(purchase.token), paymentKey],
        [purchase.sessionId, ...fields]
      );
      return { purchase: await getPurchase(purchase.sessionId), created: Number(created) === 1 };
    },
    findSessionIdByToken: async token => (await redis.get(keys.token(token))) ?? null,
    findSessionIdByPaymentIntent: async paymentIntentId => (await redis.get(keys.payment(paymentIntentId))) ?? null,
    incrementDownloads: async sessionId => Number(await redis.hincrby(keys.purchase(sessionId), 'downloads', 1)),
    markEmailed: async (sessionId, at) => { await redis.hset(keys.purchase(sessionId), { emailedAt: String(at) }); },
    revoke: async sessionId => { await redis.hset(keys.purchase(sessionId), { revoked: '1' }); },
    acquireMailLock: async sessionId => (await redis.set(keys.mailLock(sessionId), '1', { nx: true, ex: MAIL_LOCK_SECONDS })) === 'OK',
    releaseMailLock: async sessionId => { await redis.del(keys.mailLock(sessionId)); }
  };
};

/** In-memory store with the same interface, for tests. */
export const createMemoryStore = () => {
  const purchases = new Map();
  const tokens = new Map();
  const payments = new Map();
  const locks = new Set();
  return {
    getPurchase: async sessionId => (purchases.has(sessionId) ? { ...purchases.get(sessionId) } : null),
    async ensurePurchase(purchase) {
      if (purchases.has(purchase.sessionId)) return { purchase: { ...purchases.get(purchase.sessionId) }, created: false };
      const stored = toPurchase(toHashFields(purchase));
      purchases.set(purchase.sessionId, stored);
      tokens.set(purchase.token, purchase.sessionId);
      if (purchase.paymentIntentId) payments.set(purchase.paymentIntentId, purchase.sessionId);
      return { purchase: { ...stored }, created: true };
    },
    findSessionIdByToken: async token => tokens.get(token) ?? null,
    findSessionIdByPaymentIntent: async paymentIntentId => payments.get(paymentIntentId) ?? null,
    async incrementDownloads(sessionId) {
      const purchase = purchases.get(sessionId);
      purchase.downloads += 1;
      return purchase.downloads;
    },
    markEmailed: async (sessionId, at) => { purchases.get(sessionId).emailedAt = at; },
    revoke: async sessionId => { purchases.get(sessionId).revoked = true; },
    async acquireMailLock(sessionId) {
      if (locks.has(sessionId)) return false;
      locks.add(sessionId);
      return true;
    },
    releaseMailLock: async sessionId => { locks.delete(sessionId); }
  };
};
