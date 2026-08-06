import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs'
import { cpSync, mkdirSync } from 'node:fs'
import { extname, join } from 'node:path'
import type { AppIdentity } from './identity.js'

export class ScaffoldError extends Error {
  override readonly name = 'ScaffoldError'
}

/**
 * The version set a generated application starts on. `create-dinah` ships a
 * matrix it was tested against rather than a range each install re-resolves —
 * an application never starts life on a combination nobody has run.
 */
export interface Versions {
  dinah: string
  react: string
  reactTypes: string
  /** Pinned into the generated `packageManager` field, so corepack agrees with us. */
  pnpm: string
}

/** Files whose placeholders are substituted. Anything else is copied verbatim. */
const TEXT_EXTENSIONS = new Set(['.json', '.ts', '.tsx', '.md', '.yaml', '.yml', '.html', ''])

/**
 * npm refuses to publish a `.gitignore` inside a package — it strips it — so
 * the template carries the file under a name that survives, and generation puts
 * it back. Without this a generated repository commits `node_modules`.
 */
const GITIGNORE_IN_TEMPLATE = '_gitignore'

export function scaffold(
  templateDir: string,
  targetDir: string,
  identity: AppIdentity,
  versions: Versions,
): void {
  if (existsSync(targetDir) && readdirSync(targetDir).length > 0) {
    throw new ScaffoldError(
      `create-dinah: ${targetDir} already exists and is not empty.\n` +
        'Choose another name, or remove the directory first.',
    )
  }
  if (!existsSync(templateDir)) {
    throw new ScaffoldError(`create-dinah: the template is missing from this install (${templateDir}).`)
  }

  mkdirSync(targetDir, { recursive: true })
  cpSync(templateDir, targetDir, { recursive: true })

  const gitignore = join(targetDir, GITIGNORE_IN_TEMPLATE)
  if (existsSync(gitignore)) renameSync(gitignore, join(targetDir, '.gitignore'))

  substitute(targetDir, {
    name: identity.name,
    appId: identity.appId,
    productName: identity.productName,
    dinahVersion: versions.dinah,
    reactVersion: versions.react,
    reactTypesVersion: versions.reactTypes,
    pnpmVersion: versions.pnpm,
  })
}

/** Replace every `{{token}}` in the generated tree. */
function substitute(dir: string, tokens: Record<string, string>): void {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)

    if (statSync(path).isDirectory()) {
      substitute(path, tokens)
      continue
    }
    if (!TEXT_EXTENSIONS.has(extname(entry))) continue

    const original = readFileSync(path, 'utf8')
    const replaced = original.replace(/\{\{(\w+)\}\}/g, (match, token: string) => {
      const value = tokens[token]
      if (value === undefined) {
        throw new ScaffoldError(
          `create-dinah: the template uses an unknown placeholder \`${match}\` in ${entry}.`,
        )
      }
      return value
    })

    if (replaced !== original) writeFileSync(path, replaced, 'utf8')
  }
}
