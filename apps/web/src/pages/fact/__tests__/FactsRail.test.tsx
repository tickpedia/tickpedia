import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FactsRail } from '../sections/FactsRail.js'

describe('FactsRail', () => {
  it('renders nothing when rows is empty and not loading', () => {
    const { container } = render(<FactsRail rows={[]} loading={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a loading state when loading=true', () => {
    render(<FactsRail rows={[]} loading={true} />)
    expect(screen.getByText(/loading…/i)).toBeInTheDocument()
  })

  it('renders one card per row, each linking to /facts/[slug]', () => {
    render(
      <FactsRail
        rows={[
          {
            id: 1,
            slug: 'tick-saliva-numbs-the-bite',
            body: 'Tick saliva contains anesthetic-like compounds.',
            citationUrl: 'https://example.org/saliva',
          },
          {
            id: 2,
            slug: 'lyme-needs-36-hours',
            body: 'Attachment time matters.',
            citationUrl: null,
          },
        ]}
        loading={false}
      />,
    )
    const cards = screen.getAllByTestId('facts-rail-card')
    expect(cards).toHaveLength(2)
    expect(cards[0]).toHaveAttribute('href', '/facts/tick-saliva-numbs-the-bite')
    expect(cards[1]).toHaveAttribute('href', '/facts/lyme-needs-36-hours')
  })

  it('honors custom heading + testIdPrefix', () => {
    render(
      <FactsRail
        rows={[
          {
            id: 1,
            slug: 'a',
            body: 'b',
            citationUrl: null,
          },
        ]}
        loading={false}
        heading="Wild facts about Lyme"
        testIdPrefix="disease-facts"
      />,
    )
    expect(screen.getByRole('heading', { name: /wild facts about lyme/i })).toBeInTheDocument()
    expect(screen.getByTestId('disease-facts')).toBeInTheDocument()
    expect(screen.getByTestId('disease-facts-card')).toBeInTheDocument()
  })

  it('renders an error message when error is set', () => {
    render(
      <FactsRail
        rows={[]}
        loading={false}
        error={new Error('SemiLayer down')}
      />,
    )
    expect(screen.getByText(/failed to load wild facts/i)).toBeInTheDocument()
    expect(screen.getByText(/SemiLayer down/)).toBeInTheDocument()
  })
})
