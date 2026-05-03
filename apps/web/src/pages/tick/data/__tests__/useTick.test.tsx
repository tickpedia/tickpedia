import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SSRDataProvider } from '../../../../ssr/SSRDataProvider.js'

// Behavioural contract for useTick: SSR-cache hits must short-circuit
// the network round-trip on first render so the hydrated DOM matches
// the prerendered HTML; misses must fall through to the existing
// fetch path.

const mocks = vi.hoisted(() => ({
  ticksQuery: vi.fn(),
}))

vi.mock('../../../../lib/beam.js', () => ({
  beam: { ticks: { query: mocks.ticksQuery } },
}))

import { useTick, tickCacheKey } from '../useTick.js'

const TICK = {
  id: 1,
  slug: 'blacklegged-tick',
  commonName: 'Blacklegged tick',
  scientificName: 'Ixodes scapularis',
  oneLiner: 'Vector of Lyme.',
  heroPhotoUrl: null,
  heroHeadColor: null,
  heroBodyColor: null,
  heroLegColor: null,
  dangerLevel: 'high' as const,
}

describe('useTick · SSR cache integration', () => {
  beforeEach(() => {
    mocks.ticksQuery.mockReset()
  })

  it('returns cached tick synchronously on first render and skips the fetch', async () => {
    mocks.ticksQuery.mockResolvedValue({ rows: [] }) // would 404 if called
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{ [tickCacheKey('blacklegged-tick')]: TICK }}>{children}</SSRDataProvider>
    )
    const { result } = renderHook(() => useTick('blacklegged-tick'), { wrapper })

    expect(result.current.status).toBe('ok')
    expect(result.current.tick).toEqual(TICK)
    // Give the effect a tick — it should still not fire.
    await new Promise((r) => setTimeout(r, 10))
    expect(mocks.ticksQuery).not.toHaveBeenCalled()
  })

  it('falls through to fetch when cache misses', async () => {
    mocks.ticksQuery.mockResolvedValue({ rows: [TICK] })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{}}>{children}</SSRDataProvider>
    )
    const { result } = renderHook(() => useTick('blacklegged-tick'), { wrapper })

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('ok'))
    expect(result.current.tick?.slug).toBe('blacklegged-tick')
    expect(mocks.ticksQuery).toHaveBeenCalledOnce()
  })

  it('refetches on slug change when the new slug is not cached', async () => {
    mocks.ticksQuery.mockResolvedValue({ rows: [TICK] })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{ [tickCacheKey('blacklegged-tick')]: TICK }}>{children}</SSRDataProvider>
    )
    const { result, rerender } = renderHook(({ slug }: { slug: string }) => useTick(slug), {
      wrapper,
      initialProps: { slug: 'blacklegged-tick' },
    })
    expect(mocks.ticksQuery).not.toHaveBeenCalled()

    rerender({ slug: 'lone-star-tick' })
    await waitFor(() => expect(result.current.status).toBe('ok'))
    expect(mocks.ticksQuery).toHaveBeenCalledOnce()
    expect(mocks.ticksQuery).toHaveBeenCalledWith(expect.objectContaining({ where: { slug: 'lone-star-tick' } }))
  })

  it('reports not-found when the fetch returns no rows', async () => {
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{}}>{children}</SSRDataProvider>
    )
    const { result } = renderHook(() => useTick('not-real'), { wrapper })
    await waitFor(() => expect(result.current.status).toBe('not-found'))
  })
})
