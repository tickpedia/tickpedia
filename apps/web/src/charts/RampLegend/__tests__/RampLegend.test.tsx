import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { RampLegend } from '../index.js'

describe('RampLegend', () => {
  it('renders the default less/more labels', () => {
    render(<RampLegend />)
    expect(screen.getByText('less')).toBeInTheDocument()
    expect(screen.getByText('more')).toBeInTheDocument()
  })

  it('honours custom labels', () => {
    render(<RampLegend labels={['absent', 'established']} />)
    expect(screen.getByText('absent')).toBeInTheDocument()
    expect(screen.getByText('established')).toBeInTheDocument()
  })

  it('renders one swatch per ramp step', () => {
    const { container } = render(<RampLegend ramp={['#a', '#b', '#c']} />)
    const swatches = container.querySelectorAll('div[style*="width: 16px"]')
    expect(swatches.length).toBe(3)
  })

  it('switches to flex-column when vertical=true', () => {
    const { container } = render(<RampLegend vertical />)
    const root = container.querySelector('[data-testid="ramp-legend"]') as HTMLElement
    expect(root.style.flexDirection).toBe('column')
  })
})
