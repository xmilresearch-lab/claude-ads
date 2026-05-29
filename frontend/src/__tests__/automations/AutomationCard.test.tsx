import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

vi.mock('@/hooks/useAutomations', () => {
  const toggleMutate = vi.fn()
  const triggerMutate = vi.fn()
  return {
    useToggleAutomation: () => ({ mutate: toggleMutate, isPending: false }),
    useTriggerAutomation: () => ({ mutate: triggerMutate, isPending: false }),
  }
})

import { AutomationCard } from '@/components/automations/AutomationCard'
import type { Automation } from '@/lib/api/automations'

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

const makeAutomation = (overrides?: Partial<Automation>): Automation => ({
  id: 'auto-1',
  name: 'Test Automation',
  description: 'A test automation',
  status: 'active',
  platform: 'social',
  cron_expression: '0 9 * * *',
  config: {},
  workspace_id: 'ws-1',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  run_count: 0,
  ...overrides,
})

describe('AutomationCard', () => {
  it('renders automation name', () => {
    render(
      <AutomationCard
        automation={makeAutomation()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText('Test Automation')).toBeInTheDocument()
  })

  it('renders human-readable cron label', () => {
    render(
      <AutomationCard
        automation={makeAutomation()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText(/every day at 9:00 am/i)).toBeInTheDocument()
  })

  it('renders active status indicator', () => {
    render(
      <AutomationCard
        automation={makeAutomation({ status: 'active' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText(/active/i)).toBeInTheDocument()
  })

  it('renders paused status for paused automation', () => {
    render(
      <AutomationCard
        automation={makeAutomation({ status: 'paused' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText(/paused/i)).toBeInTheDocument()
  })

  it('Run Now button is present and enabled when not in cooldown', () => {
    render(
      <AutomationCard
        automation={makeAutomation()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByRole('button', { name: /run now/i })).not.toBeDisabled()
  })

  it('Run Now button becomes disabled immediately after click', () => {
    render(
      <AutomationCard
        automation={makeAutomation()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    fireEvent.click(screen.getByRole('button', { name: /run now/i }))
    expect(screen.getByRole('button', { name: /running/i })).toBeDisabled()
  })
})
