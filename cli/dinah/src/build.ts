import { createRequire } from 'node:module'
import { relative } from 'node:path'
import { build as viteBuild } from 'vite'
import { loadApp } from './app.js'
import { runToCompletion } from './electron.js'
import { DinahCliError } from './errors.js'
import { generate } from './generate.js'
import { rendererConfig, rendererOutDir } from './renderer-config.js'

const require = createRequire(import.meta.url)

/**
 * `dinah build` — typecheck the application, then compile the renderer.
 *
 * `dev` deliberately does not typecheck: a dev server that refuses to reload
 * because a type is momentarily wrong is a worse tool. `build` is where the
 * application's types are a gate, and it checks the application's code —
 * `dinah.config.ts` and `src/` — against the generated tsconfig, using the
 * TypeScript the *framework* depends on, so the application does not have to.
 */
export async function build(root?: string): Promise<void> {
  const app = await loadApp(root)
  const files = generate(app)

  const tsc = require.resolve('typescript/bin/tsc')
  const code = await runToCompletion(process.execPath, [tsc, '-p', files.tsconfig], app.root)
  if (code !== 0) {
    throw new DinahCliError('dinah: build stopped — the application does not typecheck.')
  }

  await viteBuild(rendererConfig(app, 'build'))

  console.log(`\n  dinah  built ${app.config.productName}`)
  console.log(`  renderer  ${relative(app.root, rendererOutDir(app))}`)
  console.log(`  main      ${relative(app.root, files.main)}\n`)
}
