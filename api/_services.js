// Builds the real service dependencies from environment variables (see .env.example).
import Stripe from 'stripe';
import { Resend } from 'resend';
import { Redis } from '@upstash/redis';
import { issueSignedToken, presignUrl } from '@vercel/blob';
import { createDeliveryService } from './_delivery.js';
import { createRedisStore } from './_store.js';
import { createResendMailer } from './_mailer.js';

const requireEnv = name => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
};
const positiveInt = (name, fallback) => {
  const value = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

export const getContactUrl = () => process.env.CONTACT_URL || 'https://anyaku.co.jp/contact/';

const createBlobFiles = pathname => ({
  async createDownloadUrl({ validUntil }) {
    const signedToken = await issueSignedToken({ pathname, operations: ['get'], validUntil });
    const { presignedUrl } = await presignUrl(signedToken, { operation: 'get', pathname, validUntil, access: 'private' });
    return presignedUrl;
  }
});

const readDeliveryConfig = () => ({
  priceId: process.env.STRIPE_PRICE_ID || '',
  siteUrl: (process.env.SITE_URL || '').replace(/\/+$/, ''),
  linkTtlDays: positiveInt('DOWNLOAD_LINK_TTL_DAYS', 30),
  maxDownloads: positiveInt('DOWNLOAD_MAX_COUNT', 5)
});

let stripeClient;
let store;
let webhookService;
let downloadService;

export const getStripe = () => (stripeClient ??= new Stripe(requireEnv('STRIPE_SECRET_KEY')));
const getStore = () => (store ??= createRedisStore(Redis.fromEnv()));
const getFiles = () => createBlobFiles(process.env.FIGMA_FILE_PATHNAME || 'banner70/BANNER70.fig');

export const getWebhookService = () => {
  if (webhookService) return webhookService;
  const config = { ...readDeliveryConfig(), priceId: requireEnv('STRIPE_PRICE_ID'), siteUrl: requireEnv('SITE_URL').replace(/\/+$/, '') };
  webhookService = createDeliveryService({
    stripe: getStripe(),
    store: getStore(),
    files: getFiles(),
    config,
    mailer: createResendMailer({
      resend: new Resend(requireEnv('RESEND_API_KEY')),
      from: requireEnv('MAIL_FROM'),
      replyTo: process.env.MAIL_REPLY_TO,
      contactUrl: getContactUrl()
    })
  });
  return webhookService;
};

export const getDownloadService = () => (downloadService ??= createDeliveryService({
  stripe: null,
  mailer: null,
  store: getStore(),
  files: getFiles(),
  config: readDeliveryConfig()
}));
