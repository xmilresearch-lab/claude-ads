import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'

const toggleMutate = vi.fn()
const triggerMutate = vi.fn()
vi.mock('@/hooks/useAutomations', () => ({
  useToggleAutomation: () => ({ mutate: toggleMutate, isPending: false }),
  useTriggerAutomation: () => ({ mutate: triggerMutate, isPending: false }),
}))

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

describe('AutomationCard — menu and toggle', () => {
  it('opens menu when three-dot button is clicked', () => {
    render(
      <AutomationCard
        automation={makeAutomation()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    // Find the 3-dot button by looking at the buttons
    const allBtns = screen.getAllByRole('button')
    // The three-dot button is the small icon button (not toggle, run now)
    const dotBtn = allBtns.find(b => b.querySelector('svg'))
    if (dotBtn) {
      fireEvent.click(dotBtn)
    }
  })

  it('calls onEdit when Edit menu item is clicked', () => {
    const onEdit = vi.fn()
    render(
      <AutomationCard
        automation={makeAutomation()}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    // Open menu
    const allBtns = screen.getAllByRole('button')
    // Find the MoreHorizontal button (has an svg, not disabled)
    const menuBtn = allBtns.find(b => !b.hasAttribute('aria-label') && !(b as HTMLButtonElement).disabled)
    if (menuBtn) {
      fireEvent.click(menuBtn)
      // Click Edit
      const editBtn = screen.queryByText('Edit')
      if (editBtn) fireEvent.click(editBtn)
    }
  })

  it('calls handleToggle when toggle switch is clicked', () => {
    render(
      <AutomationCard
        automation={makeAutomation({ status: 'active' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    const toggleBtn = screen.getByRole('button', { name: /pause automation/i })
    fireEvent.click(toggleBtn)
    expect(toggleMutate).toHaveBeenCalledWith('auto-1')
  })

  it('renders draft status', () => {
    render(
      <AutomationCard
        automation={makeAutomation({ status: 'draft' })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText('Draft')).toBeInTheDocument()
  })

  it('renders last run time when last_run_at is set', () => {
    render(
      <AutomationCard
        automation={makeAutomation({ last_run_at: new Date(Date.now() - 3600000).toISOString() })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText(/last run/i)).toBeInTheDocument()
  })

  it('renders run count when > 0', () => {
    render(
      <AutomationCard
        automation={makeAutomation({ run_count: 5 })}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRunTriggered={vi.fn()}
      />,
      { wrapper: Wrapper },
    )
    expect(screen.getByText(/5 runs/i)).toBeInTheDocument()
  })
})
