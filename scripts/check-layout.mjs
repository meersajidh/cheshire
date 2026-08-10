#!/usr/bin/env node
/**
 * Assert that every package's directory basename is its name with the scope
 * stripped.
 *
 * `@cheshire/runtime-electron` lives in `packages/runtime-electron`; unscoped
 * `create-cheshire` lives in `packages/create-cheshire`. Stripping an absent
 * scope is a no-op, so the rule holds for the one unscoped package too and has
 * no exceptions to remember.
 *
 * Worth a gate rather than a convention because the old layout drifted exactly
 * this way: `cli/cheshire` published as `@cheshire/app`, which read as a CLI
 * package on disk and an application-facing one on npm. Nothing failed — the
 * directory name reaches no consumer, only the reader — so nothing said so
 * until someone went looking for `@cheshire/app` in the repository and could
 * not find it.
 *
 * A single flat glob is the point: `packages/*` in `pnpm-workspace.yaml` means
 * a new package is a workspace member the moment it exists, and this says it is
 * in the right place.
 */
import { globSync, readFileSync } from 'node:fs'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const failures = []
const manifests = globSync('packages/*/package.json', { cwd: ROOT })

for (const manifest of manifests) {
  const dir = dirname(manifest)
  const { name } = JSON.parse(readFileSync(resolve(ROOT, manifest), 'utf8'))
  const expected = name.replace(/^@[^/]+\//, '')

  if (basename(dir) !== expected) {
    failures.push(`${dir} publishes as \`${name}\` — expected the directory to be packages/${expected}`)
  }
}

if (failures.length > 0) {
  console.error(`\n  ${failures.length} misplaced package(s) of ${manifests.length}:\n`)
  for (const failure of failures) console.error(`    ${failure}`)
  console.error('\n  Rename the directory, or rename the package. They are one decision.\n')
  process.exitCode = 1
} else {
  console.log(`  ${manifests.length} packages sit where their names say`)
}
