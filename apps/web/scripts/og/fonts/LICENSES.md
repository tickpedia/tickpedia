# Font licenses

These TTF files are committed so the build-time OG-image generator
(`scripts/og/generate-og.ts`) can run in clean CI without network access
to a font CDN. All four fonts are open-source under licenses that
explicitly permit redistribution.

| File                         | Family             | Weight              | License                    | Source |
|------------------------------|--------------------|---------------------|----------------------------|--------|
| `newsreader-500.ttf`         | Newsreader 16pt    | Medium (500)        | SIL Open Font License 1.1  | <https://github.com/productiontype/Newsreader> |
| `newsreader-italic-500.ttf`  | Newsreader 16pt    | Medium Italic (500) | SIL Open Font License 1.1  | <https://github.com/productiontype/Newsreader> |
| `geist-500.ttf`              | Geist Sans         | Medium (500)        | SIL Open Font License 1.1  | <https://github.com/vercel/geist-font> |
| `geist-600.ttf`              | Geist Sans         | SemiBold (600)      | SIL Open Font License 1.1  | <https://github.com/vercel/geist-font> |
| `jetbrains-mono-500.ttf`     | JetBrains Mono     | Medium (500)        | SIL Open Font License 1.1  | <https://github.com/JetBrains/JetBrainsMono> |

## License text

The full text of the SIL Open Font License 1.1 is available at
<https://openfontlicense.org>. The license requires:

- The fonts may be used, studied, modified, and redistributed freely.
- Reserved Font Names (the family name) may not be used to redistribute
  modified versions.
- Redistributed copies (modified or not) must include the license.

We redistribute the fonts unmodified, alongside this notice.

## Why these specific weights

The OG templates use:

- Newsreader 500 — page H1s (the entity name) and the fact body
- Newsreader 500 Italic — scientific names below the H1
- Geist 500 — eyebrow labels and stat values
- Geist 600 — chip labels and secondary callouts
- JetBrains Mono 500 — citation source-URL strips on fact OG cards

Adding a weight means: download it from the upstream repo, drop it in
this folder, list it in `load-fonts.ts`, append a row to the table
above. Don't fetch fonts at build time — flaky in CI, hits CDN rate
limits, and adds a hard network dependency to a deploy.
