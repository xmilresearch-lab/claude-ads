import { describe, it, expect } from 'vitest'
import {
  CONTENT_STATUS_CONFIG,
  CONTENT_PLATFORM_CONFIG,
  CONTENT_FILTER_TABS,
  ACTIONABLE_STATUSES,
} from '@/lib/content/config'

describe('CONTENT_STATUS_CONFIG', () => {
  it('has all 6 statuses', () => {
    const statuses = Object.keys(CONTENT_STATUS_CONFIG)
    expect(statuses).toContain('pending_review')
    expect(statuses).toContain('approved')
    expect(statuses).toContain('rejected')
    expect(statuses).toContain('publishing')
    expect(statuses).toContain('published')
    expect(statuses).toContain('failed')
  })

  it('pending_review has pulse=true', () => {
    expect(CONTENT_STATUS_CONFIG.pending_review.pulse).toBe(true)
  })

  it('published has pulse=false', () => {
    expect(CONTENT_STATUS_CONFIG.published.pulse).toBe(false)
  })

  it('each status has required fields', () => {
    for (const config of Object.values(CONTENT_STATUS_CONFIG)) {
      expect(config.label).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.bgColor).toBeTruthy()
      expect(config.dotColor).toBeTruthy()
    }
  })
})

describe('CONTENT_PLATFORM_CONFIG', () => {
  it('has all 5 platforms', () => {
    const platforms = Object.keys(CONTENT_PLATFORM_CONFIG)
    expect(platforms).toContain('twitter')
    expect(platforms).toContain('linkedin')
    expect(platforms).toContain('instagram')
    expect(platforms).toContain('gmail')
    expect(platforms).toContain('sendgrid')
  })

  it('each platform has label, color, lettermark', () => {
    for (const config of Object.values(CONTENT_PLATFORM_CONFIG)) {
      expect(config.label).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.lettermark).toBeTruthy()
    }
  })
})

describe('CONTENT_FILTER_TABS', () => {
  it('has an "all" tab as the first item', () => {
    expect(CONTENT_FILTER_TABS[0].key).toBe('all')
  })

  it('has pending_review tab with showCount=true', () => {
    const tab = CONTENT_FILTER_TABS.find(t => t.key === 'pending_review')
    expect(tab?.showCount).toBe(true)
  })

  it('has 5 tabs total', () => {
    expect(CONTENT_FILTER_TABS).toHaveLength(5)
  })
})

describe('ACTIONABLE_STATUSES', () => {
  it('includes pending_review', () => {
    expect(ACTIONABLE_STATUSES).toContain('pending_review')
  })
})
