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

  return { dinah: manifest.version, react: REACT_VERSION, reactTypes: REACT_TYPES_VERSION }
}

function init(targetDir: string): void {
  const result = spawnSync('git', ['init', '--quiet'], { cwd: targetDir, stdio: 'inherit' })
  // A missing git is not a reason to fail a generated application.
  if (result.error) console.warn('create-dinah: skipped `git init` — git is not available.')
}

function install(targetDir: string): void {
  const manager = packageManager()
  console.log(`\n  installing dependencies with ${manager}…\n`)

  // `shell` only on Windows, where package managers are `.cmd` shims that
  // cannot be executed directly. Everywhere else it earns a deprecation warning
  // about unescaped arguments and buys nothing.
  const result = spawnSync(manager, ['install'], {
    cwd: targetDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
  if (result.status !== 0) {
    throw new ScaffoldError(
      `create-dinah: \`${manager} install\` failed. The application is generated — run it again in ${basename(targetDir)}.`,
    )
  }
}

/** Whichever tool invoked `create`, so the lockfile matches the developer's habit. */
function packageManager(): string {
  const agent = process.env['npm_config_user_agent'] ?? ''
  if (agent.startsWith('pnpm')) return 'pnpm'
  if (agent.startsWith('yarn')) return 'yarn'
  if (agent.startsWith('bun')) return 'bun'
  return 'npm'
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
