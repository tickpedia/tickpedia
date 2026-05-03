import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'
import { pathFor } from '../../routes/index.js'
import { parseSteps } from './data/steps.js'

// SEO surface for /techniques and /techniques/[slug]. The technique
// page is the first family in the URL contract that emits HowTo
// schema — Google's rich-results pipeline uses it for the step-by-
// step preview that lands above the fold for "how do I..." queries.

export interface TechniqueSeoInput {
  slug: string
  title: string
  oneLiner: string | null
  steps: string | null
  sourceUrl: string | null
}

const TECHNIQUE_TAGLINE = 'A removal or prevention technique — steps, applies-to ticks, and source.'

const MAX_DESCRIPTION_LEN = 158

export function truncateDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LEN) return text
  const cutoff = text.slice(0, MAX_DESCRIPTION_LEN - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > 60 ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}

export function buildTechniqueHead(
  technique: TechniqueSeoInput,
  origin = DEFAULT_ORIGIN,
): PageHead {
  const canonicalPath = pathFor('technique', { slug: technique.slug })
  const description = truncateDescription(
    technique.oneLiner ?? deriveDescription(technique) ?? `${technique.title}. ${TECHNIQUE_TAGLINE}`,
  )
  return {
    title: `${technique.title} — Techniques | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      howToSchema(technique, origin),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Techniques', path: '/techniques' },
          { label: technique.title },
        ],
        origin,
      ),
    ],
  }
}

export function buildTechniquesIndexHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'Techniques — Tickpedia',
    description:
      'Removal and prevention techniques: how to take a tick off, when to see a doctor, permethrin, and the field guidance that goes with each.',
    canonicalPath: '/techniques',
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Techniques' },
        ],
        origin,
      ),
    ],
  }
}

interface HowToSchema {
  '@context': 'https://schema.org'
  '@type': 'HowTo'
  name: string
  description?: string
  url: string
  step: Array<{
    '@type': 'HowToStep'
    position: number
    text: string
  }>
  tool?: Array<{ '@type': 'HowToTool'; name: string }>
}

export function howToSchema(
  technique: TechniqueSeoInput,
  origin: string,
): HowToSchema {
  const out: HowToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: technique.title,
    url: `${origin}${pathFor('technique', { slug: technique.slug })}`,
    step: stepsForSchema(technique),
  }
  if (technique.oneLiner) {
    out.description = technique.oneLiner
  } else {
    const derived = deriveDescription(technique)
    if (derived) out.description = derived
  }
  if (technique.slug === 'fine-tipped-tweezers') {
    out.tool = [{ '@type': 'HowToTool', name: 'Fine-tipped tweezers' }]
  }
  return out
}

function stepsForSchema(technique: TechniqueSeoInput) {
  const parsed = parseSteps(technique.steps)
  if (parsed.length > 0) {
    return parsed.map((s) => ({
      '@type': 'HowToStep' as const,
      position: s.position,
      text: s.text,
    }))
  }
  // Defensive fallback: emit a single step with the whole body so
  // Google's rich-result validator never sees an empty `step` array.
  return [
    {
      '@type': 'HowToStep' as const,
      position: 1,
      text: technique.steps ?? technique.title,
    },
  ]
}

function deriveDescription(technique: TechniqueSeoInput): string | null {
  if (!technique.steps) return null
  const firstLine = technique.steps.split(/\r?\n/).find((l) => l.trim().length > 0)
  if (!firstLine) return null
  return firstLine.trim()
}
