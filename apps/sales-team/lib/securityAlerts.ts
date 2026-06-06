// SERVER-ONLY — never import from client components
import * as Sentry from '@sentry/nextjs'

export function captureSecurityEvent(params: {
  type: 'INPUT_THREAT' | 'OUTPUT_VIOLATION' | 'ANOMALY' | 'PROMPT_LEAK' | 'BLOCKED_USER'
  userId: string
  metadata: Record<string, unknown>
}): void {
  Sentry.withScope(scope => {
    scope.setTag('security.event_type', params.type)
    scope.setUser({ id: params.userId })
    scope.setLevel('warning')
    scope.setContext('security', params.metadata)
    Sentry.captureMessage(`AI Security: ${params.type}`, 'warning')
  })
}

export function captureHighSeverityEvent(params: {
  type: 'JAILBREAK' | 'SYSTEM_PROMPT_LEAK' | 'SCRIPT_INJECTION' | 'REPEATED_ATTACKER'
  userId: string
  metadata: Record<string, unknown>
}): void {
  Sentry.withScope(scope => {
    scope.setTag('security.event_type', params.type)
    scope.setTag('security.severity', 'HIGH')
    scope.setUser({ id: params.userId })
    scope.setLevel('error')
    scope.setContext('security', params.metadata)
    Sentry.captureMessage(`AI Security HIGH: ${params.type}`, 'error')
  })
}
