import { createContext, useContext, type ReactNode } from 'react'

// SSR data cache: per-render dictionary keyed by `<hook>:<arg>` (e.g.
// `tick:lone-star-tick`). The prerender script populates this on the
// server; on the client, `entry-client.tsx` reads `window.__TICKPEDIA_DATA__`
// and feeds it back in. Hooks read their entry on first render to skip
// the fetch and keep server / client output in sync.
//
// An empty cache means "no SSR data" — every hook falls back to its
// existing fetch effect. That keeps dev mode (no prerender step) and
// not-yet-prerendered pages working.

export type DataCache = Readonly<Record<string, unknown>>

const EMPTY: DataCache = Object.freeze({})

const SSRDataContext = createContext<DataCache>(EMPTY)

export interface SSRDataProviderProps {
  data: DataCache
  children: ReactNode
}

export function SSRDataProvider({ data, children }: SSRDataProviderProps) {
  return <SSRDataContext.Provider value={data}>{children}</SSRDataContext.Provider>
}

/** Read a typed entry from the cache. Returns `undefined` if absent. */
export function useSSRData<T>(key: string): T | undefined {
  return useContext(SSRDataContext)[key] as T | undefined
}

/** Browser-side cache injection key. */
export const WINDOW_DATA_KEY = '__TICKPEDIA_DATA__'

/**
 * Pull whatever the server inlined onto `window` into a cache shape.
 * Safe to call at module load on the client; returns an empty cache
 * when no inline payload is present (dev mode, unprerendered URL).
 */
export function readWindowDataCache(): DataCache {
  if (typeof window === 'undefined') return EMPTY
  const w = window as unknown as Record<string, unknown>
  const raw = w[WINDOW_DATA_KEY]
  if (raw === undefined || raw === null) return EMPTY
  if (typeof raw !== 'object') return EMPTY
  return raw as DataCache
}
