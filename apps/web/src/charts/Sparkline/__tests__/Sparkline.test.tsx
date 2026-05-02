import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sparkline } from '../index.js'

describe('Sparkline', () => {
  it('renders an SVG with an aria-label', () => {
    render(<Sparkline data={[1, 2, 3]} ariaLabel="cases" />)
    expect(screen.getByRole('img', { name: 'cases' })).toBeInTheDocument()
  })

  it('renders an empty SVG with annotated label when data is empty', () => {
    render(<Sparkline data={[]} ariaLabel="cases" />)
    expect(screen.getByRole('img', { name: /empty/i })).toBeInTheDocument()
  })

  it('omits the area fill when fill=false', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} fill={false} />)
    expect(container.querySelectorAll('path').length).toBe(1)
  })

  it('renders area + stroke + last-point dot when fill=true', () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} fill />)
    expect(container.querySelectorAll('path').length).toBe(2)
    expect(container.querySelectorAll('circle').length).toBe(1)
  })

  it('honours width and height', () => {
    const { container } = render(<Sparkline data={[1, 2]} width={200} height={60} />)
    const svg = container.querySelector('svg')
    expect(svg!.getAttribute('width')).toBe('200')
    expect(svg!.getAttribute('height')).toBe('60')
  })
})
