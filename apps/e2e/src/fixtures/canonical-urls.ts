// Re-export of `apps/web/src/routes/canonical-urls.ts`. The web app
// owns the URL contract + the SemiLayer expansion logic; this fixture
// gives the e2e smoke + SEO specs a stable import path.

export {
  URL_PATTERNS,
  pathFor,
  patternFor,
  ALL_KINDS,
  type EntityKind,
  type SlugSource,
  type UrlPattern,
} from '../../../web/src/routes/contract.js'

export {
  listCanonicalUrls,
  distinctKinds,
  type CanonicalUrl,
  type ListOptions,
} from '../../../web/src/routes/canonical-urls.js'
