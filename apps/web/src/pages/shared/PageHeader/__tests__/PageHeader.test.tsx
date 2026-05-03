import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader, sectionFor } from '../index.js'

describe('PageHeader', () => {
  it('renders the brand mark linking back to /', () => {
    render(<PageHeader />)
    const mark = screen.getByLabelText(/tickpedia home/i)
    expect(mark).toHaveAttribute('href', '/')
  })

  it('renders the seven primary nav links', () => {
    render(<PageHeader />)
    for (const label of ['Home', 'Ticks', 'Diseases', 'Techniques', 'Risk map', 'Wild facts', 'Sources']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument()
    }
  })

  it('marks the active section with aria-current="page"', () => {
    render(<PageHeader active="ticks" />)
    const ticks = screen.getByRole('link', { name: 'Ticks' })
    expect(ticks).toHaveAttribute('aria-current', 'page')
    const diseases = screen.getByRole('link', { name: 'Diseases' })
    expect(diseases).not.toHaveAttribute('aria-current')
  })

  it('omits aria-current on every link when no active section is supplied', () => {
    render(<PageHeader />)
    for (const name of ['Home', 'Ticks', 'Diseases']) {
      expect(screen.getByRole('link', { name }))
        .not.toHaveAttribute('aria-current')
    }
  })
})

describe('sectionFor', () => {
  it('maps tick-* kinds to the ticks section', () => {
    expect(sectionFor('tick')).toBe('ticks')
    expect(sectionFor('tick-range')).toBe('ticks')
    expect(sectionFor('tick-diseases')).toBe('ticks')
    expect(sectionFor('tick-removal')).toBe('ticks')
    expect(sectionFor('ticks-index')).toBe('ticks')
  })

  it('maps disease-* kinds to the diseases section', () => {
    expect(sectionFor('disease')).toBe('diseases')
    expect(sectionFor('disease-states')).toBe('diseases')
    expect(sectionFor('diseases-index')).toBe('diseases')
  })

  it('maps technique kinds to techniques', () => {
    expect(sectionFor('technique')).toBe('techniques')
    expect(sectionFor('techniques-index')).toBe('techniques')
  })

  it('maps risk kinds to risk', () => {
    expect(sectionFor('risk')).toBe('risk')
    expect(sectionFor('risk-disease')).toBe('risk')
  })

  it('maps facts to facts', () => {
    expect(sectionFor('facts-index')).toBe('facts')
    expect(sectionFor('fact')).toBe('facts')
  })

  it('returns undefined for kinds that do not have a top-level section', () => {
    expect(sectionFor('search')).toBeUndefined()
    expect(sectionFor('not-found')).toBeUndefined()
    expect(sectionFor('about')).toBeUndefined()
  })
})
