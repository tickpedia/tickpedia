import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  ticksQuery: vi.fn(),
  tickCountyByState: vi.fn(),
  tickCountySpread: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    ticks: { query: mocks.ticksQuery },
    tickCounty: {
      analyze: {
        establishedByState: mocks.tickCountyByState,
        spreadOverTime: mocks.tickCountySpread,
      },
    },
    // Unused on this page but the data hooks may pull these — provide stubs.
    tickDiseases: { query: vi.fn().mockResolvedValue({ rows: [] }) },
    diseases: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  },
}))

import { TickRangePage } from '../TickRangePage.js'

describe('TickRangePage', () => {
  beforeEach(() => {
    mocks.ticksQuery.mockReset()
    mocks.tickCountyByState.mockReset()
    mocks.tickCountySpread.mockReset()
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
  })

  // Read the .v cell from the Stat block whose .l label matches.
  // Avoids collisions with chart y-axis tick labels that may also
  // render the same number.
  function statValue(label: string): string | null | undefined {
    const labelEl = screen.getByText(label)
    return labelEl.parentElement?.querySelector('.v')?.textContent
  }

  function setupTickAndRange() {
    mocks.ticksQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'blacklegged-tick',
          commonName: 'Blacklegged tick',
          scientificName: 'Ixodes scapularis',
          oneLiner: 'x',
          heroPhotoUrl: null,
          heroHeadColor: null,
          heroBodyColor: null,
          heroLegColor: null,
          dangerLevel: 'high',
        },
      ],
    })
    mocks.tickCountyByState.mockResolvedValue({
      buckets: [
        { dims: { stateFips: '25' }, measures: { counties: 14 } },
        { dims: { stateFips: '23' }, measures: { counties: 16 } },
        { dims: { stateFips: '36' }, measures: { counties: 30 } },
      ],
    })
    mocks.tickCountySpread.mockResolvedValue({
      buckets: [
        { dims: { year: 2020 }, measures: { counties: 100 } },
        { dims: { year: 2021 }, measures: { counties: 110 } },
        { dims: { year: 2022 }, measures: { counties: 120 } },
      ],
    })
  }

  it('renders the focused range page with H1 and breadcrumb', async () => {
    setupTickAndRange()
    render(<TickRangePage slug="blacklegged-tick" />)
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /where blacklegged tick is established/i }),
      ).toBeInTheDocument()
    })
    // Breadcrumb has a link back to the parent tick page.
    expect(screen.getByRole('link', { name: 'Blacklegged tick' })).toHaveAttribute(
      'href',
      '/ticks/blacklegged-tick',
    )
  })

  it('shows total counties + state count + YoY delta from the spread series', async () => {
    setupTickAndRange()
    render(<TickRangePage slug="blacklegged-tick" />)
    await waitFor(() => {
      expect(statValue('Counties established')).toBe('60') // total: 14 + 16 + 30
    })
    expect(statValue('States with at least one')).toBe('3')
    expect(statValue('Year-over-year')).toBe('+10') // 120 - 110 = +10
  })

  it('renders the spread line chart', async () => {
    setupTickAndRange()
    render(<TickRangePage slug="blacklegged-tick" />)
    await waitFor(() => {
      expect(
        screen.getByRole('img', { name: /established counties per year/i }),
      ).toBeInTheDocument()
    })
  })

  it('sets the canonical link to the /range URL (not the tick URL)', async () => {
    setupTickAndRange()
    render(<TickRangePage slug="blacklegged-tick" />)
    await waitFor(() => {
      expect(
        document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
      ).toBe('https://tickpedia.com/ticks/blacklegged-tick/range')
    })
  })

  it('shows a single-year sentence (no line chart) when only one year is present', async () => {
    setupTickAndRange()
    mocks.tickCountySpread.mockResolvedValue({
      buckets: [{ dims: { year: 2025 }, measures: { counties: 1297 } }],
    })
    render(<TickRangePage slug="blacklegged-tick" />)
    await waitFor(() => {
      expect(screen.getByText(/1,297 counties established as of 2025/i)).toBeInTheDocument()
    })
    // The line chart would have this aria-label; assert it's absent.
    expect(
      screen.queryByRole('img', { name: /established counties per year/i }),
    ).toBeNull()
  })

  it('renders a not-found state for an unknown slug', async () => {
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.tickCountyByState.mockResolvedValue({ buckets: [] })
    mocks.tickCountySpread.mockResolvedValue({ buckets: [] })
    render(<TickRangePage slug="nope" />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tick not found/i })).toBeInTheDocument()
    })
  })
})
