#!/usr/bin/env node
/**
 * Publish every framework package to a local Verdaccio registry, so the shipping
 * path can be exercised without spending a version number on npm.
 *
 * This is the whole consumer loop; there is no second mechanism. A registry
 * proves what nothing else does: that a scope is readable, that
 * `pnpm create cheshire` resolves `create-cheshire` by name, that a dist-tag
 * points where it should, that a transitive dependency is reachable. Those
 * failures are invisible until the first real install — which is exactly how the
 * missing Electron allowlist survived every gate.
 *
 * npm cannot fill that role during development: a published version is permanent
 * (the unpublish window is 72 hours, and the version number is burned forever).
 * Verdaccio can, because it hosts the **real names** — unscoped `create-cheshire`
 * included — and costs nothing per version. See `stamp()` for why every publish
 * takes a fresh one rather than overwriting.
 *
 *   node scripts/registry-local.mjs start      run Verdaccio in the foreground
 *   node scripts/registry-local.mjs publish    build, stamp, publish all five
 *   node scripts/registry-local.mjs status     what the registry currently holds
 *   node scripts/registry-local.mjs reset      forget every published version
 *
 * `publish` refuses to run unless the registry answers on REGISTRY, which is the
 * one guard that matters: without it, a mistyped flag publishes to npmjs.org.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { connect } from 'node:net'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const REGISTRY = process.env.CHESHIRE_REGISTRY ?? 'http://localhost:4873'

/** Verdaccio's storage and config, outside the repository like every consumer. */
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

  const version = stamp()
  const originals = new Map()

  console.log(`\n  publishing to ${REGISTRY} at ${version}\n`)
  try {
    for (const dir of PACKAGES) {
      const manifestPath = join(ROOT, dir, 'package.json')
      const original = readFileSync(manifestPath, 'utf8')
      originals.set(manifestPath, original)

      // `pnpm publish` substitutes the published version for every `workspace:^`,
      // so stamping all five before publishing any of them is what keeps the
      // framework's cross-references pointing at each other.
      const manifest = JSON.parse(original)
      manifest.version = version
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
    }

    for (const dir of PACKAGES) {
      run(
        'pnpm',
        ['publish', '--registry', REGISTRY, '--no-git-checks', '--access', 'public'],
        join(ROOT, dir),
      )
    }
  } finally {
    for (const [path, contents] of originals) writeFileSync(path, contents, 'utf8')
  }

  console.log(`\n  new consumer:  pnpm create cheshire <name> --registry ${REGISTRY}`)
  console.log('  existing:      pnpm update --latest "@cheshire/*"   (in the consumer)')
  console.log('\n  generate OUTSIDE this repository — a consumer inside it inherits settings')
  console.log('  it is supposed to be proving it does not need.\n')
}

/**
 * `<next patch>-dev.<UTC timestamp>` — every publish is a version nobody has
 * seen, which is the whole reason this stamps at all.
 *
 * Republishing one version is not an option, on either side of the wire.
 * Verdaccio rejects it with `EPUBLISHCONFLICT` and has no config to relax that,
 * and worse, updates the shasum in `_attachments` while rejecting — leaving
 * storage inconsistent enough to fail a later clean install. On the consumer
 * side pnpm 10.34 made a tarball-integrity mismatch against the lockfile a hard
 * failure, and `--force` and `pnpm update` both deliberately refuse to bypass
 * it; only `--update-checksums` does, and that is a supply-chain guard, not a
 * dev loop.
 *
 * A new version sidesteps all of it: no conflict to force and correct integrity.
 * The prerelease tag keeps it below a real release, and the next patch is where
 * these builds are actually heading.
 *
 * The consumer refreshes with `pnpm update --latest "@cheshire/*"`, and the
 * `--latest` is not optional. A plain `pnpm update` resolves the caret range
 * correctly *and then rewrites the specifier as an exact pin* — so it works once
 * and is a silent no-op every time after, which reads exactly like a caching
 * bug. `--latest` ignores the declared range and follows the `latest` dist-tag,
 * which every publish here moves.
 *
 * Manifests are edited in place and restored in a `finally`. Nothing here is
 * committed: the stamped version exists only in what was published.
 */
function stamp() {
  const base = JSON.parse(readFileSync(join(ROOT, PACKAGES[0], 'package.json'), 'utf8')).version
  const [major, minor, patch] = base.split('-')[0].split('.').map(Number)
  const now = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)
  return `${major}.${minor}.${patch + 1}-dev.${now}`
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
