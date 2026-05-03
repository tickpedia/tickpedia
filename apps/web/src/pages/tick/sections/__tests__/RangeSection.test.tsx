import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { topStatesRows, RangeSection } from '../RangeSection.js'
import type { TickRangeData } from '../../data/useTickRange.js'

describe('topStatesRows', () => {
  it('returns an empty list when data is null', () => {
    expect(topStatesRows(null)).toEqual([])
  })

  it('drops zero-count rows', () => {
    const data: TickRangeData = {
      byStateFips: { '23': 5, '25': 0, '06': 1 },
      spread: [],
    }
    const rows = topStatesRows(data)
    expect(rows.map((r) => r.label)).toEqual(['Maine', 'California'])
  })

  it('sorts descending by count and assigns ranks', () => {
    const data: TickRangeData = {
      byStateFips: { '23': 5, '25': 14, '06': 1, '37': 8 },
      spread: [],
    }
    const rows = topStatesRows(data)
    expect(rows[0]).toMatchObject({ rank: 1, label: 'Massachusetts', value: 14 })
    expect(rows[1]).toMatchObject({ rank: 2, label: 'North Carolina', value: 8 })
    expect(rows[2]).toMatchObject({ rank: 3, label: 'Maine', value: 5 })
    expect(rows[3]).toMatchObject({ rank: 4, label: 'California', value: 1 })
  })

  it('caps the leaderboard at 8 rows', () => {
    const byStateFips: Record<string, number> = {}
    // 12 states, descending counts
    const fips = ['23', '25', '37', '36', '42', '17', '06', '12', '13', '01', '04', '20']
    fips.forEach((f, i) => { byStateFips[f] = 100 - i })
    const rows = topStatesRows({ byStateFips, spread: [] })
    expect(rows).toHaveLength(8)
    expect(rows[0]?.value).toBe(100)
    expect(rows[7]?.value).toBe(93)
  })

  it('builds /states/[slug] hrefs for known states', () => {
    const data: TickRangeData = {
      byStateFips: { '37': 10 }, // North Carolina
      spread: [],
    }
    const [row] = topStatesRows(data)
    expect(row?.href).toBe('/states/north-carolina')
  })

  it('skips FIPS codes that don’t resolve (e.g. territories)', () => {
    const data: TickRangeData = {
      byStateFips: { '72': 50, '23': 5 }, // 72 = PR, not in the table
      spread: [],
    }
    const rows = topStatesRows(data)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.label).toBe('Maine')
  })
})

describe('RangeSection', () => {
  it('renders the leaderboard caption + the top state name when data is present', () => {
    const data: TickRangeData = {
      byStateFips: { '23': 14, '25': 12 },
      spread: [],
    }
    render(
      <RangeSection
        tickSlug="blacklegged-tick"
        tickCommon="Blacklegged tick"
        data={data}
        loading={false}
        error={null}
      />,
    )
    expect(screen.getByTestId('range-summary')).toBeInTheDocument()
    expect(screen.getByText(/top 2 states/i)).toBeInTheDocument()
    // Use a link-role query so we don't double-count any text inside SVG <title>.
    expect(screen.getByRole('link', { name: 'Maine' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Massachusetts' })).toBeInTheDocument()
  })

  it('shows the empty-state copy when no states have establishments', () => {
    render(
      <RangeSection
        tickSlug="lone-star-tick"
        tickCommon="Lone star tick"
        data={{ byStateFips: {}, spread: [] }}
        loading={false}
        error={null}
      />,
    )
    expect(screen.getByText(/no cdc-reported established counties yet/i)).toBeInTheDocument()
    expect(screen.queryByText(/top \d+ states/i)).toBeNull()
  })

  it('shows an error message when the section is in error state', () => {
    render(
      <RangeSection
        tickSlug="x"
        tickCommon="X"
        data={null}
        loading={false}
        error={new Error('boom')}
      />,
    )
    expect(screen.getByText(/failed to load range data: boom/i)).toBeInTheDocument()
  })
})
