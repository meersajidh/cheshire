import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { ScaffoldError } from './scaffold.js'

/**
 * Point a generated application at packed tarballs instead of the registry.
 *
 * This exists for one reason: the proof gate. dinah's own rule is that a real
 * install is the only proof, and before a release there is nothing published to
 * install *from* — so the gate packs tarballs and generates against those. It
 * is the same install path a developer gets, with a different source.
 *
 * It is not a framework-development mode. Nothing about the generated app
 * changes shape; only where four dependencies resolve from.
 */
export function useLocalTarballs(targetDir: string, tarballDir: string): void {
  const dir = resolve(tarballDir)
  const tarballs = collect(dir)

  if (tarballs.size === 0) {
    throw new ScaffoldError(`create-dinah: no .tgz files in ${dir}.`)
  }

  rewriteDependencies(targetDir, tarballs)
  addOverrides(targetDir, tarballs)
}

/**
 * Map packed files back to package names. `pnpm pack` drops the scope, so
 * `dinah-core-0.0.0.tgz` is `@dinah/core` and `dinah-0.0.0.tgz` is `dinah`.
 */
function collect(dir: string): Map<string, string> {
  const tarballs = new Map<string, string>()

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.tgz')) continue

    const stem = file.replace(/-\d+\.\d+\.\d+.*\.tgz$/, '')

    // Only the framework's own packages. A `create-dinah` tarball sits in the
    // same directory during a proof gate and is not a dependency of anything
    // generated.
    if (stem !== 'dinah' && !stem.startsWith('dinah-')) continue

    const name = stem === 'dinah' ? 'dinah' : `@dinah/${stem.slice('dinah-'.length)}`
    tarballs.set(name, join(dir, file))
  }

  return tarballs
}

function rewriteDependencies(targetDir: string, tarballs: Map<string, string>): void {
  const manifestPath = join(targetDir, 'package.json')
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    devDependencies?: Record<string, string>
  }

  for (const [name, tarball] of tarballs) {
    if (manifest.devDependencies?.[name]) manifest.devDependencies[name] = `file:${tarball}`
  }

  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

/**
 * The framework's own cross-references need redirecting too. `pnpm pack`
 * substitutes a version for `workspace:*`, so a packed `dinah` asks for
 * `@dinah/core@0.0.0` — a version no registry has.
 */
function addOverrides(targetDir: string, tarballs: Map<string, string>): void {
  const workspacePath = join(targetDir, 'pnpm-workspace.yaml')
  if (!existsSync(workspacePath)) {
    throw new ScaffoldError(`create-dinah: expected a pnpm-workspace.yaml in ${targetDir}.`)
  }

  const entries = [...tarballs]
    .map(([name, tarball]) => `  '${name}': file:${tarball}`)
    .sort()
    .join('\n')

  appendFileSync(
    workspacePath,
    `\n# Generated with --from-tarballs: the framework is installed from packed files,\n` +
      `# and the versions inside them are not published anywhere.\noverrides:\n${entries}\n`,
    'utf8',
  )
}
