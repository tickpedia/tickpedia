import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { SSRDataProvider } from '../../../../ssr/SSRDataProvider.js'

const mocks = vi.hoisted(() => ({
  tickDiseasesQuery: vi.fn(),
  diseasesQuery: vi.fn(),
}))

vi.mock('../../../../lib/beam.js', () => ({
  beam: {
    tickDiseases: { query: mocks.tickDiseasesQuery },
    diseases: { query: mocks.diseasesQuery },
  },
}))

import { useTickDiseases, tickDiseasesCacheKey } from '../useTickDiseases.js'

describe('useTickDiseases · SSR cache integration', () => {
  beforeEach(() => {
    mocks.tickDiseasesQuery.mockReset()
    mocks.diseasesQuery.mockReset()
  })

  it('returns cached disease list synchronously and skips both fetches', async () => {
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })
    const cached = [
      { id: 5, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'A bacterial infection.' },
    ]
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{ [tickDiseasesCacheKey(1)]: cached }}>{children}</SSRDataProvider>
    )
    const { result } = renderHook(() => useTickDiseases(1), { wrapper })

    expect(result.current.loading).toBe(false)
    expect(result.current.rows).toEqual(cached)
    await new Promise((r) => setTimeout(r, 10))
    expect(mocks.tickDiseasesQuery).not.toHaveBeenCalled()
    expect(mocks.diseasesQuery).not.toHaveBeenCalled()
  })

  it('falls through to fetch when cache misses', async () => {
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [{ diseaseId: 5 }] })
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        { id: 5, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'x' },
        { id: 6, slug: 'rmsf', displayName: 'RMSF', oneLiner: null },
      ],
    })
    const wrapper = ({ children }: { children: ReactNode }) => (
      <SSRDataProvider data={{}}>{children}</SSRDataProvider>
    )
    const { result } = renderHook(() => useTickDiseases(1), { wrapper })

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.rows).toEqual([
      { id: 5, slug: 'lyme-disease', displayName: 'Lyme disease', oneLiner: 'x' },
    ])
  })
})
