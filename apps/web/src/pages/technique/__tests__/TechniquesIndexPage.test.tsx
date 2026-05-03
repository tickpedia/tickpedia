import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  removalTechniquesQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    removalTechniques: { query: mocks.removalTechniquesQuery },
  },
}))

import { TechniquesIndexPage } from '../TechniquesIndexPage.js'

describe('TechniquesIndexPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
  })

  it('renders rows alphabetically with /techniques/[slug] links', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({
      rows: [
        // Returned in arbitrary order — the hook sorts.
        { id: 2, slug: 'permethrin', title: 'Permethrin treatment', oneLiner: 'Treat clothing.' },
        { id: 1, slug: 'fine-tipped-tweezers', title: 'Fine-tipped tweezers', oneLiner: 'CDC primary method.' },
      ],
    })

    render(<TechniquesIndexPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /fine-tipped tweezers/i })).toHaveAttribute(
        'href',
        '/techniques/fine-tipped-tweezers',
      )
    })
    expect(screen.getByRole('link', { name: /permethrin treatment/i })).toHaveAttribute(
      'href',
      '/techniques/permethrin',
    )

    const table = screen.getByTestId('techniques-index-table')
    const linkTitles = within(table)
      .getAllByRole('link')
      .map((a) => a.textContent ?? '')
    expect(linkTitles).toEqual(['Fine-tipped tweezers', 'Permethrin treatment'])

    // One-liner column is present.
    expect(within(table).getByText(/cdc primary method/i)).toBeInTheDocument()
  })

  it('sets the canonical link to /techniques', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })

    render(<TechniquesIndexPage />)

    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/techniques')
    })
  })

  it('renders an em-dash when oneLiner is null', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({
      rows: [{ id: 1, slug: 't', title: 'T', oneLiner: null }],
    })
    render(<TechniquesIndexPage />)
    await waitFor(() => {
      expect(screen.getByRole('link', { name: /^t$/i })).toBeInTheDocument()
    })
    const table = screen.getByTestId('techniques-index-table')
    expect(within(table).getByText('—')).toBeInTheDocument()
  })
})
