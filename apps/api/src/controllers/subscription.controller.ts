import { Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { StripeService } from '../services/stripe.service.js';
import { RazorpayService } from '../services/razorpay.service.js';
import { env } from '../config/env.js';

export const getSubscriptionStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        tier: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Tier capabilities
    const tier = user.tier || 'FREE';
    const features = {
      isPro: tier === 'PRO' || tier === 'MASTER',
      isMaster: tier === 'MASTER',
      dailySessionsLimit: tier === 'FREE' ? 3 : Infinity,
      aiFeedbackPersonas: tier === 'FREE' 
        ? ['English Teacher'] 
        : ['English Teacher', 'Story Editor', 'Film Director'],
      canGenerateCoverArt: tier === 'PRO' || tier === 'MASTER',
      canExportPdf: tier === 'PRO' || tier === 'MASTER',
      customMentor: tier === 'MASTER',
      priorityQueue: tier === 'MASTER',
    };

    res.json({
      success: true,
      data: {
        tier,
        features,
        isStripeLive: StripeService.isConfigured(),
        isRazorpayLive: RazorpayService.isConfigured(),
        razorpayKeyId: RazorpayService.getKeyId(),
      },
    });
  } catch (error) {
    console.error('getSubscriptionStatus error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const createCheckout = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { plan = 'PRO', billingCycle = 'monthly' } = req.body;

    if (!['PRO', 'MASTER'].includes(plan)) {
      res.status(400).json({ success: false, message: 'Invalid plan selected. Choose PRO or MASTER.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // Determine return URL
    const origin = req.headers.origin || env.FRONTEND_URL || 'http://localhost:5173';
    const successUrl = `${origin}/pricing`;
    const cancelUrl = `${origin}/pricing`;

    const result = await StripeService.createCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      plan,
      billingCycle,
      successUrl,
      cancelUrl,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('createCheckout error:', error);
    res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
};

export const createRazorpayOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { plan = 'PRO', billingCycle = 'monthly' } = req.body;

    if (!['PRO', 'MASTER'].includes(plan)) {
      res.status(400).json({ success: false, message: 'Invalid plan selected. Choose PRO or MASTER.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const orderData = await RazorpayService.createOrder({
      userId: user.id,
      userEmail: user.email,
      plan,
      billingCycle,
    });

    res.json({
      success: true,
      data: {
        ...orderData,
        userEmail: user.email,
        userName: user.username,
      },
    });
  } catch (error: any) {
    console.error('createRazorpayOrder error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create Razorpay order' });
  }
};

export const verifyRazorpayPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { orderId, paymentId, signature, plan = 'PRO' } = req.body;

    if (!orderId || !plan) {
      res.status(400).json({ success: false, message: 'Missing orderId or plan' });
      return;
    }

    const result = await RazorpayService.verifyPayment({
      userId,
      orderId,
      paymentId: paymentId || 'pay_sim_' + Date.now(),
      signature: signature || 'sig_sim',
      plan,
    });

    res.json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error: any) {
    console.error('verifyRazorpayPayment error:', error);
    res.status(400).json({ success: false, message: error.message || 'Payment verification failed' });
  }
};

export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const user = await StripeService.downgradeToFree(userId);

    res.json({
      success: true,
      message: 'Subscription downgraded to Free plan.',
      data: { user },
    });
  } catch (error) {
    console.error('cancelSubscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel subscription' });
  }
};

export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers['stripe-signature'] as string;

  try {
    const result = await StripeService.handleWebhook(req.body, sig);
    res.json(result);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
};
