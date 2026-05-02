'use client'

import { useState } from 'react'

// Single-line SEO sentence input with a live char counter. Soft target
// 155 (Google SERP cap), hard server reject at 201 (matches
// normalizeOneLiner). Renders as a 2-row textarea so long sentences
// soft-wrap during editing — the data is single-line by contract, but
// 155 chars in a one-row input is mostly off-screen.
const TARGET = 155
const HARD_CAP = 200

export default function OneLinerField({
  initial,
  name = 'oneLiner',
  id = 'oneLiner',
  label = 'One-liner (SEO meta description + page subtitle)',
}: {
  initial: string
  name?: string
  id?: string
  label?: string
}) {
  const [value, setValue] = useState(initial)
  const len = value.trim().length
  const tone = len === 0 ? 'muted' : len > HARD_CAP ? 'error' : len > TARGET ? 'warn' : 'success'
  const color = tone === 'error' ? 'var(--error)' : tone === 'warn' ? 'var(--warn, #b45309)' : 'var(--muted)'

  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        name={name}
        rows={2}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="One sentence, present tense, name appears once. Aim for ≤155 chars."
        maxLength={HARD_CAP + 50}
      />
      <div style={{ fontSize: '0.75rem', color, marginTop: '0.25rem' }}>
        {len} / {TARGET} chars
        {len > HARD_CAP ? ` — over the ${HARD_CAP}-char hard cap; will be rejected.` : null}
        {len > TARGET && len <= HARD_CAP ? ' — over the SEO target; consider trimming.' : null}
      </div>
    </div>
  )
}
