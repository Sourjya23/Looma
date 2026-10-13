import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';
import { prisma } from '../config/database.js';

let razorpayClient: Razorpay | null = null;

if (env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET) {
  razorpayClient = new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export interface CreateOrderParams {
  userId: string;
  userEmail: string;
  plan: 'PRO' | 'MASTER';
  billingCycle: 'monthly' | 'yearly';
}

export interface VerifyPaymentParams {
  userId: string;
  orderId: string;
  paymentId: string;
  signature: string;
  plan: 'PRO' | 'MASTER';
}

export class RazorpayService {
  static isConfigured(): boolean {
    return !!razorpayClient;
  }

  static getKeyId(): string {
    return env.RAZORPAY_KEY_ID || 'rzp_test_simulation';
  }

  /**
   * Calculate price in Indian Paise (1 INR = 100 paise)
   */
  static getAmountInPaise(plan: 'PRO' | 'MASTER', billingCycle: 'monthly' | 'yearly'): number {
    const isYearly = billingCycle === 'yearly';
    if (plan === 'PRO') {
      // Monthly: ₹249 (24900 paise), Yearly: ₹2,388 (238800 paise ~ ₹199/mo)
      return isYearly ? 238800 : 24900;
    } else {
      // Master Monthly: ₹699 (69900 paise), Yearly: ₹6,588 (658800 paise ~ ₹549/mo)
      return isYearly ? 658800 : 69900;
    }
  }

  /**
   * Create Razorpay Order
   */
  static async createOrder(params: CreateOrderParams) {
    const { userId, userEmail, plan, billingCycle } = params;
    const amountInPaise = this.getAmountInPaise(plan, billingCycle);

    // If Razorpay keys are not yet configured in environment (Local Dev / $0 Simulation Mode)
    if (!razorpayClient) {
      const simulatedOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      return {
        mode: 'simulation',
        orderId: simulatedOrderId,
        amount: amountInPaise,
        currency: 'INR',
        keyId: 'rzp_test_simulation',
        plan,
        billingCycle,
        amountInRupees: amountInPaise / 100,
        message: 'Razorpay running in simulation mode. You can test checkout without live API keys.',
      };
    }

    const receipt = `rcpt_${userId.slice(0, 8)}_${Date.now()}`;

    const order = await razorpayClient.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId,
        userEmail,
        plan,
        billingCycle,
      },
    });

    return {
      mode: 'live',
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: env.RAZORPAY_KEY_ID,
      plan,
      billingCycle,
      amountInRupees: Number(order.amount) / 100,
    };
  }

  /**
   * Verify Razorpay Payment Signature and Upgrade User
   */
  static async verifyPayment(params: VerifyPaymentParams) {
    const { userId, orderId, paymentId, signature, plan } = params;

    // Handle Simulation Mode
    if (!razorpayClient || orderId.startsWith('order_sim_')) {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { tier: plan },
        select: { id: true, username: true, email: true, tier: true },
      });

      return {
        verified: true,
        simulated: true,
        user: updatedUser,
        message: `Simulated payment successful! Upgraded to ${plan} tier.`,
      };
    }

    // Live HMAC SHA256 Signature Verification
    const generatedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new Error('Invalid payment signature. Verification failed.');
    }

    // Upgrade user tier in database upon verified payment
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { tier: plan },
      select: { id: true, username: true, email: true, tier: true },
    });

    return {
      verified: true,
      simulated: false,
      user: updatedUser,
      message: `Payment successfully verified! Your account is now upgraded to ${plan}.`,
    };
  }
}
