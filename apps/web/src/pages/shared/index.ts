// Barrel export for the page-level primitives shared across every
// route family. Charts live separately under `apps/web/src/charts`;
// these are layout-level pieces (nav, breadcrumbs, stat blocks).

export { PageHeader, sectionFor, type PageHeaderProps, type TopLevelSection } from './PageHeader/index.js'
export { Crumb, type CrumbItem, type CrumbProps } from './Crumb/index.js'
export { Stat, type StatProps } from './Stat/index.js'
export { Footer, type FooterProps } from './Footer/index.js'
export { useDocumentHead, type DocumentHeadOptions } from './useDocumentHead.js'
