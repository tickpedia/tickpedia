import { test } from '@playwright/test'

// JSON-LD schema enforcement. Filled in as page families ship — each
// phase that introduces a new schema (MedicalCondition for diseases,
// HowTo for techniques, Map for /risk, BreadcrumbList everywhere,
// etc.) adds its assertion here.
//
// Section B3 of `plan/steps/05_design_handoff_and_urls.md` is the
// authoritative list.

test.describe('seo · JSON-LD', () => {
  test.skip('disease pages embed MedicalCondition schema', async () => {
    // Phase 5
  })
  test.skip('technique pages embed HowTo schema', async () => {
    // Phase 6
  })
  test.skip('county pages embed Place + geo block from county centroid', async () => {
    // Phase 8
  })
  test.skip('every page embeds BreadcrumbList', async () => {
    // Phase 4 onward — covered when the first page lands
  })
  test.skip('home embeds WebSite + SearchAction (Google sitelinks search box)', async () => {
    // Phase 10
  })
  test.skip('/risk + /risk/[slug] embed Map schema', async () => {
    // Phase 10
  })
})
