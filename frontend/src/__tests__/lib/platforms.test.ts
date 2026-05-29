import { describe, it, expect } from 'vitest'
import { PLATFORM_CONFIGS, RUN_STATUS_CONFIG } from '@/lib/automations/platforms'

describe('PLATFORM_CONFIGS', () => {
  it('has all 4 platforms', () => {
    const ids = Object.keys(PLATFORM_CONFIGS)
    expect(ids).toContain('social')
    expect(ids).toContain('email')
    expect(ids).toContain('support')
    expect(ids).toContain('crm')
  })

  it('each config has id, label, color, bgColor, description', () => {
    for (const config of Object.values(PLATFORM_CONFIGS)) {
      expect(config.id).toBeTruthy()
      expect(config.label).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.bgColor).toBeTruthy()
      expect(config.description).toBeTruthy()
    }
  })

  it('id matches the key', () => {
    for (const [key, config] of Object.entries(PLATFORM_CONFIGS)) {
      expect(config.id).toBe(key)
    }
  })
})

describe('RUN_STATUS_CONFIG', () => {
  it('has all 5 run statuses', () => {
    expect(RUN_STATUS_CONFIG.pending).toBeDefined()
    expect(RUN_STATUS_CONFIG.running).toBeDefined()
    expect(RUN_STATUS_CONFIG.success).toBeDefined()
    expect(RUN_STATUS_CONFIG.failed).toBeDefined()
    expect(RUN_STATUS_CONFIG.cancelled).toBeDefined()
  })

  it('running has pulse=true', () => {
    expect(RUN_STATUS_CONFIG.running.pulse).toBe(true)
  })

  it('success has pulse=false', () => {
    expect(RUN_STATUS_CONFIG.success.pulse).toBe(false)
  })

  it('each status has label, color, dot', () => {
    for (const config of Object.values(RUN_STATUS_CONFIG)) {
      expect(config.label).toBeTruthy()
      expect(config.color).toBeTruthy()
      expect(config.dot).toBeTruthy()
    }
  })
})
