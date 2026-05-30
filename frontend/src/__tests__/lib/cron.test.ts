import { describe, it, expect } from 'vitest'
import { cronToHuman, validateCron, CRON_PRESETS } from '@/lib/cron'

describe('cronToHuman — additional branches', () => {
  it('converts every-30-minutes cron', () => {
    expect(cronToHuman('*/30 * * * *')).toBe('Every 30 minutes')
  })

  it('converts every-6-hours cron', () => {
    expect(cronToHuman('0 */6 * * *')).toBe('Every 6 hours')
  })

  it('returns raw for every-hour (0 * * * * — no */N pattern)', () => {
    // '0 * * * *' — hour='*' doesn't match */N, minute='0' is digit but hour='*' is not → falls through
    expect(cronToHuman('0 * * * *')).toBe('0 * * * *')
  })

  it('converts every day at noon', () => {
    expect(cronToHuman('0 12 * * *')).toBe('Every day at 12:00 PM')
  })

  it('converts every day at 6pm', () => {
    expect(cronToHuman('0 18 * * *')).toBe('Every day at 6:00 PM')
  })

  it('converts every Monday', () => {
    expect(cronToHuman('0 9 * * 1')).toBe('Every Monday at 9:00 AM')
  })

  it('converts every Sunday', () => {
    expect(cronToHuman('0 8 * * 0')).toBe('Every Sunday at 8:00 AM')
  })

  it('converts 2nd of month', () => {
    expect(cronToHuman('0 9 2 * *')).toBe('2nd of month at 9:00 AM')
  })

  it('converts 3rd of month', () => {
    expect(cronToHuman('0 9 3 * *')).toBe('3rd of month at 9:00 AM')
  })

  it('converts 15th of month', () => {
    expect(cronToHuman('0 9 15 * *')).toBe('15th of month at 9:00 AM')
  })

  it('returns raw expression for ambiguous dom+dow combo', () => {
    const expr = '0 9 1 * 1'
    expect(cronToHuman(expr)).toBe(expr)
  })

  it('converts sun-sat range (0-6) to every day', () => {
    expect(cronToHuman('0 9 * * 0-6')).toBe('Every day at 9:00 AM')
  })

  it('returns raw string for expressions with wrong part count', () => {
    const expr = '0 9 1'
    expect(cronToHuman(expr)).toBe(expr)
  })

  it('returns Invalid schedule for null-like input', () => {
    // @ts-expect-error testing runtime invalid input
    expect(cronToHuman(null)).toBe('Invalid schedule')
  })
})

describe('validateCron', () => {
  it('returns null for a valid 5-part expression', () => {
    expect(validateCron('0 9 * * *')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validateCron('')).toBe('Schedule is required')
  })

  it('returns error for expression with wrong number of parts', () => {
    expect(validateCron('0 9 *')).toMatch(/5 parts/)
  })

  it('returns error for whitespace-only string', () => {
    expect(validateCron('   ')).toBe('Schedule is required')
  })

  it('accepts presets as valid', () => {
    for (const preset of CRON_PRESETS) {
      if (preset.value) {
        expect(validateCron(preset.value)).toBeNull()
      }
    }
  })
})

describe('CRON_PRESETS', () => {
  it('has 12 presets', () => {
    expect(CRON_PRESETS).toHaveLength(12)
  })

  it('every preset has label, value (or empty), and category', () => {
    for (const preset of CRON_PRESETS) {
      expect(preset.label).toBeTruthy()
      expect(preset.category).toBeTruthy()
    }
  })
})
