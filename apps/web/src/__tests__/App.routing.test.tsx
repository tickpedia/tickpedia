import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'

// The App's router shim picks the page off `window.location.pathname`.
// In jsdom we can navigate by `history.pushState` before each render.

vi.mock('../lib/beam', () => ({
  beam: {
    ticks: { search: vi.fn() },
    wildFacts: {
      feed: {
        latest: Object.assign(vi.fn().mockResolvedValue({ items: [], cursor: null, evolved: false, meta: {} }), {
          next: vi.fn(),
        }),
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

  it('renders the legacy home at /', () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: /tickpedia/i })).toBeInTheDocument()
    expect(screen.getByTestId('tagline')).toBeInTheDocument()
  })

  it('renders the design showcase at /design', () => {
    window.history.pushState({}, '', '/design')
    render(<App />)
    expect(screen.getByTestId('design-showcase')).toBeInTheDocument()
    expect(screen.queryByTestId('tagline')).not.toBeInTheDocument()
  })

  it('also responds at /design/ (trailing slash)', () => {
    window.history.pushState({}, '', '/design/')
    render(<App />)
    expect(screen.getByTestId('design-showcase')).toBeInTheDocument()
  })

  it('legacy home shows the GitHub repo link in the footer', () => {
    window.history.pushState({}, '', '/')
    render(<App />)
    const link = screen.getByRole('link', { name: /github\.com\/tickpedia\/tickpedia/i })
    expect(link).toHaveAttribute('href', 'https://github.com/tickpedia/tickpedia')
  })
})
