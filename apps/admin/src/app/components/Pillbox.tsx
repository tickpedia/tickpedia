'use client'

// Multi-select that ships its picks as repeated form fields with the
// same `name`. Server actions read them with `form.getAll(name)`.
//
// One hidden input per selected option is rendered, so the consuming
// form sees a clean list of values (no JSON encoding, no parsing).

import { useState, useMemo } from 'react'

export interface PillboxOption {
  value: string
  label: string
  hint?: string
}

export default function Pillbox({
  name,
  options,
  initial = [],
  placeholder = 'Search…',
}: {
  name: string
  options: PillboxOption[]
  initial?: string[]
  placeholder?: string
}) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initial))
  const [filter, setFilter] = useState('')

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q),
    )
  }, [options, filter])

  function toggle(value: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(value)) next.delete(value)
      else next.add(value)
      return next
    })
  }

  const selectedOptions = options.filter((o) => selected.has(o.value))

  return (
    <div className="pillbox">
      {/* one hidden field per pick — server reads via form.getAll(name) */}
      {Array.from(selected).map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}

      <div className="pillbox-selected">
        {selectedOptions.length === 0 ? (
          <span className="muted" style={{ fontSize: '0.85rem' }}>
            None selected
          </span>
        ) : (
          selectedOptions.map((o) => (
            <button
              type="button"
              key={o.value}
              className="pillbox-chip"
              onClick={() => toggle(o.value)}
              aria-label={`Remove ${o.label}`}
              title="Click to remove"
            >
              {o.label} <span aria-hidden>×</span>
            </button>
          ))
        )}
      </div>

      <input
        type="text"
        placeholder={placeholder}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        style={{ marginTop: '0.4rem' }}
      />

      <div className="pillbox-options">
        {filtered.length === 0 ? (
          <p className="muted" style={{ fontSize: '0.8rem', margin: '0.5rem' }}>
            No matches.
          </p>
        ) : (
          filtered.map((o) => {
            const isOn = selected.has(o.value)
            return (
              <label key={o.value} className={'pillbox-option ' + (isOn ? 'on' : '')}>
                <input
                  type="checkbox"
                  checked={isOn}
                  onChange={() => toggle(o.value)}
                  style={{ width: 'auto' }}
                />
                <span>
                  {o.label}
                  {o.hint ? <span className="muted"> — {o.hint}</span> : null}
                </span>
              </label>
            )
          })
        )}
      </div>
    </div>
  )
}
