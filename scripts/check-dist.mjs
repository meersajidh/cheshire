#!/usr/bin/env node
/**
 * Assert that every path a package's manifest promises actually exists in
 * `dist/` after a build — every `bin` target, every `exports` target.
 *
 * This exists because the repository published a package whose `bin` pointed at
 * a file that was never emitted, and **every other gate was green**. Lint,
 * build, typecheck, test, cites and layout all pass without any of them looking
 * inside `dist/`, and `pnpm publish` packs whatever is there rather than
 * building. The failure surfaced two steps downstream as
 * `spawn create-cheshire ENOENT`, in a consumer, naming nothing useful.
 *
 * The mechanism was `tsc -b` trusting a `tsBuildInfoFile` that outlived the
 * `dist/` it described: told everything was current, it emitted nothing, and the
 * package's other build step wrote enough output to make the directory look
 * plausible. Deleting a build's output without its build info is a state a
 * developer reaches easily — so the fix is a gate that checks the artifact,
 * rather than a rule about how to delete things.
 *
 * Deliberately shallow: it checks that files exist, not that they contain
 * anything sensible. A real install remains the only proof of that.
 */
import { existsSync, globSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Every string in an `exports` value, however deeply the conditions nest. */
function targets(value) {
  if (typeof value === 'string') return [value]
  if (value && typeof value === 'object') return Object.values(value).flatMap(targets)
  return []
}

const failures = []
const manifests = globSync('packages/*/package.json', { cwd: ROOT })
let checked = 0

for (const manifest of manifests) {
  const dir = dirname(manifest)
  const pkg = JSON.parse(readFileSync(resolve(ROOT, manifest), 'utf8'))

  const promised = [
    ...Object.entries(pkg.bin ?? {}).map(([name, path]) => [`bin ${name}`, path]),
    ...Object.entries(pkg.exports ?? {}).flatMap(([entry, value]) =>
      targets(value).map((path) => [`exports ${entry}`, path]),
    ),
  ]

  for (const [what, path] of promised) {
    checked += 1
    if (!existsSync(resolve(ROOT, dir, path))) {
      failures.push(`${pkg.name}: ${what} → ${path} does not exist`)
    }
  }
}

if (failures.length > 0) {
  console.error(`\n  ${failures.length} broken promise(s) of ${checked}:\n`)
  for (const failure of failures) console.error(`    ${failure}`)
  console.error('\n  The manifest names a file the build did not produce. `pnpm clean && pnpm build`\n')
  process.exitCode = 1
} else {
  console.log(`  ${checked} manifest paths exist in dist`)
}
