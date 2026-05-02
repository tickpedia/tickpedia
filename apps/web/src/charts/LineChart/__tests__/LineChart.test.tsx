import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LineChart } from '../index.js'

describe('LineChart', () => {
  it('renders an SVG with the label as aria-label', () => {
    render(<LineChart data={[1, 2, 3, 4]} label="Cases" />)
    expect(screen.getByRole('img', { name: /cases line chart/i })).toBeInTheDocument()
  })

  it('uses a custom ariaLabel when provided', () => {
    render(<LineChart data={[1, 2]} ariaLabel="lyme over 13 years" />)
    expect(screen.getByRole('img', { name: 'lyme over 13 years' })).toBeInTheDocument()
  })

  it('renders the area fill, stroke, and y-grid lines', () => {
    const { container } = render(<LineChart data={[1, 5, 10]} />)
    expect(container.querySelectorAll('path').length).toBe(2)
    // Default 4 ticks + baseline = 5 grid lines
    const gridLines = container.querySelectorAll('line[stroke="var(--rule)"]')
    expect(gridLines.length).toBe(5)
  })

  it('renders x-axis labels when years are provided', () => {
    render(
      <LineChart
        data={[1, 2, 3, 4, 5, 6, 7, 8]}
        years={[2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]}
      />,
    )
    expect(screen.getByText('2017')).toBeInTheDocument()
  })

  it('omits x-axis labels when years are null', () => {
    const { container } = render(<LineChart data={[1, 2, 3]} years={null} />)
    expect(container.textContent).not.toMatch(/\b2017\b/)
  })

  it('uses the viewBox for responsive sizing', () => {
    const { container } = render(<LineChart data={[1, 2]} width={500} height={150} />)
    const svg = container.querySelector('svg')
    expect(svg!.getAttribute('viewBox')).toBe('0 0 500 150')
    expect(svg!.getAttribute('width')).toBe('100%')
  })
})
