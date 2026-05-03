import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  wildFactsLatest: vi.fn(),
  wildFactsQuery: vi.fn(),
  wildFactTicksQuery: vi.fn(),
  wildFactDiseasesQuery: vi.fn(),
  wildFactRemovalTechniquesQuery: vi.fn(),
  ticksQuery: vi.fn(),
  diseasesQuery: vi.fn(),
  removalTechniquesQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    wildFacts: {
      feed: { latest: mocks.wildFactsLatest },
      query: mocks.wildFactsQuery,
    },
    wildFactTicks: { query: mocks.wildFactTicksQuery },
    wildFactDiseases: { query: mocks.wildFactDiseasesQuery },
    wildFactRemovalTechniques: { query: mocks.wildFactRemovalTechniquesQuery },
    ticks: { query: mocks.ticksQuery },
    diseases: { query: mocks.diseasesQuery },
    removalTechniques: { query: mocks.removalTechniquesQuery },
  },
}))

import { FactsIndexPage } from '../FactsIndexPage.js'

describe('FactsIndexPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
  })

  it('renders the empty state copy when feed.latest returns 0 rows', async () => {
    mocks.wildFactsLatest.mockResolvedValue({ items: [] })
    mocks.wildFactsQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactTicksQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })

    render(<FactsIndexPage />)

    expect(
      screen.getByRole('heading', { level: 1, name: /wild facts/i }),
    ).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText(/no facts yet/i)).toBeInTheDocument()
    })
    expect(screen.queryByTestId('facts-index-list')).toBeNull()
  })

  it('renders rows when the feed returns items, with linked entity chips', async () => {
    mocks.wildFactsQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactsLatest.mockResolvedValue({
      items: [
        {
          metadata: {
            id: 1,
            slug: 'tick-saliva-numbs-the-bite',
            body: 'Tick saliva contains anesthetic-like compounds.',
            citationUrl: 'https://example.org/saliva',
          },
        },
        {
          metadata: {
            id: 2,
            slug: 'lyme-needs-36-hours',
            body: 'A blacklegged tick must be attached for 36 hours to transmit Lyme.',
            citationUrl: null,
          },
        },
      ],
    })
    mocks.wildFactTicksQuery.mockResolvedValue({
      rows: [
        { wildFactId: 1, tickId: 7 },
        { wildFactId: 2, tickId: 7 },
      ],
    })
    mocks.wildFactDiseasesQuery.mockResolvedValue({
      rows: [{ wildFactId: 2, diseaseId: 10 }],
    })
    mocks.wildFactRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({
      rows: [{ id: 7, slug: 'blacklegged-tick', commonName: 'Blacklegged tick' }],
    })
    mocks.diseasesQuery.mockResolvedValue({
      rows: [{ id: 10, slug: 'lyme-disease', displayName: 'Lyme disease' }],
    })
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })

    render(<FactsIndexPage />)

    await waitFor(() => {
      expect(screen.getAllByTestId('facts-index-row')).toHaveLength(2)
    })

    const list = await screen.findByTestId('facts-index-list')
    // First row: only the tick chip.
    const firstRow = within(list).getAllByTestId('facts-index-row')[0]!
    expect(within(firstRow).getByRole('link', { name: /tick saliva numbs the bite/i })).toHaveAttribute(
      'href',
      '/facts/tick-saliva-numbs-the-bite',
    )
    expect(within(firstRow).getByRole('link', { name: /^blacklegged tick$/i })).toHaveAttribute(
      'href',
      '/ticks/blacklegged-tick',
    )

    // Second row: tick + disease chip.
    const secondRow = within(list).getAllByTestId('facts-index-row')[1]!
    expect(within(secondRow).getByRole('link', { name: /lyme disease/i })).toHaveAttribute(
      'href',
      '/diseases/lyme-disease',
    )
  })

  it('falls back to wildFacts.query when feed.latest returns 0 items but the catalog has rows', async () => {
    mocks.wildFactsLatest.mockResolvedValue({ items: [] })
    mocks.wildFactsQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'tick-saliva-numbs-the-bite',
          body: 'Tick saliva contains anesthetic-like compounds.',
          citationUrl: null,
        },
      ],
    })
    mocks.wildFactTicksQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })

    render(<FactsIndexPage />)

    await waitFor(() => {
      expect(screen.getAllByTestId('facts-index-row')).toHaveLength(1)
    })
    expect(screen.queryByText(/no facts yet/i)).toBeNull()
  })

  it('sets the document canonical to /facts', async () => {
    mocks.wildFactsLatest.mockResolvedValue({ items: [] })
    mocks.wildFactsQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactTicksQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })

    render(<FactsIndexPage />)

    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/facts')
    })
  })
})
