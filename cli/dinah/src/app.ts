import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { runnerImport } from 'vite'
import { DinahConfigError, resolveConfig } from '@dinah/core'
import type { DinahConfig, ResolvedDinahConfig } from '@dinah/core'
import { DinahCliError } from './errors.js'

/** Everything the CLI needs to know about the application it is serving. */
export interface AppContext {
  /** Directory holding `dinah.config.ts` — the application root. */
  root: string
  /** Absolute path to `dinah.config.ts`. */
  configPath: string
  /** Absolute path to the generated `.dinah/` directory. */
  generatedDir: string
  config: ResolvedDinahConfig
}

export const CONFIG_FILE = 'dinah.config.ts'
export const GENERATED_DIR = '.dinah'

/**
 * Read and validate `dinah.config.ts`.
 *
 * The config is TypeScript, and neither the CLI nor the Electron runtime loads
 * TypeScript. Vite's runner does it here, once, in the only process that has
 * Vite: the resolved plain object then travels to the renderer as a generated
 * module and to the runtime as JSON.
 */
export async function loadApp(root: string = process.cwd()): Promise<AppContext> {
  const appRoot = resolve(root)
  const configPath = resolve(appRoot, CONFIG_FILE)

  if (!existsSync(configPath)) {
    throw new DinahCliError(
      `dinah: no ${CONFIG_FILE} in ${appRoot}.\n` +
        `Run the dinah CLI from an application directory, or create one with \`pnpm create dinah <name>\`.`,
    )
  }

  const { module } = await runnerImport<{ default?: DinahConfig }>(configPath)

  try {
    return {
      root: appRoot,
      configPath,
      generatedDir: resolve(appRoot, GENERATED_DIR),
      config: resolveConfig(module.default as DinahConfig),
    }
  } catch (error) {
    // The config contract's own errors already name the file and the fix;
    // re-wrapping keeps them stack-free on the way out.
    if (error instanceof DinahConfigError) throw new DinahCliError(`dinah: ${error.message}`)
    throw error
  }
}
