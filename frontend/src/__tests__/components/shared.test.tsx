import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { StatusBadge } from '@/components/shared/status-badge'
import { EmptyState } from '@/components/shared/empty-state'
import { StatCard } from '@/components/shared/stat-card'
import { Zap } from 'lucide-react'

describe('StatusBadge', () => {
  it('renders success status', () => {
    render(<StatusBadge status="success" />)
    expect(screen.getByText('Success')).toBeInTheDocument()
  })

  it('renders failed status', () => {
    render(<StatusBadge status="failed" />)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  it('renders pending status', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Pending')).toBeInTheDocument()
  })

  it('renders running status', () => {
    render(<StatusBadge status="running" />)
    expect(screen.getByText('Running')).toBeInTheDocument()
  })

  it('renders active status', () => {
    render(<StatusBadge status="active" />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders approved status', () => {
    render(<StatusBadge status="approved" />)
    expect(screen.getByText('Approved')).toBeInTheDocument()
  })

  it('renders rejected status', () => {
    render(<StatusBadge status="rejected" />)
    expect(screen.getByText('Rejected')).toBeInTheDocument()
  })

  it('renders published status', () => {
    render(<StatusBadge status="published" />)
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('renders paused status', () => {
    render(<StatusBadge status="paused" />)
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('renders error status', () => {
    render(<StatusBadge status="error" />)
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('uppercases unknown status labels', () => {
    render(<StatusBadge status="custom_status" />)
    expect(screen.getByText('CUSTOM_STATUS')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<StatusBadge status="active" className="my-custom-class" />)
    expect(container.firstChild).toHaveClass('my-custom-class')
  })
})

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No items found" />)
    expect(screen.getByText('No items found')).toBeInTheDocument()
  })

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing here yet" />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('renders action slot', () => {
    render(
      <EmptyState
        title="Empty"
        action={<button>Create one</button>}
      />
    )
    expect(screen.getByRole('button', { name: 'Create one' })).toBeInTheDocument()
  })

  it('renders icon when provided', () => {
    const { container } = render(<EmptyState title="Empty" icon={Zap} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without icon when not provided', () => {
    const { container } = render(<EmptyState title="No icon" />)
    expect(container.querySelector('svg')).not.toBeInTheDocument()
  })
})

describe('StatCard', () => {
  it('renders title and value', () => {
    render(<StatCard title="Total Runs" value={42} />)
    expect(screen.getByText('Total Runs')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders string value', () => {
    render(<StatCard title="Status" value="Online" />)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders positive delta with + prefix', () => {
    render(<StatCard title="Growth" value={100} delta={12} deltaLabel="vs last week" />)
    expect(screen.getByText('+12%')).toBeInTheDocument()
    expect(screen.getByText('vs last week')).toBeInTheDocument()
  })

  it('renders negative delta without + prefix', () => {
    render(<StatCard title="Drop" value={50} delta={-5} />)
    expect(screen.getByText('-5%')).toBeInTheDocument()
  })

  it('does not render delta section when delta is undefined', () => {
    render(<StatCard title="Plain" value={10} />)
    expect(screen.queryByText(/%/)).not.toBeInTheDocument()
  })

  it('renders with icon', () => {
    const { container } = render(<StatCard title="Zaps" value={7} icon={Zap} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies amber accent color', () => {
    const { container } = render(<StatCard title="T" value={1} accentColor="amber" />)
    // The value element should have text-amber class
    const valueEl = container.querySelector('.text-amber')
    expect(valueEl).toBeInTheDocument()
  })
})
