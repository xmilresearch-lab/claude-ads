import { describe, it, expect } from 'vitest'
import { buildHardenedAnalysisPrompt, buildHardenedAssistantPrompt } from '@/lib/promptHardening'
import { CANARY } from '@/lib/ai'
import { auditSystemPrompt } from '@/lib/systemPromptAudit'

describe('promptHardening', () => {

  it('buildHardenedAnalysisPrompt includes PROMPT_DEFENSE_PREFIX content', () => {
    const prompt = buildHardenedAnalysisPrompt()
    expect(prompt).toContain('SECURITY POLICY')
    expect(prompt).toContain('non-negotiable')
  })

  it('buildHardenedAnalysisPrompt includes CANARY token', () => {
    const prompt = buildHardenedAnalysisPrompt()
    expect(prompt).toContain(CANARY)
  })

  it('buildHardenedAnalysisPrompt includes "cannot be overridden" language', () => {
    const prompt = buildHardenedAnalysisPrompt()
    expect(prompt).toContain('cannot be overridden')
  })

  it('buildHardenedAssistantPrompt injects user history into the prompt', () => {
    const history = 'Analysis 1: SaaS offer for project management'
    const prompt = buildHardenedAssistantPrompt(history)
    expect(prompt).toContain(history)
    expect(prompt).not.toContain('{HISTORY_PLACEHOLDER}')
  })

  it('auditSystemPrompt returns score >= 9', () => {
    const { score, issues } = auditSystemPrompt()
    if (score < 9) {
      console.warn('Audit issues:\n' + issues.join('\n'))
    }
    expect(score).toBeGreaterThanOrEqual(9)
  })

  it('CANARY has length >= 24', () => {
    expect(CANARY.length).toBeGreaterThanOrEqual(24)
  })

  it('CANARY is consistent within the same process (module-level constant)', () => {
    expect(CANARY).toMatch(/^analysis_canary_[0-9a-f]{16}$/)
    const snapshot = CANARY
    expect(CANARY).toBe(snapshot)
  })

})
