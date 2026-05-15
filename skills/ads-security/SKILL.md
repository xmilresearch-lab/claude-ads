---
name: ads-security
description: "Comprehensive AI application security audit for Claude-powered apps and agent pipelines. Covers OWASP LLM Top 10, prompt injection, secrets management, output safety, tool permissions, and excessive agency. Use when user says: security audit, check for vulnerabilities, is this agent safe, review AI security, LLM security, prompt injection, or secrets scan."
user-invokable: true
---

# AI App Security Skill

Trigger: `/ads security` or `/security` or any mention of AI security review.

## Process

1. **Collect scope**: identify all agent files, skill definitions, scripts, configs
2. **Read reference**: load `ads/references/ai-security-checks.md` for full check list
3. **Assess threat model**: determine app type, trust boundaries, external surfaces
4. **Delegate to audit-security agent**: run 60-check security audit in parallel
5. **Score and grade**: calculate Security Health Score (0-100)
6. **Report**: output findings, severity rankings, and remediation roadmap

## Threat Model for AI Apps

### Trust Boundaries
```
[User Input] → [Input Validation] → [LLM / Agent] → [Tool Execution] → [Output Validation] → [User]
        ↑                                    ↑                  ↑
  Injection surface              Indirect injection       Command injection
  (direct prompt injection)    (via tool output)         (via file paths, filters)
```

### Top 5 AI App Attack Vectors

1. **Direct prompt injection** — user crafts input that overrides system prompt
2. **Indirect prompt injection** — malicious content in files/URLs fed back to LLM
3. **Tool output injection** — tool returns data that hijacks next LLM turn
4. **Secrets leakage** — API keys in prompts, logs, or model outputs
5. **Excessive agency** — agent takes destructive action without human confirmation

## Quick Security Checklist

For any Claude-powered app, verify these 10 controls before deployment:

| # | Control | How to Verify |
|---|---------|---------------|
| 1 | Input validation | Grep for direct f-string prompt construction with user input |
| 2 | Tool allowlist | Check agents have explicit `tools:` list, not wildcard |
| 3 | maxTurns set | All agents have `maxTurns: N` in frontmatter |
| 4 | No hardcoded secrets | `grep -r 'sk-ant\|api_key\s*=' --include='*.py' --include='*.md'` |
| 5 | Rate limiting | API calls wrapped in rate limiter |
| 6 | Output sanitization | LLM output escaped/validated before use |
| 7 | Least privilege tools | Agents only have tools they need |
| 8 | Audit logging | Security events logged with context |
| 9 | PII redaction | User data redacted before LLM calls and logging |
| 10 | Human-in-the-loop | Destructive actions require confirmation |

## Scoring

Read `ads/references/ai-security-checks.md` for the full 60-check scoring rubric.

```
Security Health Score = (checks_passed x 2 + checks_warning x 1) / (checks_applicable x 2) x 100
```

| Score | Grade | Deployment Decision |
|-------|-------|--------------------|
| 90-100 | A | Deploy — monitor |
| 75-89 | B | Deploy — fix highs within 7 days |
| 60-74 | C | Deploy to staging only — fix before production |
| 40-59 | D | Do not deploy — remediate criticals and highs |
| < 40 | F | Block — security review required |

## Output

Always produce:
- `SECURITY-AUDIT-REPORT.md` — full findings with evidence and remediation steps
- Summary table of check results per category
- Remediation roadmap (Immediate / This sprint / Next sprint / Backlog)

## Integration with Ads Audit

When running `/ads audit`, security checks run as a parallel agent alongside
the 6 ad-platform audit agents. Security findings are included in the
ADS-AUDIT-REPORT.md under a dedicated Security section.
