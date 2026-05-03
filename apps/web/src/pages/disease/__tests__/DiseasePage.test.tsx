import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  diseasesQuery: vi.fn(),
  casesByState: vi.fn(),
  casesByYear: vi.fn(),
  seasonality: vi.fn(),
  tickDiseasesQuery: vi.fn(),
  ticksQuery: vi.fn(),
  diseasePathogensQuery: vi.fn(),
  pathogensQuery: vi.fn(),
  wildFactDiseasesQuery: vi.fn(),
  wildFactsQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    diseases: { query: mocks.diseasesQuery },
    diseaseCountyYear: {
      analyze: {
        casesByState: mocks.casesByState,
        casesByYear: mocks.casesByYear,
      },
    },
    diseaseMonth: { analyze: { seasonality: mocks.seasonality } },
    tickDiseases: { query: mocks.tickDiseasesQuery },
    ticks: { query: mocks.ticksQuery },
    diseasePathogens: { query: mocks.diseasePathogensQuery },
    pathogens: { query: mocks.pathogensQuery },
    wildFactDiseases: { query: mocks.wildFactDiseasesQuery },
    wildFacts: { query: mocks.wildFactsQuery },
  },
}))

import { DiseasePage } from '../DiseasePage.js'

describe('DiseasePage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    mocks.wildFactDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.wildFactsQuery.mockResolvedValue({ rows: [] })
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  function setupHappyPath() {
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'lyme-disease',
          displayName: 'Lyme disease',
          oneLiner: 'A bacterial infection from blacklegged ticks.',
          aliases: ['borreliosis'],
        },
      ],
    })
    mocks.casesByState.mockResolvedValue({
      buckets: [
        { dims: { stateFips: '23' }, measures: { total: 500 } },  // ME
        { dims: { stateFips: '36' }, measures: { total: 300 } },  // NY
        { dims: { stateFips: '25' }, measures: { total: 200 } },  // MA
      ],
    })
    mocks.casesByYear.mockResolvedValue({
      buckets: [
        { dims: { year: 2022 }, measures: { total: 400, counties: 50 } },
        { dims: { year: 2023 }, measures: { total: 600, counties: 60 } },
      ],
    })
    mocks.seasonality.mockResolvedValue({
      buckets: [
        { dims: { month: 6 }, measures: { total: 120 } },
        { dims: { month: 7 }, measures: { total: 350 } }, // peak
        { dims: { month: 8 }, measures: { total: 80 } },
      ],
    })
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [{ tickId: 1 }, { tickId: 2 }] })
    mocks.ticksQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'blacklegged-tick',
          commonName: 'Blacklegged tick',
          scientificName: 'Ixodes scapularis',
          oneLiner: 'Vector of Lyme.',
        },
        {
          id: 2,
          slug: 'western-blacklegged-tick',
          commonName: 'Western blacklegged tick',
          scientificName: 'Ixodes pacificus',
          oneLiner: null,
        },
        // Not associated with this disease — should be filtered out.
        {
          id: 99,
          slug: 'lone-star-tick',
          commonName: 'Lone star tick',
          scientificName: 'Amblyomma americanum',
          oneLiner: null,
        },
      ],
    })
    mocks.diseasePathogensQuery.mockResolvedValue({ rows: [{ pathogenId: 10 }] })
    mocks.pathogensQuery.mockResolvedValue({
      rows: [
        {
          id: 10,
          slug: 'borrelia-burgdorferi',
          displayName: 'Borrelia burgdorferi',
          scientificName: 'Borrelia burgdorferi',
          oneLiner: 'The Lyme disease bacterium.',
        },
      ],
    })
  }

  it('renders the loading state while diseases.query resolves', () => {
    mocks.diseasesQuery.mockReturnValue(new Promise(() => {})) // never settles
    mocks.casesByState.mockResolvedValue({ buckets: [] })
    mocks.casesByYear.mockResolvedValue({ buckets: [] })
    mocks.seasonality.mockResolvedValue({ buckets: [] })
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasePathogensQuery.mockResolvedValue({ rows: [] })
    mocks.pathogensQuery.mockResolvedValue({ rows: [] })

    render(<DiseasePage slug="lyme-disease" />)
    expect(screen.getByText(/loading disease/i)).toBeInTheDocument()
  })

  it('renders the not-found state for an unknown slug', async () => {
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.casesByState.mockResolvedValue({ buckets: [] })
    mocks.casesByYear.mockResolvedValue({ buckets: [] })
    mocks.seasonality.mockResolvedValue({ buckets: [] })
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasePathogensQuery.mockResolvedValue({ rows: [] })
    mocks.pathogensQuery.mockResolvedValue({ rows: [] })

    render(<DiseasePage slug="not-a-disease" />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /disease not found/i })).toBeInTheDocument()
    })
  })

  it('renders the hero and the cross-link rails on success', async () => {
    setupHappyPath()
    render(<DiseasePage slug="lyme-disease" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /lyme disease/i })).toBeInTheDocument()
    })

    // Hero chips load alongside the per-section data hooks; wait for
    // the cases chip then assert the rest in the same render cycle.
    await waitFor(() => {
      expect(screen.getByText(/cases · 1,000/i)).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /carried by 2 ticks/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('link', { name: /peak · july/i })).toBeInTheDocument()
    // The risk CTA appears both in the hero chip and the dedicated
    // chart-CTA card; assert both point at /risk/[slug].
    const riskLinks = screen.getAllByRole('link', { name: /view risk map/i })
    expect(riskLinks.length).toBeGreaterThanOrEqual(2)
    for (const link of riskLinks) {
      expect(link).toHaveAttribute('href', '/risk/lyme-disease')
    }
    // RiskCtaSection — flagship card.
    const cta = within(screen.getByTestId('disease-risk-cta'))
    expect(cta.getByText(/where lyme disease hits hardest/i)).toBeInTheDocument()

    // Tick rail — links out to /ticks/[slug] for every carrying tick,
    // and excludes ticks not linked.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^blacklegged tick$/i })).toHaveAttribute(
        'href',
        '/ticks/blacklegged-tick',
      )
    })
    expect(screen.getByRole('link', { name: /^western blacklegged tick$/i })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /^lone star tick$/i })).toBeNull()

    // Pathogen rail — link to /pathogens/[slug] (alias-stub ok until 5b).
    expect(screen.getByRole('link', { name: /borrelia burgdorferi/i })).toHaveAttribute(
      'href',
      '/pathogens/borrelia-burgdorferi',
    )

    // States choropleth + leaderboard
    expect(screen.getByTestId('disease-states')).toBeInTheDocument()
    // "Maine" appears in multiple slots (leaderboard row, hero stat
    // sub-text). Asserting at least one match keeps the test stable
    // as the page evolves.
    expect(screen.getAllByText(/maine/i).length).toBeGreaterThan(0)
  })

  it('sets the document title and canonical link from the loaded disease', async () => {
    setupHappyPath()
    render(<DiseasePage slug="lyme-disease" />)

    await waitFor(() => {
      expect(document.title).toBe('Lyme disease — Diseases | Tickpedia')
    })
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/diseases/lyme-disease')
  })

  it('hides the peak chip when seasonality is too flat', async () => {
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'lyme-disease',
          displayName: 'Lyme disease',
          oneLiner: null,
          aliases: null,
        },
      ],
    })
    mocks.casesByState.mockResolvedValue({ buckets: [] })
    mocks.casesByYear.mockResolvedValue({ buckets: [] })
    // Roughly even distribution across all months — no peak should
    // surface.
    mocks.seasonality.mockResolvedValue({
      buckets: Array.from({ length: 12 }, (_, i) => ({
        dims: { month: i + 1 },
        measures: { total: 100 },
      })),
    })
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasePathogensQuery.mockResolvedValue({ rows: [] })
    mocks.pathogensQuery.mockResolvedValue({ rows: [] })

    render(<DiseasePage slug="lyme-disease" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /lyme disease/i })).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: /peak ·/i })).toBeNull()
  })
})
