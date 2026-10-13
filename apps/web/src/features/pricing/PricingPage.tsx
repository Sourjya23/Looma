import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { useAuth } from '../auth/AuthContext';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

/* ── Crisp Inline SVG Icons ── */
const CheckIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ShieldIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const UpiIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

interface RazorpayOrderResponse {
  success: boolean;
  data: {
    mode: 'simulation' | 'live';
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    plan: 'PRO' | 'MASTER';
    billingCycle: 'monthly' | 'yearly';
    amountInRupees: number;
    userEmail: string;
    userName: string;
  };
}

interface StripeCheckoutResponse {
  success: boolean;
  data: {
    mode: 'stripe' | 'test_dev_mode';
    url?: string;
    sessionId?: string;
    upgradedDirectly?: boolean;
    user?: any;
    message?: string;
  };
}

declare global {
  interface Window {
    Razorpay?: any;
  }
}

export function PricingPage() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Detect Indian visitor timezone automatically for PPP INR pricing
  const [currency, setCurrency] = useState<'INR' | 'USD'>(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz.includes('Calcutta') || tz.includes('Kolkata') || tz.includes('Asia/Colombo')) {
        return 'INR';
      }
    } catch {
      // fallback to USD
    }
    return 'USD';
  });

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Simulated Razorpay Modal state
  const [simulatedModal, setSimulatedModal] = useState<{
    isOpen: boolean;
    plan: 'PRO' | 'MASTER';
    orderId: string;
    amountInRupees: number;
  } | null>(null);

  // Check for successful Stripe checkout redirect
  useEffect(() => {
    const upgraded = searchParams.get('upgraded');
    const plan = searchParams.get('plan');
    const sessionId = searchParams.get('session_id');

    if (upgraded === 'true' || sessionId) {
      const targetPlan = plan || 'PRO';
      toast.success(`Welcome to Looma ${targetPlan}. Your account has been upgraded!`, { duration: 5000 });
      if (user && updateUser) {
        updateUser({ tier: targetPlan });
      }
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, user, updateUser, setSearchParams]);

  // Dynamically load Razorpay SDK script
  const loadRazorpaySDK = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleSelectPlan = async (plan: 'FREE' | 'PRO' | 'MASTER') => {
    if (!user) {
      navigate(`/register?plan=${plan}`);
      return;
    }

    const currentTier = (user.tier || 'FREE').toUpperCase();

    if (plan === 'FREE') {
      if (currentTier === 'FREE') {
        toast('You are currently on the Free plan.');
        return;
      }
      
      if (confirm('Are you sure you want to cancel your subscription and downgrade to Free?')) {
        try {
          setLoadingPlan('FREE');
          await api.post('/subscription/cancel');
          updateUser({ tier: 'FREE' });
          toast.success('Your subscription has been downgraded to Free.');
        } catch (err: any) {
          toast.error(err.message || 'Failed to downgrade plan.');
        } finally {
          setLoadingPlan(null);
        }
      }
      return;
    }

    if (currentTier === plan) {
      toast(`You are currently subscribed to the ${plan} plan.`);
      return;
    }

    // ── Indian Checkout Flow (UPI / Cards / NetBanking via Razorpay) ──
    if (currency === 'INR') {
      try {
        setLoadingPlan(plan);
        const res = await api.post<RazorpayOrderResponse>('/subscription/razorpay/create-order', {
          plan,
          billingCycle,
        });

        const order = res.data;

        // If in simulation mode (keys not yet configured in .env)
        if (order.mode === 'simulation') {
          setSimulatedModal({
            isOpen: true,
            plan,
            orderId: order.orderId,
            amountInRupees: order.amountInRupees,
          });
          return;
        }

        // Live Razorpay SDK checkout
        const isLoaded = await loadRazorpaySDK();
        if (!isLoaded) {
          toast.error('Failed to load Razorpay payment gateway. Please check your internet connection.');
          return;
        }

        const options = {
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: 'Looma Story Craft',
          description: `${plan} Writer Plan (${billingCycle})`,
          order_id: order.orderId,
          prefill: {
            name: order.userName || user.username,
            email: order.userEmail || user.email,
          },
          theme: {
            color: '#09090b',
          },
          handler: async (response: any) => {
            try {
              await api.post('/subscription/razorpay/verify-payment', {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                plan,
              });

              updateUser({ tier: plan });
              toast.success(`Payment verified! Welcome to Looma ${plan}.`, { duration: 6000 });
            } catch (err: any) {
              toast.error(err.message || 'Payment verification failed.');
            }
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (err: any) {
        toast.error(err.message || 'Unable to initiate UPI / Razorpay checkout.');
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    // ── International USD Checkout Flow (Stripe) ──
    try {
      setLoadingPlan(plan);
      const res = await api.post<StripeCheckoutResponse>('/subscription/create-checkout', {
        plan,
        billingCycle,
      });

      if (res.data.url) {
        window.location.href = res.data.url;
      } else if (res.data.upgradedDirectly) {
        updateUser({ tier: plan });
        toast.success(res.data.message || `Upgraded to ${plan} successfully.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to initiate checkout. Please try again.');
    } finally {
      setLoadingPlan(null);
    }
  };

  // Complete Simulated Indian Payment
  const handleConfirmSimulatedPayment = async () => {
    if (!simulatedModal) return;

    try {
      setLoadingPlan(simulatedModal.plan);
      await api.post('/subscription/razorpay/verify-payment', {
        orderId: simulatedModal.orderId,
        paymentId: `pay_sim_${Date.now()}`,
        signature: 'simulated_signature',
        plan: simulatedModal.plan,
      });

      updateUser({ tier: simulatedModal.plan });
      setSimulatedModal(null);
      toast.success(`Simulation Successful: Upgraded to ${simulatedModal.plan} tier!`, { duration: 6000 });
    } catch (err: any) {
      toast.error(err.message || 'Failed to complete simulated payment.');
    } finally {
      setLoadingPlan(null);
    }
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const isCurrentPlan = (plan: string) => {
    const current = (user?.tier || 'FREE').toUpperCase();
    return current === plan.toUpperCase();
  };

  const faqs = [
    {
      q: 'Can I pay with UPI (Google Pay, PhonePe, Paytm) and Indian cards?',
      a: 'Yes, absolutely! We fully support Indian clients through Razorpay. You can pay via Google Pay, PhonePe, Paytm, BHIM, QR Code, RuPay debit cards, Visa, Mastercard, and Indian NetBanking with zero currency conversion fees.',
    },
    {
      q: 'How does the Triple AI Critique perspective work?',
      a: 'Looma evaluates your story through three distinct creative perspectives: the English Teacher (prose rhythm, grammar, vocabulary elevation), the Story Editor (pacing, narrative tension, character motives), and the Film Director (visual imagery, sensory beats, scene staging). This provides actionable, multi-layered feedback calibrated to sharpen your writing craft.',
    },
    {
      q: 'Can I cancel or switch my plan at any time?',
      a: 'Yes. You can upgrade, downgrade, or cancel your subscription at any time with a single click. When canceling, you retain full access to your plan benefits until the end of your billing cycle.',
    },
    {
      q: 'Do I own the copyright to the stories I write?',
      a: 'Yes, completely. You retain 100% intellectual property ownership of every story you write on Looma, including any generated cover art. You can publish, license, or submit your work anywhere.',
    },
    {
      q: 'What is the Rewrite Sandbox?',
      a: 'The Rewrite Sandbox allows you to take any scene that received critique and test revisions in real time. Looma provides side-by-side diff highlighting to demonstrate how your word choice, dialogue, and pacing improved.',
    },
    {
      q: 'What is the refund policy?',
      a: 'We offer a 14-day money-back guarantee on all paid plans. If Looma does not meet your expectations, contact support for a prompt refund.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] text-zinc-950 font-sans antialiased">
      <Navbar />

      <main className="flex-1 pt-24 pb-20 px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        <div className="w-full max-w-5xl mx-auto">
          
          {/* Hero Header */}
          <section className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-zinc-200 rounded-full text-xs font-medium text-zinc-600 mb-5 shadow-xs">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Transparent, predictable plans</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-zinc-900 mb-3">
              Plans for every writer.
            </h1>
            
            <p className="text-base sm:text-lg text-zinc-500 font-normal leading-relaxed mb-7">
              Choose the right tier to build a daily writing habit, sharpen narrative tension, or publish complete stories.
            </p>

            {/* Segmented Controls: Currency & Billing Cycle */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              
              {/* Currency Selector (India UPI vs Global USD) */}
              <div className="inline-flex items-center bg-zinc-100 border border-zinc-200/80 p-1 rounded-full gap-1 shadow-2xs">
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 ${
                    currency === 'INR'
                      ? 'bg-white text-zinc-950 shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  onClick={() => setCurrency('INR')}
                >
                  <UpiIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>INR (₹ UPI / Cards)</span>
                </button>
                <button
                  type="button"
                  className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-150 cursor-pointer ${
                    currency === 'USD'
                      ? 'bg-white text-zinc-950 shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  onClick={() => setCurrency('USD')}
                >
                  USD ($ Global)
                </button>
              </div>

              {/* Monthly vs Annual Toggle */}
              <div className="inline-flex items-center bg-zinc-100 border border-zinc-200/80 p-1 rounded-full gap-1 shadow-2xs">
                <button
                  type="button"
                  className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-zinc-950 shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-150 cursor-pointer inline-flex items-center gap-1.5 ${
                    billingCycle === 'yearly'
                      ? 'bg-white text-zinc-950 shadow-xs font-semibold'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                  onClick={() => setBillingCycle('yearly')}
                >
                  <span>Annual</span>
                  <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded-full">
                    Save 20%
                  </span>
                </button>
              </div>

            </div>
          </section>

          {/* Pricing Grid */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 items-stretch">
            
            {/* 1. Free Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-7 flex flex-col relative transition-all duration-200 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-950/5">
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="text-xl font-bold tracking-tight text-zinc-950">Free</h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 leading-normal min-h-[2.5rem]">
                  For exploring story craft and building a daily writing routine.
                </p>
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-semibold text-zinc-900">{currency === 'INR' ? '₹' : '$'}</span>
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-950">0</span>
                <span className="text-sm text-zinc-500 font-normal">/ month</span>
              </div>
              <div className="text-xs text-zinc-400 mb-6 min-h-[1.125rem]">Free forever</div>

              <button
                type="button"
                className={`w-full py-2.5 px-4 rounded-full text-sm font-semibold transition-colors mb-7 cursor-pointer border ${
                  isCurrentPlan('FREE')
                    ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-default'
                    : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-300'
                }`}
                onClick={() => handleSelectPlan('FREE')}
                disabled={isCurrentPlan('FREE') || loadingPlan === 'FREE'}
              >
                {isCurrentPlan('FREE') ? 'Current plan' : 'Start free'}
              </button>

              <div className="h-px bg-zinc-100 w-full mb-5" />

              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">Includes:</div>
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>3 writing sessions per day</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>English Teacher critique persona</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Grammar, syntax, and flow analysis</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Daily streak tracking and XP level</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Community leaderboard ranking</span>
                </li>
              </ul>
            </div>

            {/* 2. Pro Card (Featured with Shimmer) */}
            <div className="bg-white border-1.5 border-zinc-950 rounded-2xl p-7 flex flex-col relative transition-all duration-200 shadow-md shadow-zinc-950/5 hover:border-zinc-950 hover:shadow-xl hover:shadow-zinc-950/8">
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="text-xl font-bold tracking-tight text-zinc-950">Pro</h2>
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-zinc-950 text-white tracking-wide">
                    Popular
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 leading-normal min-h-[2.5rem]">
                  For dedicated writers refining prose, narrative tension, and style.
                </p>
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-semibold text-zinc-900">{currency === 'INR' ? '₹' : '$'}</span>
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-950">
                  {currency === 'INR'
                    ? billingCycle === 'yearly'
                      ? '199'
                      : '249'
                    : billingCycle === 'yearly'
                    ? '8'
                    : '10'}
                </span>
                <span className="text-sm text-zinc-500 font-normal">/ month</span>
              </div>
              <div className="text-xs text-zinc-400 mb-6 min-h-[1.125rem]">
                {currency === 'INR'
                  ? billingCycle === 'yearly'
                    ? 'Billed annually (₹2,388 / year)'
                    : 'Billed monthly via UPI / Card'
                  : billingCycle === 'yearly'
                  ? 'Billed annually ($96 / year)'
                  : 'Billed monthly'}
              </div>

              {/* Shimmer Button */}
              <button
                type="button"
                className={`w-full py-2.5 px-4 rounded-full text-sm font-semibold transition-all mb-7 cursor-pointer relative overflow-hidden inline-flex items-center justify-center gap-2 ${
                  isCurrentPlan('PRO')
                    ? 'bg-zinc-100 text-zinc-400 border border-zinc-200 cursor-default'
                    : 'bg-zinc-950 text-white hover:bg-zinc-800 shadow-xs after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_3.5s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent'
                }`}
                onClick={() => handleSelectPlan('PRO')}
                disabled={isCurrentPlan('PRO') || loadingPlan === 'PRO'}
              >
                {loadingPlan === 'PRO' ? (
                  'Processing...'
                ) : isCurrentPlan('PRO') ? (
                  'Current plan'
                ) : currency === 'INR' ? (
                  <>
                    <UpiIcon className="w-4 h-4 text-emerald-400" />
                    <span>Pay with UPI / Cards</span>
                  </>
                ) : (
                  'Get Pro'
                )}
              </button>

              <div className="h-px bg-zinc-100 w-full mb-5" />

              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Everything in Free, plus:
              </div>
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-900 font-medium leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span><strong>Unlimited</strong> daily writing sessions</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-900 font-medium leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span><strong>Triple AI Critique</strong>: English Teacher, Story Editor, and Film Director</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-900 font-medium leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Interactive <strong>Rewrite Sandbox</strong> with side-by-side diff comparison</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-900 font-medium leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>AI Book Cover Art generation</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Formatted PDF & Markdown export</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Custom story constraints & adaptive difficulty</span>
                </li>
              </ul>
            </div>

            {/* 3. Master Card */}
            <div className="bg-white border border-zinc-200 rounded-2xl p-7 flex flex-col relative transition-all duration-200 hover:border-zinc-300 hover:shadow-lg hover:shadow-zinc-950/5">
              <div className="mb-5">
                <div className="flex items-center justify-between mb-1.5">
                  <h2 className="text-xl font-bold tracking-tight text-zinc-950">Master</h2>
                </div>
                <p className="text-xs sm:text-sm text-zinc-500 leading-normal min-h-[2.5rem]">
                  For published novelists and storytellers producing complete literary works.
                </p>
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-2xl font-semibold text-zinc-900">{currency === 'INR' ? '₹' : '$'}</span>
                <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-950">
                  {currency === 'INR'
                    ? billingCycle === 'yearly'
                      ? '549'
                      : '699'
                    : billingCycle === 'yearly'
                    ? '16'
                    : '20'}
                </span>
                <span className="text-sm text-zinc-500 font-normal">/ month</span>
              </div>
              <div className="text-xs text-zinc-400 mb-6 min-h-[1.125rem]">
                {currency === 'INR'
                  ? billingCycle === 'yearly'
                    ? 'Billed annually (₹6,588 / year)'
                    : 'Billed monthly via UPI / Card'
                  : billingCycle === 'yearly'
                  ? 'Billed annually ($192 / year)'
                  : 'Billed monthly'}
              </div>

              <button
                type="button"
                className={`w-full py-2.5 px-4 rounded-full text-sm font-semibold transition-colors mb-7 cursor-pointer border ${
                  isCurrentPlan('MASTER')
                    ? 'bg-zinc-100 text-zinc-400 border-zinc-200 cursor-default'
                    : 'bg-white hover:bg-zinc-50 text-zinc-900 border-zinc-200 hover:border-zinc-300'
                }`}
                onClick={() => handleSelectPlan('MASTER')}
                disabled={isCurrentPlan('MASTER') || loadingPlan === 'MASTER'}
              >
                {loadingPlan === 'MASTER' ? (
                  'Processing...'
                ) : isCurrentPlan('MASTER') ? (
                  'Current plan'
                ) : currency === 'INR' ? (
                  'Get Master via UPI'
                ) : (
                  'Get Master'
                )}
              </button>

              <div className="h-px bg-zinc-100 w-full mb-5" />

              <div className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-3">
                Everything in Pro, plus:
              </div>
              <ul className="space-y-3 flex-1">
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Custom AI Mentor Persona customization</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Deep Scene Pacing & Emotional Arc Diagnostics</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Streak freeze protection</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Priority analysis processing queue</span>
                </li>
                <li className="flex items-start gap-2.5 text-xs sm:text-sm text-zinc-700 leading-snug">
                  <CheckIcon className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                  <span>Full commercial rights on all exported manuscripts</span>
                </li>
              </ul>
            </div>

          </section>

          {/* Comparison Matrix Table */}
          <section className="mb-20">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 mb-2">Compare plan features</h2>
              <p className="text-sm text-zinc-500">Every feature detailed with complete transparency.</p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-200 bg-zinc-50/75">
                      <th className="py-3.5 px-5 font-semibold text-zinc-900 w-2/5">Feature</th>
                      <th className="py-3.5 px-5 font-semibold text-zinc-900 text-center w-1/5">Free</th>
                      <th className="py-3.5 px-5 font-bold text-zinc-950 text-center w-1/5 bg-zinc-100/50">Pro</th>
                      <th className="py-3.5 px-5 font-semibold text-zinc-900 text-center w-1/5">Master</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Category: Creative Practice */}
                    <tr className="bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-t border-zinc-100">
                      <td colSpan={4} className="py-2.5 px-5">Creative Practice</td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">Daily Writing Sessions</td>
                      <td className="py-3 px-5 text-center text-zinc-600">3 per day</td>
                      <td className="py-3 px-5 text-center text-zinc-950 font-bold bg-zinc-50/30">Unlimited</td>
                      <td className="py-3 px-5 text-center text-zinc-950 font-bold">Unlimited</td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">Timed Writing Modes & Word Targets</td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">Custom Constraints & Prompts</td>
                      <td className="py-3 px-5 text-center text-zinc-300">—</td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>

                    {/* Category: AI Evaluation */}
                    <tr className="bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-t border-zinc-100">
                      <td colSpan={4} className="py-2.5 px-5">AI Evaluation Personas</td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">English Teacher (Grammar & Flow)</td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">Story Editor (Pacing & Tension)</td>
                      <td className="py-3 px-5 text-center text-zinc-300">—</td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">Film Director (Visuals & Staging)</td>
                      <td className="py-3 px-5 text-center text-zinc-300">—</td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>

                    {/* Category: Publishing */}
                    <tr className="bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-t border-zinc-100">
                      <td colSpan={4} className="py-2.5 px-5">Publishing & Export</td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">AI Book Cover Art</td>
                      <td className="py-3 px-5 text-center text-zinc-300">—</td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">PDF & Manuscript Export</td>
                      <td className="py-3 px-5 text-center text-zinc-300">—</td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">Full Commercial Rights</td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>

                    {/* Category: Platform */}
                    <tr className="bg-zinc-50/50 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-t border-zinc-100">
                      <td colSpan={4} className="py-2.5 px-5">Platform & Performance</td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">Streak Tracking & XP Gamification</td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                      <td className="py-3 px-5 text-center text-zinc-900"><CheckIcon className="w-4 h-4 mx-auto" /></td>
                    </tr>
                    <tr className="border-b border-zinc-100 hover:bg-zinc-50/50 transition-colors">
                      <td className="py-3 px-5 text-zinc-800 font-medium">Generation Response Speed</td>
                      <td className="py-3 px-5 text-center text-zinc-600">Standard</td>
                      <td className="py-3 px-5 text-center text-zinc-900 bg-zinc-50/30">Priority</td>
                      <td className="py-3 px-5 text-center text-zinc-900 font-semibold">Dedicated</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Guarantee Section */}
          <section className="bg-white border border-zinc-200 rounded-2xl p-7 text-center mb-20 flex flex-col items-center gap-2 shadow-2xs">
            <div className="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-900 mb-1">
              <ShieldIcon className="w-4 h-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-zinc-900">14-day money-back guarantee</h3>
            <p className="text-xs sm:text-sm text-zinc-500 max-w-lg leading-relaxed">
              Try Pro or Master for two weeks. If the feedback does not elevate your storytelling, 
              reach out for a full, hassle-free refund.
            </p>
          </section>

          {/* FAQ Accordion */}
          <section className="max-w-2xl mx-auto mb-20 w-full">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">Frequently asked questions</h2>
            </div>

            <div className="border-t border-zinc-200">
              {faqs.map((faq, index) => {
                const isOpen = openFaqIndex === index;
                return (
                  <div key={index} className="border-b border-zinc-200">
                    <button
                      type="button"
                      className="w-full py-4 px-1 flex items-center justify-between text-left text-sm sm:text-base font-semibold text-zinc-900 hover:text-zinc-600 transition-colors cursor-pointer gap-4"
                      onClick={() => toggleFaq(index)}
                      aria-expanded={isOpen}
                    >
                      <span>{faq.q}</span>
                      <span className="text-zinc-400 shrink-0">
                        <ChevronIcon open={isOpen} />
                      </span>
                    </button>
                    {isOpen && (
                      <div className="pb-4 px-1 text-xs sm:text-sm text-zinc-500 leading-relaxed">
                        <p className="m-0">{faq.a}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="bg-zinc-950 text-white rounded-2xl p-10 sm:p-12 text-center flex flex-col items-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">Start writing today.</h2>
            <p className="text-sm sm:text-base text-zinc-400 max-w-md mb-6 leading-relaxed">
              Join thousands of writers overcoming blank-page paralysis and building sharper creative craft.
            </p>
            <button
              type="button"
              className="px-7 py-3 rounded-full bg-white text-zinc-950 font-semibold text-sm hover:bg-zinc-100 transition-all shadow-sm cursor-pointer"
              onClick={() => handleSelectPlan('PRO')}
            >
              Get started with Pro →
            </button>
          </section>

        </div>
      </main>

      {/* Simulated Indian Payment Modal ($0 Development Mode) */}
      {simulatedModal?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  ₹
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-950">Razorpay UPI Checkout</h3>
                  <p className="text-xs text-zinc-400">Indian Payment Simulation Mode</p>
                </div>
              </div>
              <button
                type="button"
                className="text-zinc-400 hover:text-zinc-600 p-1 text-lg font-bold"
                onClick={() => setSimulatedModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="my-5 space-y-4">
              <div className="bg-zinc-50 border border-zinc-200/80 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-500">Plan Selected</div>
                  <div className="text-sm font-bold text-zinc-900">Looma {simulatedModal.plan}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500">Amount Due</div>
                  <div className="text-base font-extrabold text-zinc-950">₹{simulatedModal.amountInRupees}</div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-700">Supported Indian Payment Channels:</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 bg-white font-medium text-zinc-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Google Pay UPI</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 bg-white font-medium text-zinc-800">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>PhonePe / Paytm</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 bg-white font-medium text-zinc-800">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>RuPay & Cards</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-zinc-200 bg-white font-medium text-zinc-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>NetBanking</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl text-xs text-emerald-800 leading-relaxed">
                ℹ️ <strong>Zero upfront cost:</strong> You are testing in simulated sandbox mode. When you configure your Razorpay Key in <code>.env</code>, this will open the real Razorpay UPI QR popup and settle payments into your Indian savings account!
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-full text-xs font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 cursor-pointer"
                onClick={() => setSimulatedModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 py-2.5 px-4 rounded-full text-xs font-semibold bg-zinc-950 text-white hover:bg-zinc-800 cursor-pointer shadow-xs"
                onClick={handleConfirmSimulatedPayment}
              >
                Confirm Test Payment (₹{simulatedModal.amountInRupees})
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
