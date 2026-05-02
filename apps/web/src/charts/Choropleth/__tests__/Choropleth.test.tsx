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
})
