import { describe, it, expect } from 'vitest'
import { cronToHuman, validateCron, CRON_PRESETS } from '@/lib/cron'

describe('cronToHuman', () => {
  it('converts daily morning cron to human label', () => {
    expect(cronToHuman('0 9 * * *')).toBe('Every day at 9:00 AM')
  })

  it('converts weekday cron to human label', () => {
    expect(cronToHuman('0 9 * * 1-5')).toBe('Weekdays at 9:00 AM')
  })

  it('converts every-15-minutes cron to human label', () => {
    expect(cronToHuman('*/15 * * * *')).toBe('Every 15 minutes')
  })

  it('converts monthly cron to human label', () => {
    expect(cronToHuman('0 9 1 * *')).toBe('1st of month at 9:00 AM')
  })

  it('returns raw expression for unrecognized patterns', () => {
    const expr = '5 4 3 2 1'
    expect(cronToHuman(expr)).toBe(expr)
  })

  it('returns error string for empty input', () => {
    expect(cronToHuman('')).toBe('Invalid schedule')
  })
})
