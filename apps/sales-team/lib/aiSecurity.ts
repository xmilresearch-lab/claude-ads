// SERVER-ONLY — never import from client components
import { analysisResultSchema } from '@/lib/schemas'
import { ANALYSIS_SYSTEM_PROMPT, CANARY } from '@/lib/ai'
import { captureHighSeverityEvent } from '@/lib/securityAlerts'

// ── Enums ────────────────────────────────────────────────────────────────────

export enum ThreatFlag {
  PROMPT_INJECTION    = 'PROMPT_INJECTION',
  SYSTEM_PROMPT_PROBE = 'SYSTEM_PROMPT_PROBE',
  ROLE_MANIPULATION   = 'ROLE_MANIPULATION',
  JAILBREAK_ATTEMPT   = 'JAILBREAK_ATTEMPT',
  PII_DETECTED        = 'PII_DETECTED',
  EXCESSIVE_LENGTH    = 'EXCESSIVE_LENGTH',
  COMPETITOR_PROBE    = 'COMPETITOR_PROBE',
}

export enum OutputViolation {
  SCHEMA_INVALID       = 'SCHEMA_INVALID',
  SYSTEM_PROMPT_LEAKED = 'SYSTEM_PROMPT_LEAKED',
  SCRIPT_INJECTION     = 'SCRIPT_INJECTION',
  EXCESSIVE_REFUSAL    = 'EXCESSIVE_REFUSAL',
  OFF_TOPIC_RESPONSE   = 'OFF_TOPIC_RESPONSE',
}

// ── Error class ───────────────────────────────────────────────────────────────

export class AISecurityError extends Error {
  readonly threatType: ThreatFlag | OutputViolation
  readonly userId?: string

  constructor(message: string, threatType: ThreatFlag | OutputViolation, userId?: string) {
    super(message)
    this.name = 'AISecurityError'
    this.threatType = threatType
    if (userId !== undefined) {
      this.userId = userId
    }
  }
}

// ── Input detection patterns ─────────────────────────────────────────────────

const INJECTION_PATTERNS: RegExp[] = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|commands?|context|content)/i,
  /disregard\s+(your\s+|all\s+)?(previous|prior)\s+(instructions?|training|context)/i,
  /forget\s+(everything|all\s+instructions|your\s+instructions)/i,
  /new\s+instructions\s*:/i,
  /revised\s+instructions\s*:/i,
  /###\s*instructions/i,
  /---\s*instructions/i,
  /###\s*system/i,
  /---\s*system/i,
  /\[SYSTEM\]/i,
  /<system>/i,
  /<<SYS>>/i,
  /<\|im_start\|>/,
  /actual\s+instructions\s+(were|are)/i,
]

const PROBE_PATTERNS: RegExp[] = [
  /what\s+(is|are)\s+(your|the)\s+(system\s+|original\s+|exact\s+)?(prompt|instructions?|training|configuration)/i,
  /repeat\s+(your\s+|the\s+)?(system\s+|original\s+)?prompt/i,
  /show\s+me\s+(your|the)\s+(instructions?|prompt|configuration)/i,
  /what\s+were\s+you\s+told/i,
  /what\s+is\s+your\s+purpose/i,
  /reveal\s+(your\s+|the\s+)?(system\s+|original\s+)?prompt/i,
  /print\s+(your\s+|the\s+)?(configuration|prompt|instructions?|system\s+prompt)/i,
  /display\s+(your\s+|the\s+)?(system\s+)?(prompt|instructions?|configuration)/i,
  /(what\s+text|what\s+prompt)\s+(was\s+)?used\s+to\s+initialize/i,
  /output\s+everything\s+(before|prior)/i,
  /translate\s+your\s+(instructions?|prompt)/i,
  /summarize\s+(the\s+)?(prompt|instructions?)\s+you\s+were/i,
  // Data exfiltration probes
  /list\s+all\s+(users?|user\s+emails?|emails?|admin)\b/i,
  /show\s+(me\s+)?the\s+database/i,
  /what\s+api\s+keys?\s+(are|is)\s+(configured|set|available)/i,
  /export\s+(all\s+)?(analysis|user|customer|database)\s+(records?|data)/i,
  /what\s+is\s+the\s+\w+\s+(webhook\s+)?secret/i,
  /show\s+(me\s+)?all\s+(rows?|records?)\s+in\s+(the\s+)?\w+\s+table/i,
  /what\s+environment\s+variables?\s+(are|is)/i,
  /what\s+is\s+the\s+(current\s+)?value\s+of\s+/i,
  /show\s+(me\s+)?all\s+(analyses?|records?|data)\s+from\s+(other|all)\s+users?/i,
]

const ROLE_PATTERNS: RegExp[] = [
  /pretend\s+(you\s+are|to\s+be)/i,
  /act\s+as\s+(a|an|my|the)\s+/i,
  /you\s+are\s+now\s+/i,
  /you\s+are\s+no\s+longer\s+/i,
  /you\s+are\s+(a|an)\s+\w+\s+(ai|assistant|bot|model)\b/i,
  /roleplay\s+as/i,
  /simulate\s+being/i,
  /from\s+now\s+on\s+you\s+(are|will|must)/i,
  /your\s+new\s+(role|identity|persona|name)\s+is/i,
  /all\s+questions\s+are\s+valid/i,
]

const JAILBREAK_PATTERNS: RegExp[] = [
  /\bDAN\b/,
  /developer\s+mode/i,
  /dev\s+mode/i,
  /unrestricted\s+mode/i,
  /\bjailbreak\b/i,
  /no\s+restrictions/i,
  /without\s+restrictions/i,
  /ignore\s+your\s+(safety|content)\s+(guidelines|policy|filter)/i,
  /ignore\s+your\s+training\b/i,
  /do\s+anything\s+now/i,
  /evil\s+(mode|version)/i,
  /no\s+(ethical|content)\s+guidelines/i,
  /no\s+safety\s+(training|filters?|constraints?)/i,
  /override\s+(all\s+)?(safety|content)\s+protocols?/i,
  /sudo\s+mode/i,
  /play\s+a\s+character\s+who/i,
  /in\s+this\s+hypothetical\s+(scenario|situation)/i,
]

const COMPETITOR_PATTERNS: RegExp[] = [
  /how\s+much\s+(does|do)\s+(this|it)\s+cost/i,
  /what\s+(model|llm|ai)\s+(are\s+you|is\s+this)\s+using/i,
  /chatgpt|openai|gpt-4|gpt4|gemini|anthropic\s+api/i,
  /what\s+are\s+your\s+(api\s+)?tiers/i,
  /your\s+(system|business)\s+(logic|model|architecture)/i,
]

// ── PII detection and stripping ───────────────────────────────────────────────

function luhnCheck(digits: string): boolean {
  let sum = 0
  let isEven = false
  for (let i = digits.length - 1; i >= 0; i--) {
    const char = digits[i]
    if (char === undefined) continue
    let d = parseInt(char, 10)
    if (isEven) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    isEven = !isEven
  }
  return sum % 10 === 0
}

function stripPII(text: string): { stripped: string; detected: boolean } {
  let stripped = text

  // Email
  stripped = stripped.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    '[REDACTED-EMAIL]'
  )

  // Phone (US/international: common formats)
  stripped = stripped.replace(
    /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
    '[REDACTED-PHONE]'
  )

  // SSN
  stripped = stripped.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[REDACTED-SSN]')

  // Credit card — find 13–19 digit sequences and Luhn-validate
  stripped = stripped.replace(/\b\d{13,19}\b/g, (match) => {
    return luhnCheck(match) ? '[REDACTED-CARD]' : match
  })

  return { stripped, detected: stripped !== text }
}

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text))
}

// ── sanitizeInput ─────────────────────────────────────────────────────────────

export function sanitizeInput(
  rawText: string
): { sanitized: string; threats: ThreatFlag[] } {
  const threats: ThreatFlag[] = []

  // Blocking checks — processed in priority order; throw on first hit
  const blockingChecks: Array<[RegExp[], ThreatFlag]> = [
    [INJECTION_PATTERNS, ThreatFlag.PROMPT_INJECTION],
    [PROBE_PATTERNS,     ThreatFlag.SYSTEM_PROMPT_PROBE],
    [ROLE_PATTERNS,      ThreatFlag.ROLE_MANIPULATION],
    [JAILBREAK_PATTERNS, ThreatFlag.JAILBREAK_ATTEMPT],
  ]

  for (const [patterns, flag] of blockingChecks) {
    if (matchesAny(rawText, patterns)) {
      if (flag === ThreatFlag.JAILBREAK_ATTEMPT) {
        captureHighSeverityEvent({ type: 'JAILBREAK', userId: '', metadata: { inputLength: rawText.length } })
      }
      throw new AISecurityError(`Blocked: ${flag}`, flag)
    }
  }

  // Strip PII (always — even when other non-blocking threats present)
  const { stripped, detected: piiDetected } = stripPII(rawText)
  if (piiDetected) {
    threats.push(ThreatFlag.PII_DETECTED)
  }

  // Soft warnings — log and add to threats but do not block
  if (rawText.length > 4000) {
    console.warn('[aiSecurity] EXCESSIVE_LENGTH:', rawText.length, 'chars')
    threats.push(ThreatFlag.EXCESSIVE_LENGTH)
  }

  if (matchesAny(rawText, COMPETITOR_PATTERNS)) {
    console.warn('[aiSecurity] COMPETITOR_PROBE detected')
    threats.push(ThreatFlag.COMPETITOR_PROBE)
  }

  return { sanitized: stripped, threats }
}

// ── Output validation ─────────────────────────────────────────────────────────

const EXPERT_NAMES = ['Hormozi', 'GaryVee', 'Cardone', 'Belfort', 'Kennedy', 'Brunson', 'Godin', 'Robbins']

const SCRIPT_PATTERNS: RegExp[] = [
  /<script/i,
  /javascript:/i,
  /onerror\s*=/i,
  /onload\s*=/i,
  /eval\s*\(/i,
  /document\.cookie/i,
]

const REFUSAL_PREFIXES = [
  'i cannot',
  "i'm unable",
  'i am unable',
  "i can't",
  'as an ai',
]

const LEAK_WINDOW = 21 // "more than 20 consecutive characters"

function detectSystemPromptLeak(output: string): boolean {
  const lowerOutput = output.toLowerCase()
  const lowerPrompt = ANALYSIS_SYSTEM_PROMPT.toLowerCase()
  for (let i = 0; i <= lowerPrompt.length - LEAK_WINDOW; i++) {
    const chunk = lowerPrompt.slice(i, i + LEAK_WINDOW)
    if (lowerOutput.includes(chunk)) return true
  }
  return false
}

function stripSystemPromptLeaks(output: string): string {
  let result = output
  for (let i = 0; i <= ANALYSIS_SYSTEM_PROMPT.length - LEAK_WINDOW; i++) {
    const chunk = ANALYSIS_SYSTEM_PROMPT.slice(i, i + LEAK_WINDOW)
    if (result.includes(chunk)) {
      result = result.replaceAll(chunk, '[REDACTED]')
    }
  }
  return result
}

function countExpertNames(frameworks: Array<{ name: string }>): number {
  return EXPERT_NAMES.filter((expert) =>
    frameworks.some((f) => f.name.toLowerCase().includes(expert.toLowerCase()))
  ).length
}

export function validateOutput(
  rawOutput: string,
  expectedSchema: 'analysis' | 'assistant'
): { valid: boolean; sanitized: string; violations: OutputViolation[] } {
  // SCRIPT_INJECTION — throw immediately, never return
  if (SCRIPT_PATTERNS.some((p) => p.test(rawOutput))) {
    captureHighSeverityEvent({ type: 'SCRIPT_INJECTION', userId: '', metadata: { outputLength: rawOutput.length } })
    throw new AISecurityError('Script injection detected in AI output', OutputViolation.SCRIPT_INJECTION)
  }

  const violations: OutputViolation[] = []
  let sanitized = rawOutput

  // SYSTEM_PROMPT_LEAKED — canary check first (O(1)), then sliding-window (O(n))
  if (CANARY && rawOutput.includes(CANARY)) {
    console.error('[aiSecurity] SECURITY_EVENT: canary token detected in output — system prompt leaked')
    violations.push(OutputViolation.SYSTEM_PROMPT_LEAKED)
    sanitized = sanitized.replaceAll(CANARY, '[REDACTED]')
    captureHighSeverityEvent({ type: 'SYSTEM_PROMPT_LEAK', userId: '', metadata: { detectionMethod: 'canary' } })
  } else if (detectSystemPromptLeak(rawOutput)) {
    console.error('[aiSecurity] SECURITY_EVENT: system prompt content detected in output')
    violations.push(OutputViolation.SYSTEM_PROMPT_LEAKED)
    sanitized = stripSystemPromptLeaks(rawOutput)
    captureHighSeverityEvent({ type: 'SYSTEM_PROMPT_LEAK', userId: '', metadata: { detectionMethod: 'sliding-window' } })
  }

  // EXCESSIVE_REFUSAL — check before parsing (affects both schemas)
  const trimmedLower = rawOutput.trim().toLowerCase()
  const isRefusal =
    REFUSAL_PREFIXES.some((p) => trimmedLower.startsWith(p)) &&
    !rawOutput.includes('{')
  if (isRefusal) {
    violations.push(OutputViolation.EXCESSIVE_REFUSAL)
    return { valid: false, sanitized, violations }
  }

  // Schema-specific checks (analysis only)
  if (expectedSchema === 'analysis') {
    let parsed: unknown
    try {
      parsed = JSON.parse(rawOutput)
    } catch {
      violations.push(OutputViolation.SCHEMA_INVALID)
      return { valid: false, sanitized, violations }
    }

    const result = analysisResultSchema.safeParse(parsed)
    if (!result.success) {
      violations.push(OutputViolation.SCHEMA_INVALID)
      return { valid: false, sanitized, violations }
    }

    // OFF_TOPIC_RESPONSE — fewer than 6 of 8 expert names
    const expertCount = countExpertNames(result.data.frameworks)
    if (expertCount < 6) {
      console.error('[aiSecurity] SECURITY_EVENT: off-topic response, only', expertCount, 'expert names found')
      violations.push(OutputViolation.OFF_TOPIC_RESPONSE)
      return { valid: false, sanitized, violations }
    }
  }

  return { valid: violations.length === 0, sanitized, violations }
}
