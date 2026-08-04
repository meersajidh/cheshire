import { createRequire } from 'node:module'
import { relative } from 'node:path'
import { build as electronBuild } from 'electron-builder'
import type { Configuration } from 'electron-builder'
import { build } from './build.js'
import type { AppContext } from './app.js'
import { DinahCliError } from './errors.js'

const require = createRequire(import.meta.url)

export interface PackageOptions {
  /**
   * Produce an unpacked directory instead of an installer. Fast, and it needs
   * no platform toolchain, so it is the shape a smoke test wants.
   */
  dir?: boolean
}

/**
 * `dinah package` — build, then hand the built output to electron-builder.
 *
 * The whole configuration is derived, never authored: an application states
 * `appId` and `productName` in `dinah.config.ts` and the framework decides what
 * those mean for a package (premise 3).
 */
export async function packageApp(options: PackageOptions = {}, root?: string): Promise<void> {
  const { app, mainEntry } = await build(root)

  try {
    await electronBuild({
      projectDir: app.root,
      config: builderConfig(app, mainEntry),
      ...(options.dir ? { dir: true } : {}),
    })
  } catch (error) {
    throw new DinahCliError(
      `dinah: packaging failed.\n${error instanceof Error ? error.message : String(error)}`,
    )
  }

  console.log(`\n  dinah  packaged ${app.config.productName} → dist/\n`)
}

function builderConfig(app: AppContext, mainEntry: string): Configuration {
  return {
    appId: app.config.appId,
    productName: app.config.productName,

    // electron-builder reads the Electron version from the *application's*
    // dependencies, and the application does not have one — the framework owns
    // the runtime (premise 5). Hand it the version the framework resolved.
    electronVersion: electronVersion(),

    directories: { output: 'dist' },

    // The build output is self-contained: the renderer is bundled by Vite and
    // the main process is bundled with the runtime inlined. So the two built
    // trees are the entire package.
    //
    // The exclusion is not redundant. electron-builder collects production
    // dependencies through its own pass, *outside* these patterns, and only an
    // explicit negation stops it — otherwise an application that names `dinah`
    // as a runtime dependency ships Vite, TypeScript and electron-builder
    // inside its asar. Nothing here needs to resolve at run time.
    files: [relative(app.root, mainEntry), '.dinah/dist/renderer/**', '!node_modules/**'],
    extraMetadata: {
      main: relative(app.root, mainEntry),
      // Linux desktop environments associate a running window with its launcher
      // through WM_CLASS, which Electron takes from the desktop entry's name.
      // Without it the app appears as a second, unlinked icon while running.
      desktopName: `${app.config.appId}.desktop`,
    },

    // Nothing here has a native binding to rebuild, and electron-builder's
    // rebuild step silently finds nothing under pnpm's hoisted linker anyway —
    // it would report success while changing nothing. Leave it off until a
    // native module actually arrives and the rebuild is done deliberately.
    npmRebuild: false,

    linux: { target: 'AppImage', category: 'Utility', syncDesktopName: true },
    win: { target: 'nsis' },
    mac: { target: 'dmg' },
  }
}

function electronVersion(): string {
  const manifest = require('electron/package.json') as { version: string }
  return manifest.version
}
