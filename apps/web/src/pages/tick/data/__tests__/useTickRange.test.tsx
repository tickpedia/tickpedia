import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SSRDataProvider } from '../../../../ssr/SSRDataProvider.js'

const mocks = vi.hoisted(() => ({
  byState: vi.fn(),
  spread: vi.fn(),
}))

vi.mock('../../../../lib/beam.js', () => ({
  beam: {
    tickCounty: {
      analyze: {
        establishedByState: mocks.byState,
        spreadOverTime: mocks.spread,
      },
    },
  },
}))

import { useTickRange, tickRangeCacheKey } from '../useTickRange.js'

describe('useTickRange · SSR cache integration', () => {
  beforeEach(() => {
    mocks.byState.mockReset()
    mocks.spread.mockReset()
  })

  it('returns cached range data synchronously and skips the fetch', async () => {
    mocks.byState.mockResolvedValue({ buckets: [] })
    mocks.spread.mockResolvedValue({ buckets: [] })
    const cached = {
      byStateFips: { '23': 14, '36': 22 },
      spread: [{ year: 2020, counties: 100 }],
    }
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{ [tickRangeCacheKey(1)]: cached }}>{children}</SSRDataProvider>
    )
    const { result } = renderHook(() => useTickRange(1), { wrapper })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toEqual(cached)
    await new Promise((r) => setTimeout(r, 10))
    expect(mocks.byState).not.toHaveBeenCalled()
    expect(mocks.spread).not.toHaveBeenCalled()
  })

  it('falls through to fetch when cache misses', async () => {
    mocks.byState.mockResolvedValue({
      buckets: [{ dims: { stateFips: '23' }, measures: { counties: 16 } }],
    })
    mocks.spread.mockResolvedValue({
      buckets: [{ dims: { year: 2022 }, measures: { counties: 88 } }],
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{}}>{children}</SSRDataProvider>
    )
    const { result } = renderHook(() => useTickRange(1), { wrapper })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.byStateFips).toEqual({ '23': 16 })
    expect(result.current.data?.spread).toEqual([{ year: 2022, counties: 88 }])
  })

  it('short-circuits while tickId is null', () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{}}>{children}</SSRDataProvider>
    )
    const { result } = renderHook(() => useTickRange(null), { wrapper })
    expect(result.current.loading).toBe(true)
    expect(mocks.byState).not.toHaveBeenCalled()
  })
})
