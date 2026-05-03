import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  countyHotspots: vi.fn(),
  countiesQuery: vi.fn(),
  statesQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    diseaseCountyYear: { analyze: { countyHotspots: mocks.countyHotspots } },
    counties: { query: mocks.countiesQuery },
    states: { query: mocks.statesQuery },
  },
}))

import { CountiesLeaderboardPage } from '../CountiesLeaderboardPage.js'

describe('CountiesLeaderboardPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
  })

  it('renders rows in cumulative-total descending order with cross-links', async () => {
    mocks.countyHotspots.mockResolvedValue({
      buckets: [
        { dims: { countyName: 'Cumberland', countyFips: '23005', stateFips: '23' }, measures: { total: 5104, mostRecentYear: 2024, diseases: 4 } },
        { dims: { countyName: 'York',       countyFips: '23031', stateFips: '23' }, measures: { total: 3892, mostRecentYear: 2024, diseases: 4 } },
        { dims: { countyName: 'Rockingham', countyFips: '33015', stateFips: '33' }, measures: { total: 2104, mostRecentYear: 2024, diseases: 3 } },
      ],
    })
    mocks.countiesQuery.mockResolvedValue({
      rows: [
        { fips: '23005', slug: 'cumberland', countyName: 'Cumberland', stateFips: '23' },
        { fips: '23031', slug: 'york', countyName: 'York', stateFips: '23' },
        { fips: '33015', slug: 'rockingham', countyName: 'Rockingham', stateFips: '33' },
      ],
    })
    mocks.statesQuery.mockResolvedValue({
      rows: [
        { fips: '23', slug: 'maine', code: 'ME' },
        { fips: '33', slug: 'new-hampshire', code: 'NH' },
      ],
    })

    render(<CountiesLeaderboardPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /cumberland county/i })).toHaveAttribute(
        'href',
        '/counties/maine/cumberland',
      )
    })
    const table = screen.getByTestId('counties-leaderboard-table')
    // Order check — rank "01" goes to Cumberland (highest total).
    const firstRow = within(table).getAllByRole('row')[1]!
    expect(firstRow).toHaveTextContent(/Cumberland/)
    expect(firstRow).toHaveTextContent(/5,104/)
    // State column links to /states/[slug].
    expect(within(table).getByRole('link', { name: 'NH' })).toHaveAttribute(
      'href',
      '/states/new-hampshire',
    )
  })

  it('sets the canonical link to /counties', async () => {
    mocks.countyHotspots.mockResolvedValue({ buckets: [] })
    mocks.countiesQuery.mockResolvedValue({ rows: [] })
    mocks.statesQuery.mockResolvedValue({ rows: [] })

    render(<CountiesLeaderboardPage />)

    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/counties')
    })
  })
})
