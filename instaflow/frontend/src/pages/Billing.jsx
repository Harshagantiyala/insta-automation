import { useEffect, useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.jsx';
import api from '../api/client';
import { useToast } from '../context/ToastContext.jsx';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    period: '/mo',
    desc: 'Perfect for creators getting started',
    color: '#6C4CF1',
    features: [
      '5 active automation flows',
      'Up to 100 DMs / hour',
      'Comment & DM triggers',
      'Live activity dashboard',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$79',
    period: '/mo',
    desc: 'For power users & agencies',
    color: '#FF6B3D',
    popular: true,
    features: [
      'Unlimited automation flows',
      'Up to 200 DMs / hour',
      'All trigger types (Story, DM, Comment)',
      'Fallback auto-reply',
      'Priority support & analytics export',
    ],
  },
];

export default function Billing() {
  const toast = useToast();
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(null);

  useEffect(() => {
    api.get('/api/billing/subscription')
      .then(({ data }) => setSubscription(data.subscription))
      .catch(() => toast.error('Failed to load subscription.'))
      .finally(() => setLoading(false));
  }, []);

  async function handleUpgrade(planId) {
    setUpgrading(planId);
    try {
      const { data } = await api.post('/api/billing/checkout-session', { plan: planId });
      window.location.href = data.checkoutUrl;
    } catch {
      toast.error('Failed to start checkout. Please try again.');
      setUpgrading(null);
    }
  }

  const currentPlan = subscription?.plan || 'free';

  return (
    <DashboardLayout>
      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Billing & Plans
        </h1>
        <p style={{ margin: '5px 0 0', fontSize: 13.5, color: 'var(--text-secondary)' }}>
          {loading ? 'Loading subscription…' : (
            <>
              Current plan:{' '}
              <span style={{ color: '#8B7CF6', fontWeight: 700, textTransform: 'capitalize' }}>
                {subscription?.status === 'trialing' && subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd) > new Date()
                  ? `Free Trial (${Math.ceil((new Date(subscription.currentPeriodEnd) - new Date()) / (1000 * 60 * 60 * 24))} days left)`
                  : currentPlan}
              </span>
            </>
          )}
        </p>
      </div>

      {/* Plan Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 36 }}>
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div key={plan.id} style={{
              background: plan.popular ? 'rgba(255,107,61,0.06)' : 'var(--overlay-light)',
              border: `1px solid ${plan.popular ? 'rgba(255,107,61,0.25)' : isCurrent ? 'rgba(108,76,241,0.35)' : 'var(--overlay-strong)'}`,
              borderRadius: 18,
              padding: '28px',
              position: 'relative',
              transition: 'all 0.25s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.3)`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {/* Popular badge */}
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: 'linear-gradient(90deg, #FF6B3D, #FFB347)',
                  color: 'var(--text-primary)', fontSize: 10, fontWeight: 800,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  borderRadius: 100, padding: '4px 14px',
                  boxShadow: '0 4px 12px rgba(255,107,61,0.4)',
                }}>
                  Most Popular
                </div>
              )}

              {/* Plan name */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: `${plan.color}18`,
                  border: `1px solid ${plan.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {plan.popular
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3l14 9-14 9V3z" /></svg>
                  }
                </div>
                <p style={{ margin: 0, fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>{plan.name}</p>
              </div>

              <p style={{ margin: '0 0 20px', fontSize: 12.5, color: 'var(--text-secondary)' }}>{plan.desc}</p>

              {/* Price */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 3, marginBottom: 22 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 40, fontWeight: 800, color: plan.color }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{plan.period}</span>
              </div>

              {/* Features */}
              <ul style={{ margin: '0 0 24px', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 9 }}>
                {plan.features.map(feat => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: 'var(--text-secondary)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={plan.color} strokeWidth="2.5" style={{ marginTop: 1, flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {feat}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isCurrent || upgrading === plan.id}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: 11,
                  border: isCurrent ? '1px solid rgba(43,182,115,0.3)' : 'none',
                  cursor: isCurrent ? 'default' : 'pointer',
                  fontSize: 13.5,
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  background: isCurrent
                    ? 'rgba(43,182,115,0.15)'
                    : `linear-gradient(135deg, ${plan.color}, ${plan.popular ? '#FFB347' : '#8B7CF6'})`,
                  color: isCurrent ? '#2BB673' : 'var(--text-primary)',
                  boxShadow: isCurrent ? 'none' : `0 4px 18px ${plan.color}40`,
                  opacity: (upgrading && upgrading !== plan.id) ? 0.5 : 1,
                }}
                onMouseEnter={e => { if (!isCurrent) { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${plan.color}50`; } }}
                onMouseLeave={e => { if (!isCurrent) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = `0 4px 18px ${plan.color}40`; } }}
              >
                {isCurrent ? '✓ Current plan' : upgrading === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* FAQ / Info strip */}
      <div style={{
        background: 'var(--overlay-light)',
        border: '1px solid var(--overlay-strong)',
        borderRadius: 14,
        padding: '20px 24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 20,
      }}>
        {[
          { icon: '🔒', title: 'Secure payments', desc: 'All payments via Stripe — PCI compliant' },
          { icon: '↩️', title: 'Cancel anytime', desc: 'No lock-in. Cancel or downgrade at any time.' },
          { icon: '🚀', title: 'Instant activation', desc: 'Upgraded immediately after checkout' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 12 }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
            <div>
              <p style={{ margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>{item.title}</p>
              <p style={{ margin: '3px 0 0', fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
}
