import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DesignShowcase } from '../index.js'

describe('DesignShowcase', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders the phase eyebrow', () => {
    render(<DesignShowcase />)
    expect(
      screen.getByText(/phase 01 — design tokens & brand primitives/i),
    ).toBeInTheDocument()
  })

  it('renders the brand H1', () => {
    render(<DesignShowcase />)
    expect(
      screen.getByRole('heading', { level: 1, name: /encyclopedia/i }),
    ).toBeInTheDocument()
  })

  it('renders the three sample tick crests with accessible labels', () => {
    render(<DesignShowcase />)
    // Blacklegged + Lone Star appear in both the size demo + the species
    // grid; Brown Dog only in the species grid. Use getAllByRole to
    // tolerate the duplicates and assert presence.
    expect(screen.getAllByRole('img', { name: /blacklegged/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('img', { name: /lone star/i }).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByRole('img', { name: /brown dog/i }).length).toBe(1)
  })

  it('renders the palette + data ramp grids', () => {
    render(<DesignShowcase />)
    const grids = screen.getAllByTestId('palette-grid')
    expect(grids.length).toBe(2)
  })

  it('renders the citation atom example', () => {
    render(<DesignShowcase />)
    expect(screen.getByText('CDC')).toBeInTheDocument()
    expect(screen.getByText('NIH')).toBeInTheDocument()
  })

  it('mounts the theme bar', () => {
    render(<DesignShowcase />)
    expect(screen.getByRole('group', { name: /theme/i })).toBeInTheDocument()
  })

  it('uses the design-system container class', () => {
    render(<DesignShowcase />)
    const root = screen.getByTestId('design-showcase')
    expect(root.classList.contains('tp')).toBe(true)
  })
})
