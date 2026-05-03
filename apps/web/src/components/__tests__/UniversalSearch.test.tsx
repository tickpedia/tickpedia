import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  ticksSearch: vi.fn(),
  diseasesSearch: vi.fn(),
  removalTechniquesSearch: vi.fn(),
  statesSearch: vi.fn(),
  countiesSearch: vi.fn(),
  // Static fips→slug fetch the component does on mount so it can build
  // /counties/<state-slug>/<county-slug> URLs without a per-result hop.
  statesQuery: vi.fn(),
}))

vi.mock('../../lib/beam.js', () => ({
  beam: {
    ticks: { search: mocks.ticksSearch },
    diseases: { search: mocks.diseasesSearch },
    removalTechniques: { search: mocks.removalTechniquesSearch },
    states: { search: mocks.statesSearch, query: mocks.statesQuery },
    counties: { search: mocks.countiesSearch },
  },
}))

import { UniversalSearch } from '../UniversalSearch.js'

describe('UniversalSearch', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    mocks.ticksSearch.mockResolvedValue({ results: [] })
    mocks.diseasesSearch.mockResolvedValue({ results: [] })
    mocks.removalTechniquesSearch.mockResolvedValue({ results: [] })
    mocks.statesSearch.mockResolvedValue({ results: [] })
    mocks.countiesSearch.mockResolvedValue({ results: [] })
    mocks.statesQuery.mockResolvedValue({
      rows: [
        { fips: '25', slug: 'massachusetts' },
        { fips: '19', slug: 'iowa' },
      ],
    })
  })

  it('renders an input and does not query SemiLayer until the user types', () => {
    render(<UniversalSearch />)
    expect(screen.getByTestId('universal-search-input')).toBeInTheDocument()
    // No panel is open before focus + non-empty query.
    expect(screen.queryByTestId('universal-search-panel')).toBeNull()
    expect(mocks.ticksSearch).not.toHaveBeenCalled()
  })

  it('queries five lenses in parallel after debounce and groups the results', async () => {
    mocks.ticksSearch.mockResolvedValue({
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
    mocks.diseasesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            id: 10,
            slug: 'lyme-disease',
            displayName: 'Lyme disease',
            oneLiner: 'A bacterial infection.',
          },
        },
      ],
    })
    mocks.removalTechniquesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            id: 100,
            slug: 'fine-tipped-tweezers',
            title: 'Fine-tipped tweezers',
            oneLiner: 'CDC primary method.',
            kind: 'removal',
          },
        },
      ],
    })
    mocks.statesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            fips: '25',
            slug: 'massachusetts',
            name: 'Massachusetts',
          },
        },
      ],
    })
    mocks.countiesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            fips: '25009',
            slug: 'essex',
            countyName: 'Essex County',
            stateFips: '25',
          },
        },
      ],
    })

    render(<UniversalSearch />)

    const input = screen.getByTestId('universal-search-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'lyme' } })

    await waitFor(
      () => {
        expect(mocks.ticksSearch).toHaveBeenCalled()
      },
      { timeout: 2000 },
    )

    // All five lenses fired in parallel from a single keystroke.
    expect(mocks.diseasesSearch).toHaveBeenCalled()
    expect(mocks.removalTechniquesSearch).toHaveBeenCalled()
    expect(mocks.statesSearch).toHaveBeenCalled()
    expect(mocks.countiesSearch).toHaveBeenCalled()

    const panel = await screen.findByTestId('universal-search-panel')
    expect(within(panel).getByTestId('universal-search-section-ticks')).toBeInTheDocument()
    expect(within(panel).getByTestId('universal-search-section-diseases')).toBeInTheDocument()
    expect(within(panel).getByTestId('universal-search-section-techniques')).toBeInTheDocument()
    expect(within(panel).getByTestId('universal-search-section-states')).toBeInTheDocument()
    expect(within(panel).getByTestId('universal-search-section-counties')).toBeInTheDocument()

    // Tick result links to /ticks/<slug>.
    expect(
      within(panel).getByRole('option', { name: /blacklegged tick/i }),
    ).toHaveAttribute('href', '/ticks/blacklegged-tick')
    // Disease result links to /diseases/<slug>.
    expect(
      within(panel).getByRole('option', { name: /lyme disease/i }),
    ).toHaveAttribute('href', '/diseases/lyme-disease')
    // Technique result tags itself with the kind.
    expect(within(panel).getByText(/fine-tipped tweezers/i)).toBeInTheDocument()
    expect(within(panel).getByText(/^removal$/i)).toBeInTheDocument()
  })

  it('renders an empty-state message when no lens returns results', async () => {
    render(<UniversalSearch />)
    const input = screen.getByTestId('universal-search-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'absurdthingwithnoresult' } })

    await waitFor(
      () => {
        expect(screen.getByTestId('universal-search-empty')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
  })

  it('hides empty sections so a tick-only search does not dump empty rails', async () => {
    mocks.ticksSearch.mockResolvedValue({
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

    render(<UniversalSearch />)
    const input = screen.getByTestId('universal-search-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'tick' } })

    await waitFor(
      () => {
        expect(screen.getByTestId('universal-search-section-ticks')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
    // Empty lenses are not rendered as headers.
    expect(screen.queryByTestId('universal-search-section-diseases')).toBeNull()
    expect(screen.queryByTestId('universal-search-section-techniques')).toBeNull()
    expect(screen.queryByTestId('universal-search-section-states')).toBeNull()
    expect(screen.queryByTestId('universal-search-section-counties')).toBeNull()
  })

  it('routes county hits to /counties/<state-slug>/<county-slug>', async () => {
    mocks.countiesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            fips: '19013',
            slug: 'black-hawk',
            countyName: 'Black Hawk County',
            stateFips: '19',
          },
        },
      ],
    })

    render(<UniversalSearch />)
    // Wait for the on-mount states fetch to land before typing — the
    // map needs to be populated for the URL to compose.
    await waitFor(() => {
      expect(mocks.statesQuery).toHaveBeenCalled()
    })

    const input = screen.getByTestId('universal-search-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'black hawk' } })

    const link = await screen.findByRole(
      'option',
      { name: /black hawk county/i },
      { timeout: 2000 },
    )
    expect(link).toHaveAttribute('href', '/counties/iowa/black-hawk')
  })

  it('falls back to /search?q=… when the states cache failed to load', async () => {
    mocks.statesQuery.mockRejectedValue(new Error('cache fetch failed'))
    mocks.countiesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            fips: '19013',
            slug: 'black-hawk',
            countyName: 'Black Hawk County',
            stateFips: '19',
          },
        },
      ],
    })

    render(<UniversalSearch />)
    await waitFor(() => {
      expect(mocks.statesQuery).toHaveBeenCalled()
    })

    const input = screen.getByTestId('universal-search-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'black hawk' } })

    const link = await screen.findByRole(
      'option',
      { name: /black hawk county/i },
      { timeout: 2000 },
    )
    expect(link.getAttribute('href') ?? '').toMatch(/^\/search\?q=/)
  })

  it('survives a per-lens failure — failing lenses fall back to empty', async () => {
    mocks.ticksSearch.mockRejectedValue(new Error('boom'))
    mocks.diseasesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            id: 10,
            slug: 'lyme-disease',
            displayName: 'Lyme disease',
            oneLiner: null,
          },
        },
      ],
    })

    render(<UniversalSearch />)
    const input = screen.getByTestId('universal-search-input')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'lyme' } })

    await waitFor(
      () => {
        expect(screen.getByTestId('universal-search-section-diseases')).toBeInTheDocument()
      },
      { timeout: 2000 },
    )
    // No global error banner — the failing lens degrades silently.
    expect(screen.queryByTestId('universal-search-error')).toBeNull()
    // Failing lens contributes no section.
    expect(screen.queryByTestId('universal-search-section-ticks')).toBeNull()
  })
})
