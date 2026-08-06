#!/usr/bin/env node
/**
 * Publish every framework package to a local Verdaccio registry, so the shipping
 * path can be exercised without spending a version number on npm.
 *
 * Tarballs prove that a package *installs*. They cannot prove what only a
 * registry does: that a scope is readable, that `pnpm create cheshire` resolves
 * `create-cheshire` by name, that a dist-tag points where it should, that a
 * transitive dependency is reachable. Those failures are invisible until the
 * first real install — which is exactly how the missing Electron allowlist
 * survived every gate.
 *
 * npm cannot fill that role during development: a published version is permanent
 * (the unpublish window is 72 hours, and the version number is burned forever).
 * Verdaccio can, because it hosts the **real names** — unscoped `create-cheshire`
 * included — and lets the same version be republished as often as you like.
 *
 *   node scripts/registry-local.mjs start      run Verdaccio in the foreground
 *   node scripts/registry-local.mjs publish    build, then publish all five
 *   node scripts/registry-local.mjs status     what the registry currently holds
 *   node scripts/registry-local.mjs reset      forget every published version
 *
 * `publish` refuses to run unless the registry answers on REGISTRY, which is the
 * one guard that matters: without it, a mistyped flag publishes to npmjs.org.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = process.env.CHESHIRE_REGISTRY ?? 'http://localhost:4873'

/** Verdaccio's storage and config, outside the repository like the tarballs. */
const HOME = join(
  process.env.XDG_DATA_HOME ?? join(homedir(), '.local', 'share'),
  'cheshire',
  'verdaccio',
)

/** Packed in dependency order, which keeps the output readable. */
const PACKAGES = [
  'packages/core',
  'packages/shell',
  'packages/runtime/electron',
  'cli/cheshire',
  'cli/create-cheshire',
]

const COMMANDS = { start, publish, status, reset }

async function main(argv) {
  const command = COMMANDS[argv[0]]
  if (!command) {
    console.error(`\n  usage: node scripts/registry-local.mjs <${Object.keys(COMMANDS).join('|')}>\n`)
    process.exitCode = 1
    return
  }
  await command()
}

/**
 * Verdaccio's default config allows anonymous publish only from localhost, which
 * is what lets `publish` skip `npm adduser` entirely. Written once and left alone
 * afterwards, so a hand-edit survives.
 */
function start() {
  mkdirSync(HOME, { recursive: true })

  const configPath = join(HOME, 'config.yaml')
  if (!existsSync(configPath)) {
    writeFileSync(configPath, CONFIG, 'utf8')
    console.log(`  wrote ${configPath}`)
  }

  console.log(`\n  verdaccio on ${REGISTRY}, storage in ${HOME}`)
  console.log('  leave this running; publish from another terminal\n')

  spawnSync('pnpm', ['dlx', 'verdaccio@6', '--config', configPath], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  })
}

async function publish() {
  if (!(await reachable())) {
    console.error(
      `\n  cheshire: nothing is answering on ${REGISTRY}.\n\n` +
        '    start it:  node scripts/registry-local.mjs start\n\n' +
        '  Refusing to continue — without a local registry, a publish would go to npmjs.org.\n',
    )
    process.exitCode = 1
    return
  }

  console.log('  building…\n')
  run('pnpm', ['-r', 'build'], ROOT)

  console.log(`\n  publishing to ${REGISTRY}\n`)
  for (const dir of PACKAGES) {
    // `--force` because republishing the same version is the entire point here,
    // and npm's "cannot publish over an existing version" rule is what makes the
    // real registry unusable for iteration.
    run(
      'pnpm',
      ['publish', '--registry', REGISTRY, '--no-git-checks', '--access', 'public', '--force'],
      join(ROOT, dir),
    )
  }

  console.log(`\n  consume it:  pnpm create cheshire <name> --registry ${REGISTRY}`)
  console.log('  generate OUTSIDE this repository — a consumer inside it inherits settings')
  console.log('  it is supposed to be proving it does not need.\n')
}

async function status() {
  if (!(await reachable())) {
    console.log(`\n  nothing answering on ${REGISTRY}\n`)
    return
  }
  console.log(`\n  ${REGISTRY}\n`)
  for (const name of ['@cheshire/app', '@cheshire/core', '@cheshire/shell', '@cheshire/runtime-electron', 'create-cheshire']) {
    const probe = spawnSync('npm', ['view', name, 'version', '--registry', REGISTRY], {
      encoding: 'utf8',
      shell: process.platform === 'win32',
    })
    const version = probe.status === 0 ? probe.stdout.trim() : '—'
    console.log(`    ${name.padEnd(28)} ${version}`)
  }
  console.log('')
}

function reset() {
  const storage = join(HOME, 'storage')
  rmSync(storage, { recursive: true, force: true })
  console.log(`\n  cleared ${storage}\n`)
}

/**
 * A bounded TCP probe, deliberately not `curl` and not an HTTP request.
 *
 * `curl http://localhost:4873` was measured hanging for its full timeout against
 * a port with nothing listening, rather than failing fast on connection-refused —
 * so a "is it up?" check became a ten-second stall on the common path. A socket
 * with an explicit timeout cannot do that, needs no external binary, and is the
 * same three states everywhere: connected, refused, or timed out.
 */
function reachable() {
  const { hostname, port } = new URL(REGISTRY)
  return new Promise((resolvePromise) => {
    const socket = connect({ host: hostname, port: Number(port || 80) })
    const settle = (value) => {
      socket.destroy()
      resolvePromise(value)
    }
    socket.setTimeout(1500)
    socket.once('connect', () => settle(true))
    socket.once('timeout', () => settle(false))
    socket.once('error', () => settle(false))
  })
}

function run(command, args, cwd) {
  execFileSync(command, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' })
}

/**
 * Everything not published here is proxied to npmjs.org and cached, so a
 * generated application still resolves React and Electron normally.
 */
const CONFIG = `storage: ./storage

uplinks:
  npmjs:
    url: https://registry.npmjs.org/

packages:
  '@cheshire/*':
    access: $all
    publish: $anonymous
    unpublish: $anonymous
  'create-cheshire':
    access: $all
    publish: $anonymous
    unpublish: $anonymous
  '**':
    access: $all
    publish: $authenticated
    proxy: npmjs

log: { type: stdout, format: pretty, level: warn }
`

await main(process.argv.slice(2))
