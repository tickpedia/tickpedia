import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BarRow } from '../index.js'

const ROWS = [
  { label: 'Pennsylvania', value: 11421 },
  { label: 'New York', value: 9842 },
  { label: 'New Jersey', value: 7104 },
]

describe('BarRow', () => {
  it('renders one meter per row', () => {
    render(<BarRow rows={ROWS} />)
    expect(screen.getAllByRole('meter').length).toBe(3)
  })

  it('labels each meter with the row label', () => {
    render(<BarRow rows={ROWS} />)
    expect(screen.getByRole('meter', { name: 'Pennsylvania' })).toBeInTheDocument()
  })

  it('caps the largest value at 100% of the bar width', () => {
    const { container } = render(<BarRow rows={ROWS} />)
    const bars = container.querySelectorAll('[role="meter"] > div')
    expect((bars[0] as HTMLElement).style.width).toBe('100%')
  })

  it('honours an explicit max', () => {
    const { container } = render(<BarRow rows={[{ label: 'a', value: 50 }]} max={100} />)
    const bar = container.querySelector('[role="meter"] > div') as HTMLElement
    expect(bar.style.width).toBe('50%')
  })

  it('formats values with locale strings by default', () => {
    render(<BarRow rows={ROWS} />)
    expect(screen.getByText('11,421')).toBeInTheDocument()
  })

  it('honours a custom formatter', () => {
    render(<BarRow rows={[{ label: 'X', value: 12 }]} fmt={(n) => `${n} cases`} />)
    expect(screen.getByText('12 cases')).toBeInTheDocument()
  })

  it('renders a 0% bar when max is 0', () => {
    const { container } = render(
      <BarRow rows={[{ label: 'X', value: 0 }]} max={0} />,
    )
    const bar = container.querySelector('[role="meter"] > div') as HTMLElement
    expect(bar.style.width).toBe('0%')
  })
})
