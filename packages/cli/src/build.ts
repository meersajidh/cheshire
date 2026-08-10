import { createRequire } from 'node:module'
import { join, relative } from 'node:path'
import { build as viteBuild } from 'vite'
import { loadApp } from './app.js'
import type { AppContext } from './app.js'
import { runToCompletion } from './electron.js'
import { CheshireCliError } from './errors.js'
import { generate } from './generate.js'
import { mainConfig, mainOutDir } from './main-config.js'
import { rendererConfig, rendererOutDir } from './renderer-config.js'

const require = createRequire(import.meta.url)

/** What a completed build leaves behind, and where `cheshire package` picks it up. */
export interface BuildResult {
  app: AppContext
  /** The bundled Electron entry — the packaged app's `main`. */
  mainEntry: string
}

/**
 * `cheshire build` — typecheck the application, then compile both processes.
 *
 * `dev` deliberately does not typecheck: a dev server that refuses to reload
 * because a type is momentarily wrong is a worse tool. `build` is where the
 * application's types are a gate, and it checks the application's code —
 * `cheshire.config.ts` and `src/` — against the generated tsconfig, using the
 * TypeScript the *framework* depends on, so the application does not have to.
 */
export async function build(root?: string): Promise<BuildResult> {
  const app = await loadApp(root)
  const files = generate(app)

  const tsc = require.resolve('typescript/bin/tsc')
  const code = await runToCompletion(process.execPath, [tsc, '-p', files.tsconfig], app.root)
  if (code !== 0) {
    throw new CheshireCliError('cheshire: build stopped — the application does not typecheck.')
  }

  await viteBuild(rendererConfig(app, 'build'))
  await viteBuild(mainConfig(app, files.prodMain))

  const mainEntry = join(mainOutDir(app), 'main.mjs')

  console.log(`\n  cheshire  built ${app.config.productName}`)
  console.log(`  renderer  ${relative(app.root, rendererOutDir(app))}`)
  console.log(`  main      ${relative(app.root, mainEntry)}\n`)

  return { app, mainEntry }
}
