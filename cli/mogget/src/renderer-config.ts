import { join, resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import type { InlineConfig } from 'vite'
import type { AppContext } from './app.js'

/** Where `mogget build` leaves the built renderer. */
export function rendererOutDir(app: AppContext): string {
  return join(app.generatedDir, 'dist', 'renderer')
}

/**
 * The renderer's Vite config — the whole of it, in code, never on disk. The
 * application authors no build config (premise 3), so there is no file for it
 * to have opinions about and no config file for Vite to find.
 *
 * The root is `.mogget/`, where the generated HTML lives; `src/` is reached from
 * there like any other relative import, which is why the dev server's file
 * allowlist has to name the application root explicitly.
 */
export function rendererConfig(app: AppContext, mode: 'dev' | 'build'): InlineConfig {
  const base: InlineConfig = {
    configFile: false,
    // The application has no `.env` to load — mogget owns the build.
    envDir: false,
    root: app.generatedDir,
    // Relative, because the packaged renderer is loaded from a file:// path,
    // not served from the root of an origin.
    base: './',
    // Default would be `.mogget/node_modules/.vite` — a node_modules directory
    // inside generated output, which nothing else in the app expects to exist.
    cacheDir: resolve(app.root, 'node_modules', '.mogget-vite'),
    plugins: [react()],
    clearScreen: false,
  }

  if (mode === 'dev') {
    return {
      ...base,
      server: {
        // `.mogget/` is inside the app root, but Vite's default allowlist is
        // computed from the *root*, which here is the generated directory.
        fs: { allow: [app.root] },
      },
    }
  }

  return {
    ...base,
    build: {
      outDir: rendererOutDir(app),
      emptyOutDir: true,
    },
  }
}
