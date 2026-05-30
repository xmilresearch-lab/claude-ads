import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createCheckout,
  createPortal,
  getSubscription,
  getUsage,
} from '@/lib/api/billing'

export const billingKeys = {
  usage: ['billing', 'usage'] as const,
  subscription: ['billing', 'subscription'] as const,
}

export function useUsage() {
  return useQuery({
    queryKey: billingKeys.usage,
    queryFn: getUsage,
    staleTime: 60_000,
  })
}

export function useSubscription() {
  return useQuery({
    queryKey: billingKeys.subscription,
    queryFn: getSubscription,
    staleTime: 60_000,
  })
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: ({
      priceId,
      successUrl,
      cancelUrl,
    }: {
      priceId: string
      successUrl: string
      cancelUrl: string
    }) => createCheckout(priceId, successUrl, cancelUrl),
    onSuccess: (data) => {
      window.location.href = data.checkout_url
    },
  })
}

export function useCreatePortal() {
  return useMutation({
    mutationFn: createPortal,
    onSuccess: (data) => {
      window.location.href = data.portal_url
    },
  })
}
