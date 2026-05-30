import { describe, it, expect } from 'vitest'
import {
  PROVIDER_CONFIGS,
  getProvidersByCategory,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
} from '@/lib/integrations/providers'

describe('PROVIDER_CONFIGS', () => {
  it('contains all expected providers', () => {
    const ids = Object.keys(PROVIDER_CONFIGS)
    expect(ids).toContain('gmail')
    expect(ids).toContain('twitter')
    expect(ids).toContain('linkedin')
    expect(ids).toContain('instagram')
    expect(ids).toContain('sendgrid')
    expect(ids).toContain('zendesk')
    expect(ids).toContain('hubspot')
  })

  it('each provider has required fields', () => {
    for (const config of Object.values(PROVIDER_CONFIGS)) {
      expect(config.id).toBeTruthy()
      expect(config.name).toBeTruthy()
      expect(config.category).toBeTruthy()
      expect(config.authType).toMatch(/oauth|api_key/)
      expect(config.color).toBeTruthy()
      expect(config.lettermark).toBeTruthy()
      expect(config.description).toBeTruthy()
    }
  })
})

describe('getProvidersByCategory', () => {
  it('returns social providers', () => {
    const social = getProvidersByCategory('social')
    expect(social.length).toBeGreaterThan(0)
    expect(social.every(p => p.category === 'social')).toBe(true)
  })

  it('returns email providers', () => {
    const email = getProvidersByCategory('email')
    expect(email.length).toBeGreaterThan(0)
    const emailIds = email.map(p => p.id)
    expect(emailIds).toContain('gmail')
    expect(emailIds).toContain('sendgrid')
  })

  it('returns support providers', () => {
    const support = getProvidersByCategory('support')
    expect(support.length).toBeGreaterThan(0)
    expect(support.map(p => p.id)).toContain('zendesk')
  })

  it('returns crm providers', () => {
    const crm = getProvidersByCategory('crm')
    expect(crm.length).toBeGreaterThan(0)
    expect(crm.map(p => p.id)).toContain('hubspot')
  })

  it('returns empty array for nonexistent category', () => {
    // @ts-expect-error testing runtime invalid input
    const result = getProvidersByCategory('nonexistent')
    expect(result).toHaveLength(0)
  })
})

describe('CATEGORY_LABELS', () => {
  it('has a label for each category', () => {
    expect(CATEGORY_LABELS.social).toBe('Social Media')
    expect(CATEGORY_LABELS.email).toBe('Email')
    expect(CATEGORY_LABELS.support).toBe('Customer Support')
    expect(CATEGORY_LABELS.crm).toBe('CRM')
  })
})

describe('CATEGORY_ORDER', () => {
  it('has 4 categories in order', () => {
    expect(CATEGORY_ORDER).toHaveLength(4)
    expect(CATEGORY_ORDER[0]).toBe('social')
  })
})
