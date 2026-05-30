import { api } from './client'

export interface UsageData {
  plan: string
  automations_used: number
  automations_limit: number | null
  integrations_used: number
  integrations_limit: number | null
  content_queue_used: number
  content_queue_limit: number | null
  tokens_used: number
  tokens_limit: number | null
  period_reset_date: string | null
}

export interface SubscriptionData {
  plan: string
  subscription_status: string
  current_period_end: string | null
  stripe_subscription_id: string | null
}

export interface CheckoutResponse {
  checkout_url: string
  session_id: string
}

export interface PortalResponse {
  portal_url: string
}

export const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
}

export const PLAN_PRICES: Record<string, string> = {
  free: '$0/mo',
  starter: '$29/mo',
  pro: '$79/mo',
  enterprise: 'Custom',
}

export async function getUsage(): Promise<UsageData> {
  return api.get<UsageData>('/billing/usage')
}

export async function getSubscription(): Promise<SubscriptionData> {
  return api.get<SubscriptionData>('/billing/subscription')
}

export async function createCheckout(
  priceId: string,
  successUrl: string,
  cancelUrl: string,
): Promise<CheckoutResponse> {
  return api.post<CheckoutResponse>('/billing/checkout', {
    price_id: priceId,
    success_url: successUrl,
    cancel_url: cancelUrl,
  })
}

export async function createPortal(): Promise<PortalResponse> {
  return api.post<PortalResponse>('/billing/portal', {})
}
