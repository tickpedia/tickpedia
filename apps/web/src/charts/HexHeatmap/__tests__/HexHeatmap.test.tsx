import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { HexHeatmap } from '../index.js'

describe('HexHeatmap', () => {
  it('renders an accessible SVG', () => {
    render(<HexHeatmap synthesize ariaLabel="Lyme density" />)
    expect(screen.getByRole('img', { name: 'Lyme density' })).toBeInTheDocument()
  })

  it('renders a hex polygon per supplied cell above the threshold', () => {
    const cells = [
      { x: 10, y: 10, v: 0.5 },
      { x: 30, y: 10, v: 0.9 },
      { x: 50, y: 10, v: 0.01 }, // below threshold (0.06)
    ]
    const { container } = render(<HexHeatmap cells={cells} />)
    expect(container.querySelectorAll('polygon').length).toBe(2)
  })

  it('renders nothing past the heatmap polygons when given no cells', () => {
    const { container } = render(<HexHeatmap />)
    expect(container.querySelectorAll('polygon').length).toBe(0)
    // The base rect is always there as the canvas backdrop
    expect(container.querySelectorAll('rect').length).toBe(1)
  })

  it('synthesizes mockup cells when synthesize=true and no cells are provided', () => {
    const { container } = render(<HexHeatmap synthesize />)
    expect(container.querySelectorAll('polygon').length).toBeGreaterThan(20)
  })

  it('compact mode uses a smaller hex radius (more cells fit)', () => {
    const big = render(<HexHeatmap synthesize />)
    const small = render(<HexHeatmap synthesize compact />)
    expect(small.container.querySelectorAll('polygon').length).toBeGreaterThan(
      big.container.querySelectorAll('polygon').length,
    )
  })

  it('honours custom width + height via the viewBox', () => {
    const { container } = render(<HexHeatmap width={500} height={250} />)
    const svg = container.querySelector('svg')
    expect(svg!.getAttribute('viewBox')).toBe('0 0 500 250')
  })
})
