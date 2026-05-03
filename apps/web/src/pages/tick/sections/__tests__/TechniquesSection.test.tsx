import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { TechniquesSection } from '../TechniquesSection.js'
import type { TickTechniqueBuckets } from '../../data/useTickTechniques.js'

function makeBuckets(over: Partial<TickTechniqueBuckets> = {}): TickTechniqueBuckets {
  return {
    removal: [],
    prevention: [],
    aftercare: [],
    diagnostic: [],
    myth: [],
    ...over,
  }
}

describe('TechniquesSection', () => {
  it('renders three rails when removal, prevention, and aftercare buckets are populated', () => {
    const buckets = makeBuckets({
      removal: [
        {
          id: 1,
          slug: 'fine-tipped-tweezers',
          title: 'Fine-tipped tweezers',
          oneLiner: 'CDC method.',
          kind: 'removal',
          preventionScore: null,
          citations: ['https://www.cdc.gov/ticks/removing_a_tick.html'],
          sourceUrl: 'https://www.cdc.gov/ticks/removing_a_tick.html',
        },
      ],
      prevention: [
        {
          id: 2,
          slug: 'permethrin-clothing',
          title: 'Permethrin-treated clothing',
          oneLiner: 'Kills ticks on contact with treated fabric.',
          kind: 'prevention',
          preventionScore: 9,
          citations: ['https://www.epa.gov/insect-repellents/repellent-treated-clothing'],
          sourceUrl: 'https://www.epa.gov/insect-repellents/repellent-treated-clothing',
        },
        {
          id: 3,
          slug: 'tick-checks',
          title: 'Tick checks and the two-hour shower rule',
          oneLiner: null,
          kind: 'prevention',
          preventionScore: 9,
          citations: [],
          sourceUrl: null,
        },
      ],
      aftercare: [
        {
          id: 4,
          slug: '30-day-rash-watch',
          title: '30-day symptom watch',
          oneLiner: null,
          kind: 'aftercare',
          preventionScore: null,
          citations: [],
          sourceUrl: null,
        },
      ],
    })

    render(<TechniquesSection buckets={buckets} loading={false} error={null} />)

    expect(screen.getByTestId('tick-techniques-removal')).toBeInTheDocument()
    expect(screen.getByTestId('tick-techniques-prevention')).toBeInTheDocument()
    expect(screen.getByTestId('tick-techniques-aftercare')).toBeInTheDocument()

    // Card link goes to the canonical technique page.
    const card = screen.getByTestId('tick-technique-card-permethrin-clothing')
    expect(card).toHaveAttribute('href', '/techniques/permethrin-clothing')
    // Score pip carries the 0-10 score.
    const pip = within(card).getByTestId('tick-technique-score-pip')
    expect(pip.getAttribute('data-score')).toBe('9')
  })

  it('renders the empty fallback when no buckets carry entries', () => {
    render(
      <TechniquesSection buckets={makeBuckets()} loading={false} error={null} />,
    )
    expect(screen.getByTestId('tick-techniques-fallback-link')).toHaveAttribute(
      'href',
      '/techniques',
    )
  })

  it('hides empty rails — diagnostic-only buckets do not render the prevention rail', () => {
    const buckets = makeBuckets({
      diagnostic: [
        {
          id: 9,
          slug: 'two-tier-serology',
          title: 'CDC two-tier serology',
          oneLiner: 'ELISA → Western blot.',
          kind: 'diagnostic',
          preventionScore: null,
          citations: [],
          sourceUrl: null,
        },
      ],
    })

    render(<TechniquesSection buckets={buckets} loading={false} error={null} />)
    expect(screen.getByTestId('tick-techniques-diagnostic')).toBeInTheDocument()
    expect(screen.queryByTestId('tick-techniques-prevention')).toBeNull()
    expect(screen.queryByTestId('tick-techniques-removal')).toBeNull()
  })
})
