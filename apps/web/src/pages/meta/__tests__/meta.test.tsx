import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AboutPage } from '../AboutPage.js'
import { SourcesPage } from '../SourcesPage.js'
import { ContributePage } from '../ContributePage.js'

describe('meta pages', () => {
  beforeEach(() => {
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  describe('AboutPage', () => {
    it('renders the H1 and the medical-disclaimer anchor section', () => {
      render(<AboutPage />)
      expect(screen.getByRole('heading', { level: 1, name: /^about$/i })).toBeInTheDocument()
      // The footer's medical-disclaimer link points at #medical — the
      // section must exist with that id so the jump lands.
      const medical = document.querySelector('section#medical')
      expect(medical).not.toBeNull()
      expect(medical?.textContent).toMatch(/not medical advice/i)
    })

    it('sets the document title and canonical link', () => {
      render(<AboutPage />)
      expect(document.title).toBe('About | Tickpedia')
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/about')
    })

    it('links to /contribute from the disclaimer paragraph', () => {
      render(<AboutPage />)
      const link = screen.getByRole('link', { name: /open an issue or pr/i })
      expect(link).toHaveAttribute('href', '/contribute')
    })
  })

  describe('SourcesPage', () => {
    it('renders the H1 and at least four source groups', () => {
      render(<SourcesPage />)
      expect(screen.getByRole('heading', { level: 1, name: /^sources$/i })).toBeInTheDocument()
      const groupHeadings = screen.getAllByRole('heading', { level: 2 })
      expect(groupHeadings.length).toBeGreaterThanOrEqual(4)
    })

    it('every external link carries rel="noreferrer"', () => {
      const { container } = render(<SourcesPage />)
      const externalLinks = container.querySelectorAll('a[href^="http"]')
      expect(externalLinks.length).toBeGreaterThan(5)
      externalLinks.forEach((a) => {
        expect(a.getAttribute('rel')).toContain('noreferrer')
      })
    })

    it('sets the document title and canonical link', () => {
      render(<SourcesPage />)
      expect(document.title).toBe('Sources | Tickpedia')
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/sources')
    })
  })

  describe('ContributePage', () => {
    it('renders the H1 and links to the GitHub repo', () => {
      render(<ContributePage />)
      expect(screen.getByRole('heading', { level: 1, name: /^contribute$/i })).toBeInTheDocument()
      const ghLinks = screen.getAllByRole('link', { name: /github\.com\/tickpedia/i })
      expect(ghLinks.length).toBeGreaterThanOrEqual(1)
    })

    it('sets the document title and canonical link', () => {
      render(<ContributePage />)
      expect(document.title).toBe('Contribute | Tickpedia')
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/contribute')
    })
  })
})
