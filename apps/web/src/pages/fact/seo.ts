import {
  type PageHead,
  breadcrumbListSchema,
  DEFAULT_ORIGIN,
} from '../shared/seo/index.js'
import { pathFor } from '../../routes/index.js'
import { titleizeSlug, clampBody } from './data/slug-title.js'
import type { FactRefs } from './data/useFactRefs.js'

// SEO surface for /facts and /facts/[slug]. Per step 05 §B3, fact
// pages emit Article + ScholarlyArticle (array form — both schemas
// apply; Google parses arrays of types correctly).

export interface FactSeoInput {
  slug: string
  body: string
  citationUrl: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

const FACTS_INDEX_TAGLINE =
  'Short, sourced facts about ticks, the diseases they carry, and how to remove them.'

const MAX_DESCRIPTION_LEN = 158

export function truncateDescription(text: string): string {
  if (text.length <= MAX_DESCRIPTION_LEN) return text
  const cutoff = text.slice(0, MAX_DESCRIPTION_LEN - 1)
  const lastSpace = cutoff.lastIndexOf(' ')
  return (lastSpace > 60 ? cutoff.slice(0, lastSpace) : cutoff) + '…'
}

export function buildFactHead(
  fact: FactSeoInput,
  refs: FactRefs = { ticks: [], diseases: [], techniques: [] },
  origin = DEFAULT_ORIGIN,
): PageHead {
  const headline = titleizeSlug(fact.slug)
  const canonicalPath = pathFor('fact', { slug: fact.slug })
  const description = truncateDescription(fact.body || `${headline} — Wild fact from Tickpedia.`)
  return {
    title: `${headline} — Wild facts | Tickpedia`,
    description,
    canonicalPath,
    jsonLd: [
      articleSchema(fact, refs, origin),
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Wild facts', path: '/facts' },
          { label: headline },
        ],
        origin,
      ),
    ],
  }
}

export function buildFactsIndexHead(origin = DEFAULT_ORIGIN): PageHead {
  return {
    title: 'Wild facts — Tickpedia',
    description: FACTS_INDEX_TAGLINE,
    canonicalPath: '/facts',
    jsonLd: [
      breadcrumbListSchema(
        [
          { label: 'Tickpedia', path: '/' },
          { label: 'Wild facts' },
        ],
        origin,
      ),
    ],
  }
}

interface AboutItem {
  '@type': 'Thing' | 'MedicalCondition' | 'HowTo'
  name: string
  url: string
}

interface FactArticleSchema {
  '@context': 'https://schema.org'
  '@type': ['Article', 'ScholarlyArticle']
  headline: string
  articleBody: string
  url: string
  mainEntityOfPage: string
  citation?: { '@type': 'CreativeWork'; url: string }
  about?: AboutItem[]
  datePublished?: string
  dateModified?: string
}

export function articleSchema(
  fact: FactSeoInput,
  refs: FactRefs,
  origin: string,
): FactArticleSchema {
  const url = `${origin}${pathFor('fact', { slug: fact.slug })}`
  const headline = titleizeSlug(fact.slug)

  const out: FactArticleSchema = {
    '@context': 'https://schema.org',
    '@type': ['Article', 'ScholarlyArticle'],
    headline: clampBody(headline, 110) || headline,
    articleBody: fact.body,
    url,
    mainEntityOfPage: url,
  }

  if (fact.citationUrl) {
    out.citation = { '@type': 'CreativeWork', url: fact.citationUrl }
  }

  const about: AboutItem[] = [
    ...refs.ticks.map((t) => ({
      '@type': 'Thing' as const,
      name: t.commonName,
      url: `${origin}${pathFor('tick', { slug: t.slug })}`,
    })),
    ...refs.diseases.map((d) => ({
      '@type': 'MedicalCondition' as const,
      name: d.displayName,
      url: `${origin}${pathFor('disease', { slug: d.slug })}`,
    })),
    ...refs.techniques.map((tq) => ({
      '@type': 'HowTo' as const,
      name: tq.title,
      url: `${origin}${pathFor('technique', { slug: tq.slug })}`,
    })),
  ]
  if (about.length > 0) out.about = about

  if (fact.createdAt) out.datePublished = fact.createdAt
  if (fact.updatedAt) out.dateModified = fact.updatedAt

  return out
}
