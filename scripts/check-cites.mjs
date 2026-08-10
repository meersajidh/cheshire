#!/usr/bin/env node
/**
 * Verify that every `path:symbol` cite in the documentation still resolves.
 *
 * The documentation cites code constantly, and a cite that points at nothing is
 * worse than no cite: it sends a reader somewhere confidently wrong. `path:line`
 * cites cannot be checked — line 92 always exists, and no tool can say whether
 * it is still the right line. Cites are therefore written `path:symbol`, which
 * is checkable, and this is the check.
 *
 * It caught its own motivating case during the migration: fixing a comment added
 * six lines and moved a stamp from `cli.ts:86` to `cli.ts:92`, invalidating a
 * cite corrected minutes earlier.
 *
 * **What it cannot do:** tell you a symbol still *means* what the prose claims.
 * A comment that went false while staying where it was passes this gate and is
 * exactly the failure that motivated the migration. Only reading catches that.
 */
import { globSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Documentation that carries cites. Source comments are not scanned. */
const DOCS = ['docs/**/*.md', 'CLAUDE.md', 'README.md']

/** Files a cite may point into. */
const SOURCES = [
  'packages/**/src/**/*.ts',
  'packages/**/src/**/*.tsx',
  'packages/**/*.config.ts',
  'packages/**/scripts/*.mjs',
  'scripts/*.mjs',
  'templates/**/*.yaml',
  '*.yaml',
  '*.json',
]

/**
 * `path.ext:symbol` or `path.ext:symbol()`, inside backticks.
 *
 * The trailing `()` is optional and stripped: it reads better for a function and
 * carries no meaning the check needs.
 */
const CITE = /`([\w./-]+\.(?:ts|tsx|mjs|yaml|json)):(\w+)(?:\(\))?`/g

const sources = SOURCES.flatMap((pattern) => globSync(pattern, { cwd: ROOT }))
const docs = DOCS.flatMap((pattern) => globSync(pattern, { cwd: ROOT }))
const failures = []
let checked = 0

for (const doc of docs) {
  const text = readFileSync(resolve(ROOT, doc), 'utf8')

  for (const [cite, path, symbol] of text.matchAll(CITE)) {
    checked += 1

    // A cite may name any unique suffix of a path. `app.ts` is enough because
    // exactly one exists; `cli.ts` is not, because both CLIs have one. Ambiguity
    // is an error rather than a guess — that demands precision only where it is
    // actually needed, instead of forcing full paths everywhere.
    const matches = sources.filter((file) => file === path || file.endsWith(`/${path}`))

    if (matches.length === 0) {
      failures.push(`${doc}: ${cite} — no such file`)
      continue
    }
    if (matches.length > 1) {
      failures.push(`${doc}: ${cite} — ambiguous; matches ${matches.join(', ')}. Lengthen the path.`)
      continue
    }

    const source = readFileSync(resolve(ROOT, matches[0]), 'utf8')
    if (!new RegExp(`\\b${symbol}\\b`).test(source)) {
      failures.push(`${doc}: ${cite} — \`${symbol}\` is not in ${matches[0]}`)
    }
  }
}

if (failures.length > 0) {
  console.error(`\n  ${failures.length} stale cite(s) of ${checked}:\n`)
  for (const failure of failures) console.error(`    ${failure}`)
  console.error('\n  Fix the cite — or the symbol moved, and the prose around it needs rereading.\n')
  process.exitCode = 1
} else {
  console.log(`  ${checked} cites resolve`)
}
