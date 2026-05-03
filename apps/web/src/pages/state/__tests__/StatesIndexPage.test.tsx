import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  statesQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    states: { query: mocks.statesQuery },
  },
}))

import { StatesIndexPage } from '../StatesIndexPage.js'

describe('StatesIndexPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
  })

  it('renders rows alphabetically with /states/[slug] links', async () => {
    mocks.statesQuery.mockResolvedValue({
      rows: [
        // Returned in arbitrary order — the hook sorts.
        { fips: '23', code: 'ME', slug: 'maine', name: 'Maine' },
        { fips: '02', code: 'AK', slug: 'alaska', name: 'Alaska' },
        { fips: '01', code: 'AL', slug: 'alabama', name: 'Alabama' },
      ],
    })

    render(<StatesIndexPage />)

    await waitFor(() => {
      expect(screen.getByRole('link', { name: /alabama/i })).toHaveAttribute(
        'href',
        '/states/alabama',
      )
    })
    const table = screen.getByTestId('states-index-table')
    const linkTitles = within(table)
      .getAllByRole('link')
      .map((a) => a.textContent ?? '')
    expect(linkTitles).toEqual(['Alabama', 'Alaska', 'Maine'])

    expect(within(table).getByText('ME')).toBeInTheDocument()
    expect(within(table).getByText('23')).toBeInTheDocument()
  })

  it('sets the canonical link to /states', async () => {
    mocks.statesQuery.mockResolvedValue({ rows: [] })
    render(<StatesIndexPage />)

    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/states')
    })
  })
})
