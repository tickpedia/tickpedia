import { test } from '@playwright/test'

// JSON-LD schema enforcement. Filled in as pages ship — each new
// schema (MedicalCondition for diseases, HowTo for techniques, Map
// for /risk, BreadcrumbList everywhere, etc.) adds its assertion
// here.

test.describe('seo · JSON-LD', () => {
  test.skip('disease pages embed MedicalCondition schema', async () => {
    // Filled when /diseases/[slug] ships
  })
  test.skip('technique pages embed HowTo schema', async () => {
    // Filled when /techniques/[slug] ships
  })
  test.skip('county pages embed Place + geo block from county centroid', async () => {
    // Filled when /counties/[state]/[slug] ships
  })
  test.skip('every page embeds BreadcrumbList', async () => {
    // Filled when the first real page lands
  })
  test.skip('home embeds WebSite + SearchAction (Google sitelinks search box)', async () => {
    // Filled when / ships its real home page
  })
  test.skip('/risk + /risk/[slug] embed Map schema', async () => {
    // Filled when /risk ships
  })
})
