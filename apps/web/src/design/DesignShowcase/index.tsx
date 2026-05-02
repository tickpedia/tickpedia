import { ThemeBar } from '../theme/index.js'
import { HeroSection } from './sections/HeroSection.js'
import { CrestSection } from './sections/CrestSection.js'
import { PaletteSection } from './sections/PaletteSection.js'
import { TypeSection } from './sections/TypeSection.js'
import { CitationSection } from './sections/CitationSection.js'

// Phase-1 review surface. Visit `/design` in the dev server to see
// the design system in isolation. Each section is its own component
// under `sections/` so future phases can compose / reuse pieces.

export function DesignShowcase() {
  return (
    <div className="tp tp-showcase" data-testid="design-showcase">
      <HeroSection />
      <CrestSection />
      <PaletteSection />
      <TypeSection />
      <CitationSection />
      <ThemeBar />
    </div>
  )
}
