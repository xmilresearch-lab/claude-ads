// Comprehensive AI security audit script
// Run via: npm run audit:ai-security
import { readFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'
import { auditSystemPrompt } from '@/lib/systemPromptAudit'
import { CANARY, ANALYSIS_SYSTEM_PROMPT } from '@/lib/ai'

const ROOT = join(__dirname, '..')

function read(relPath: string): string {
  return readFileSync(join(ROOT, relPath), 'utf8')
}

const results: Array<{ label: string; passed: boolean }> = []

function check(label: string, passed: boolean): void {
  results.push({ label, passed })
}

// ── Check 1: ANTHROPIC_API_KEY not in client files ────────────────────────────
try {
  const grepOut = execSync(
    'grep -r "ANTHROPIC_API_KEY" app/ components/ hooks/ --include="*.ts" --include="*.tsx" 2>/dev/null || true',
    { cwd: ROOT, encoding: 'utf8' }
  )
  const hits = grepOut.trim().split('\n').filter(l =>
    l.length > 0 && !l.includes('NEXT_PUBLIC_') && l.includes('ANTHROPIC_API_KEY')
  )
  check('ANTHROPIC_API_KEY: Not found in client files', hits.length === 0)
} catch {
  check('ANTHROPIC_API_KEY: Not found in client files', false)
}

// ── Check 2: aiSecurity.ts imported in analyze route ─────────────────────────
const analyzeRoute = read('app/api/analyze/route.ts')
check(
  'Input guard: Integrated in analyze route',
  analyzeRoute.includes('aiSecurity') && analyzeRoute.includes('sanitizeInput')
)

// ── Check 3: aiSecurity.ts imported in assistant route ───────────────────────
const assistantRoute = read('app/api/assistant/route.ts')
check(
  'Output guard: Integrated in assistant route',
  assistantRoute.includes('aiSecurity') && assistantRoute.includes('sanitizeInput')
)

// ── Check 4: tokenBudget.ts imported in analyze route ────────────────────────
check(
  'Token budget: Integrated in analyze route',
  analyzeRoute.includes('tokenBudget') && analyzeRoute.includes('checkTokenBudget')
)

// ── Check 5: anomalyDetection.ts imported in both AI routes ──────────────────
check(
  'Anomaly detection: Integrated in analyze route',
  analyzeRoute.includes('anomalyDetection') && analyzeRoute.includes('isUserBlocked')
)
check(
  'Anomaly detection: Integrated in assistant route',
  assistantRoute.includes('anomalyDetection') && assistantRoute.includes('isUserBlocked')
)

// ── Check 6: hardened prompt used (not raw ANALYSIS_SYSTEM_PROMPT) ────────────
check(
  'Hardened prompt: Used in analyze route',
  analyzeRoute.includes('buildHardenedAnalysisPrompt') && !analyzeRoute.includes('ANALYSIS_SYSTEM_PROMPT')
)

// ── Check 7: Prompt audit score >= 9 ─────────────────────────────────────────
const { score: promptScore, issues: promptIssues } = auditSystemPrompt()
check(`Prompt audit score: ${promptScore}/10`, promptScore >= 9)

// ── Check 8: Canary token present in system prompt ───────────────────────────
check('Canary token: Present in ANALYSIS_SYSTEM_PROMPT', ANALYSIS_SYSTEM_PROMPT.includes(CANARY))

// ── Check 9: AnalysisResult Zod schema referenced in validateOutput ───────────
const aiSecuritySrc = read('lib/aiSecurity.ts')
check(
  'Schema validation: analysisResultSchema referenced in aiSecurity',
  aiSecuritySrc.includes('analysisResultSchema') && aiSecuritySrc.includes('safeParse')
)

// ── Check 10: stop_sequences set in Anthropic API call ───────────────────────
check('Stop sequences: Configured in analyze route', analyzeRoute.includes('stop_sequences'))

// ── Report ────────────────────────────────────────────────────────────────────
const passed = results.filter(r => r.passed).length
const total = results.length

console.log('\nAI SECURITY AUDIT REPORT')
console.log('========================')
for (const { label, passed: p } of results) {
  console.log(`[${p ? 'PASS' : 'FAIL'}] ${label}`)
}
console.log('========================')
console.log(`RESULT: ${passed === total ? 'PASS' : 'FAIL'} (${passed}/${total} checks)`)
console.log()

if (promptScore < 9 && promptIssues.length > 0) {
  console.log('Prompt audit issues:')
  promptIssues.forEach(issue => console.log(' ', issue))
  console.log()
}

if (passed < total) {
  process.exit(1)
}
