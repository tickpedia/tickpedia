# Skill: add-a-lens

Expose a Postgres table to the public site through a SemiLayer lens.

## Prerequisites

- The table exists in `db/src/schema.ts` and migrations have been applied.
- You're logged into SemiLayer (`semilayer login`) and `.semilayerrc` is
  pointed at the right org/project/env.

## Steps

1. **Declare the lens** in `sl.config.ts`:
   ```ts
   lenses: {
     myThing: {
       source: 'main',
       table: 'my_things',
       fields: {
         id: { type: 'number', primaryKey: true },
         title: { type: 'text', searchable: true },
       },
       grants: { search: 'public', query: 'public' },
     },
   }
   ```

2. **Push the config**:
   ```bash
   pnpm semilayer:push
   ```

3. **Regenerate the client**:
   ```bash
   pnpm semilayer:generate
   ```
   This writes typed bindings to `generated/semilayer/`. The folder is
   gitignored — CI regenerates on every build.

4. **Use it from `apps/web`**:
   ```ts
   import { beam } from '../../../generated/semilayer'
   const results = await beam.myThing.search({ q: 'lyme' })
   ```

5. **Test the page that consumes it.**

## Don'ts

- Don't grant `write` to a public lens. Writes go through admin / scrape
  jobs over Drizzle directly.
- Don't query SemiLayer with the service key from the browser. Browser
  bundles use the public key (`NEXT_PUBLIC_SEMILAYER_PUBLIC_KEY`).
