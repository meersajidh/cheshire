#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { basename, join, relative, resolve } from 'node:path'
import { deriveIdentity, InvalidNameError } from './identity.js'
import { scaffold, ScaffoldError } from './scaffold.js'
import { parse, USAGE } from './options.js'
import type { Versions } from './scaffold.js'

/**
 * The React the template is generated against — a version that has actually been
 * run together with this generator, not whatever `latest` resolves to on the day.
 * Caret, so a generated application still collects patches.
 */
const REACT_VERSION = '^19.2.7'

/** React's types, which an application needs from the moment it writes a view. */
const REACT_TYPES_VERSION = '^19.2.17'

/**
 * The pnpm a generated application declares in `packageManager`, so corepack
 * pins the same one the framework was tested against.
 */
const PNPM_VERSION = '11.17.0'

async function main(argv: string[]): Promise<void> {
  if (argv.includes('-h') || argv.includes('--help')) {
    console.log(USAGE)
    return
  }

  const options = parse(argv)
  const identity = deriveIdentity(options.name ?? (await ask()))
  const targetDir = resolve(process.cwd(), identity.name)

  scaffold(templateDir(), targetDir, identity, versions())
  if (options.registry) pinRegistry(targetDir, options.registry)

  if (options.git) init(targetDir)
  if (options.install) install(targetDir, options.registry)

  const where = relative(process.cwd(), targetDir) || '.'
  console.log(`\n  ${identity.productName} is ready in ${where}\n`)
  console.log(`    cd ${where}`)
  if (!options.install) console.log('    pnpm install')
  console.log('    pnpm dev\n')
}

async function ask(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return await rl.question('Application name: ')
  } finally {
    rl.close()
  }
}

function templateDir(): string {
  return fileURLToPath(new URL('./template', import.meta.url))
}

/**
 * The framework version a generated application declares is this generator's own
 * version: `create-cheshire` and the packages it generates against are released
 * together, so they cannot disagree.
 *
 * Caret, not exact. Below 1.0 a caret range admits patches and nothing else, so a
 * generated application collects the next patch without ever crossing a minor —
 * which is where the breaking changes live while the surface moves. An exact pin would
 * strand every application generated today on the version that shipped today.
 *
 * It is also what makes the local-registry loop work. `registry:publish` stamps
 * `<next patch>-dev.<timestamp>`, so a generator installed from that registry
 * writes `^<that version>` here — and every later dev publish is a higher
 * prerelease of the same patch, which this range admits. The consumer refreshes
 * with `pnpm update` and nothing rewrites its manifest.
 */
function versions(): Versions {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string }

  return {
    cheshire: `^${manifest.version}`,
    react: REACT_VERSION,
    reactTypes: REACT_TYPES_VERSION,
    pnpm: PNPM_VERSION,
  }
}

/**
 * Write the chosen registry into the generated application's `.npmrc`.
 *
 * `--registry` reaches the install this command spawns, and nothing after it.
 * Without this the *next* command a developer runs in the application — `pnpm
 * update`, `pnpm add`, `pnpm install` after a git clone — silently goes to
 * npmjs.org and fails on framework versions that only exist locally, with an
 * error naming npmjs.org and no hint that the registry was ever the question.
 *
 * A file in the application is also the honest place for it: the registry a
 * project resolves from is the project's property, not one invocation's.
 */
function pinRegistry(targetDir: string, registry: string): void {
  writeFileSync(join(targetDir, '.npmrc'), `registry=${registry}\n`, 'utf8')
}

function init(targetDir: string): void {
  const result = spawnSync('git', ['init', '--quiet'], { cwd: targetDir, stdio: 'inherit' })
  // A missing git is not a reason to fail a generated application.
  if (result.error) console.warn('create-cheshire: skipped `git init` — git is not available.')
}

/**
 * Install with pnpm — always, and never with whatever invoked `create`.
 *
 * A cheshire application is pnpm-shaped by construction, in two ways that have no
 * equivalent anywhere else:
 *
 * - `pnpm-workspace.yaml` carries `nodeLinker: hoisted`, which exists because
 *   electron-builder cannot follow pnpm's Windows junctions when it collects
 *   binaries — without it a packaged application ships incomplete and crashes
 *   on launch. npm and yarn have no such setting to honour.
 * Detecting the caller's package manager was therefore offering a choice cheshire
 * cannot honour: npm "succeeds" while silently ignoring the linker, and the
 * failure surfaces much later, at packaging, on Windows. Being explicit costs a
 * developer one `npm i -g pnpm`; the alternative costs them a debugging session
 * with no clue pointing here.
 */
function install(targetDir: string, registry?: string): void {
  if (!hasPnpm()) {
    throw new ScaffoldError(
      'create-cheshire: cheshire applications require pnpm.\n' +
        '  `nodeLinker: hoisted` has no npm or yarn equivalent, and electron-builder\n' +
        '  needs it to package correctly on Windows.\n\n' +
        '    install it:  npm i -g pnpm\n' +
        `    then:        cd ${basename(targetDir)} && pnpm install\n\n` +
        '  The application is generated — only the install was skipped.',
    )
  }

  console.log('\n  installing dependencies with pnpm…\n')

  // The install is a separate process, so a registry chosen for *this* command
  // does not reach it on its own. Without forwarding, `--registry` would fetch
  // the generator from one registry and the framework from another — and when
  // both hold the same version, that resolves cleanly and proves nothing.
  const args = registry ? ['install', '--registry', registry] : ['install']

  const result = spawnSync('pnpm', args, {
    cwd: targetDir,
    stdio: 'inherit',
    // `shell` only on Windows, where package managers are `.cmd` shims that
    // cannot be executed directly. Everywhere else it earns a deprecation
    // warning about unescaped arguments and buys nothing.
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new ScaffoldError(
      `create-cheshire: \`pnpm install\` failed. The application is generated — run it again in ${basename(targetDir)}.`,
    )
  }
}

function hasPnpm(): boolean {
  const probe = spawnSync('pnpm', ['--version'], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
  return probe.error === undefined && probe.status === 0
}

try {
  await main(process.argv.slice(2))
} catch (error) {
  if (error instanceof ScaffoldError || error instanceof InvalidNameError) {
    console.error(`\n${error.message}\n`)
    process.exitCode = 1
  } else {
    throw error
  }
}
