import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  diseasesQuery: vi.fn(),
  casesByYear: vi.fn(),
  ticksPerDisease: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    diseases: { query: mocks.diseasesQuery },
    diseaseCountyYear: { analyze: { casesByYear: mocks.casesByYear } },
    tickDiseases: { analyze: { ticksPerDisease: mocks.ticksPerDisease } },
  },
}))

import { DiseasesIndexPage, sortRows, type IndexRow } from '../DiseasesIndexPage.js'

describe('DiseasesIndexPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
  })

  it('renders rows with /diseases/[slug] links and case counts', async () => {
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        { id: 1, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'A bacterial infection.' },
        { id: 2, slug: 'rmsf', displayName: 'RMSF', oneLiner: 'Rocky Mountain spotted fever.' },
      ],
    })
    mocks.casesByYear.mockResolvedValue({
      buckets: [
        { dims: { diseaseId: 1, year: 2023 }, measures: { total: 5000, counties: 100 } },
        { dims: { diseaseId: 2, year: 2023 }, measures: { total: 200, counties: 30 } },
      ],
    })
    mocks.ticksPerDisease.mockResolvedValue({
      buckets: [
        { dims: { diseaseId: 1 }, measures: { count: 2 } },
        { dims: { diseaseId: 2 }, measures: { count: 1 } },
      ],
    })

    render(<DiseasesIndexPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /lyme disease/i })).toHaveAttribute(
        'href',
        '/diseases/lyme-disease',
      )
    })
    expect(screen.getByRole('link', { name: /rmsf/i })).toHaveAttribute(
      'href',
      '/diseases/rmsf',
    )
    const table = screen.getByTestId('diseases-index-table')
    expect(within(table).getByText(/5,000/)).toBeInTheDocument()
  })

  it('sets the canonical link to /diseases', async () => {
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    mocks.casesByYear.mockResolvedValue({ buckets: [] })
    mocks.ticksPerDisease.mockResolvedValue({ buckets: [] })

    render(<DiseasesIndexPage />)

    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/diseases')
    })
  })
})

describe('sortRows', () => {
  const rows: IndexRow[] = [
    { id: 1, slug: 'a', displayName: 'Alpha', oneLiner: null, caseCount: 100, tickCount: 1 },
    { id: 2, slug: 'b', displayName: 'Bravo', oneLiner: null, caseCount: 500, tickCount: 2 },
    { id: 3, slug: 'c', displayName: 'Charlie', oneLiner: null, caseCount: 50, tickCount: 1 },
  ]

  it('sorts alphabetically by name when by="name"', () => {
    expect(sortRows(rows, 'name').map((r) => r.displayName)).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('sorts by case count descending when by="cases"', () => {
    expect(sortRows(rows, 'cases').map((r) => r.displayName)).toEqual(['Bravo', 'Alpha', 'Charlie'])
  })
})
