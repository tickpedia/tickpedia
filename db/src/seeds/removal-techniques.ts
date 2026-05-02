// Canonical removal techniques. Add new entries here; the seed upserts
// them by slug so re-runs are idempotent.

export interface CanonicalRemovalTechnique {
  slug: string
  title: string
  steps: string
  sourceUrl: string | null
}

export const CANONICAL_REMOVAL_TECHNIQUES: CanonicalRemovalTechnique[] = [
  {
    slug: 'fine-tipped-tweezers',
    title: 'Fine-tipped tweezers (CDC method)',
    steps: [
      '1. Use clean, fine-tipped tweezers to grasp the tick as close to the skin as possible.',
      '2. Pull upward with steady, even pressure. Do not twist or jerk — that can leave mouth-parts behind.',
      '3. After removal, clean the bite area and your hands with rubbing alcohol or soap and water.',
      '4. Dispose of the tick by flushing it, sealing it in tape, or placing it in alcohol. Do not crush it with bare fingers.',
    ].join('\n'),
    sourceUrl: 'https://www.cdc.gov/ticks/removing_a_tick.html',
  },
  {
    slug: 'when-to-see-a-doctor',
    title: 'When to see a doctor after a tick bite',
    steps: [
      'See a clinician within 72 hours if any of the following apply:',
      '- The tick was attached for an unknown duration or longer than 36 hours.',
      '- You develop a rash (especially the bullseye / erythema migrans pattern) within 30 days.',
      '- You develop fever, chills, joint pain, or facial palsy within 30 days.',
      '- The bite occurred in a region with high Lyme, anaplasmosis, or Powassan prevalence.',
    ].join('\n'),
    sourceUrl: 'https://www.cdc.gov/lyme/signs_symptoms/index.html',
  },
]
