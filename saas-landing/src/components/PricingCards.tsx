import { useState } from 'react';

const APP_URL = 'https://app.yoursaas.com';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: { monthly: 0 },
    description: 'Perfect for side projects and solo builders.',
    features: [
      '3 automations',
      '1 integration',
      '10 content queue slots',
      '10K AI tokens / month',
      '1 workspace',
      'Community support',
    ],
    cta: 'Start for free',
    ctaHref: `${APP_URL}/register`,
    highlight: false,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: { monthly: 29 },
    description: 'For growing creators and small teams.',
    features: [
      '15 automations',
      '5 integrations',
      '100 content queue slots',
      '100K AI tokens / month',
      '1 workspace',
      'Email support',
      'Analytics dashboard',
    ],
    cta: 'Get Starter',
    ctaHref: `${APP_URL}/billing/plans?plan=starter`,
    highlight: false,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 79 },
    description: 'Unlimited power for serious operators.',
    features: [
      'Unlimited automations',
      'Unlimited integrations',
      'Unlimited content queue',
      '1M AI tokens / month',
      '5 workspaces',
      'Priority support',
      'Advanced analytics',
      'API access',
    ],
    cta: 'Get Pro',
    ctaHref: `${APP_URL}/billing/plans?plan=pro`,
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: { monthly: null },
    description: 'Custom limits, SLA, and white-glove onboarding.',
    features: [
      'Everything in Pro',
      'Unlimited AI tokens',
      'Unlimited workspaces',
      'Custom SSO / SAML',
      'Dedicated support',
      'Custom SLA',
      'Audit log export',
      'Invoice billing',
    ],
    cta: 'Contact sales',
    ctaHref: 'mailto:sales@yoursaas.com',
    highlight: false,
  },
] as const;

export default function PricingCards() {
  // billing toggle reserved for future annual pricing
  const [_billing] = useState<'monthly' | 'annual'>('monthly');

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
      {PLANS.map((plan) => (
        <div
          key={plan.id}
          className={[
            'flex flex-col rounded-md border p-6 transition-colors duration-200',
            plan.highlight
              ? 'bg-amber-faint border-amber relative'
              : 'bg-surface-raised border-surface-border hover:border-amber/40',
          ].join(' ')}
        >
          {plan.highlight && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber text-surface text-xs font-mono font-semibold px-3 py-0.5 rounded">
              Most popular
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-display font-bold text-lg text-text-primary mb-1">{plan.name}</h3>
            <p className="text-xs text-text-muted font-body">{plan.description}</p>
          </div>

          <div className="mb-6">
            {plan.price.monthly === null ? (
              <span className="font-display font-extrabold text-3xl text-text-primary">Custom</span>
            ) : plan.price.monthly === 0 ? (
              <span className="font-display font-extrabold text-3xl text-text-primary">Free</span>
            ) : (
              <>
                <span className="font-mono text-text-secondary text-lg">$</span>
                <span className="font-display font-extrabold text-4xl text-text-primary">
                  {plan.price.monthly}
                </span>
                <span className="text-sm text-text-muted font-body ml-1">/mo</span>
              </>
            )}
          </div>

          <ul className="space-y-2 mb-8 flex-1">
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-secondary font-body">
                <svg
                  className="flex-shrink-0 mt-0.5 text-amber"
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M2.5 7l3 3 6-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {f}
              </li>
            ))}
          </ul>

          <a
            href={plan.ctaHref}
            className={
              plan.highlight
                ? 'btn-primary justify-center'
                : 'btn-ghost justify-center'
            }
          >
            {plan.cta}
          </a>
        </div>
      ))}
    </div>
  );
}
