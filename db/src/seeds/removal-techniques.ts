// Canonical removal techniques. Add new entries here; the seed upserts
// them by slug so re-runs are idempotent. The full editorial set
// (200+ entries — removal, prevention, aftercare, diagnostic, myths)
// lives in unstructured-data/json/content-removal-techniques.json and
// lands via the /import/json/techniques admin path. The base seed
// covers the three shapes the site needs to render correctly even on
// a freshly-migrated, never-imported database: a primary removal
// method, a prevention example (so the score scale has data to render),
// and a debunked myth (so the warning banner has data to render).

export type TechniqueKind = 'removal' | 'prevention' | 'aftercare' | 'diagnostic' | 'myth'

export interface CanonicalRemovalTechnique {
  slug: string
  title: string
  oneLiner: string | null
  steps: string
  kind: TechniqueKind
  preventionScore: number | null
  citations: string[]
  sourceUrl: string | null
}

export const CANONICAL_REMOVAL_TECHNIQUES: CanonicalRemovalTechnique[] = [
  {
    slug: 'fine-tipped-tweezers',
    title: 'Fine-tipped tweezers (CDC method)',
    oneLiner:
      'Fine-tipped tweezers grasp the tick at skin level and pull straight up with steady pressure — the CDC-recommended method for any embedded tick.',
    steps: [
      '1. Use clean, fine-tipped tweezers to grasp the tick as close to the skin as possible.',
      '2. Pull upward with steady, even pressure. Do not twist or jerk — that can leave mouth-parts behind.',
      '3. After removal, clean the bite area and your hands with rubbing alcohol or soap and water.',
      '4. Dispose of the tick by flushing it, sealing it in tape, or placing it in alcohol. Do not crush it with bare fingers.',
    ].join('\n'),
    kind: 'removal',
    preventionScore: null,
    citations: ['https://www.cdc.gov/ticks/removing_a_tick.html'],
    sourceUrl: 'https://www.cdc.gov/ticks/removing_a_tick.html',
  },
  {
    slug: 'tick-checks-and-shower',
    title: 'Tick checks and the two-hour shower rule',
    oneLiner:
      'A full-body tick check and shower within two hours of coming indoors removes unattached ticks before they bite — the highest-payoff prevention step.',
    steps: [
      'Most ticks crawl for hours before they bite. A check on the way in is the single most reliable way to remove one before it attaches.',
      '- Within two hours of coming indoors, shower. This washes off unattached ticks and gives you a chance to do a full body check.',
      '- Do a head-to-toe check. Pay special attention to: in and around the hair, in and around the ears, under the arms, around the waist, inside the belly button, between the legs, and behind the knees.',
      '- Have a partner check the spots you cannot easily see (back, scalp, behind ears).',
      '- Tumble dry clothes on high heat for 10 minutes to kill any ticks riding in on fabric.',
    ].join('\n'),
    kind: 'prevention',
    preventionScore: 9,
    citations: ['https://www.cdc.gov/ticks/prevention/index.html'],
    sourceUrl: 'https://www.cdc.gov/ticks/prevention/index.html',
  },
  {
    slug: 'when-to-see-a-doctor',
    title: 'When to see a doctor after a tick bite',
    oneLiner:
      'See a clinician within 72 hours after a long-attached blacklegged tick bite, or any time a rash, fever, or joint pain appears within 30 days.',
    steps: [
      'See a clinician within 72 hours if any of the following apply:',
      '- The tick was attached for an unknown duration or longer than 36 hours.',
      '- You develop a rash (especially the bullseye / erythema migrans pattern) within 30 days.',
      '- You develop fever, chills, joint pain, or facial palsy within 30 days.',
      '- The bite occurred in a region with high Lyme, anaplasmosis, or Powassan prevalence.',
    ].join('\n'),
    kind: 'aftercare',
    preventionScore: null,
    citations: ['https://www.cdc.gov/lyme/signs_symptoms/index.html'],
    sourceUrl: 'https://www.cdc.gov/lyme/signs_symptoms/index.html',
  },
  {
    slug: 'debunked-folk-removal-methods',
    title: 'Matches, nail polish, petroleum jelly, and essential oils',
    oneLiner:
      'Matches, nail polish, petroleum jelly, and essential oils make the tick salivate or regurgitate into the wound and increase pathogen transfer — do not use.',
    steps: [
      'Do not use any of these to remove a tick. CDC warns explicitly against them.',
      '- Matches or hot needles. Burning the tick makes it salivate and regurgitate gut contents into the wound.',
      '- Nail polish. Suffocating the tick is slow and during that time the tick continues to feed and salivate.',
      '- Petroleum jelly. Same problem as nail polish: a stressed, slowly-suffocating tick keeps feeding.',
      '- Essential oils painted on the attached tick. No primary-literature support; the agitation effect is the same.',
      'What to do instead: use clean fine-tipped tweezers, grasp the tick at skin level, and pull straight up with steady pressure.',
    ].join('\n'),
    kind: 'myth',
    preventionScore: null,
    citations: ['https://www.cdc.gov/ticks/after-a-tick-bite/index.html'],
    sourceUrl: 'https://www.cdc.gov/ticks/after-a-tick-bite/index.html',
  },
]
