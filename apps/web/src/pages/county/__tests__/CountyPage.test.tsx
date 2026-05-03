import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  statesQuery: vi.fn(),
  countiesQuery: vi.fn(),
  casesByYear: vi.fn(),
  diseasesQuery: vi.fn(),
  tickCountyQuery: vi.fn(),
  ticksQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    states: { query: mocks.statesQuery },
    counties: { query: mocks.countiesQuery },
    diseaseCountyYear: {
      analyze: { casesByYear: mocks.casesByYear },
    },
    diseases: { query: mocks.diseasesQuery },
    tickCounty: { query: mocks.tickCountyQuery },
    ticks: { query: mocks.ticksQuery },
  },
}))

import { CountyPage } from '../CountyPage.js'

describe('CountyPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  function setupHappyPath() {
    mocks.statesQuery.mockImplementation((opts) => {
      // First call: by slug. Second call (neighbours): all states.
      if (opts?.where?.slug) {
        return Promise.resolve({
          rows: [{ fips: '23', code: 'ME', slug: 'maine', name: 'Maine' }],
        })
      }
      return Promise.resolve({
        rows: [
          { fips: '23', code: 'ME', slug: 'maine', name: 'Maine' },
          { fips: '33', code: 'NH', slug: 'new-hampshire', name: 'New Hampshire' },
        ],
      })
    })
    mocks.countiesQuery.mockImplementation((opts) => {
      // First call: by (slug, stateFips). Subsequent: pool.
      if (opts?.where?.slug && opts?.where?.stateFips) {
        return Promise.resolve({
          rows: [{
            fips: '23005',
            slug: 'cumberland',
            stateFips: '23',
            countyName: 'Cumberland',
            latitude: 43.94,
            longitude: -70.24,
          }],
        })
      }
      return Promise.resolve({
        rows: [
          { fips: '23005', slug: 'cumberland', stateFips: '23', countyName: 'Cumberland', latitude: 43.94, longitude: -70.24 },
          { fips: '23031', slug: 'york', stateFips: '23', countyName: 'York', latitude: 43.40, longitude: -70.65 },
          { fips: '33015', slug: 'rockingham', stateFips: '33', countyName: 'Rockingham', latitude: 42.99, longitude: -71.13 },
        ],
      })
    })
    mocks.casesByYear.mockResolvedValue({
      buckets: [
        { dims: { diseaseId: 10, year: 2024 }, measures: { total: 412, counties: 1 } },
        { dims: { diseaseId: 10, year: 2023 }, measures: { total: 380, counties: 1 } },
        { dims: { diseaseId: 11, year: 2024 }, measures: { total: 18, counties: 1 } },
      ],
    })
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        { id: 10, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: null },
        { id: 11, slug: 'anaplasmosis', displayName: 'Anaplasmosis', oneLiner: null },
        // Not in the casesByYear results for this county — filtered out.
        { id: 99, slug: 'rmsf', displayName: 'RMSF', oneLiner: null },
      ],
    })
    mocks.tickCountyQuery.mockResolvedValue({
      rows: [
        { tickId: 1, status: 'established', year: 1989 },
        { tickId: 2, status: 'reported', year: 2003 },
      ],
    })
    mocks.ticksQuery.mockResolvedValue({
      rows: [
        { id: 1, slug: 'blacklegged-tick', commonName: 'Blacklegged tick', scientificName: 'Ixodes scapularis', oneLiner: null },
        { id: 2, slug: 'woodchuck-tick', commonName: 'Woodchuck tick', scientificName: 'Ixodes cookei', oneLiner: null },
        { id: 99, slug: 'lone-star-tick', commonName: 'Lone star tick', scientificName: 'Amblyomma americanum', oneLiner: null },
      ],
    })
  }

  it('renders the loading state while states.query resolves', () => {
    mocks.statesQuery.mockReturnValue(new Promise(() => {}))
    mocks.countiesQuery.mockResolvedValue({ rows: [] })
    mocks.casesByYear.mockResolvedValue({ buckets: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.tickCountyQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })

    render(<CountyPage stateSlug="maine" countySlug="cumberland" />)
    expect(screen.getByText(/loading county/i)).toBeInTheDocument()
  })

  it('renders the not-found state when the parent state is unknown', async () => {
    mocks.statesQuery.mockResolvedValue({ rows: [] })
    mocks.countiesQuery.mockResolvedValue({ rows: [] })
    mocks.casesByYear.mockResolvedValue({ buckets: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.tickCountyQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })

    render(<CountyPage stateSlug="not-a-state" countySlug="anything" />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /county not found/i })).toBeInTheDocument()
    })
  })

  it('renders the hero, disease bars, ticks rail, and neighbours on success', async () => {
    setupHappyPath()
    render(<CountyPage stateSlug="maine" countySlug="cumberland" />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /cumberland county/i }),
      ).toBeInTheDocument()
    })

    // Hero parent-state link (also appears in breadcrumb — assert both
    // point at /states/maine).
    const maineLinks = screen.getAllByRole('link', { name: /^maine$/i })
    expect(maineLinks.length).toBeGreaterThanOrEqual(2)
    for (const link of maineLinks) {
      expect(link).toHaveAttribute('href', '/states/maine')
    }

    // Disease bars
    const diseaseSection = await screen.findByTestId('county-diseases')
    await waitFor(() => {
      expect(within(diseaseSection).getByRole('link', { name: /lyme disease/i })).toHaveAttribute(
        'href',
        '/diseases/lyme-disease',
      )
    })
    expect(within(diseaseSection).getByText(/792/)).toBeInTheDocument() // 412 + 380 = 792

    // Tick rail — only the two associated ticks.
    const tickSection = await screen.findByTestId('county-ticks')
    await waitFor(() => {
      expect(within(tickSection).getByRole('link', { name: /blacklegged tick/i })).toHaveAttribute(
        'href',
        '/ticks/blacklegged-tick',
      )
    })
    expect(within(tickSection).queryByRole('link', { name: /lone star tick/i })).toBeNull()

    // Neighbours sidebar
    const neighbours = await screen.findByTestId('county-neighbours')
    await waitFor(() => {
      const yorkLinks = within(neighbours).queryAllByRole('link', { name: /york/i })
      expect(yorkLinks.length).toBeGreaterThan(0)
    })
  })

  it('sets the document title and canonical link from the loaded county', async () => {
    setupHappyPath()
    render(<CountyPage stateSlug="maine" countySlug="cumberland" />)

    await waitFor(() => {
      expect(document.title).toBe('Cumberland County — Maine | Tickpedia')
    })
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/counties/maine/cumberland')
  })
})
