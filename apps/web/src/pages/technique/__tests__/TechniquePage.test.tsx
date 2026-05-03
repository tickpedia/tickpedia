import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  removalTechniquesQuery: vi.fn(),
  tickRemovalTechniquesQuery: vi.fn(),
  ticksQuery: vi.fn(),
  tickDiseasesQuery: vi.fn(),
  diseasesQuery: vi.fn(),
}))

vi.mock('../../../lib/beam.js', () => ({
  beam: {
    removalTechniques: { query: mocks.removalTechniquesQuery },
    tickRemovalTechniques: { query: mocks.tickRemovalTechniquesQuery },
    ticks: { query: mocks.ticksQuery },
    tickDiseases: { query: mocks.tickDiseasesQuery },
    diseases: { query: mocks.diseasesQuery },
  },
}))

import { TechniquePage } from '../TechniquePage.js'

describe('TechniquePage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset())
    document.title = ''
    document.head.querySelectorAll('link[rel="canonical"]').forEach((n) => n.remove())
    document.head.querySelectorAll('meta[name="description"]').forEach((n) => n.remove())
  })

  function setupHappyPath() {
    mocks.removalTechniquesQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'fine-tipped-tweezers',
          title: 'Fine-tipped tweezers (CDC method)',
          oneLiner: 'The CDC-recommended primary method for tick removal.',
          steps: [
            '1. Use clean, fine-tipped tweezers to grasp the tick close to the skin.',
            '2. Pull upward with steady, even pressure.',
            '3. Clean the bite area with rubbing alcohol.',
            '4. Dispose of the tick.',
          ].join('\n'),
          sourceUrl: 'https://www.cdc.gov/ticks/removal/index.html',
        },
      ],
    })
    mocks.tickRemovalTechniquesQuery.mockResolvedValue({
      rows: [{ tickId: 1 }, { tickId: 2 }],
    })
    mocks.ticksQuery.mockResolvedValue({
      rows: [
        {
          id: 1,
          slug: 'blacklegged-tick',
          commonName: 'Blacklegged tick',
          scientificName: 'Ixodes scapularis',
          oneLiner: 'Vector of Lyme.',
        },
        {
          id: 2,
          slug: 'lone-star-tick',
          commonName: 'Lone star tick',
          scientificName: 'Amblyomma americanum',
          oneLiner: null,
        },
        // Not associated with this technique — should be filtered out.
        {
          id: 99,
          slug: 'american-dog-tick',
          commonName: 'American dog tick',
          scientificName: 'Dermacentor variabilis',
          oneLiner: null,
        },
      ],
    })
    mocks.tickDiseasesQuery.mockResolvedValue({
      rows: [
        { diseaseId: 10 },
        { diseaseId: 11 },
      ],
    })
    mocks.diseasesQuery.mockResolvedValue({
      rows: [
        {
          id: 10,
          slug: 'lyme-disease',
          displayName: 'Lyme disease',
          oneLiner: 'A bacterial infection.',
        },
        {
          id: 11,
          slug: 'alpha-gal-syndrome',
          displayName: 'Alpha-gal syndrome',
          oneLiner: 'A red-meat allergy.',
        },
        // Not in the join — filtered out.
        {
          id: 99,
          slug: 'rmsf',
          displayName: 'RMSF',
          oneLiner: null,
        },
      ],
    })
  }

  it('renders the loading state while removalTechniques.query resolves', () => {
    mocks.removalTechniquesQuery.mockReturnValue(new Promise(() => {})) // never settles
    mocks.tickRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })

    render(<TechniquePage slug="fine-tipped-tweezers" />)
    expect(screen.getByText(/loading technique/i)).toBeInTheDocument()
  })

  it('renders the not-found state for an unknown slug', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.tickRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })

    render(<TechniquePage slug="not-a-technique" />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /technique not found/i })).toBeInTheDocument()
    })
  })

  it('renders the hero, parsed steps, applies-to rail, and prevents rail on success', async () => {
    setupHappyPath()
    render(<TechniquePage slug="fine-tipped-tweezers" />)

    // H1
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /fine-tipped tweezers/i }),
      ).toBeInTheDocument()
    })

    // Steps — 4 ordinals "01" through "04"
    const stepsSection = await screen.findByTestId('technique-steps')
    expect(within(stepsSection).getByText('01')).toBeInTheDocument()
    expect(within(stepsSection).getByText('04')).toBeInTheDocument()
    expect(within(stepsSection).getByText(/^Use clean/)).toBeInTheDocument()
    expect(within(stepsSection).getByText(/^Dispose of the tick/)).toBeInTheDocument()

    // Applies-to — only the two ticks linked via the join.
    const appliesTo = await screen.findByTestId('technique-applies-to')
    await waitFor(() => {
      expect(within(appliesTo).getByRole('link', { name: /^blacklegged tick$/i })).toHaveAttribute(
        'href',
        '/ticks/blacklegged-tick',
      )
    })
    expect(within(appliesTo).getByRole('link', { name: /^lone star tick$/i })).toBeInTheDocument()
    expect(within(appliesTo).queryByRole('link', { name: /^american dog tick$/i })).toBeNull()

    // Prevents-diseases — derived rail, only the two diseases in the join.
    const prevents = await screen.findByTestId('technique-prevents')
    await waitFor(() => {
      expect(within(prevents).getByRole('link', { name: /^lyme disease$/i })).toHaveAttribute(
        'href',
        '/diseases/lyme-disease',
      )
    })
    expect(within(prevents).getByRole('link', { name: /alpha-gal syndrome/i })).toBeInTheDocument()
    expect(within(prevents).queryByRole('link', { name: /^rmsf$/i })).toBeNull()

    // Source chip — opens in a new tab.
    const sourceLink = screen.getByRole('link', { name: /source · cdc\.gov/i })
    expect(sourceLink).toHaveAttribute('href', 'https://www.cdc.gov/ticks/removal/index.html')
    expect(sourceLink).toHaveAttribute('target', '_blank')
    expect(sourceLink).toHaveAttribute('rel', expect.stringContaining('noreferrer'))
  })

  it('sets the document title and canonical link from the loaded technique', async () => {
    setupHappyPath()
    render(<TechniquePage slug="fine-tipped-tweezers" />)

    await waitFor(() => {
      expect(document.title).toBe('Fine-tipped tweezers (CDC method) — Techniques | Tickpedia')
    })
    expect(
      document.head.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    ).toBe('https://tickpedia.com/techniques/fine-tipped-tweezers')
  })

  it('hides the prevents section when the applies-to rail is empty', async () => {
    mocks.removalTechniquesQuery.mockResolvedValue({
      rows: [
        {
          id: 5,
          slug: 'when-to-see-doctor',
          title: 'When to see a doctor',
          oneLiner: null,
          steps: '1. Watch for fever.\n2. Then call.',
          sourceUrl: null,
        },
      ],
    })
    mocks.tickRemovalTechniquesQuery.mockResolvedValue({ rows: [] })
    mocks.ticksQuery.mockResolvedValue({ rows: [] })
    mocks.tickDiseasesQuery.mockResolvedValue({ rows: [] })
    mocks.diseasesQuery.mockResolvedValue({ rows: [] })

    render(<TechniquePage slug="when-to-see-doctor" />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /when to see a doctor/i }),
      ).toBeInTheDocument()
    })
    // Prevents section hides when rows are empty (and not loading).
    await waitFor(() => {
      expect(screen.queryByTestId('technique-prevents')).toBeNull()
    })
    // Applies-to shows the editorial-empty fallback copy.
    expect(screen.getByText(/editorial mapping not yet seeded/i)).toBeInTheDocument()
  })
})
