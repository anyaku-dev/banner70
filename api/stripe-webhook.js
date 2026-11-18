// Stripe webhook endpoint: POST /api/stripe-webhook
// Subscribe to: checkout.session.completed, checkout.session.async_payment_succeeded, charge.refunded
import { handleWebhookRequest } from './_delivery.js';
import { getStripe, getWebhookService } from './_services.js';

export async function POST(request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) throw new Error('Missing environment variable: STRIPE_WEBHOOK_SECRET');
    return await handleWebhookRequest(request, {
      stripe: getStripe(),
      webhookSecret,
      service: getWebhookService()
    });
  } catch (error) {
    console.error('[banner70] webhook is not configured', error);
    return new Response('Webhook is not configured', { status: 500 });
  }
}
