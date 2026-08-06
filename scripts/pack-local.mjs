#!/usr/bin/env node
/**
 * Pack every framework package into `.local/tarballs`, at a version nobody has
 * seen before.
 *
 * The problem this exists to remove: while every package sat at `0.0.0`, a
 * repack was **invisible** to a consumer. The consumer's lockfile pinned the old
 * tarball's integrity and pnpm reinstalled that copy from the store — `pnpm
 * install --force` included — so a framework change silently did not appear,
 * and the only way through was to wipe `node_modules` and the lockfile by hand.
 *
 * Stamping a unique version per pack removes the ambiguity at the source. The
 * tarball *filename* carries the version, so the consumer's `file:` specifier
 * changes too, and pnpm has nothing stale it could resolve to.
 *
 *   node scripts/pack-local.mjs                     build, then pack
 *   node scripts/pack-local.mjs --no-build          pack what is already built
 *   node scripts/pack-local.mjs --refresh <dir>     also repoint a consumer
 *                                                   (repeatable)
 *
 * Manifests are edited in place and restored in a `finally`. Nothing here is
 * committed: the stamped version exists only inside the tarball.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TARBALL_DIR = join(ROOT, '.local', 'tarballs')

/** Packed in this order; it is also dependency order, which keeps output readable. */
const PACKAGES = [
  'packages/core',
  'packages/shell',
  'packages/runtime/electron',
  'cli/mogget',
  'cli/create-mogget',
]

/**
 * The marker `create-mogget` writes above the overrides block it appends to a
 * generated app's `pnpm-workspace.yaml`. Refreshing replaces everything from
 * this line onward.
 *
 * Kept in sync by hand with `cli/create-mogget/src/local-tarballs.ts`. If the two
 * ever disagree, `--refresh` appends a second overrides block instead of
 * replacing the first, and the install fails loudly rather than quietly.
 */
const OVERRIDES_MARKER = '# Generated with --from-tarballs:'

function main(argv) {
  const options = parse(argv)

  if (options.build) {
    console.log('  building…\n')
    run('pnpm', ['-r', 'build'], ROOT)
  }

  const version = stamp()
  const originals = new Map()

  mkdirSync(TARBALL_DIR, { recursive: true })
  prune()

  try {
    for (const dir of PACKAGES) {
      const manifestPath = join(ROOT, dir, 'package.json')
      const original = readFileSync(manifestPath, 'utf8')
      originals.set(manifestPath, original)

      // `pnpm pack` substitutes the packed version for every `workspace:*`, so
      // stamping all five before packing any of them is what keeps the
      // framework's cross-references pointing at each other.
      const manifest = JSON.parse(original)
      manifest.version = version
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    }

    for (const dir of PACKAGES) {
      run('pnpm', ['pack', '--pack-destination', TARBALL_DIR], join(ROOT, dir))
    }
  } finally {
    for (const [path, contents] of originals) writeFileSync(path, contents, 'utf8')
  }

  const packed = readdirSync(TARBALL_DIR).filter((file) => file.endsWith('.tgz'))
  console.log(`\n  packed ${packed.length} tarballs at ${version}\n`)
  for (const file of packed.sort()) console.log(`    ${file}`)

  if (options.refresh.length === 0) {
    console.log(`\n  consumers: pnpm exec create-mogget <name> --from-tarballs ${TARBALL_DIR}`)
    console.log(`  existing:  node scripts/pack-local.mjs --refresh <dir>\n`)
    return
  }

  console.log('')
  const targets = options.refresh.map((dir) => resolve(dir))
  for (const target of targets) {
    refresh(target)
    console.log(`  repointed ${target}`)
  }

  // Installs are the developer's to run, so this stops at the instruction.
  console.log(`\n  now: ${targets.map((target) => `(cd ${target} && pnpm install)`).join(' && ')}\n`)
}

function parse(argv) {
  const options = { build: true, refresh: [] }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]

    if (argument === '--no-build') {
      options.build = false
    } else if (argument === '--refresh') {
      const value = argv[index + 1]
      if (!value) fail('--refresh needs a directory.')
      options.refresh.push(value)
      index += 1
    } else {
      fail(`unknown option \`${argument}\`.`)
    }
  }

  return options
}

/**
 * `0.0.0-dev.<UTC timestamp>` — a valid semver prerelease that sorts by when it
 * was packed, and never collides with a published version.
 */
function stamp() {
  const now = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  return `0.0.0-dev.${now}`
}

/**
 * Remove earlier packs. Not housekeeping: `--from-tarballs` maps files back to
 * package names by stripping the version, so two versions of one package in this
 * directory means whichever `readdir` returns last wins — silently.
 */
function prune() {
  for (const file of readdirSync(TARBALL_DIR)) {
    if (file.endsWith('.tgz')) rmSync(join(TARBALL_DIR, file))
  }
}

/** Repoint a generated application at the tarballs just packed. */
function refresh(targetDir) {
  const manifestPath = join(targetDir, 'package.json')
  if (!existsSync(manifestPath)) fail(`no package.json in ${targetDir}.`)

  const tarballs = new Map()
  for (const file of readdirSync(TARBALL_DIR)) {
    if (!file.endsWith('.tgz')) continue
    const stem = file.replace(/-\d+\.\d+\.\d+.*\.tgz$/, '')

    // `pnpm pack` drops the scope: `mogget-core-*.tgz` is `@mogget/core`. The two
    // unscoped packages keep their own names, and anything else in this
    // directory is not ours to rewrite.
    let name
    if (stem === 'mogget' || stem === 'create-mogget') name = stem
    else if (stem.startsWith('mogget-')) name = `@mogget/${stem.slice('mogget-'.length)}`
    else continue

    tarballs.set(name, join(TARBALL_DIR, file))
  }

  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  let rewritten = 0
  const dropped = []
  for (const group of ['dependencies', 'devDependencies']) {
    for (const name of Object.keys(manifest[group] ?? {})) {
      const tarball = tarballs.get(name)
      if (tarball) {
        manifest[group][name] = `file:${tarball}`
        rewritten += 1
        continue
      }

      // A mogget-scoped dependency with no tarball is a package that has been
      // renamed or removed since this consumer was generated. Rewriting only
      // what matches would leave the dead specifier resolving to whatever stale
      // tarball is still on disk — a consumer that installs green and runs the
      // wrong code. Drop it and say so; the replacement arrives when the
      // consumer is regenerated from the current template.
      if (name === 'mogget' || name === 'create-mogget' || name.startsWith('@mogget/')) {
        delete manifest[group][name]
        dropped.push(name)
      }
    }
  }

  if (dropped.length > 0) {
    console.warn(
      `  warn  ${targetDir}: dropped ${dropped.join(', ')} — no such package is packed any more.\n` +
        '        Regenerate this consumer with create-mogget; --refresh cannot add what a rename removed.',
    )
  }

  if (rewritten === 0) {
    fail(`${targetDir} depends on no mogget package — is it a generated application?`)
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')

  // The framework's own cross-references need the same treatment: a packed
  // `mogget` asks for `@mogget/core` at a version no registry has.
  const workspacePath = join(targetDir, 'pnpm-workspace.yaml')
  if (!existsSync(workspacePath)) return

  const existing = readFileSync(workspacePath, 'utf8')
  const marker = existing.indexOf(OVERRIDES_MARKER)
  const base = marker === -1 ? existing.trimEnd() : existing.slice(0, marker).trimEnd()

  const entries = [...tarballs]
    .filter(([name]) => name !== 'create-mogget')
    .map(([name, tarball]) => `  '${name}': file:${tarball}`)
    .sort()
    .join('\n')

  writeFileSync(
    workspacePath,
    `${base}\n\n${OVERRIDES_MARKER} the framework is installed from packed files,\n` +
      `# and the versions inside them are not published anywhere.\noverrides:\n${entries}\n`,
    'utf8',
  )
}

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: ['ignore', 'inherit', 'inherit'] })
}

function fail(message) {
  console.error(`\npack-local: ${message}\n`)
  process.exit(1)
}

main(process.argv.slice(2))
