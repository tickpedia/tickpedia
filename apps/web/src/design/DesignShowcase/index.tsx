import { ThemeBar } from '../theme/index.js'
import { HeroSection } from './sections/HeroSection.js'
import { CrestSection } from './sections/CrestSection.js'
import { PaletteSection } from './sections/PaletteSection.js'
import { TypeSection } from './sections/TypeSection.js'
import { CitationSection } from './sections/CitationSection.js'
import { ChartsSection } from './sections/ChartsSection.js'

// Design-system review surface. Visit `/design` in the dev server.
// Each section is its own component under `sections/` so future phases
// can compose / reuse pieces.

export function DesignShowcase() {
  return (
    <div className="tp tp-showcase" data-testid="design-showcase">
      <HeroSection />
      <CrestSection />
      <PaletteSection />
      <TypeSection />
      <CitationSection />
      <ChartsSection />
      <ThemeBar />
    </div>
  )
}
