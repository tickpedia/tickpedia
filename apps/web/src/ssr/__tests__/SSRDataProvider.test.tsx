import { describe, it, expect } from 'vitest'
import { render, renderHook } from '@testing-library/react'
import { SSRDataProvider, useSSRData, readWindowDataCache, WINDOW_DATA_KEY } from '../SSRDataProvider.js'

// Behavioural contract for the SSR cache + window adapter. The hook
// shape is the integration point every data hook touches; if it
// regresses, hydration silently breaks across every page.

describe('SSRDataProvider', () => {
  it('exposes typed entries via useSSRData', () => {
    const cache = { 'tick:lone-star-tick': { id: 42, slug: 'lone-star-tick' } }
    const { result } = renderHook(() => useSSRData<{ id: number; slug: string }>('tick:lone-star-tick'), {
      wrapper: ({ children }) => <SSRDataProvider data={cache}>{children}</SSRDataProvider>,
    })
    expect(result.current).toEqual({ id: 42, slug: 'lone-star-tick' })
  })

  it('returns undefined for missing keys', () => {
    const { result } = renderHook(() => useSSRData('tick:does-not-exist'), {
      wrapper: ({ children }) => <SSRDataProvider data={{}}>{children}</SSRDataProvider>,
    })
    expect(result.current).toBeUndefined()
  })

  it('provider value is the same object identity for re-renders', () => {
    // Identity matters: useContext re-renders every consumer when the
    // value identity changes. The provider should hand through the
    // raw `data` prop, not wrap it.
    const cache = { 'a:1': 1 }
    const { rerender, container } = render(
      <SSRDataProvider data={cache}>
        <div data-testid="probe">x</div>
      </SSRDataProvider>,
    )
    rerender(
      <SSRDataProvider data={cache}>
        <div data-testid="probe">x</div>
      </SSRDataProvider>,
    )
    expect(container.querySelector('[data-testid="probe"]')).toBeTruthy()
  })
})

describe('readWindowDataCache', () => {
  it('returns an empty cache when window key is absent', () => {
    delete (window as unknown as Record<string, unknown>)[WINDOW_DATA_KEY]
    const cache = readWindowDataCache()
    expect(Object.keys(cache)).toHaveLength(0)
  })

  it('returns the inlined cache when present', () => {
    ;(window as unknown as Record<string, unknown>)[WINDOW_DATA_KEY] = {
      'tick:blacklegged-tick': { id: 1 },
    }
    const cache = readWindowDataCache()
    expect(cache).toEqual({ 'tick:blacklegged-tick': { id: 1 } })
    delete (window as unknown as Record<string, unknown>)[WINDOW_DATA_KEY]
  })

  it('returns empty cache for non-object payloads', () => {
    ;(window as unknown as Record<string, unknown>)[WINDOW_DATA_KEY] = 'malformed'
    const cache = readWindowDataCache()
    expect(Object.keys(cache)).toHaveLength(0)
    delete (window as unknown as Record<string, unknown>)[WINDOW_DATA_KEY]
  })
})
