import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'

vi.mock('../lib/beam', () => ({
  beam: {
    states: { query: vi.fn() },
    ticks: { search: vi.fn() },
  },
}))

import { App } from '../App'
import { beam } from '../lib/beam'

const mockedStates = beam.states.query as unknown as ReturnType<typeof vi.fn>
const mockedTicks = beam.ticks.search as unknown as ReturnType<typeof vi.fn>

describe('App', () => {
  beforeEach(() => {
    mockedStates.mockReset()
    mockedTicks.mockReset()
    mockedStates.mockResolvedValue({ rows: [] })
    mockedTicks.mockResolvedValue({ results: [] })
  })

  it('renders the brand', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: /tickpedia/i })).toBeInTheDocument()
  })

  it('renders the tagline', () => {
    render(<App />)
    expect(screen.getByTestId('tagline')).toHaveTextContent(/ticks by region/i)
  })

  it('renders the search box and lens result lists', () => {
    render(<App />)
    expect(screen.getByRole('searchbox', { name: /search states or ticks/i })).toBeInTheDocument()
    expect(screen.getByTestId('results-states')).toBeInTheDocument()
    expect(screen.getByTestId('results-ticks')).toBeInTheDocument()
  })

  it('fires both lens calls (debounced) once the user types', async () => {
    render(<App />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'mass' } })

    await waitFor(() => {
      expect(mockedStates).toHaveBeenCalled()
      expect(mockedTicks).toHaveBeenCalled()
    })

    expect(mockedStates).toHaveBeenLastCalledWith({
      where: {
        $or: [{ name: { $contains: 'mass' } }, { slug: { $contains: 'mass' } }],
      },
      limit: 5,
    })
    expect(mockedTicks).toHaveBeenLastCalledWith({ query: 'mass', limit: 5 })
  })

  it('does not call the API for empty input', async () => {
    render(<App />)
    await new Promise((r) => setTimeout(r, 200))
    expect(mockedStates).not.toHaveBeenCalled()
    expect(mockedTicks).not.toHaveBeenCalled()
  })
})
