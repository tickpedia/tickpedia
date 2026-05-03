import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

// Mock the Beam client at the module boundary so the page's three
// data hooks resolve against fixtures instead of the network. Keeps
// the test deterministic + free of API keys.
//
// `vi.hoisted` is required because `vi.mock` is itself hoisted above
// every top-level statement; top-level vi.fn()s can't be referenced
// from inside the mock factory without it.

const mocks = vi.hoisted(() => ({
  ticksQuery: vi.fn(),
  tickCountyByState: vi.fn(),
  tickCountySpread: vi.fn(),
  tickDiseasesQuery: vi.fn(),
  diseasesQuery: vi.fn(),
  wildFactTicksQuery: vi.fn(),
  wildFactsQuery: vi.fn(),
  tickRemovalTechniquesQuery: vi.fn(),
  removalTechniquesQuery: vi.fn(),
  tickPathogensQuery: vi.fn(),
  pathogensQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    ticks: { query: mocks.ticksQuery },
    tickCounty: {
      analyze: {
        establishedByState: mocks.tickCountyByState,
        spreadOverTime: mocks.tickCountySpread,
      },
    },
    tickDiseases: { query: mocks.tickDiseasesQuery },
    diseases: { query: mocks.diseasesQuery },
    wildFactTicks: { query: mocks.wildFactTicksQuery },
    wildFacts: { query: mocks.wildFactsQuery },
    tickRemovalTechniques: { query: mocks.tickRemovalTechniquesQuery },
    removalTechniques: { query: mocks.removalTechniquesQuery },
    tickPathogens: { query: mocks.tickPathogensQuery },
    pathogens: { query: mocks.pathogensQuery },
  },
}))

const {
  ticksQuery,
  tickCountyByState,
  tickCountySpread,
  tickDiseasesQuery,
  diseasesQuery,
  wildFactTicksQuery,
  wildFactsQuery,
  tickRemovalTechniquesQuery,
  removalTechniquesQuery,
  tickPathogensQuery,
  pathogensQuery,
} = mocks

import { TickPage } from '../TickPage.js'

describe('TickPage', () => {
  beforeEach(() => {
    ticksQuery.mockReset()
    tickCountyByState.mockReset()
    tickCountySpread.mockReset()
    tickDiseasesQuery.mockReset()
    diseasesQuery.mockReset()
    wildFactTicksQuery.mockReset()
    wildFactsQuery.mockReset()
    wildFactTicksQuery.mockResolvedValue({ rows: [] })
    wildFactsQuery.mockResolvedValue({ rows: [] })
    tickRemovalTechniquesQuery.mockReset()
    removalTechniquesQuery.mockReset()
    tickRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    removalTechniquesQuery.mockResolvedValue({ rows: [] })
    tickPathogensQuery.mockReset()
    pathogensQuery.mockReset()
    tickPathogensQuery.mockResolvedValue({ rows: [] })
    pathogensQuery.mockResolvedValue({ rows: [] })
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  it('renders the loading state while ticks.query resolves', () => {
    ticksQuery.mockReturnValue(new Promise(() => {})) // never settles
    tickCountyByState.mockResolvedValue({ buckets: [] })
    tickCountySpread.mockResolvedValue({ buckets: [] })
    tickDiseasesQuery.mockResolvedValue({ rows: [] })
    diseasesQuery.mockResolvedValue({ rows: [] })

    render(<TickPage slug="blacklegged-tick" />)
    expect(screen.getByText(/loading tick/i)).toBeInTheDocument()
  })

  it('renders the not-found state when ticks.query returns no rows', async () => {
    ticksQuery.mockResolvedValue({ rows: [] })
    tickCountyByState.mockResolvedValue({ buckets: [] })
    tickCountySpread.mockResolvedValue({ buckets: [] })
    tickDiseasesQuery.mockResolvedValue({ rows: [] })
    diseasesQuery.mockResolvedValue({ rows: [] })

    render(<TickPage slug="not-a-real-tick" />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tick not found/i })).toBeInTheDocument()
    })
    expect(screen.getByText(/not-a-real-tick/)).toBeInTheDocument()
  })

  it('renders the hero, range section, and diseases table on success', async () => {
    ticksQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'blacklegged-tick',
          commonName: 'Blacklegged tick',
          scientificName: 'Ixodes scapularis',
          oneLiner: 'Principal vector of Lyme disease in the eastern US.',
          heroPhotoUrl: null,
          heroHeadColor: '#1c1814',
          heroBodyColor: '#8a2a1a',
          heroLegColor: '#1c1814',
          dangerLevel: 'high',
        },
      ],
    })
    tickCountyByState.mockResolvedValue({
      buckets: [
        { dims: { stateFips: '25' }, measures: { counties: 14 } },
        { dims: { stateFips: '23' }, measures: { counties: 16 } },
      ],
    })
    tickCountySpread.mockResolvedValue({
      buckets: [
        { dims: { year: 2020 }, measures: { counties: 100 } },
        { dims: { year: 2021 }, measures: { counties: 110 } },
      ],
    })
    tickDiseasesQuery.mockResolvedValue({
      rows: [{ diseaseId: 1 }, { diseaseId: 2 }],
    })
    diseasesQuery.mockResolvedValue({
      rows: [
        { id: 1, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'A bacterial infection.' },
        { id: 2, slug: 'anaplasmosis', displayName: 'Anaplasmosis', oneLiner: null },
        { id: 3, slug: 'rmsf', displayName: 'RMSF', oneLiner: null }, // not carried — should be filtered out
      ],
    })

    render(<TickPage slug="blacklegged-tick" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /blacklegged tick/i })).toBeInTheDocument()
    })

    expect(screen.getByText(/Ixodes scapularis/)).toBeInTheDocument()
    expect(screen.getByText(/principal vector of lyme/i)).toBeInTheDocument()
    // "High danger" appears in both the chip and the Stat sidebar.
    expect(screen.getAllByText(/high danger/i).length).toBeGreaterThanOrEqual(1)

    // Wait for the diseases section to populate — it depends on the
    // tick row loading first, so it lands a tick after the H1.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /lyme disease/i })).toBeInTheDocument()
    })

    // Diseases table — RMSF must NOT appear.
    expect(screen.getByRole('link', { name: /anaplasmosis/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^rmsf$/i })).toBeNull()

    // Disease links point at the canonical disease URLs.
    expect(screen.getByRole('link', { name: /lyme disease/i })).toHaveAttribute(
      'href',
      '/diseases/lyme-disease',
    )
  })

  it('sets the document title and canonical link from the loaded tick', async () => {
    ticksQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'blacklegged-tick',
          commonName: 'Blacklegged tick',
          scientificName: 'Ixodes scapularis',
          oneLiner: 'Vector of Lyme.',
          heroPhotoUrl: null,
          heroHeadColor: null,
          heroBodyColor: null,
          heroLegColor: null,
          dangerLevel: 'high',
        },
      ],
    })
    tickCountyByState.mockResolvedValue({ buckets: [] })
    tickCountySpread.mockResolvedValue({ buckets: [] })
    tickDiseasesQuery.mockResolvedValue({ rows: [] })
    diseasesQuery.mockResolvedValue({ rows: [] })

    render(<TickPage slug="blacklegged-tick" />)

    await waitFor(() => {
      expect(document.title).toBe('Blacklegged tick — Ticks | Tickpedia')
    })
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/ticks/blacklegged-tick')
    expect(
      document.head.querySelector('meta[name="description"]')?.getAttribute('content'),
    ).toBe('Vector of Lyme.')
  })

  it('renders a link to the /range sub-page', async () => {
    ticksQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'blacklegged-tick',
          commonName: 'Blacklegged tick',
          scientificName: 'Ixodes scapularis',
          oneLiner: 'x',
          heroPhotoUrl: null,
          heroHeadColor: null,
          heroBodyColor: null,
          heroLegColor: null,
          dangerLevel: 'high',
        },
      ],
    })
    tickCountyByState.mockResolvedValue({ buckets: [] })
    tickCountySpread.mockResolvedValue({ buckets: [] })
    tickDiseasesQuery.mockResolvedValue({ rows: [] })
    diseasesQuery.mockResolvedValue({ rows: [] })

    render(<TickPage slug="blacklegged-tick" />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /open full range/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /open full range/i })).toHaveAttribute(
      'href',
      '/ticks/blacklegged-tick/range',
    )
  })
})
