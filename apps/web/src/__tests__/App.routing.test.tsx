import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// The App router shim picks the page off `window.location.pathname`.
// In jsdom we navigate by `history.pushState` before each render. The
// mock below provides the surface of `beam` exercised by the home page
// + the search-box autocomplete; everything is empty/idle.

vi.mock('../lib/beam', () => ({
  beam: {
    ticks: {
      search: vi.fn().mockResolvedValue({ results: [] }),
      count: vi.fn().mockResolvedValue({ count: 0 }),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    },
    diseases: {
      count: vi.fn().mockResolvedValue({ count: 0 }),
      query: vi.fn().mockResolvedValue({ rows: [] }),
      feed: {
        trending: vi.fn().mockResolvedValue({ items: [] }),
      },
    },
    counties: {
      count: vi.fn().mockResolvedValue({ count: 0 }),
      query: vi.fn().mockResolvedValue({ rows: [] }),
    },
    states: {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    },
    diseaseCountyYear: {
      count: vi.fn().mockResolvedValue({ count: 0 }),
      analyze: {
        densityByH3: vi.fn().mockResolvedValue({ buckets: [] }),
      },
    },
    tickCounty: {
      feed: {
        recentlyEstablished: vi.fn().mockResolvedValue({ items: [] }),
      },
    },
    wildFacts: {
      feed: {
        latest: Object.assign(
          vi.fn().mockResolvedValue({ items: [], cursor: null, evolved: false, meta: {} }),
          { next: vi.fn() },
        ),
      },
    },
  },
}))

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

import { App } from '../App'

describe('App router shim', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders the home page at /', () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /ticks, the diseases they carry/i,
      }),
    ).toBeInTheDocument()
  })

  it('renders the design showcase at /design', () => {
    window.history.pushState({}, '', '/design')
    render(<App />)
    expect(screen.getByTestId('design-showcase')).toBeInTheDocument()
    expect(screen.queryByTestId('home-page')).not.toBeInTheDocument()
  })

  it('also responds at /design/ (trailing slash)', () => {
    window.history.pushState({}, '', '/design/')
    render(<App />)
    expect(screen.getByTestId('design-showcase')).toBeInTheDocument()
  })

  it('shows the not-found page for unknown URLs', () => {
    window.history.pushState({}, '', '/no-such-route')
    render(<App />)
    expect(screen.getByTestId('not-found')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /not on the map/i }),
    ).toBeInTheDocument()
  })
})
