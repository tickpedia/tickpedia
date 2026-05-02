import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeBar } from '../ThemeBar.js'
import { THEMES, THEME_LABELS, STORAGE_KEY } from '../themes.js'

describe('ThemeBar', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders a button per theme', () => {
    render(<ThemeBar />)
    for (const t of THEMES) {
      expect(screen.getByRole('button', { name: THEME_LABELS[t] })).toBeInTheDocument()
    }
  })

  it('marks the active theme with aria-pressed=true', () => {
    render(<ThemeBar />)
    const paperBtn = screen.getByRole('button', { name: THEME_LABELS.paper })
    expect(paperBtn).toHaveAttribute('aria-pressed', 'true')

    const nightBtn = screen.getByRole('button', { name: THEME_LABELS.night })
    expect(nightBtn).toHaveAttribute('aria-pressed', 'false')
  })

  it('switches the active theme on click', () => {
    render(<ThemeBar />)
    fireEvent.click(screen.getByRole('button', { name: THEME_LABELS.night }))

    const nightBtn = screen.getByRole('button', { name: THEME_LABELS.night })
    expect(nightBtn).toHaveAttribute('aria-pressed', 'true')
    expect(document.documentElement.getAttribute('data-theme')).toBe('night')
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('night')
  })

  it('exposes itself as a labelled group', () => {
    render(<ThemeBar />)
    expect(screen.getByRole('group', { name: /theme/i })).toBeInTheDocument()
  })
})
