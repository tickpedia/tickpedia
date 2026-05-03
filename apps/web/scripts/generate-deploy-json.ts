// Build-time: emit `dist/deploy.json` (served at tickpedia.com/deploy.json).
// Captures when the GitHub Pages build ran, the deploy commit, and the
// last 25 commits — each parsed into conventional-commit pieces and
// body blocks (text paragraphs + bullet lists) so consumers can render
// David's verbose messages without re-parsing.
//
// Times are exposed both as raw ISO and as a display string in
// America/New_York (EST/EDT auto-selected via Intl). The repo origin
// + owner/name come from `GITHUB_REPOSITORY` on Actions and fall back
// to `git remote get-url origin` locally.
//
// Requires full git history (fetch-depth: 0 in the workflow).

import { execFileSync } from 'node:child_process'
import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const WEB_ROOT = resolve(SCRIPT_DIR, '..')
const DIST_DIR = resolve(WEB_ROOT, 'dist')

const COMMIT_LIMIT = 25
const RECORD_SEPARATOR = '\x1e'
const FIELD_SEPARATOR = '\x1f'

export interface Repository {
  owner: string
  name: string
  url: string
}

export interface DisplayTime {
  iso: string
  date: string
  time: string
  display: string
}

export interface Author {
  name: string
  email: string
  url: string
}

export type BodyBlock =
  | { kind: 'text'; text: string }
  | { kind: 'list'; items: string[] }

export interface Conventional {
  type: string
  scopes: string[]
  description: string
}

export interface Commit {
  sha: string
  shortSha: string
  url: string
  author: Author
  committedAt: DisplayTime
  subject: string
  conventional: Conventional | null
  body: {
    raw: string
    blocks: BodyBlock[]
  }
}

export interface DeployManifest {
  deployedAt: DisplayTime
  commit: { sha: string; shortSha: string; url: string }
  repository: Repository
  commits: Commit[]
}

export function resolveRepository(): Repository {
  const fromEnv = process.env.GITHUB_REPOSITORY
  if (fromEnv && fromEnv.includes('/')) {
    const [owner, name] = fromEnv.split('/')
    return { owner, name, url: `https://github.com/${owner}/${name}` }
  }
  const remote = execFileSync('git', ['remote', 'get-url', 'origin'], {
    encoding: 'utf8',
  }).trim()
  return parseRemote(remote)
}

export function parseRemote(remote: string): Repository {
  // git@github.com:owner/repo.git  |  https://github.com/owner/repo(.git)
  const ssh = remote.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/)
  const https = remote.match(/^https:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/)
  const m = ssh ?? https
  if (!m) {
    throw new Error(`unrecognized git remote: ${remote}`)
  }
  const [, owner, name] = m
  return { owner, name, url: `https://github.com/${owner}/${name}` }
}

export function parseConventionalSubject(subject: string): Conventional | null {
  // type(scope1,scope2): description   |   type: description
  const m = subject.match(/^([a-zA-Z]+)(?:\(([^)]+)\))?!?:\s+(.+)$/)
  if (!m) return null
  const [, type, scopeRaw, description] = m
  const scopes = scopeRaw
    ? scopeRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  return { type: type.toLowerCase(), scopes, description }
}

export function parseBody(body: string): { raw: string; blocks: BodyBlock[] } {
  const raw = body.trim()
  if (!raw) return { raw: '', blocks: [] }

  const blocks: BodyBlock[] = []
  let textLines: string[] = []
  let listItems: string[] = []
  let lastListIndent = 0

  const flushText = () => {
    if (textLines.length === 0) return
    blocks.push({ kind: 'text', text: textLines.join(' ').trim() })
    textLines = []
  }
  const flushList = () => {
    if (listItems.length === 0) return
    blocks.push({ kind: 'list', items: listItems })
    listItems = []
  }

  for (const line of raw.split('\n')) {
    if (line.trim() === '') {
      flushText()
      flushList()
      continue
    }
    const bullet = line.match(/^(\s*)[-*]\s+(.*)$/)
    if (bullet) {
      flushText()
      lastListIndent = bullet[1].length
      listItems.push(bullet[2].trim())
      continue
    }
    // Non-bullet, non-blank: continuation of previous bullet (indented),
    // or a normal text line.
    if (listItems.length > 0 && line.startsWith(' '.repeat(lastListIndent + 1))) {
      listItems[listItems.length - 1] += ' ' + line.trim()
    } else {
      flushList()
      textLines.push(line.trim())
    }
  }
  flushText()
  flushList()
  return { raw, blocks }
}

const TIME_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
  timeZoneName: 'short',
})
const DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})
const ISO_DATE_FMT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/New_York',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function formatEastern(input: Date | string): DisplayTime {
  const d = typeof input === 'string' ? new Date(input) : input
  const time = TIME_FMT.format(d)
  const date = ISO_DATE_FMT.format(d)
  const longDate = DATE_FMT.format(d)
  return {
    iso: d.toISOString(),
    date,
    time,
    display: `${longDate} at ${time}`,
  }
}

export function buildAuthorUrl(
  email: string,
  name: string,
  repo: Repository,
): string {
  // GitHub no-reply form: 12345+username@users.noreply.github.com
  // (or the older username@users.noreply.github.com).
  const noreply = email.match(
    /^(?:\d+\+)?([a-zA-Z0-9-]+)@users\.noreply\.github\.com$/,
  )
  if (noreply) {
    return `https://github.com/${noreply[1]}`
  }
  // Fall back to GitHub's commits-by-author filter on the repo. Email
  // is more precise than name (no collisions) and GitHub accepts it.
  const q = encodeURIComponent(email || name)
  return `${repo.url}/commits?author=${q}`
}

export function buildCommitUrl(repo: Repository, sha: string): string {
  return `${repo.url}/commit/${sha}`
}

interface RawCommit {
  sha: string
  authorName: string
  authorEmail: string
  date: string
  subject: string
  body: string
}

function readGitLog(limit: number): RawCommit[] {
  const fmt = [
    '%H',
    '%an',
    '%ae',
    '%aI',
    '%s',
    '%b',
  ].join(FIELD_SEPARATOR)
  const out = execFileSync(
    'git',
    [
      'log',
      `-${limit}`,
      `--pretty=format:${fmt}${RECORD_SEPARATOR}`,
    ],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  return out
    .split(RECORD_SEPARATOR)
    .map((s) => s.replace(/^\n+/, ''))
    .filter((s) => s.trim().length > 0)
    .map((rec) => {
      const [sha, authorName, authorEmail, date, subject, ...bodyParts] =
        rec.split(FIELD_SEPARATOR)
      return {
        sha,
        authorName,
        authorEmail,
        date,
        subject,
        body: bodyParts.join(FIELD_SEPARATOR),
      }
    })
}

export function shapeCommit(raw: RawCommit, repo: Repository): Commit {
  return {
    sha: raw.sha,
    shortSha: raw.sha.slice(0, 7),
    url: buildCommitUrl(repo, raw.sha),
    author: {
      name: raw.authorName,
      email: raw.authorEmail,
      url: buildAuthorUrl(raw.authorEmail, raw.authorName, repo),
    },
    committedAt: formatEastern(raw.date),
    subject: raw.subject,
    conventional: parseConventionalSubject(raw.subject),
    body: parseBody(raw.body),
  }
}

export function buildManifest(
  raws: RawCommit[],
  repo: Repository,
  deployedAt: Date,
  headSha: string,
): DeployManifest {
  return {
    deployedAt: formatEastern(deployedAt),
    commit: {
      sha: headSha,
      shortSha: headSha.slice(0, 7),
      url: buildCommitUrl(repo, headSha),
    },
    repository: repo,
    commits: raws.map((r) => shapeCommit(r, repo)),
  }
}

async function main(): Promise<void> {
  const repo = resolveRepository()
  const headSha =
    process.env.GITHUB_SHA?.trim() ||
    execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  const raws = readGitLog(COMMIT_LIMIT)
  const manifest = buildManifest(raws, repo, new Date(), headSha)

  await mkdir(DIST_DIR, { recursive: true })
  const outPath = resolve(DIST_DIR, 'deploy.json')
  await writeFile(outPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(
    `✓ wrote deploy.json (${manifest.commits.length} commits, head ${manifest.commit.shortSha})`,
  )
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])
if (isMain) {
  main().catch((err) => {
    console.error('✗ deploy.json generation failed:', err)
    process.exit(1)
  })
}
