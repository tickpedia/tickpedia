import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Stat } from '../index.js'

describe('Stat', () => {
  it('renders the value, label, and sub-line', () => {
    render(<Stat value="412" label="Counties established" sub="of 3 146" />)
    expect(screen.getByText('412')).toBeInTheDocument()
    expect(screen.getByText('Counties established')).toBeInTheDocument()
    expect(screen.getByText('of 3 146')).toBeInTheDocument()
  })

  it('omits the sub-line when none is supplied', () => {
    const { container } = render(<Stat value="5" label="Diseases" />)
    expect(container.querySelector('.s')).toBeNull()
  })

  it('renders the value verbatim — formatting is the caller’s job', () => {
    render(<Stat value="36–48 h" label="Lyme transmission" sub="post-attachment" />)
    expect(screen.getByText('36–48 h')).toBeInTheDocument()
  })

  it('exposes the label as the structural .l class', () => {
    const { container } = render(<Stat value="9" label="Counts" />)
    expect(container.querySelector('.l')?.textContent).toBe('Counts')
  })
})
