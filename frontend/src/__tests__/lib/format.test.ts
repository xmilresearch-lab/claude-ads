import { describe, it, expect } from 'vitest'
import { format } from '@/lib/utils/format'

describe('format.number', () => {
  it('formats integers with locale separators', () => {
    const result = format.number(1000)
    expect(result).toBe('1,000')
  })

  it('formats zero', () => {
    expect(format.number(0)).toBe('0')
  })
})

describe('format.compact', () => {
  it('formats large numbers compactly', () => {
    const result = format.compact(1_500_000)
    expect(result).toMatch(/1\.5M|1\.5 M/)
  })

  it('formats thousands compactly', () => {
    const result = format.compact(2500)
    expect(result).toMatch(/2\.5K|2\.5 K/)
  })
})

describe('format.percent', () => {
  it('converts fraction to percent string', () => {
    expect(format.percent(0.5)).toBe('50.0%')
  })

  it('handles 100%', () => {
    expect(format.percent(1)).toBe('100.0%')
  })

  it('handles 0%', () => {
    expect(format.percent(0)).toBe('0.0%')
  })
})

describe('format.tokens', () => {
  it('appends tokens label', () => {
    const result = format.tokens(5000)
    expect(result).toMatch(/tokens/)
  })
})

describe('format.usd', () => {
  it('formats cost with 4 decimal places', () => {
    expect(format.usd(0.0025)).toBe('$0.0025')
  })

  it('formats zero cost', () => {
    expect(format.usd(0)).toBe('$0.0000')
  })
})

describe('format.date', () => {
  it('formats ISO date string to human readable', () => {
    const result = format.date('2024-06-15T00:00:00Z')
    expect(result).toMatch(/Jun|June/)
    expect(result).toMatch(/2024/)
  })
})

describe('format.time', () => {
  it('returns a time string with AM/PM', () => {
    const result = format.time('2024-06-15T14:30:00Z')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

describe('format.datetime', () => {
  it('combines date and time', () => {
    const result = format.datetime('2024-06-15T14:30:00Z')
    expect(result).toMatch(/2024/)
    expect(result).toMatch(/\d{1,2}:\d{2}/)
  })
})

describe('format.truncate', () => {
  it('does not truncate short strings', () => {
    expect(format.truncate('hello', 10)).toBe('hello')
  })

  it('truncates long strings and adds ellipsis', () => {
    const long = 'a'.repeat(50)
    const result = format.truncate(long, 40)
    expect(result.length).toBe(41) // 40 chars + ellipsis char
    expect(result).toMatch(/…$/)
  })

  it('uses default length of 40', () => {
    const long = 'a'.repeat(50)
    const result = format.truncate(long)
    expect(result).toMatch(/…$/)
  })
})

describe('format.initials', () => {
  it('returns first character uppercased', () => {
    expect(format.initials('alice@example.com')).toBe('A')
  })

  it('returns ? for empty string', () => {
    expect(format.initials('')).toBe('?')
  })
})

describe('format.planLabel', () => {
  it('returns Free for free plan', () => {
    expect(format.planLabel('free')).toBe('Free')
  })

  it('returns Pro for pro plan', () => {
    expect(format.planLabel('pro')).toBe('Pro')
  })

  it('returns Admin for admin plan', () => {
    expect(format.planLabel('admin')).toBe('Admin')
  })

  it('returns the plan key for unknown plans', () => {
    expect(format.planLabel('enterprise')).toBe('enterprise')
  })
})
