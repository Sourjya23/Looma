import { Router, raw } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  getSubscriptionStatus,
  createCheckout,
  cancelSubscription,
  stripeWebhook,
  createRazorpayOrder,
  verifyRazorpayPayment,
} from '../controllers/subscription.controller.js';

const router = Router();

// Public webhook route (Stripe calls this directly with raw body)
router.post('/webhook', raw({ type: 'application/json' }), stripeWebhook);

// Protected routes for authenticated users
router.get('/status', requireAuth, getSubscriptionStatus);
router.post('/create-checkout', requireAuth, createCheckout);
router.post('/cancel', requireAuth, cancelSubscription);

// Razorpay Indian Payments (UPI, Cards, NetBanking)
router.post('/razorpay/create-order', requireAuth, createRazorpayOrder);
router.post('/razorpay/verify-payment', requireAuth, verifyRazorpayPayment);

export default router;
