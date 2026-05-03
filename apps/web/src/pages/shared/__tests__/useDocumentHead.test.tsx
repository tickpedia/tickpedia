import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useDocumentHead } from '../useDocumentHead.js'

describe('useDocumentHead', () => {
  beforeEach(() => {
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  it('sets document.title on mount', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'Blacklegged tick — Ticks | Tickpedia',
        canonicalPath: '/ticks/blacklegged-tick',
      }),
    )
    expect(document.title).toBe('Blacklegged tick — Ticks | Tickpedia')
  })

  it('creates a <link rel="canonical"> with the absolute URL', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'x',
        canonicalPath: '/ticks/blacklegged-tick',
      }),
    )
    const link = document.head.querySelector('link[rel="canonical"]')
    expect(link).not.toBeNull()
    expect(link?.getAttribute('href')).toBe('https://tickpedia.com/ticks/blacklegged-tick')
  })

  it('honours a custom origin', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'x',
        canonicalPath: '/ticks/blacklegged-tick',
        origin: 'http://localhost:5173',
      }),
    )
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('http://localhost:5173/ticks/blacklegged-tick')
  })

  it('updates an existing canonical link rather than appending duplicates', () => {
    const existing = document.createElement('link')
    existing.setAttribute('rel', 'canonical')
    existing.setAttribute('href', '/old')
    document.head.appendChild(existing)

    renderHook(() =>
      useDocumentHead({ title: 'x', canonicalPath: '/new' }),
    )

    const links = document.head.querySelectorAll('link[rel="canonical"]')
    expect(links).toHaveLength(1)
    expect(links[0]?.getAttribute('href')).toBe('https://tickpedia.com/new')
  })

  it('sets a meta description when supplied', () => {
    renderHook(() =>
      useDocumentHead({
        title: 'x',
        canonicalPath: '/ticks/blacklegged-tick',
        description: 'Principal vector of Lyme disease in the eastern US.',
      }),
    )
    const meta = document.head.querySelector('meta[name="description"]')
    expect(meta?.getAttribute('content')).toBe(
      'Principal vector of Lyme disease in the eastern US.',
    )
  })

  it('does not touch meta description when none is supplied', () => {
    renderHook(() =>
      useDocumentHead({ title: 'x', canonicalPath: '/foo' }),
    )
    expect(document.head.querySelector('meta[name="description"]')).toBeNull()
  })
})
