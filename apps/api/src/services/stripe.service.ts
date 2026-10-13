import Stripe from 'stripe';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';

let stripeClient: Stripe | null = null;
if (env.STRIPE_SECRET_KEY) {
  stripeClient = new Stripe(env.STRIPE_SECRET_KEY);
}

export interface CheckoutParams {
  userId: string;
  userEmail: string;
  plan: 'PRO' | 'MASTER';
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export class StripeService {
  static isConfigured(): boolean {
    return !!stripeClient;
  }

  static async createCheckoutSession(params: CheckoutParams) {
    const { userId, userEmail, plan, billingCycle, successUrl, cancelUrl } = params;

    // If Stripe is not configured (e.g. local dev / testing before Stripe keys are set up)
    if (!stripeClient) {
      // In dev mode, immediately activate the tier to allow testing premium features
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { tier: plan },
        select: { id: true, username: true, email: true, tier: true },
      });

      return {
        mode: 'test_dev_mode',
        url: `${params.successUrl}?upgraded=true&plan=${plan}`,
        upgradedDirectly: true,
        user: updatedUser,
        message: `Stripe not configured in environment. Simulated upgrade to ${plan} tier activated!`,
      };
    }

    // Determine pricing data
    const isYearly = billingCycle === 'yearly';
    const amountInCents = plan === 'PRO' 
      ? (isYearly ? 7900 : 999) 
      : (isYearly ? 15900 : 1999);
    
    const productName = plan === 'PRO' ? 'Looma Pro (Author)' : 'Looma Master (Novelist)';
    const interval = isYearly ? 'year' : 'month';

    const session = await stripeClient.checkout.sessions.create({
      mode: 'subscription',
      customer_email: userEmail,
      client_reference_id: userId,
      metadata: {
        userId,
        plan,
        billingCycle,
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: productName,
              description: plan === 'PRO' 
                ? 'Full triple-perspective AI critiques, unlimited daily sessions & AI book covers'
                : 'Unlimited AI book covers, custom mentor style tuning, and advanced PDF exports',
            },
            unit_amount: amountInCents,
            recurring: {
              interval: interval as Stripe.Checkout.SessionCreateParams.LineItem.PriceData.Recurring.Interval,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${plan}`,
      cancel_url: cancelUrl,
    });

    return {
      mode: 'stripe',
      url: session.url,
      sessionId: session.id,
    };
  }

  static async handleWebhook(payload: Buffer | string, signature: string) {
    if (!stripeClient || !env.STRIPE_WEBHOOK_SECRET) {
      throw new Error('Stripe or Stripe Webhook Secret not configured');
    }

    const event = stripeClient.webhooks.constructEvent(
      payload,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const plan = (session.metadata?.plan as string) || 'PRO';

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { tier: plan },
          });
          console.log(`[StripeWebhook] Upgraded user ${userId} to ${plan}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Search user by customer ID or metadata if stored
        console.log(`[StripeWebhook] Subscription deleted: ${subscription.id}`);
        break;
      }
    }

    return { received: true };
  }

  static async downgradeToFree(userId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { tier: 'FREE' },
      select: { id: true, username: true, email: true, tier: true },
    });
  }
}
