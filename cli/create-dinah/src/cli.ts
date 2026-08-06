#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { createInterface } from 'node:readline/promises'
import { fileURLToPath } from 'node:url'
import { basename, relative, resolve } from 'node:path'
import { deriveIdentity, InvalidNameError } from './identity.js'
import { useLocalTarballs } from './local-tarballs.js'
import { scaffold, ScaffoldError } from './scaffold.js'
import type { Versions } from './scaffold.js'

const USAGE = `
  create-dinah — generate a desktop application

  Usage
    pnpm create dinah <name>

  Requires pnpm — a generated application declares \`nodeLinker: hoisted\`,
  which npm and yarn have no equivalent for and electron-builder needs.

  Options
    --from-tarballs <dir>   Install the framework from packed tarballs (proof gate)
    --no-install            Skip installing dependencies
    --no-git                Skip \`git init\`
    -h, --help              Show this message
`

/**
 * The React the template is generated against. Pinned rather than ranged for
 * the same reason as the dinah version: a generated application starts on a
 * combination that has been run, not one resolved fresh on the day.
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
  if (options.fromTarballs) useLocalTarballs(targetDir, options.fromTarballs)

  if (options.git) init(targetDir)
  if (options.install) install(targetDir)

  const where = relative(process.cwd(), targetDir) || '.'
  console.log(`\n  ${identity.productName} is ready in ${where}\n`)
  console.log(`    cd ${where}`)
  if (!options.install) console.log('    pnpm install')
  console.log('    pnpm dev\n')
}

interface Options {
  name?: string
  fromTarballs?: string
  install: boolean
  git: boolean
}

function parse(argv: string[]): Options {
  const options: Options = { install: true, git: true }

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index] as string

    if (argument === '--from-tarballs') {
      const value = argv[index + 1]
      if (!value) throw new ScaffoldError('create-dinah: --from-tarballs needs a directory.')
      options.fromTarballs = value
      index += 1
    } else if (argument === '--no-install') {
      options.install = false
    } else if (argument === '--no-git') {
      options.git = false
    } else if (argument.startsWith('-')) {
      throw new ScaffoldError(`create-dinah: unknown option \`${argument}\`.\n${USAGE}`)
    } else {
      options.name ??= argument
    }
  }

  return options
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
 * The framework version a generated application pins to is this generator's own
 * version: `create-dinah` and the packages it generates against are released
 * together, so they cannot disagree.
 */
function versions(): Versions {
  const manifest = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { version: string }

  return {
    dinah: manifest.version,
    react: REACT_VERSION,
    reactTypes: REACT_TYPES_VERSION,
    pnpm: PNPM_VERSION,
  }
}

function init(targetDir: string): void {
  const result = spawnSync('git', ['init', '--quiet'], { cwd: targetDir, stdio: 'inherit' })
  // A missing git is not a reason to fail a generated application.
  if (result.error) console.warn('create-dinah: skipped `git init` — git is not available.')
}

/**
 * Install with pnpm — always, and never with whatever invoked `create`.
 *
 * A dinah application is pnpm-shaped by construction, in two ways that have no
 * equivalent anywhere else:
 *
 * - `pnpm-workspace.yaml` carries `nodeLinker: hoisted`, which exists because
 *   electron-builder cannot follow pnpm's Windows junctions when it collects
 *   binaries — without it a packaged application ships incomplete and crashes
 *   on launch. npm and yarn have no such setting to honour.
 * - Generated with `--from-tarballs`, the `overrides:` block that resolves the
 *   framework's own cross-references lives in that same file. Nothing else
 *   reads it, so every `@dinah/*` request goes to a registry that has no such
 *   version.
 *
 * Detecting the caller's package manager was therefore offering a choice dinah
 * cannot honour: npm "succeeds" while silently ignoring the linker, and the
 * failure surfaces much later, at packaging, on Windows. Being explicit costs a
 * developer one `npm i -g pnpm`; the alternative costs them a debugging session
 * with no clue pointing here.
 */
function install(targetDir: string): void {
  if (!hasPnpm()) {
    throw new ScaffoldError(
      'create-dinah: dinah applications require pnpm.\n' +
        '  `nodeLinker: hoisted` has no npm or yarn equivalent, and electron-builder\n' +
        '  needs it to package correctly on Windows.\n\n' +
        '    install it:  npm i -g pnpm\n' +
        `    then:        cd ${basename(targetDir)} && pnpm install\n\n` +
        '  The application is generated — only the install was skipped.',
    )
  }

  console.log('\n  installing dependencies with pnpm…\n')

  const result = spawnSync('pnpm', ['install'], {
    cwd: targetDir,
    stdio: 'inherit',
    // `shell` only on Windows, where package managers are `.cmd` shims that
    // cannot be executed directly. Everywhere else it earns a deprecation
    // warning about unescaped arguments and buys nothing.
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new ScaffoldError(
      `create-dinah: \`pnpm install\` failed. The application is generated — run it again in ${basename(targetDir)}.`,
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
