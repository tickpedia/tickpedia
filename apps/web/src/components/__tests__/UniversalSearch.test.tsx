import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  ticksSearch: vi.fn(),
  diseasesSearch: vi.fn(),
  removalTechniquesSearch: vi.fn(),
  statesSearch: vi.fn(),
  countiesSearch: vi.fn(),
}))

vi.mock('../../lib/beam.js', () => ({
  beam: {
    ticks: { search: mocks.ticksSearch },
    diseases: { search: mocks.diseasesSearch },
    removalTechniques: { search: mocks.removalTechniquesSearch },
    states: { search: mocks.statesSearch },
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
