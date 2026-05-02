import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Cite } from '../index.js'

describe('Cite', () => {
  it('renders the source label', () => {
    render(<Cite src="CDC" />)
    expect(screen.getByText('CDC')).toBeInTheDocument()
  })

  it('renders the year when provided', () => {
    render(<Cite src="CDC" year={2024} />)
    expect(screen.getByText(/2024/)).toBeInTheDocument()
  })

  it('omits the year when not provided', () => {
    const { container } = render(<Cite src="CDC" />)
    expect(container.textContent?.includes('·')).toBe(false)
  })

  it('points the anchor at the source URL when provided', () => {
    render(<Cite src="CDC" url="https://www.cdc.gov/lyme" />)
    const anchor = screen.getByRole('link')
    expect(anchor).toHaveAttribute('href', 'https://www.cdc.gov/lyme')
    expect(anchor).toHaveAttribute('target', '_blank')
    expect(anchor).toHaveAttribute('rel', 'noreferrer')
  })

  it('falls back to a "#" href when no URL is provided', () => {
    render(<Cite src="CDC" />)
    expect(screen.getByRole('link')).toHaveAttribute('href', '#')
  })

  it('puts the source + year into the title attribute for hover context', () => {
    render(<Cite src="CDC" year={2024} />)
    const anchor = screen.getByRole('link')
    expect(anchor).toHaveAttribute('title', 'Source: CDC, 2024')
  })
})
