import { describe, it, expect } from 'vitest'
import {
  ticks,
  states,
  counties,
  tickState,
  tickCounty,
  wildFacts,
  removalTechniques,
  diseases,
  diseaseCountyYear,
  diseaseMonth,
} from '../schema.js'

describe('schema', () => {
  it('exposes all v0 tables', () => {
    expect(ticks).toBeDefined()
    expect(states).toBeDefined()
    expect(counties).toBeDefined()
    expect(tickState).toBeDefined()
    expect(tickCounty).toBeDefined()
    expect(wildFacts).toBeDefined()
    expect(removalTechniques).toBeDefined()
    expect(diseases).toBeDefined()
    expect(diseaseCountyYear).toBeDefined()
    expect(diseaseMonth).toBeDefined()
  })
})
