import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TickCrest } from '../index.js'

const COLORS = { headColor: '#1c1814', bodyColor: '#8a2a1a', legColor: '#1c1814' }

describe('TickCrest', () => {
  it('renders an SVG with a descriptive aria-label', () => {
    render(
      <TickCrest
        colors={COLORS}
        size="hero"
        common="Blacklegged"
        scientific="Ixodes scapularis"
      />,
    )
    const svg = screen.getByRole('img', { name: /blacklegged \(ixodes scapularis\) crest/i })
    expect(svg).toBeInTheDocument()
    expect(svg.tagName.toLowerCase()).toBe('svg')
  })

  it('uses the explicit size in pixels', () => {
    const { container } = render(
      <TickCrest colors={COLORS} size="badge" scientific="Ixodes scapularis" />,
    )
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg!.getAttribute('width')).toBe('28')
    expect(svg!.getAttribute('height')).toBe('28')
  })

  it('renders ring text only on tile + hero, never on badge', () => {
    const badge = render(
      <TickCrest colors={COLORS} size="badge" scientific="Ixodes scapularis" />,
    )
    expect(badge.container.querySelector('textPath')).toBeNull()
    badge.unmount()

    const tile = render(
      <TickCrest colors={COLORS} size="tile" scientific="Ixodes scapularis" />,
    )
    const textPaths = tile.container.querySelectorAll('textPath')
    expect(textPaths.length).toBeGreaterThan(0)
  })

  it('renders the family epithet on hero size only', () => {
    const tile = render(
      <TickCrest colors={COLORS} size="tile" scientific="Ixodes scapularis" />,
    )
    expect(tile.container.querySelectorAll('textPath').length).toBe(1)
    tile.unmount()

    const hero = render(
      <TickCrest colors={COLORS} size="hero" scientific="Ixodes scapularis" />,
    )
    expect(hero.container.querySelectorAll('textPath').length).toBe(2)
  })

  it('falls back to default colors when a color slot is null', () => {
    const { container } = render(
      <TickCrest
        colors={{ headColor: null, bodyColor: null, legColor: null }}
        size="tile"
      />,
    )
    const ellipse = container.querySelector('ellipse[rx="14"]')
    expect(ellipse).not.toBeNull()
    expect(ellipse!.getAttribute('fill')).toBe('#7a4a2a')
  })

  it('uses provided colors verbatim', () => {
    const { container } = render(
      <TickCrest
        colors={{ headColor: '#abcdef', bodyColor: '#123456', legColor: '#000000' }}
        size="tile"
      />,
    )
    const body = container.querySelector('ellipse[rx="14"]')
    expect(body!.getAttribute('fill')).toBe('#123456')
    const head = container.querySelector('ellipse[rx="10"]')
    expect(head!.getAttribute('fill')).toBe('#abcdef')
  })

  it('uses unique <defs> path ids for two crests of the same species at different sizes', () => {
    const { container } = render(
      <div>
        <TickCrest colors={COLORS} size="tile" scientific="Ixodes scapularis" />
        <TickCrest colors={COLORS} size="hero" scientific="Ixodes scapularis" />
      </div>,
    )
    const ids = Array.from(container.querySelectorAll('defs path'))
      .map((p) => p.getAttribute('id'))
      .filter((x): x is string => !!x)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('honours ringText={false} even on tile/hero', () => {
    const { container } = render(
      <TickCrest
        colors={COLORS}
        size="hero"
        scientific="Ixodes scapularis"
        ringText={false}
      />,
    )
    expect(container.querySelector('textPath')).toBeNull()
  })

  it('renders 8 leg paths', () => {
    const { container } = render(<TickCrest colors={COLORS} size="hero" />)
    // legs sit inside a <g stroke-width="1.4"> block
    const legGroup = container.querySelector('g[stroke-width="1.4"]')
    expect(legGroup).not.toBeNull()
    const paths = legGroup!.querySelectorAll('path')
    expect(paths.length).toBe(8)
  })
})
