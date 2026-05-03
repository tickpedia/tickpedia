import { describe, it, expect } from 'vitest'
import {
  parseRemote,
  parseConventionalSubject,
  parseBody,
  formatEastern,
  buildAuthorUrl,
  buildCommitUrl,
  shapeCommit,
  buildManifest,
} from '../generate-deploy-json.js'

const REPO = {
  owner: 'tickpedia',
  name: 'tickpedia',
  url: 'https://github.com/tickpedia/tickpedia',
}

describe('parseRemote', () => {
  it('parses SSH form', () => {
    expect(parseRemote('git@github.com:tickpedia/tickpedia.git')).toEqual(REPO)
  })

  it('parses HTTPS form with .git', () => {
    expect(parseRemote('https://github.com/tickpedia/tickpedia.git')).toEqual(REPO)
  })

  it('parses HTTPS form without .git', () => {
    expect(parseRemote('https://github.com/tickpedia/tickpedia')).toEqual(REPO)
  })

  it('throws on unknown remote', () => {
    expect(() => parseRemote('weird://thing')).toThrow(/unrecognized git remote/)
  })
})

describe('parseConventionalSubject', () => {
  it('parses single scope', () => {
    expect(
      parseConventionalSubject('fix(semilayer): countyHotspots donut shows names'),
    ).toEqual({
      type: 'fix',
      scopes: ['semilayer'],
      description: 'countyHotspots donut shows names',
    })
  })

  it('parses multi-scope', () => {
    expect(
      parseConventionalSubject('feat(db,admin,sl): pathogens table family'),
    ).toEqual({
      type: 'feat',
      scopes: ['db', 'admin', 'sl'],
      description: 'pathogens table family',
    })
  })

  it('parses no-scope', () => {
    expect(parseConventionalSubject('chore: bump deps')).toEqual({
      type: 'chore',
      scopes: [],
      description: 'bump deps',
    })
  })

  it('handles breaking-change marker', () => {
    expect(parseConventionalSubject('feat(api)!: drop legacy field')).toEqual({
      type: 'feat',
      scopes: ['api'],
      description: 'drop legacy field',
    })
  })

  it('returns null for non-conventional', () => {
    expect(parseConventionalSubject('simple home page')).toBeNull()
  })
})

describe('parseBody', () => {
  it('returns empty for empty body', () => {
    expect(parseBody('')).toEqual({ raw: '', blocks: [] })
    expect(parseBody('\n\n  \n')).toEqual({ raw: '', blocks: [] })
  })

  it('joins wrapped text lines into a single paragraph', () => {
    const out = parseBody('one two\nthree four\n\nnext para')
    expect(out.blocks).toEqual([
      { kind: 'text', text: 'one two three four' },
      { kind: 'text', text: 'next para' },
    ])
  })

  it('groups bullets into a list block', () => {
    const out = parseBody('- alpha\n- beta\n- gamma')
    expect(out.blocks).toEqual([
      { kind: 'list', items: ['alpha', 'beta', 'gamma'] },
    ])
  })

  it('splits intro text + bullets within one paragraph', () => {
    const out = parseBody('Three new paths:\n- /a\n- /b\n- /c')
    expect(out.blocks).toEqual([
      { kind: 'text', text: 'Three new paths:' },
      { kind: 'list', items: ['/a', '/b', '/c'] },
    ])
  })

  it('treats indented continuations as part of the previous bullet', () => {
    const out = parseBody('- first item\n  continues here\n- second')
    expect(out.blocks).toEqual([
      { kind: 'list', items: ['first item continues here', 'second'] },
    ])
  })

  it('handles text → list → text across blank lines', () => {
    const out = parseBody('intro line\n\n- one\n- two\n\nclosing thought')
    expect(out.blocks).toEqual([
      { kind: 'text', text: 'intro line' },
      { kind: 'list', items: ['one', 'two'] },
      { kind: 'text', text: 'closing thought' },
    ])
  })
})

describe('formatEastern', () => {
  it('formats a winter (EST) timestamp', () => {
    const out = formatEastern('2026-01-15T14:30:00Z') // 09:30 EST
    expect(out.iso).toBe('2026-01-15T14:30:00.000Z')
    expect(out.date).toBe('2026-01-15')
    expect(out.time).toMatch(/^09:30 AM EST$/)
    expect(out.display).toMatch(/^January 15, 2026 at 09:30 AM EST$/)
  })

  it('formats a summer (EDT) timestamp', () => {
    const out = formatEastern('2026-05-03T13:56:40Z') // 09:56 EDT
    expect(out.date).toBe('2026-05-03')
    expect(out.time).toMatch(/^09:56 AM EDT$/)
    expect(out.display).toMatch(/^May 3, 2026 at 09:56 AM EDT$/)
  })
})

describe('buildAuthorUrl', () => {
  it('points GitHub no-reply at the user profile', () => {
    expect(
      buildAuthorUrl('12345+truleydave@users.noreply.github.com', 'David', REPO),
    ).toBe('https://github.com/truleydave')
  })

  it('handles older no-reply form without numeric id', () => {
    expect(
      buildAuthorUrl('truleydave@users.noreply.github.com', 'David', REPO),
    ).toBe('https://github.com/truleydave')
  })

  it('falls back to repo commits-by-author for regular emails', () => {
    expect(buildAuthorUrl('me@dave.blue', 'David Rehmat', REPO)).toBe(
      'https://github.com/tickpedia/tickpedia/commits?author=me%40dave.blue',
    )
  })

  it('uses name when email is missing', () => {
    expect(buildAuthorUrl('', 'David Rehmat', REPO)).toBe(
      'https://github.com/tickpedia/tickpedia/commits?author=David%20Rehmat',
    )
  })
})

describe('buildCommitUrl', () => {
  it('builds the GitHub commit URL', () => {
    expect(buildCommitUrl(REPO, 'abc123')).toBe(
      'https://github.com/tickpedia/tickpedia/commit/abc123',
    )
  })
})

describe('shapeCommit', () => {
  it('shapes a verbose conventional commit', () => {
    const out = shapeCommit(
      {
        sha: '0a7917b9715200e80a3f23cd909c7253678cc76a',
        authorName: 'David Rehmat',
        authorEmail: 'me@dave.blue',
        date: '2026-05-03T13:56:40Z',
        subject: 'feat(db,admin,sl): pathogens table family',
        body: 'Three new paths:\n- /a\n- /b',
      },
      REPO,
    )
    expect(out.shortSha).toBe('0a7917b')
    expect(out.url).toBe(
      'https://github.com/tickpedia/tickpedia/commit/0a7917b9715200e80a3f23cd909c7253678cc76a',
    )
    expect(out.author.url).toBe(
      'https://github.com/tickpedia/tickpedia/commits?author=me%40dave.blue',
    )
    expect(out.committedAt.time).toBe('09:56 AM EDT')
    expect(out.conventional).toEqual({
      type: 'feat',
      scopes: ['db', 'admin', 'sl'],
      description: 'pathogens table family',
    })
    expect(out.body.blocks).toEqual([
      { kind: 'text', text: 'Three new paths:' },
      { kind: 'list', items: ['/a', '/b'] },
    ])
  })

  it('keeps conventional null on non-conventional subjects', () => {
    const out = shapeCommit(
      {
        sha: '4209d39aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        authorName: 'David Rehmat',
        authorEmail: 'me@dave.blue',
        date: '2026-05-01T13:00:00Z',
        subject: 'simple home page',
        body: '',
      },
      REPO,
    )
    expect(out.conventional).toBeNull()
    expect(out.body.blocks).toEqual([])
  })
})

describe('buildManifest', () => {
  it('assembles the top-level shape', () => {
    const head = '0a7917b9715200e80a3f23cd909c7253678cc76a'
    const out = buildManifest(
      [
        {
          sha: head,
          authorName: 'David Rehmat',
          authorEmail: 'me@dave.blue',
          date: '2026-05-03T13:56:40Z',
          subject: 'feat(db): x',
          body: '',
        },
      ],
      REPO,
      new Date('2026-05-03T14:00:00Z'),
      head,
    )
    expect(out.deployedAt.time).toBe('10:00 AM EDT')
    expect(out.commit.shortSha).toBe('0a7917b')
    expect(out.repository).toEqual(REPO)
    expect(out.commits).toHaveLength(1)
  })
})
