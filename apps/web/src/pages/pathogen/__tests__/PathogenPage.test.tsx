import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  pathogensQuery: vi.fn(),
  pathogenCountyQuery: vi.fn(),
  tickPathogensQuery: vi.fn(),
  ticksQuery: vi.fn(),
  diseasePathogensQuery: vi.fn(),
  diseasesQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    pathogens: { query: mocks.pathogensQuery },
    pathogenCounty: { query: mocks.pathogenCountyQuery },
    tickPathogens: { query: mocks.tickPathogensQuery },
    ticks: { query: mocks.ticksQuery },
    diseasePathogens: { query: mocks.diseasePathogensQuery },
    diseases: { query: mocks.diseasesQuery },
  },
}))

import { PathogenPage } from '../PathogenPage.js'

describe('PathogenPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  function setupHappyPath() {
    mocks.pathogensQuery.mockResolvedValue({
      rows: [
        {
          id: 10,
          slug: 'borrelia-burgdorferi',
          displayName: 'Borrelia burgdorferi',
          scientificName: 'Borrelia burgdorferi sensu stricto',
          oneLiner: 'The Lyme disease spirochete.',
          aliases: null,
        },
      ],
    })
    mocks.pathogenCountyQuery.mockResolvedValue({
      rows: [
        { countyFips: '23005', year: 2022 },
        { countyFips: '23001', year: 2023 },
        { countyFips: '36001', year: 2023 },
      ],
    })
    mocks.tickPathogensQuery.mockResolvedValue({ rows: [{ tickId: 1 }, { tickId: 2 }] })
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
        // Not associated — should be filtered out.
        {
          id: 99,
          slug: 'lone-star-tick',
          commonName: 'Lone star tick',
          scientificName: 'Amblyomma americanum',
          oneLiner: null,
        },
      ],
    })
    mocks.diseasePathogensQuery.mockResolvedValue({ rows: [{ diseaseId: 1 }] })
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        { id: 1, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'A bacterial infection.' },
        { id: 2, slug: 'rmsf', displayName: 'RMSF', oneLiner: null },
      ],
    })
  }

  it('renders the loading state while pathogens.query resolves', () => {
    mocks.pathogensQuery.mockReturnValue(new Promise(() => {}))
    mocks.pathogenCountyQuery.mockResolvedValue({ rows: [] })
    mocks.tickPathogensQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasePathogensQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })

    render(<PathogenPage slug="borrelia-burgdorferi" />)
    expect(screen.getByText(/loading pathogen/i)).toBeInTheDocument()
  })

  it('renders the not-found state for an unknown slug', async () => {
    mocks.pathogensQuery.mockResolvedValue({ rows: [] })
    mocks.pathogenCountyQuery.mockResolvedValue({ rows: [] })
    mocks.tickPathogensQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.diseasePathogensQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })

    render(<PathogenPage slug="not-a-real-pathogen" />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /pathogen not found/i })).toBeInTheDocument()
    })
  })

  it('renders the hero, range section, and cross-link rails on success', async () => {
    setupHappyPath()
    render(<PathogenPage slug="borrelia-burgdorferi" />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /borrelia burgdorferi/i })).toBeInTheDocument()
    })

    // Tick rail — links carry their canonical URLs and exclude unrelated ticks.
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^blacklegged tick$/i })).toHaveAttribute(
        'href',
        '/ticks/blacklegged-tick',
      )
    })
    expect(screen.queryByRole('link', { name: /^lone star tick$/i })).toBeNull()

    // Disease rail — RMSF is not linked to this pathogen, so only Lyme appears.
    // Scope the lookup to the diseases section so the risk-rail CTA
    // ("Where Lyme disease hits hardest →") doesn't collide with the
    // disease row link.
    const diseasesSection = screen.getByTestId('pathogen-diseases')
    expect(within(diseasesSection).getByRole('link', { name: /lyme disease/i })).toHaveAttribute(
      'href',
      '/diseases/lyme-disease',
    )
    expect(within(diseasesSection).queryByRole('link', { name: /^rmsf$/i })).toBeNull()

    // Range section
    expect(screen.getByTestId('pathogen-range')).toBeInTheDocument()
  })

  it('sets the document title and canonical link from the loaded pathogen', async () => {
    setupHappyPath()
    render(<PathogenPage slug="borrelia-burgdorferi" />)

    await waitFor(() => {
      expect(document.title).toBe('Borrelia burgdorferi — Pathogens | Tickpedia')
    })
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/pathogens/borrelia-burgdorferi')
  })
})
