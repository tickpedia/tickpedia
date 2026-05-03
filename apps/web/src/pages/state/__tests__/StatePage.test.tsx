import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  statesQuery: vi.fn(),
  establishedByState: vi.fn(),
  ticksQuery: vi.fn(),
  casesByState: vi.fn(),
  diseasesQuery: vi.fn(),
  countiesQuery: vi.fn(),
  countyHotspots: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    states: { query: mocks.statesQuery },
    tickCounty: {
      analyze: {
        establishedByState: mocks.establishedByState,
      },
    },
    ticks: { query: mocks.ticksQuery },
    diseaseCountyYear: {
      analyze: {
        casesByState: mocks.casesByState,
        countyHotspots: mocks.countyHotspots,
      },
    },
    diseases: { query: mocks.diseasesQuery },
    counties: { query: mocks.countiesQuery },
  },
}))

import { StatePage } from '../StatePage.js'

describe('StatePage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  function setupHappyPath() {
    mocks.statesQuery.mockResolvedValue({
      rows: [{ fips: '23', code: 'ME', slug: 'maine', name: 'Maine' }],
    })
    // tickCounty.establishedByState returns (tickId, stateFips, counties)
    // buckets — the rollup helper filters to this state and derives
    // a prevalence chip from the county count (≥30 high, 10–29 mod,
    // 1–9 low).
    mocks.establishedByState.mockResolvedValue({
      buckets: [
        { dims: { tickId: 1, stateFips: '23' }, measures: { counties: 14 } },
        { dims: { tickId: 2, stateFips: '23' }, measures: { counties: 5 } },
        // A different state — must be filtered out client-side.
        { dims: { tickId: 99, stateFips: '36' }, measures: { counties: 30 } },
      ],
    })
    mocks.ticksQuery.mockResolvedValue({
      rows: [
        { id: 1, slug: 'blacklegged-tick', commonName: 'Blacklegged tick', scientificName: 'Ixodes scapularis', oneLiner: 'Vector of Lyme.' },
        { id: 2, slug: 'american-dog-tick', commonName: 'American dog tick', scientificName: 'Dermacentor variabilis', oneLiner: null },
        // Not associated with this state — should be filtered out.
        { id: 99, slug: 'lone-star-tick', commonName: 'Lone star tick', scientificName: 'Amblyomma americanum', oneLiner: null },
      ],
    })
    mocks.casesByState.mockResolvedValue({
      buckets: [
        { dims: { diseaseId: 10, stateFips: '23' }, measures: { total: 2318, counties: 16, yearsCovered: 9 } },
        { dims: { diseaseId: 11, stateFips: '23' }, measures: { total: 50, counties: 4, yearsCovered: 6 } },
        // A different state — must be filtered out client-side.
        { dims: { diseaseId: 10, stateFips: '36' }, measures: { total: 9999, counties: 30, yearsCovered: 9 } },
      ],
    })
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        { id: 10, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'A bacterial infection.' },
        { id: 11, slug: 'anaplasmosis', displayName: 'Anaplasmosis', oneLiner: null },
        { id: 99, slug: 'rmsf', displayName: 'RMSF', oneLiner: null },
      ],
    })
    mocks.countiesQuery.mockResolvedValue({
      rows: [
        { fips: '23001', slug: 'androscoggin', countyName: 'Androscoggin' },
        { fips: '23005', slug: 'cumberland', countyName: 'Cumberland' },
        { fips: '23031', slug: 'york', countyName: 'York' },
      ],
    })
    mocks.countyHotspots.mockResolvedValue({
      buckets: [
        { dims: { countyName: 'Cumberland', countyFips: '23005', stateFips: '23' }, measures: { total: 412, mostRecentYear: 2024, diseases: 4 } },
        { dims: { countyName: 'York', countyFips: '23031', stateFips: '23' }, measures: { total: 389, mostRecentYear: 2024, diseases: 4 } },
      ],
    })
  }

  it('renders the loading state while states.query resolves', () => {
    mocks.statesQuery.mockReturnValue(new Promise(() => {}))
    mocks.establishedByState.mockResolvedValue({ buckets: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.casesByState.mockResolvedValue({ buckets: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.countiesQuery.mockResolvedValue({ rows: [] })
    mocks.countyHotspots.mockResolvedValue({ buckets: [] })

    render(<StatePage slug="maine" />)
    expect(screen.getByText(/loading state/i)).toBeInTheDocument()
  })

  it('renders the not-found state for an unknown slug', async () => {
    mocks.statesQuery.mockResolvedValue({ rows: [] })
    mocks.establishedByState.mockResolvedValue({ buckets: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.casesByState.mockResolvedValue({ buckets: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.countiesQuery.mockResolvedValue({ rows: [] })
    mocks.countyHotspots.mockResolvedValue({ buckets: [] })

    render(<StatePage slug="not-a-state" />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /state not found/i })).toBeInTheDocument()
    })
  })

  it('renders the hero, ticks rail, diseases table, and worst-counties leaderboard on success', async () => {
    setupHappyPath()
    render(<StatePage slug="maine" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /^maine$/i })).toBeInTheDocument()
    })

    // Hero chips
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /established · 2 ticks/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /top disease · lyme disease/i })).toHaveAttribute(
      'href',
      '/diseases/lyme-disease',
    )
    expect(screen.getByRole('link', { name: /counties · 3/i })).toHaveAttribute(
      'href',
      '/states/maine/counties',
    )

    // Ticks rail — only the two state-associated ticks.
    const ticksSection = await screen.findByTestId('state-ticks')
    await waitFor(() => {
      expect(within(ticksSection).getByRole('link', { name: /blacklegged tick/i })).toHaveAttribute(
        'href',
        '/ticks/blacklegged-tick',
      )
    })
    expect(within(ticksSection).queryByRole('link', { name: /lone star tick/i })).toBeNull()

    // Diseases table
    const diseasesTable = await screen.findByTestId('state-diseases-table')
    await waitFor(() => {
      expect(within(diseasesTable).getByRole('link', { name: /lyme disease/i })).toBeInTheDocument()
    })
    expect(within(diseasesTable).getByText(/2,318/)).toBeInTheDocument()

    // Hotspots leaderboard
    const hotspotsTable = await screen.findByTestId('state-county-hotspots-table')
    await waitFor(() => {
      expect(within(hotspotsTable).getByRole('link', { name: /cumberland/i })).toHaveAttribute(
        'href',
        '/counties/maine/cumberland',
      )
    })
    expect(within(hotspotsTable).getByText(/412/)).toBeInTheDocument()
  })

  it('sets the document title and canonical link from the loaded state', async () => {
    setupHappyPath()
    render(<StatePage slug="maine" />)

    await waitFor(() => {
      expect(document.title).toBe('Maine — States | Tickpedia')
    })
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/states/maine')
  })
})
