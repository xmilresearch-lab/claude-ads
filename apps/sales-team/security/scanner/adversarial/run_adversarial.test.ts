/**
 * Adversarial test suite — probes all AI security controls.
 * Zero real Anthropic API calls. All LLM interactions are mocked.
 */
import { describe, it, expect, vi } from 'vitest'
import { sanitizeInput, validateOutput, ThreatFlag, OutputViolation, AISecurityError } from '@/lib/aiSecurity'
import { PAYLOADS } from './payloads'

vi.mock('@/lib/ai', () => ({
  ANALYSIS_SYSTEM_PROMPT: 'MOCK_SYSTEM_PROMPT_FOR_TESTS_ONLY',
  ASSISTANT_SYSTEM_PROMPT: 'MOCK_ASSISTANT_PROMPT',
  CANARY: 'mock-canary-not-in-any-real-response',
  anthropic: {},
}))

vi.mock('@/lib/securityAlerts', () => ({
  captureSecurityEvent: vi.fn(),
  captureHighSeverityEvent: vi.fn(),
}))

// ── Helper ────────────────────────────────────────────────────────────────────

function expectBlocked(payload: string): void {
  expect(
    () => sanitizeInput(payload),
    `Expected payload to be blocked: "${payload.slice(0, 80)}"`
  ).toThrow(AISecurityError)
}

function expectAllowed(payload: string): void {
  expect(
    () => sanitizeInput(payload),
    `Expected payload to be allowed: "${payload.slice(0, 80)}"`
  ).not.toThrow()
}

// ── Prompt Injection ──────────────────────────────────────────────────────────

describe('Adversarial: Prompt Injection', () => {
  it('blocks every prompt injection payload', () => {
    for (const payload of PAYLOADS.promptInjection) {
      expectBlocked(payload)
    }
  })
})

// ── System Prompt Probes ──────────────────────────────────────────────────────

describe('Adversarial: System Prompt Probes', () => {
  it('blocks every system prompt probe payload', () => {
    for (const payload of PAYLOADS.systemPromptProbe) {
      expectBlocked(payload)
    }
  })
})

// ── Jailbreaks ────────────────────────────────────────────────────────────────

describe('Adversarial: Jailbreaks', () => {
  it('blocks every jailbreak payload', () => {
    for (const payload of PAYLOADS.jailbreak) {
      expectBlocked(payload)
    }
  })
})

// ── Role Manipulation ─────────────────────────────────────────────────────────

describe('Adversarial: Role Manipulation', () => {
  it('blocks every role manipulation payload', () => {
    for (const payload of PAYLOADS.roleManipulation) {
      expectBlocked(payload)
    }
  })
})

// ── Data Exfiltration ─────────────────────────────────────────────────────────

describe('Adversarial: Data Exfiltration', () => {
  it('blocks data exfiltration attempts via probe or injection patterns', () => {
    const blocked = PAYLOADS.dataExfiltration.filter((p) => {
      try {
        sanitizeInput(p)
        return false
      } catch {
        return true
      }
    })
    // At least 50% of exfil attempts should be caught by existing patterns
    expect(blocked.length).toBeGreaterThanOrEqual(Math.floor(PAYLOADS.dataExfiltration.length * 0.5))
  })
})

// ── Legitimate Inputs ─────────────────────────────────────────────────────────

describe('Adversarial: Legitimate Inputs (must NOT be blocked)', () => {
  it('passes every legitimate business input', () => {
    for (const payload of PAYLOADS.legitimateInputs) {
      expectAllowed(payload)
    }
  })
})

// ── PII Stripping ─────────────────────────────────────────────────────────────

describe('Adversarial: PII Stripping', () => {
  it('strips email addresses from input', () => {
    const { sanitized, threats } = sanitizeInput(PAYLOADS.piiInputs[0]!)
    expect(sanitized).not.toMatch(/john\.smith@example\.com/)
    expect(sanitized).toContain('[REDACTED-EMAIL]')
    expect(threats).toContain(ThreatFlag.PII_DETECTED)
  })

  it('strips phone numbers from input', () => {
    const { sanitized } = sanitizeInput(PAYLOADS.piiInputs[1]!)
    expect(sanitized).not.toMatch(/555-123-4567/)
    expect(sanitized).toContain('[REDACTED-PHONE]')
  })

  it('strips SSNs from input', () => {
    const { sanitized } = sanitizeInput(PAYLOADS.piiInputs[2]!)
    expect(sanitized).not.toMatch(/123-45-6789/)
    expect(sanitized).toContain('[REDACTED-SSN]')
  })

  it('strips valid credit card numbers (Luhn-valid) from input', () => {
    const { sanitized } = sanitizeInput(PAYLOADS.piiInputs[3]!)
    expect(sanitized).not.toMatch(/4111111111111111/)
    expect(sanitized).toContain('[REDACTED-CARD]')
  })

  it('does not block PII inputs — just strips and warns', () => {
    for (const payload of PAYLOADS.piiInputs) {
      expect(() => sanitizeInput(payload)).not.toThrow()
    }
  })
})

// ── Output: Script Injection ──────────────────────────────────────────────────

describe('Adversarial: Malicious Output Validation', () => {
  it('throws on script injection in AI output', () => {
    for (const output of PAYLOADS.maliciousOutputs) {
      expect(
        () => validateOutput(output, 'assistant'),
        `Expected script injection to throw for: "${output.slice(0, 80)}"`
      ).toThrow(AISecurityError)
    }
  })
})

// ── Output: Canary Leak Detection ─────────────────────────────────────────────

describe('Adversarial: Canary Token Leak Detection', () => {
  it('detects canary in AI output and marks SYSTEM_PROMPT_LEAKED', () => {
    const fakeOutput = 'Here is some output. mock-canary-not-in-any-real-response And more text.'
    const result = validateOutput(fakeOutput, 'assistant')
    expect(result.violations).toContain(OutputViolation.SYSTEM_PROMPT_LEAKED)
    expect(result.sanitized).not.toContain('mock-canary-not-in-any-real-response')
    expect(result.sanitized).toContain('[REDACTED]')
  })

  it('sanitizes canary token out of returned content', () => {
    const fakeOutput = 'prefix mock-canary-not-in-any-real-response suffix'
    const result = validateOutput(fakeOutput, 'assistant')
    expect(result.sanitized).toBe('prefix [REDACTED] suffix')
  })
})

// ── Output: Excessive Refusal ─────────────────────────────────────────────────

describe('Adversarial: Excessive Refusal Detection', () => {
  it('flags a plain refusal as EXCESSIVE_REFUSAL', () => {
    const refusal = "I cannot help with that request."
    const result = validateOutput(refusal, 'assistant')
    expect(result.violations).toContain(OutputViolation.EXCESSIVE_REFUSAL)
    expect(result.valid).toBe(false)
  })

  it('does not flag a refusal that also contains JSON', () => {
    const hybrid = "I cannot directly help, but here is the analysis: {}"
    const result = validateOutput(hybrid, 'assistant')
    expect(result.violations).not.toContain(OutputViolation.EXCESSIVE_REFUSAL)
  })
})

// ── Many-Shot Flooding ────────────────────────────────────────────────────────

describe('Adversarial: Many-Shot / Length Flooding', () => {
  it('adds EXCESSIVE_LENGTH threat for inputs over 4000 chars', () => {
    const longInput = PAYLOADS.manyShot[0]!
    if (longInput.length > 4000) {
      const { threats } = sanitizeInput(longInput)
      expect(threats).toContain(ThreatFlag.EXCESSIVE_LENGTH)
    }
  })
})
