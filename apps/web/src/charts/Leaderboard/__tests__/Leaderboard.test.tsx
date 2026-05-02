import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Leaderboard } from '../index.js'

const ROWS = [
  { rank: 1, label: 'Cumberland County, ME', value: 8421, sub: 'Maine' },
  { rank: 2, label: 'Hampshire County, MA', value: 7910, sub: 'Massachusetts' },
  { rank: 3, label: 'Litchfield County, CT', value: 6201, sub: 'Connecticut', href: '/counties/ct/litchfield' },
]

describe('Leaderboard', () => {
  it('renders one row per entry plus the header row', () => {
    const { container } = render(<Leaderboard rows={ROWS} />)
    expect(container.querySelectorAll('tbody tr').length).toBe(3)
  })

  it('renders the value-column header label', () => {
    render(<Leaderboard rows={ROWS} valueLabel="Cases" />)
    expect(screen.getByText('Cases')).toBeInTheDocument()
  })

  it('formats values with the locale formatter by default', () => {
    render(<Leaderboard rows={ROWS} />)
    expect(screen.getByText('8,421')).toBeInTheDocument()
  })

  it('honours a custom value formatter', () => {
    render(<Leaderboard rows={ROWS} valueFmt={(n) => `${n} reports`} />)
    expect(screen.getByText('8421 reports')).toBeInTheDocument()
  })

  it('wraps the label in an anchor when href is present', () => {
    render(<Leaderboard rows={ROWS} />)
    const link = screen.getByRole('link', { name: /litchfield/i })
    expect(link).toHaveAttribute('href', '/counties/ct/litchfield')
  })

  it('renders a plain span (no anchor) when href is absent', () => {
    render(<Leaderboard rows={ROWS} />)
    // Cumberland row has no href
    const cell = screen.getByText('Cumberland County, ME')
    expect(cell.tagName.toLowerCase()).toBe('span')
  })

  it('renders the optional `sub` line under the label', () => {
    render(<Leaderboard rows={ROWS} />)
    expect(screen.getByText('Maine')).toBeInTheDocument()
  })

  it('renders the trailing slot (e.g. a sparkline) when supplied', () => {
    render(
      <Leaderboard
        rows={[{ rank: 1, label: 'X', value: 1, trailing: <span data-testid="trail" /> }]}
      />,
    )
    expect(screen.getByTestId('trail')).toBeInTheDocument()
  })

  it('renders the optional caption', () => {
    render(<Leaderboard rows={ROWS} caption="Top counties" />)
    expect(screen.getByText('Top counties')).toBeInTheDocument()
  })
})
