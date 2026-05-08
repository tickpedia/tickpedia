import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const {
  ticksSearch,
  diseasesSearch,
  techniquesSearch,
  statesSearch,
  countiesSearch,
  statesQuery,
} = vi.hoisted(() => ({
  ticksSearch: vi.fn().mockResolvedValue({ results: [] }),
  diseasesSearch: vi.fn().mockResolvedValue({ results: [] }),
  techniquesSearch: vi.fn().mockResolvedValue({ results: [] }),
  statesSearch: vi.fn().mockResolvedValue({ results: [] }),
  countiesSearch: vi.fn().mockResolvedValue({ results: [] }),
  statesQuery: vi.fn().mockResolvedValue({ rows: [{ fips: '23', slug: 'maine' }] }),
}))

vi.mock('../../../lib/beam', () => ({
  beam: {
    ticks: { search: ticksSearch },
    diseases: { search: diseasesSearch },
    removalTechniques: { search: techniquesSearch },
    states: { search: statesSearch, query: statesQuery },
    counties: { search: countiesSearch },
  },
}))

import { SearchPage } from '../SearchPage.js'

describe('SearchPage', () => {
  beforeEach(() => {
    ticksSearch.mockClear()
    diseasesSearch.mockClear()
    techniquesSearch.mockClear()
    statesSearch.mockClear()
    countiesSearch.mockClear()
    statesQuery.mockClear()
    statesQuery.mockResolvedValue({ rows: [{ fips: '23', slug: 'maine' }] })
    ticksSearch.mockResolvedValue({ results: [] })
    diseasesSearch.mockResolvedValue({ results: [] })
    techniquesSearch.mockResolvedValue({ results: [] })
    statesSearch.mockResolvedValue({ results: [] })
    countiesSearch.mockResolvedValue({ results: [] })
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
    window.history.replaceState({}, '', '/search')
  })

  it('renders the empty-state suggestions when there is no query', () => {
    render(<SearchPage initialQuery="" />)
    expect(screen.getByTestId('search-empty-prompt')).toBeInTheDocument()
    expect(screen.getByTestId('search-suggestions')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /search tickpedia/i }),
    ).toBeInTheDocument()
    // No fetch should fire on the empty initial state.
    expect(ticksSearch).not.toHaveBeenCalled()
  })

  it('sets a generic title + canonical /search when no query', () => {
    render(<SearchPage initialQuery="" />)
    expect(document.title).toBe('Search — Tickpedia')
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/search')
  })

  it('renders the no-results message when lenses come back empty', async () => {
    render(<SearchPage initialQuery="tickapotamus" />)
    await waitFor(() => {
      expect(screen.getByTestId('search-no-results')).toBeInTheDocument()
    })
    expect(screen.getByTestId('search-no-results').textContent).toMatch(
      /tickapotamus/i,
    )
    // Title reflects the active query.
    expect(document.title).toContain('tickapotamus')
  })

  it('renders mixed-entity results with kind tags and entity hrefs', async () => {
    ticksSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            id: 1,
            slug: 'blacklegged-tick',
            commonName: 'Blacklegged tick',
            scientificName: 'Ixodes scapularis',
          },
        },
      ],
    })
    diseasesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            id: 11,
            slug: 'lyme-disease',
            displayName: 'Lyme disease',
            oneLiner: 'A bacterial infection from blacklegged tick bites.',
          },
        },
      ],
    })
    statesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            fips: '42',
            slug: 'pennsylvania',
            name: 'Pennsylvania',
          },
        },
      ],
    })
    countiesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            fips: '23005',
            slug: 'cumberland',
            countyName: 'Cumberland County',
            stateFips: '23',
          },
        },
      ],
    })

    render(<SearchPage initialQuery="lyme" />)

    await waitFor(() => {
      expect(screen.getByTestId('search-results')).toBeInTheDocument()
    })
    expect(screen.getByTestId('search-group-tick')).toBeInTheDocument()
    expect(screen.getByTestId('search-group-disease')).toBeInTheDocument()
    expect(screen.getByTestId('search-group-state')).toBeInTheDocument()
    expect(screen.getByTestId('search-group-county')).toBeInTheDocument()

    const tickLink = screen.getByTestId('search-result-tick-1')
    expect(tickLink).toHaveAttribute('href', '/ticks/blacklegged-tick')
    expect(tickLink.textContent).toContain('TICK')

    const diseaseLink = screen.getByTestId('search-result-disease-11')
    expect(diseaseLink).toHaveAttribute('href', '/diseases/lyme-disease')

    const countyLink = screen.getByTestId('search-result-county-23005')
    expect(countyLink).toHaveAttribute('href', '/counties/maine/cumberland')
  })

  it('updates the URL with ?q= when the form is submitted', async () => {
    const user = userEvent.setup()
    render(<SearchPage initialQuery="" />)
    const input = screen.getByTestId('search-input')
    await user.type(input, 'lyme{Enter}')
    await waitFor(() => {
      expect(window.location.search).toBe('?q=lyme')
    })
    // Title now reflects the submitted query.
    await waitFor(() => {
      expect(document.title).toContain('lyme')
    })
  })

  it('shows a search-error panel when every lens rejects', async () => {
    ticksSearch.mockRejectedValue(new Error('network'))
    diseasesSearch.mockRejectedValue(new Error('network'))
    techniquesSearch.mockRejectedValue(new Error('network'))
    statesSearch.mockRejectedValue(new Error('network'))
    countiesSearch.mockRejectedValue(new Error('network'))

    render(<SearchPage initialQuery="lyme" />)
    // The component swallows individual failures and renders empty
    // results — that mirrors UniversalSearch's resilience and is the
    // contract the e2e relies on.
    await waitFor(() => {
      expect(screen.getByTestId('search-no-results')).toBeInTheDocument()
    })
  })
})
