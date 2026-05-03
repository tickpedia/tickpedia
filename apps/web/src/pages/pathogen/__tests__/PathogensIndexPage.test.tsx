import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  pathogensQuery: vi.fn(),
  ticksPerPathogen: vi.fn(),
  diseasesPerPathogen: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    pathogens: { query: mocks.pathogensQuery },
    tickPathogens: { analyze: { ticksPerPathogen: mocks.ticksPerPathogen } },
    diseasePathogens: { analyze: { diseasesPerPathogen: mocks.diseasesPerPathogen } },
  },
}))

import {
  PathogensIndexPage,
  sortRows,
} from '../PathogensIndexPage.js'
import type { PathogenIndexRow } from '../data/usePathogensIndex.js'

describe('PathogensIndexPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
  })

  it('renders rows with /pathogens/[slug] links and counts', async () => {
    mocks.pathogensQuery.mockResolvedValue({
      rows: [
        { id: 1, slug: 'borrelia-burgdorferi', displayName: 'Borrelia burgdorferi', scientificName: 'Borrelia burgdorferi', oneLiner: 'Lyme spirochete.' },
        { id: 2, slug: 'anaplasma-phagocytophilum', displayName: 'Anaplasma phagocytophilum', scientificName: 'A. phagocytophilum', oneLiner: null },
      ],
    })
    mocks.ticksPerPathogen.mockResolvedValue({
      buckets: [
        { dims: { pathogenId: 1 }, measures: { count: 2 } },
        { dims: { pathogenId: 2 }, measures: { count: 1 } },
      ],
    })
    mocks.diseasesPerPathogen.mockResolvedValue({
      buckets: [
        { dims: { pathogenId: 1 }, measures: { count: 1 } },
        { dims: { pathogenId: 2 }, measures: { count: 1 } },
      ],
    })

    render(<PathogensIndexPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /borrelia burgdorferi/i })).toHaveAttribute(
        'href',
        '/pathogens/borrelia-burgdorferi',
      )
    })
    expect(screen.getByRole('link', { name: /anaplasma phagocytophilum/i })).toHaveAttribute(
      'href',
      '/pathogens/anaplasma-phagocytophilum',
    )
    const table = screen.getByTestId('pathogens-index-table')
    // tick count badge from the analyse buckets
    expect(within(table).getByText('2')).toBeInTheDocument()
  })

  it('sets the canonical link to /pathogens', async () => {
    mocks.pathogensQuery.mockResolvedValue({ rows: [] })
    mocks.ticksPerPathogen.mockResolvedValue({ buckets: [] })
    mocks.diseasesPerPathogen.mockResolvedValue({ buckets: [] })

    render(<PathogensIndexPage />)

    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/pathogens')
    })
  })
})

describe('sortRows', () => {
  const rows: PathogenIndexRow[] = [
    { id: 1, slug: 'a', displayName: 'Alpha', scientificName: '', oneLiner: null, tickCount: 1, diseaseCount: 2 },
    { id: 2, slug: 'b', displayName: 'Bravo', scientificName: '', oneLiner: null, tickCount: 5, diseaseCount: 1 },
    { id: 3, slug: 'c', displayName: 'Charlie', scientificName: '', oneLiner: null, tickCount: 3, diseaseCount: 4 },
  ]

  it('sorts alphabetically by name when by="name"', () => {
    expect(sortRows(rows, 'name').map((r) => r.displayName)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('sorts by tickCount descending when by="ticks"', () => {
    expect(sortRows(rows, 'ticks').map((r) => r.displayName)).toEqual(['Bravo', 'Charlie', 'Alpha'])
  })

  it('sorts by diseaseCount descending when by="diseases"', () => {
    expect(sortRows(rows, 'diseases').map((r) => r.displayName)).toEqual(['Charlie', 'Alpha', 'Bravo'])
  })
})
