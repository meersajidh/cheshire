import { builtinModules } from 'node:module'
import { join } from 'node:path'
import type { InlineConfig } from 'vite'
import type { AppContext } from './app.js'

/** Where `cheshire build` leaves the bundled main process. */
export function mainOutDir(app: AppContext): string {
  return join(app.generatedDir, 'dist', 'main')
}

/**
 * Bundling for a Node target means concatenating the framework's own modules
 * into one file. It does **not** mean bundling the runtime: `electron` and the
 * node builtins are baked into the Electron binary and exist only at run time,
 * so they stay as literal imports the process resolves when it starts.
 */
const RUNTIME_PROVIDED = [
  'electron',
  ...builtinModules,
  ...builtinModules.map((name) => `node:${name}`),
]

/**
 * The main process build. The output is self-contained, which is what lets a
 * packaged application ship without `node_modules` at all.
 */
export function mainConfig(app: AppContext, entry: string): InlineConfig {
  return {
    configFile: false,
    envDir: false,
    root: app.generatedDir,
    build: {
      outDir: mainOutDir(app),
      emptyOutDir: true,
      target: 'node22',
      // A main process is read in crash reports and debugged in place; there is
      // nothing to gain from making it unreadable.
      minify: false,
      ssr: entry,
      rollupOptions: {
        external: RUNTIME_PROVIDED,
        // `.mjs`, so the entry is unambiguously ESM to Electron no matter what
        // the surrounding package.json says.
        output: { entryFileNames: 'main.mjs' },
      },
    },
    // The framework's packages are the point of the bundle — inline them rather
    // than leaving imports that would need `node_modules` beside the app.
    ssr: { noExternal: true },
    logLevel: 'warn',
    clearScreen: false,
  }
}
