import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Crumb } from '../index.js'

describe('Crumb', () => {
  it('renders each item in order', () => {
    render(
      <Crumb
        items={[
          { label: 'Tickpedia', href: '/' },
          { label: 'Ticks', href: '/ticks' },
          { label: 'Blacklegged tick' },
        ]}
      />,
    )
    const nav = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(nav).toBeInTheDocument()
    // textContent collapses inline children with no whitespace, so just
    // check the labels appear in order with separators between.
    expect(nav.textContent).toBe('Tickpedia/Ticks/Blacklegged tick')
  })

  it('renders intermediate items as links', () => {
    render(
      <Crumb
        items={[
          { label: 'Tickpedia', href: '/' },
          { label: 'Ticks', href: '/ticks' },
          { label: 'Blacklegged tick' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Tickpedia' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Ticks' })).toHaveAttribute('href', '/ticks')
  })

  it('renders the last item as the current page (no link, aria-current="page")', () => {
    render(<Crumb items={[{ label: 'Ticks', href: '/ticks' }, { label: 'Blacklegged tick' }]} />)
    const current = screen.getByText('Blacklegged tick')
    expect(current.tagName.toLowerCase()).toBe('span')
    expect(current).toHaveAttribute('aria-current', 'page')
  })

  it('omits the trailing separator', () => {
    const { container } = render(
      <Crumb items={[{ label: 'Tickpedia', href: '/' }, { label: 'Ticks' }]} />,
    )
    const seps = container.querySelectorAll('.sep')
    expect(seps).toHaveLength(1)
  })

  it('handles a single-item breadcrumb (just the current page)', () => {
    render(<Crumb items={[{ label: 'Tickpedia' }]} />)
    expect(screen.getByText('Tickpedia')).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link')).toBeNull()
  })
})
