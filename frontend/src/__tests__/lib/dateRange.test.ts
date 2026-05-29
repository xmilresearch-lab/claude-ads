import { describe, it, expect } from 'vitest'
import {
  buildDateAxis,
  fillTimeSeries,
  formatAxisDate,
  formatNumber,
  formatCost,
  formatDurationMs,
  DATE_RANGE_OPTIONS,
} from '@/lib/analytics/dateRange'

describe('buildDateAxis — 90d', () => {
  it('returns 90 dates for 90d range', () => {
    expect(buildDateAxis('90d')).toHaveLength(90)
  })

  it('dates are in ascending order', () => {
    const axis = buildDateAxis('7d')
    for (let i = 1; i < axis.length; i++) {
      expect(axis[i] > axis[i - 1]).toBe(true)
    }
  })

  it('first date is (days-1) days before today', () => {
    const axis = buildDateAxis('7d')
    const firstDate = new Date(axis[0] + 'T00:00:00')
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = Math.round((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(6)
  })
})

describe('fillTimeSeries — edge cases', () => {
  it('returns all defaults when data array is empty', () => {
    const filled = fillTimeSeries([], '7d', { count: 0 })
    expect(filled).toHaveLength(7)
    expect(filled.every(d => d.count === 0)).toBe(true)
  })

  it('preserves existing data points', () => {
    const today = new Date().toISOString().slice(0, 10)
    const data = [{ date: today, count: 42 }]
    const filled = fillTimeSeries(data, '7d', { count: 0 })
    const todayEntry = filled.find(d => d.date === today)
    expect(todayEntry?.count).toBe(42)
  })
})

describe('formatAxisDate', () => {
  it('formats as day-of-week for 7d range', () => {
    const result = formatAxisDate('2024-06-17', '7d')
    // June 17 2024 is a Monday
    expect(result).toMatch(/Mon|Tue|Wed|Thu|Fri|Sat|Sun/)
  })

  it('formats as month-day for 30d range', () => {
    const result = formatAxisDate('2024-06-17', '30d')
    expect(result).toMatch(/Jun/)
  })

  it('formats as month-day for 90d range', () => {
    const result = formatAxisDate('2024-01-15', '90d')
    expect(result).toMatch(/Jan/)
  })
})

describe('formatNumber — additional', () => {
  it('handles exactly 1000', () => {
    expect(formatNumber(1000)).toBe('1.0K')
  })

  it('handles exactly 1_000_000', () => {
    expect(formatNumber(1_000_000)).toBe('1.0M')
  })

  it('handles 0', () => {
    expect(formatNumber(0)).toBe('0')
  })
})

describe('formatCost', () => {
  it('returns formatted dollar amount for values >= 0.01', () => {
    expect(formatCost(1.5)).toBe('$1.50')
  })

  it('returns <$0.01 for very small amounts', () => {
    expect(formatCost(0)).toBe('<$0.01')
  })

  it('formats exactly $0.01', () => {
    expect(formatCost(0.01)).toBe('$0.01')
  })
})

describe('formatDurationMs', () => {
  it('returns ms for sub-second durations', () => {
    expect(formatDurationMs(500)).toBe('500ms')
  })

  it('returns seconds for durations under a minute', () => {
    expect(formatDurationMs(2500)).toBe('2.5s')
  })

  it('returns minutes for long durations', () => {
    expect(formatDurationMs(120_000)).toBe('2m')
  })

  it('handles exactly 1000ms as 1.0s', () => {
    expect(formatDurationMs(1000)).toBe('1.0s')
  })

  it('handles exactly 60000ms as 1m', () => {
    expect(formatDurationMs(60_000)).toBe('1m')
  })
})

describe('DATE_RANGE_OPTIONS', () => {
  it('has 3 options', () => {
    expect(DATE_RANGE_OPTIONS).toHaveLength(3)
  })

  it('options have correct values', () => {
    const values = DATE_RANGE_OPTIONS.map(o => o.value)
    expect(values).toContain('7d')
    expect(values).toContain('30d')
    expect(values).toContain('90d')
  })
})
