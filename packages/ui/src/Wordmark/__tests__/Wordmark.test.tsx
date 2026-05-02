import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Wordmark } from '../index.js'

describe('Wordmark', () => {
  it('renders the literal "Tickpedia" text (across the Tick + em split)', () => {
    const { container } = render(<Wordmark />)
    expect(container.textContent).toBe('Tickpedia')
  })

  it('wraps the "pedia" half in an <em> for the brand italic', () => {
    const { container } = render(<Wordmark />)
    const em = container.querySelector('em')
    expect(em).not.toBeNull()
    expect(em!.textContent).toBe('pedia')
  })

  it('keeps "Tick" outside the <em>', () => {
    const { container } = render(<Wordmark />)
    const span = container.querySelector('span')
    expect(span!.firstChild?.textContent).toBe('Tick')
  })

  it('honours the `size` prop in the inline font-size', () => {
    const { container } = render(<Wordmark size={48} />)
    const span = container.querySelector('span')
    expect(span!.style.fontSize).toBe('48px')
  })

  it('uses the brand serif stack', () => {
    const { container } = render(<Wordmark />)
    const span = container.querySelector('span')
    expect(span!.style.fontFamily).toContain('Newsreader')
  })

  it('passes through className + style overrides', () => {
    const { container } = render(
      <Wordmark className="brand" style={{ letterSpacing: '0.1em' }} />,
    )
    const span = container.querySelector('span')
    expect(span!.className).toBe('brand')
    expect(span!.style.letterSpacing).toBe('0.1em')
  })
})
