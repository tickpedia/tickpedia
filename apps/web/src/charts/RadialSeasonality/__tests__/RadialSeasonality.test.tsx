import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RadialSeasonality } from '../index.js'

const MONTHS = [3, 5, 12, 28, 62, 88, 110, 95, 64, 38, 18, 8]

describe('RadialSeasonality', () => {
  it('renders an accessible SVG', () => {
    render(<RadialSeasonality months={MONTHS} ariaLabel="Lyme seasonality" />)
    expect(screen.getByRole('img', { name: 'Lyme seasonality' })).toBeInTheDocument()
  })

  it('renders one wedge per month', () => {
    const { container } = render(<RadialSeasonality months={MONTHS} />)
    expect(container.querySelectorAll('path').length).toBe(12)
  })

  it('renders 12 month labels', () => {
    const { container } = render(<RadialSeasonality months={MONTHS} />)
    expect(container.querySelectorAll('text').length).toBe(12)
  })

  it('uses higher opacity for higher-value months', () => {
    const { container } = render(<RadialSeasonality months={MONTHS} />)
    const paths = Array.from(container.querySelectorAll('path'))
    const julyOpacity = parseFloat(paths[6]!.getAttribute('opacity') ?? '0')
    const februaryOpacity = parseFloat(paths[1]!.getAttribute('opacity') ?? '0')
    expect(julyOpacity).toBeGreaterThan(februaryOpacity)
  })

  it('honours the size prop', () => {
    const { container } = render(<RadialSeasonality months={MONTHS} size={240} />)
    const svg = container.querySelector('svg')
    expect(svg!.getAttribute('width')).toBe('240')
    expect(svg!.getAttribute('height')).toBe('240')
  })
})
