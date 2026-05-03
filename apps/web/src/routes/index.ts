// Barrel export for the URL contract. The contract data model lives
// in `contract.ts`; the runtime path-matching helpers live in
// `match.ts`; the SemiLayer-driven URL expander lives in
// `canonical-urls.ts`. Importers should always pull from
// `routes/index.js`.

export * from './contract.js'
export * from './match.js'
export * from './canonical-urls.js'
