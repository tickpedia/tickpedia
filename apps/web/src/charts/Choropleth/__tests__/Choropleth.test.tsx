import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Choropleth } from '../index.js'

describe('Choropleth', () => {
  it('renders an accessible SVG with one cell per state', () => {
    const { container } = render(
      <Choropleth data={{ ME: 9, MA: 5, CA: 1 }} ariaLabel="established range" />,
    )
    expect(screen.getByRole('img', { name: 'established range' })).toBeInTheDocument()
    expect(container.querySelectorAll('rect').length).toBe(51)
  })

  it('renders the USPS code for each cell as a label', () => {
    render(<Choropleth data={{ ME: 9 }} />)
    expect(screen.getByText('ME')).toBeInTheDocument()
    expect(screen.getByText('CA')).toBeInTheDocument()
  })

  it('uses the absent fill (var(--bg-2)) for states with no data', () => {
    const { container } = render(<Choropleth data={{ ME: 9 }} />)
    const meCell = Array.from(container.querySelectorAll('text'))
      .find((t) => t.textContent === 'CA')
    expect(meCell).toBeTruthy()
    const rect = meCell!.previousElementSibling as SVGRectElement
    expect(rect.getAttribute('fill')).toBe('var(--bg-2)')
  })

  it('uses the highest ramp step for the max value', () => {
    const { container } = render(<Choropleth data={{ ME: 100, MA: 1 }} />)
    const meText = Array.from(container.querySelectorAll('text')).find((t) => t.textContent === 'ME')
    const meRect = meText!.previousElementSibling as SVGRectElement
    expect(meRect.getAttribute('fill')).toBe('var(--d5)')
  })

  it('renders a corner label when provided', () => {
    render(<Choropleth data={{ ME: 1 }} label="cases by state" />)
    expect(screen.getByText('CASES BY STATE')).toBeInTheDocument()
  })

  it('omits the label text when none is provided', () => {
    const { container } = render(<Choropleth data={{ ME: 1 }} />)
    const labels = Array.from(container.querySelectorAll('text')).filter((t) => t.textContent === 'cases')
    expect(labels.length).toBe(0)
  })

  it('renders cells as plain <g> when no linkFor is provided', () => {
    const { container } = render(<Choropleth data={{ ME: 1 }} />)
    expect(container.querySelectorAll('a[data-state-code]').length).toBe(0)
    expect(container.querySelectorAll('g[data-state-code]').length).toBe(51)
  })

  it('wraps cells in <a> when linkFor returns a URL', () => {
    const { container } = render(
      <Choropleth
        data={{ ME: 9, MA: 4 }}
        linkFor={(code) => `/states/${code.toLowerCase()}`}
      />,
    )
    const links = container.querySelectorAll('a[data-state-code]')
    expect(links.length).toBe(51)
    const me = container.querySelector('a[data-state-code="ME"]')
    expect(me?.getAttribute('href')).toBe('/states/me')
  })

  it('skips the link wrapper when linkFor returns null for a code', () => {
    const { container } = render(
      <Choropleth
        data={{ ME: 9 }}
        linkFor={(code) => (code === 'ME' ? '/states/maine' : null)}
      />,
    )
    expect(container.querySelector('a[data-state-code="ME"]')).not.toBeNull()
    // Non-ME cells stay as <g>.
    expect(container.querySelector('g[data-state-code="MA"]')).not.toBeNull()
    expect(container.querySelector('a[data-state-code="MA"]')).toBeNull()
  })

  it('emits an SVG <title> when titleFor returns a string', () => {
    const { container } = render(
      <Choropleth
        data={{ ME: 9 }}
        titleFor={(code, v) => `${code}: ${v}`}
      />,
    )
    const titles = Array.from(container.querySelectorAll('title'))
    expect(titles.length).toBe(51)
    expect(titles.find((t) => t.textContent === 'ME: 9')).toBeTruthy()
    expect(titles.find((t) => t.textContent === 'CA: 0')).toBeTruthy()
  })

  it('omits the <title> when titleFor returns null for a code', () => {
    const { container } = render(
      <Choropleth
        data={{ ME: 9 }}
        titleFor={(code, v) => (v > 0 ? `${code}: ${v}` : null)}
      />,
    )
    // Only ME has v>0, so only one title should render.
    expect(container.querySelectorAll('title').length).toBe(1)
  })
})
