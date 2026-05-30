import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders with default variant', () => {
    const { container } = render(<Badge>Label</Badge>)
    // default variant uses amber styling
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders success variant', () => {
    const { container } = render(<Badge variant="success">Done</Badge>)
    expect(container.firstChild).toHaveClass('text-success')
  })

  it('renders danger variant', () => {
    const { container } = render(<Badge variant="danger">Error</Badge>)
    expect(container.firstChild).toHaveClass('text-danger')
  })

  it('renders warning variant', () => {
    const { container } = render(<Badge variant="warning">Warn</Badge>)
    expect(container.firstChild).toHaveClass('text-warning')
  })

  it('renders info variant', () => {
    const { container } = render(<Badge variant="info">Info</Badge>)
    expect(container.firstChild).toHaveClass('text-info')
  })

  it('renders secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Off</Badge>)
    expect(container.firstChild).toHaveClass('text-text-secondary')
  })

  it('renders outline variant', () => {
    const { container } = render(<Badge variant="outline">Draft</Badge>)
    expect(container.firstChild).toHaveClass('border-border')
  })

  it('merges custom className', () => {
    const { container } = render(<Badge className="extra-class">X</Badge>)
    expect(container.firstChild).toHaveClass('extra-class')
  })
})

describe('Button', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('renders secondary variant', () => {
    const { container } = render(<Button variant="secondary">Sec</Button>)
    expect(container.firstChild).toHaveClass('bg-bg-elevated')
  })

  it('renders ghost variant', () => {
    const { container } = render(<Button variant="ghost">Ghost</Button>)
    expect(container.firstChild).toHaveClass('hover:bg-bg-elevated')
  })

  it('renders destructive variant', () => {
    const { container } = render(<Button variant="destructive">Del</Button>)
    expect(container.firstChild).toHaveClass('bg-danger')
  })

  it('renders outline variant', () => {
    const { container } = render(<Button variant="outline">Out</Button>)
    expect(container.firstChild).toHaveClass('border')
  })

  it('renders link variant', () => {
    const { container } = render(<Button variant="link">Link</Button>)
    expect(container.firstChild).toHaveClass('text-amber')
  })

  it('renders sm size', () => {
    const { container } = render(<Button size="sm">Small</Button>)
    expect(container.firstChild).toHaveClass('h-7')
  })

  it('renders lg size', () => {
    const { container } = render(<Button size="lg">Large</Button>)
    expect(container.firstChild).toHaveClass('h-11')
  })

  it('renders icon size', () => {
    const { container } = render(<Button size="icon">+</Button>)
    expect(container.firstChild).toHaveClass('h-9', 'w-9')
  })

  it('is disabled when disabled prop is set', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('accepts className override', () => {
    const { container } = render(<Button className="my-btn">X</Button>)
    expect(container.firstChild).toHaveClass('my-btn')
  })
})
