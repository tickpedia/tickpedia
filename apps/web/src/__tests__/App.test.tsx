import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

vi.mock('../lib/beam', () => ({
  beam: {
    ticks: { search: vi.fn() },
    wildFacts: {
      feed: {
        latest: Object.assign(vi.fn(), { next: vi.fn() }),
      },
    },
  },
}))

import { App } from '../App'
import { beam } from '../lib/beam'

const mockedTicks = beam.ticks.search as unknown as ReturnType<typeof vi.fn>
const mockedFeed = beam.wildFacts.feed.latest as unknown as ReturnType<typeof vi.fn>

// jsdom doesn't ship IntersectionObserver. The Feed component only uses
// it for the "load more" sentinel; the initial fetch happens on mount,
// which is what the tests below assert.
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}
;(globalThis as unknown as { IntersectionObserver: typeof MockIntersectionObserver }).IntersectionObserver =
  MockIntersectionObserver

describe('App', () => {
  beforeEach(() => {
    mockedTicks.mockReset()
    mockedFeed.mockReset()
    mockedTicks.mockResolvedValue({ results: [] })
    mockedFeed.mockResolvedValue({ items: [], cursor: null, evolved: false, meta: {} })
  })

  it('renders the brand', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /tickpedia/i })).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<App />)
    expect(screen.getByTestId('tagline')).toHaveTextContent(/ticks by region/i)
  })

  it('renders the search box and feed column', () => {
    render(<App />)
    expect(screen.getByRole('searchbox', { name: /search ticks/i })).toBeInTheDocument()
    expect(screen.getByTestId('feed')).toBeInTheDocument()
    expect(screen.getByTestId('results-ticks')).toBeInTheDocument()
  })

  it('fires the ticks semantic search (debounced) once the user types', async () => {
    render(<App />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'lyme' } })

    await waitFor(() => {
      expect(mockedTicks).toHaveBeenCalled()
    })

    expect(mockedTicks).toHaveBeenLastCalledWith({ query: 'lyme', limit: 5 })
  })

  it('does not call the API for empty input', async () => {
    render(<App />)
    await new Promise((r) => setTimeout(r, 200))
    expect(mockedTicks).not.toHaveBeenCalled()
  })

  it('loads the latest-facts feed on mount', async () => {
    mockedFeed.mockResolvedValue({
      items: [
        {
          id: 'f1',
          sourceRowId: '1',
          content: null,
          score: 1,
          rank: 1,
          metadata: {
            id: 1,
            body: 'A nymph the size of a poppy seed can transmit Lyme.',
            citationUrl: null,
            tickId: 1,
            createdAt: '2026-04-01',
          },
        },
      ],
      cursor: null,
      evolved: false,
      meta: {},
    })

    render(<App />)
    await waitFor(() => {
      expect(mockedFeed).toHaveBeenCalled()
    })
    expect(await screen.findByText(/poppy seed/i)).toBeInTheDocument()
  })
})
