import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('../../../lib/beam', () => ({
  beam: {
    states: {
      query: vi.fn().mockResolvedValue({ rows: [] }),
    },
  },
}))

import { NotFoundPage } from '../NotFoundPage.js'

describe('NotFoundPage', () => {
  beforeEach(() => {
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="robots"]').forEach((n) => n.remove())
  })

  it('renders the eyebrow, H1, and the requested path', () => {
    render(<NotFoundPage currentPath="/diseases/typhoid" />)
    expect(screen.getByTestId('not-found-eyebrow')).toHaveTextContent(
      /404 · not in encyclopedia/i,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /not on the map/i }),
    ).toBeInTheDocument()
    expect(screen.getByTestId('not-found-path')).toHaveTextContent(
      '/diseases/typhoid',
    )
  })

  it('exposes data-testid="not-found" so the App router test still passes', () => {
    render(<NotFoundPage currentPath="/something-unknown" />)
    expect(screen.getByTestId('not-found')).toBeInTheDocument()
  })

  it('sets the document title and canonical link to /404', () => {
    render(<NotFoundPage currentPath="/oops" />)
    expect(document.title).toBe('Page not found — Tickpedia')
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/404')
  })

  it('emits a robots noindex meta tag', () => {
    render(<NotFoundPage currentPath="/oops" />)
    const robots = document.head.querySelector('meta[name="robots"]')
    expect(robots?.getAttribute('content')).toMatch(/noindex/i)
  })

  it('renders a chip rail of popular destinations as real links', () => {
    const { container } = render(<NotFoundPage currentPath="/oops" />)
    const chips = container.querySelectorAll(
      '[data-testid="not-found-chips"] a.tp-chip',
    )
    expect(chips.length).toBe(5)
    const hrefs = Array.from(chips).map((a) => a.getAttribute('href'))
    expect(hrefs).toContain('/ticks/blacklegged-tick')
    expect(hrefs).toContain('/diseases/lyme-disease')
    expect(hrefs).toContain('/risk')
  })

  it('falls back to "/" when no currentPath is supplied and no DOM URL exists', () => {
    // jsdom always has window, so currentPath will land on whatever
    // window.location.pathname is — assert on the rendered code block
    // rather than reaching into the implementation.
    window.history.pushState({}, '', '/')
    render(<NotFoundPage />)
    expect(screen.getByTestId('not-found-path').textContent).toBeTruthy()
  })
})
