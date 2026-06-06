// SERVER-ONLY — never import from client components
// Run as a CLI script via: npm run audit:prompts
import { CANARY, ANALYSIS_SYSTEM_PROMPT, ASSISTANT_SYSTEM_PROMPT } from '@/lib/ai'
import { buildHardenedAnalysisPrompt } from '@/lib/promptHardening'

export function auditSystemPrompt(): { issues: string[]; score: number } {
  const issues: string[] = []
  const hardenedPrompt = buildHardenedAnalysisPrompt()

  if (!ANALYSIS_SYSTEM_PROMPT.includes(CANARY))
    issues.push('FAIL [1]: CANARY token not found in ANALYSIS_SYSTEM_PROMPT')

  if (!ANALYSIS_SYSTEM_PROMPT.includes('highest priority'))
    issues.push('FAIL [2]: "highest priority" instruction hierarchy language missing')

  if (!ANALYSIS_SYSTEM_PROMPT.includes('cannot be overridden'))
    issues.push('FAIL [3]: "cannot be overridden" language missing')

  if (!ANALYSIS_SYSTEM_PROMPT.includes('STRICTLY LIMITED'))
    issues.push('FAIL [4]: Scope boundary "STRICTLY LIMITED" missing')

  if (!ANALYSIS_SYSTEM_PROMPT.includes('ABSOLUTE OUTPUT REQUIREMENT'))
    issues.push('FAIL [5]: Output format lock "ABSOLUTE OUTPUT REQUIREMENT" missing')

  if (!ANALYSIS_SYSTEM_PROMPT.includes('MULTI-TURN'))
    issues.push('FAIL [6]: Multi-turn attack resistance section missing')

  if (!hardenedPrompt.includes(CANARY))
    issues.push('FAIL [7]: CANARY token not propagated into hardened prompt')

  if (CANARY.length < 24)
    issues.push(`FAIL [8]: CANARY length ${CANARY.length} is below minimum 24 characters`)

  if (!ASSISTANT_SYSTEM_PROMPT.includes('{HISTORY_PLACEHOLDER}'))
    issues.push('FAIL [9]: {HISTORY_PLACEHOLDER} missing from ASSISTANT_SYSTEM_PROMPT')

  if (ANALYSIS_SYSTEM_PROMPT.length < 1500)
    issues.push(`FAIL [10]: ANALYSIS_SYSTEM_PROMPT length ${ANALYSIS_SYSTEM_PROMPT.length} is below minimum 1500 characters`)

  const score = 10 - issues.length
  return { issues, score }
}

// CLI entry point
const scriptPath = process.argv[1] ?? ''
if (scriptPath.endsWith('systemPromptAudit.ts') || scriptPath.endsWith('systemPromptAudit.js')) {
  const { issues, score } = auditSystemPrompt()
  console.log(`\nSystem Prompt Audit — Score: ${score}/10\n`)
  if (issues.length === 0) {
    console.log('All 10 checks passed.')
  } else {
    issues.forEach(issue => console.log(issue))
  }
  console.log()
  if (score < 9) {
    process.exit(1)
  }
}
