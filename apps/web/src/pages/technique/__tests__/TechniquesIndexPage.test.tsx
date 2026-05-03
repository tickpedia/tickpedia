import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  removalTechniquesQuery: vi.fn(),
  removalTechniquesSearch: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    removalTechniques: {
      query: mocks.removalTechniquesQuery,
      search: mocks.removalTechniquesSearch,
    },
  },
}))

import { TechniquesIndexPage } from '../TechniquesIndexPage.js'

describe('TechniquesIndexPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
  })

  it('renders rows alphabetically with /techniques/[slug] links and a kind badge', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({
      rows: [
        // Returned in arbitrary order — the hook sorts.
        {
          id: 2,
          slug: 'permethrin',
          title: 'Permethrin treatment',
          oneLiner: 'Treat clothing.',
          kind: 'prevention',
          preventionScore: 9,
        },
        {
          id: 1,
          slug: 'fine-tipped-tweezers',
          title: 'Fine-tipped tweezers',
          oneLiner: 'CDC primary method.',
          kind: 'removal',
          preventionScore: null,
        },
      ],
    })

    render(<TechniquesIndexPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /fine-tipped tweezers/i })).toHaveAttribute(
        'href',
        '/techniques/fine-tipped-tweezers',
      )
    })

    const table = screen.getByTestId('techniques-index-table')
    const linkTitles = within(table)
      .getAllByRole('link')
      .map((a) => a.textContent ?? '')
    expect(linkTitles).toEqual(['Fine-tipped tweezers', 'Permethrin treatment'])

    // Kind badges render the trait + score for prevention rows.
    expect(within(table).getByText(/^prevention · 9\/10$/i)).toBeInTheDocument()
    expect(within(table).getByText(/^removal$/i)).toBeInTheDocument()
  })

  it('sets the canonical link to /techniques', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })

    render(<TechniquesIndexPage />)

    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/techniques')
    })
  })

  it('renders an em-dash when oneLiner is null', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({
      rows: [{ id: 1, slug: 't', title: 'T', oneLiner: null, kind: 'removal', preventionScore: null }],
    })
    render(<TechniquesIndexPage />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^t$/i })).toBeInTheDocument()
    })
    const table = screen.getByTestId('techniques-index-table')
    expect(within(table).getByText('—')).toBeInTheDocument()
  })

  it('filters by kind when a chip is clicked', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({
      rows: [
        { id: 1, slug: 'tweezers', title: 'Tweezers', oneLiner: null, kind: 'removal', preventionScore: null },
        {
          id: 2,
          slug: 'permethrin',
          title: 'Permethrin',
          oneLiner: null,
          kind: 'prevention',
          preventionScore: 9,
        },
        {
          id: 3,
          slug: 'matches-myth',
          title: 'Burning ticks off',
          oneLiner: null,
          kind: 'myth',
          preventionScore: null,
        },
      ],
    })

    render(<TechniquesIndexPage />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^tweezers$/i })).toBeInTheDocument()
    })
    // All three rows in the default view.
    expect(screen.getAllByRole('row')).toHaveLength(4) // header + 3 data rows

    fireEvent.click(screen.getByTestId('kind-chip-myth'))
    await waitFor(() => {
      expect(screen.queryByRole('link', { name: /^tweezers$/i })).toBeNull()
    })
    expect(screen.getByRole('link', { name: /burning ticks off/i })).toBeInTheDocument()
    // Header + one debunked row.
    expect(screen.getAllByRole('row')).toHaveLength(2)
  })

  it('runs a SemiLayer search after debounce and renders the results', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({
      rows: [
        { id: 1, slug: 'tweezers', title: 'Tweezers', oneLiner: null, kind: 'removal', preventionScore: null },
      ],
    })
    mocks.removalTechniquesSearch.mockResolvedValue({
      results: [
        {
          metadata: {
            id: 99,
            slug: 'bullseye-watch',
            title: 'Watch for the bullseye rash',
            oneLiner: 'Watch the bite for an expanding red rash for 30 days.',
            kind: 'aftercare',
            preventionScore: null,
          },
        },
      ],
    })

    render(<TechniquesIndexPage />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^tweezers$/i })).toBeInTheDocument()
    })

    const input = screen.getByTestId('techniques-search-input')
    fireEvent.change(input, { target: { value: 'bullseye' } })

    await waitFor(
      () => {
        expect(mocks.removalTechniquesSearch).toHaveBeenCalledWith({
          query: 'bullseye',
          limit: 60,
        })
      },
      { timeout: 2000 },
    )

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /watch for the bullseye rash/i })).toBeInTheDocument()
    })
    // The pre-search alphabetical row is now hidden; only the search hit shows.
    expect(screen.queryByRole('link', { name: /^tweezers$/i })).toBeNull()
  })
})
