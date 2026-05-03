import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  wildFactsQuery: vi.fn(),
  wildFactsRelated: vi.fn(),
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
      query: mocks.wildFactsQuery,
      feed: { relatedTo: mocks.wildFactsRelated },
    },
    wildFactTicks: { query: mocks.wildFactTicksQuery },
    wildFactDiseases: { query: mocks.wildFactDiseasesQuery },
    wildFactRemovalTechniques: { query: mocks.wildFactRemovalTechniquesQuery },
    ticks: { query: mocks.ticksQuery },
    diseases: { query: mocks.diseasesQuery },
    removalTechniques: { query: mocks.removalTechniquesQuery },
  },
}))

import { FactPage } from '../FactPage.js'

describe('FactPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  function setupHappyPath() {
    mocks.wildFactsQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'lyme-needs-36-hours',
          body: 'A blacklegged tick must usually be attached for 36+ hours to transmit Lyme.',
          citationUrl: 'https://www.cdc.gov/lyme/transmission/',
          createdAt: '2026-01-15T00:00:00Z',
          updatedAt: '2026-04-10T00:00:00Z',
        },
      ],
    })
    mocks.wildFactTicksQuery.mockResolvedValue({ rows: [{ tickId: 7 }] })
    mocks.wildFactDiseasesQuery.mockResolvedValue({ rows: [{ diseaseId: 10 }] })
    mocks.wildFactRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({
      rows: [
        {
          id: 7,
          slug: 'blacklegged-tick',
          commonName: 'Blacklegged tick',
          scientificName: 'Ixodes scapularis',
          oneLiner: null,
        },
        {
          id: 99,
          slug: 'lone-star-tick',
          commonName: 'Lone star tick',
          scientificName: 'Amblyomma americanum',
          oneLiner: null,
        },
      ],
    })
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        { id: 10, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: null },
        { id: 99, slug: 'rmsf', displayName: 'RMSF', oneLiner: null },
      ],
    })
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactsRelated.mockResolvedValue({
      items: [
        {
          metadata: {
            id: 2,
            slug: 'tick-saliva-numbs-the-bite',
            body: 'Tick saliva contains anesthetic-like compounds.',
            citationUrl: 'https://example.org/tick-saliva',
          },
        },
      ],
    })
  }

  it('renders the loading state while wildFacts.query resolves', () => {
    mocks.wildFactsQuery.mockReturnValue(new Promise(() => {})) // never settles
    mocks.wildFactTicksQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactsRelated.mockResolvedValue({ items: [] })

    render(<FactPage slug="any" />)
    expect(screen.getByText(/loading fact/i)).toBeInTheDocument()
  })

  it('renders the not-found state for an unknown slug', async () => {
    mocks.wildFactsQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactTicksQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactsRelated.mockResolvedValue({ items: [] })

    render(<FactPage slug="not-a-fact" />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /fact not found/i })).toBeInTheDocument()
    })
  })

  it('renders the hero, refs sidebar, citation chip, and related rail on success', async () => {
    setupHappyPath()
    render(<FactPage slug="lyme-needs-36-hours" />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /lyme needs 36 hours/i }),
      ).toBeInTheDocument()
    })

    // Body
    expect(
      screen.getByText(/blacklegged tick must usually be attached/i),
    ).toBeInTheDocument()

    // Citation chip
    const citation = await screen.findByTestId('fact-citation')
    expect(citation).toHaveAttribute('href', 'https://www.cdc.gov/lyme/transmission/')
    expect(citation).toHaveAttribute('target', '_blank')
    expect(citation).toHaveAttribute('rel', expect.stringContaining('noreferrer'))

    // Refs — only the linked tick + disease, not the others.
    const refs = await screen.findByTestId('fact-refs')
    await waitFor(() => {
      expect(within(refs).getByRole('link', { name: /blacklegged tick/i })).toHaveAttribute(
        'href',
        '/ticks/blacklegged-tick',
      )
    })
    expect(within(refs).getByRole('link', { name: /lyme disease/i })).toHaveAttribute(
      'href',
      '/diseases/lyme-disease',
    )
    expect(within(refs).queryByRole('link', { name: /lone star tick/i })).toBeNull()
    expect(within(refs).queryByText(/techniques · /i)).toBeNull()

    // Related rail — one card.
    const related = await screen.findByTestId('fact-related')
    expect(within(related).getAllByTestId('fact-related-card')).toHaveLength(1)
    expect(within(related).getByRole('link')).toHaveAttribute(
      'href',
      '/facts/tick-saliva-numbs-the-bite',
    )
  })

  it('sets the document title and canonical link from the loaded fact', async () => {
    setupHappyPath()
    render(<FactPage slug="lyme-needs-36-hours" />)

    await waitFor(() => {
      expect(document.title).toBe('Lyme Needs 36 Hours — Wild facts | Tickpedia')
    })
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/facts/lyme-needs-36-hours')
  })

  it('hides the related rail when relatedTo returns 0 items', async () => {
    setupHappyPath()
    mocks.wildFactsRelated.mockResolvedValue({ items: [] })

    render(<FactPage slug="lyme-needs-36-hours" />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /lyme needs 36 hours/i }),
      ).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByTestId('fact-related')).toBeNull()
    })
  })

  it('hides empty ref groups but keeps the refs sidebar', async () => {
    setupHappyPath()
    mocks.wildFactTicksQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactRemovalTechniquesQuery.mockResolvedValue({ rows: [] })

    render(<FactPage slug="lyme-needs-36-hours" />)

    const refs = await screen.findByTestId('fact-refs')
    await waitFor(() => {
      expect(within(refs).getByText(/no entity references yet/i)).toBeInTheDocument()
    })
  })
})
