import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Footer } from '../index.js'

describe('Footer', () => {
  it('renders the four column eyebrows', () => {
    render(<Footer now={new Date('2026-05-03')} />)
    expect(screen.getByText(/^Tickpedia$/)).toBeInTheDocument()
    expect(screen.getByText('Browse')).toBeInTheDocument()
    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
  })

  it('renders all six contract meta links', () => {
    render(<Footer now={new Date('2026-05-03')} />)
    // Browse column
    expect(screen.getByRole('link', { name: 'Ticks' })).toHaveAttribute('href', '/ticks')
    expect(screen.getByRole('link', { name: 'Diseases' })).toHaveAttribute('href', '/diseases')
    expect(screen.getByRole('link', { name: 'Techniques' })).toHaveAttribute('href', '/techniques')
    expect(screen.getByRole('link', { name: 'Risk map' })).toHaveAttribute('href', '/risk')
    expect(screen.getByRole('link', { name: 'Wild facts' })).toHaveAttribute('href', '/facts')
    // Project column
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('href', '/about')
    expect(screen.getByRole('link', { name: 'Sources' })).toHaveAttribute('href', '/sources')
    expect(screen.getByRole('link', { name: 'Contribute' })).toHaveAttribute('href', '/contribute')
  })

  it('links to the GitHub repo', () => {
    render(<Footer now={new Date('2026-05-03')} />)
    const gh = screen.getByRole('link', { name: /github\.com\/tickpedia/i })
    expect(gh).toHaveAttribute('href', 'https://github.com/tickpedia/tickpedia')
    expect(gh).toHaveAttribute('rel', 'noreferrer')
  })

  it('shows the current year in the copyright', () => {
    // Mid-year date — January 1 collapses to the prior year in
    // negative-offset timezones (e.g. EST), which would make the
    // assertion flake on developer machines vs CI.
    render(<Footer now={new Date('2030-06-15T12:00:00Z')} />)
    const bottom = screen.getByTestId('footer-bottom')
    expect(bottom.textContent).toMatch(/© 2030/)
  })

  it('has a stable site-footer testid', () => {
    render(<Footer now={new Date('2026-05-03')} />)
    expect(screen.getByTestId('site-footer')).toBeInTheDocument()
  })

  it('carries the medical-disclaimer link in the bottom strip', () => {
    render(<Footer now={new Date('2026-05-03')} />)
    const bottom = screen.getByTestId('footer-bottom')
    expect(bottom.textContent).toMatch(/not medical advice/i)
    // The disclaimer-strip link is the second /about anchor; query
    // by closest ancestor instead of duplicating.
    const links = bottom.querySelectorAll('a[href="/about#medical"]')
    expect(links.length).toBe(1)
  })
})
